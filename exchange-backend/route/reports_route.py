from flask import Blueprint, request, jsonify, abort
import jwt
import datetime
from extensions import db
from model.transaction import Transaction, transactions_schema
from model.offer import Offer
from model.user import User
from service.auth_service import extract_auth_token, decode_token
from sqlalchemy import func
reports_bp = Blueprint('reports', __name__)

def require_admin():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        user_id = decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)
    user = User.query.get(user_id)
    if not user or user.role != 'ADMIN':
        abort(403)

#get transaction volume report(as admin)
@reports_bp.route('/admin/reports/transactions', methods=['GET'])
def transaction_volume_report():
    require_admin()

    start_str = request.args.get('start_date')
    end_str = request.args.get('end_date')

    try:
        if start_str and end_str:
            start_date = datetime.datetime.strptime(start_str, "%m/%d/%Y")
            end_date = datetime.datetime.strptime(end_str, "%m/%d/%Y").replace(hour=23, minute=59, second=59)
        else:
            end_date = datetime.datetime.now()
            start_date = end_date - datetime.timedelta(hours=72)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use MM/DD/YYYY"}), 400

    transactions = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date)
    ).all()

    total_usd_volume = sum(t.usd_amount for t in transactions)
    total_lbp_volume = sum(t.lbp_amount for t in transactions)
    usd_to_lbp_count = sum(1 for t in transactions if t.usd_to_lbp)
    lbp_to_usd_count = sum(1 for t in transactions if not t.usd_to_lbp)

    return jsonify({
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_transactions": len(transactions),
        "usd_to_lbp_transactions": usd_to_lbp_count,
        "lbp_to_usd_transactions": lbp_to_usd_count,
        "total_usd_volume": round(total_usd_volume, 2),
        "total_lbp_volume": round(total_lbp_volume, 2)
    })

#get most active users report(as admin)
@reports_bp.route('/admin/reports/users', methods=['GET'])
def user_activity_report():
    require_admin()

    #use db aggregation to count transactions per user
    transaction_counts = db.session.query(
        Transaction.user_id,
        func.count(Transaction.id).label('transaction_count')
    ).filter(
        Transaction.user_id != None
    ).group_by(Transaction.user_id).order_by(
        func.count(Transaction.id).desc()
    ).all()

    #count offers per user
    offer_counts = db.session.query(
        Offer.user_id,
        func.count(Offer.id).label('offer_count')
    ).group_by(Offer.user_id).order_by(
        func.count(Offer.id).desc()
    ).all()

    transaction_data = [{"user_id": r.user_id, "transaction_count": r.transaction_count} for r in transaction_counts]
    offer_data = [{"user_id": r.user_id, "offer_count": r.offer_count} for r in offer_counts]

    return jsonify({
        "most_active_by_transactions": transaction_data,
        "most_active_by_offers": offer_data
    })

#get marketplace stats (as admin)
@reports_bp.route('/admin/reports/marketplace', methods=['GET'])
def marketplace_report():
    require_admin()

    total_offers = Offer.query.count()
    available_offers = Offer.query.filter_by(status='available').count()
    accepted_offers = Offer.query.filter_by(status='accepted').count()
    canceled_offers = Offer.query.filter_by(status='canceled').count()

    return jsonify({
        "total_offers": total_offers,
        "available_offers": available_offers,
        "accepted_offers": accepted_offers,
        "canceled_offers": canceled_offers
    })
