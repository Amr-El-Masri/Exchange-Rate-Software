from flask import Blueprint, request, jsonify, abort
import datetime
import jwt
from extensions import db, limiter
from model.transaction import Transaction, transaction_schema, transactions_schema
from service.auth_service import extract_auth_token, decode_token

transactions_bp= Blueprint('transactions', __name__)

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
