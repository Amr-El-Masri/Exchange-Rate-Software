from flask import Blueprint, request, jsonify, abort, make_response
import datetime
import jwt
from extensions import db, limiter
from model.transaction import Transaction, transaction_schema, transactions_schema
from service.auth_service import extract_auth_token, decode_token
import csv
import io
from service.audit_service import log_event
from service.notification_service import check_and_notify

outlier_threshold = 0.5

transactions_bp= Blueprint('transactions', __name__)

def get_current_user():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)

def is_outlier_rate(usd_amount, lbp_amount, usd_to_lbp):
    #get the recent average rate for comparison
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(hours=72)
    recent_txns = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date),
        Transaction.usd_to_lbp == usd_to_lbp,
        Transaction.is_outlier == False
    ).all()

    if not recent_txns:
        return False  #in case there is no baseline to compare against

    avg_rate = sum(t.lbp_amount / t.usd_amount for t in recent_txns) / len(recent_txns)
    new_rate = lbp_amount / usd_amount
    deviation = abs(new_rate - avg_rate) / avg_rate

    return deviation > outlier_threshold #defined above as 0.5, meaning we flag when a rate deviates more than 50% from the recent average

#the three routes below are the ones already implemented in labs 1 and 2
@transactions_bp.route('/transaction', methods=['POST'])
@limiter.limit("5 per minute")#note: this automatically returns the 429 error too many requests
def add_transaction():
    user_id = None
    usd_amount = float(request.json.get("usd_amount", 0))
    lbp_amount = float(request.json.get("lbp_amount", 0))
    usd_to_lbp = request.json.get("usd_to_lbp")
    source = request.json.get("source", "internal")

    if usd_amount<=0:
        return jsonify({"error": "Invalid usd_amount"}), 400
    if lbp_amount<=0:
        return jsonify({"error": "Invalid lbp_amount"}), 400
    if usd_to_lbp not in [True, False]:
        return jsonify({"error": "Invalid usd_to_lbp value"}), 400
    if source not in ['internal', 'external']:
        return jsonify({"error": "source must be 'internal' or 'external'"}), 400
    
    token = extract_auth_token(request)
    if token:
        try:
            user_id=decode_token(token)
            
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            abort(403)

    #check if this transac is an outlier
    outlier = is_outlier_rate(usd_amount, lbp_amount, usd_to_lbp)
    transaction = Transaction(usd_amount, lbp_amount, usd_to_lbp, user_id, source)
    transaction.is_outlier = outlier  # just flag it
    try:
        db.session.add(transaction)
        db.session.commit()
        log_event('TRANSACTION_CREATED', f"Transaction created: {usd_amount} USD / {lbp_amount} LBP", user_id=user_id)
        check_and_notify(db.session)
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Transaction failed, please try again"}), 500

    if outlier:
        return jsonify({
            "warning": "Transaction saved but flagged as outlier: rate deviates significantly from recent average",
            "transaction": transaction_schema.dump(transaction)
        }) 
    
    #in the above we simply flag the transaction and add it, if we want to reject it instead, we can use the below:
    # outlier = is_outlier_rate(usd_amount, lbp_amount, usd_to_lbp)
    # if outlier:
    #     return jsonify({"error": "Transaction rate flagged as outlier..."}), 400

    return jsonify(transaction_schema.dump(transaction))

@transactions_bp.route('/transaction', methods=['GET'])
def get_user_transactions():
    token= extract_auth_token(request)
    if not token:
        abort(403)

    try:
        user_id = decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(403)
    user_transactions= Transaction.query.filter_by(user_id=user_id).all()
    return jsonify(transactions_schema.dump(user_transactions))

@transactions_bp.route('/exchangeRate', methods=['GET'])
def get_exchange_rate():
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(hours=72)
    
    usd_to_lbp_transactions = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date),
        Transaction.usd_to_lbp == True,
        Transaction.is_outlier == False  #exclude outliers (extreme transactions) so they dont ruin the avg rate
    ).all()

    lbp_to_usd_transactions = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date),
        Transaction.usd_to_lbp == False,
        Transaction.is_outlier == False#also exclude outliers
    ).all()

    avg_usd_to_lbp = None
    if usd_to_lbp_transactions:
        avg_usd_to_lbp = sum([txn.lbp_amount / txn.usd_amount for txn in usd_to_lbp_transactions]) / len(usd_to_lbp_transactions)

    avg_lbp_to_usd = None
    if lbp_to_usd_transactions:
        avg_lbp_to_usd = sum([txn.lbp_amount / txn.usd_amount for txn in lbp_to_usd_transactions]) / len(lbp_to_usd_transactions)
    return jsonify({"usd_to_lbp_rate": avg_usd_to_lbp, "lbp_to_usd_rate": avg_lbp_to_usd})

#export transaction history as csv
@transactions_bp.route('/export', methods=['GET'])
def export_transaction_history():
    user_id=get_current_user()

    transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.added_date.desc()).all()# now we order by desc() to put the newest transactions first, if we wanna do it the opposite way just use asc() instead

    if not transactions:
        return jsonify({"message": "No transactions found to export"}), 200
    
    #create in memory string buffer to write the csv into (we dont create a real file in the server filesystem, just a fake file that lives in Ram instead of disk)
    output = io.StringIO()
    #python's built in csv writer , handles proper formatting
    writer = csv.writer(output)
    #write the first row (the col names)
    writer.writerow(['id', 'usd_amount', 'lbp_amount', 'usd_to_lbp', 'added_date'])
    #write one row per transac
    for txn in transactions:
        writer.writerow([txn.id,txn.usd_amount,txn.lbp_amount,txn.usd_to_lbp,txn.added_date])

    #build HTTP response with the csv content
    output.seek(0)#move the buffer's cursor back to the start 
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = 'attachment; filename=transactions.csv'
    return response


