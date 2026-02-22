from flask import Blueprint, request, jsonify, abort, make_response
import datetime
import jwt
from extensions import db, limiter
from model.transaction import Transaction, transaction_schema, transactions_schema
from service.auth_service import extract_auth_token, decode_token
import csv
import io

transactions_bp= Blueprint('transactions', __name__)

def get_current_user():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)

#the three routes below are the ones already implemented in labs 1 and 2
@transactions_bp.route('/transaction', methods=['POST'])
@limiter.limit("10 per minute")
def add_transaction():
    user_id = None
    usd_amount = float(request.json.get("usd_amount", 0))
    lbp_amount = float(request.json.get("lbp_amount", 0))
    usd_to_lbp = request.json.get("usd_to_lbp")
    if usd_amount<=0:
        return jsonify({"error": "Invalid usd_amount"}), 400
    if lbp_amount<=0:
        return jsonify({"error": "Invalid lbp_amount"}), 400
    if usd_to_lbp not in [True, False]:
        return jsonify({"error": "Invalid usd_to_lbp value"}), 400
    
    token = extract_auth_token(request)
    if token:
        try:
            user_id=decode_token(token)
            print(user_id)
            
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            abort(403)
    transaction= Transaction(float(usd_amount), float(lbp_amount), bool(usd_to_lbp), user_id)
    db.session.add(transaction)
    db.session.commit()
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
        Transaction.usd_to_lbp == True
    ).all()

    lbp_to_usd_transactions = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date),
        Transaction.usd_to_lbp == False
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


