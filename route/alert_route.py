from flask import Blueprint, request, jsonify, abort
import jwt
import datetime
from extensions import db
from model.alert import Alert, alert_schema, alerts_schema
from model.transaction import Transaction
from service.auth_service import extract_auth_token, decode_token

alerts_bp=Blueprint('alerts', __name__)

def get_current_user():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)

#create new alert
@alerts_bp.route('/alerts', methods=['POST'])
def create_alert():
    user_id= get_current_user()
    usd_to_lbp=request.json.get('usd_to_lbp')
    threshold= request.json.get('threshold')
    direction=request.json.get('direction')

    if usd_to_lbp is None or threshold is None or direction is None:
        return jsonify({"error": "usd_to_lbp, threshold, and direction are required"}), 400
    if float(threshold) <= 0:
        return jsonify({"error": "Threshold must be positive"}), 400
    if direction not in ['above', 'below']:
        return jsonify({"error": "Direction must be 'above' or 'below'"}), 400
    if usd_to_lbp not in [True, False]:
        return jsonify({"error": "usd_to_lbp must be a boolean"}), 400
    
    alert= Alert(
        user_id=user_id,
        usd_to_lbp=bool(usd_to_lbp),
        threshold=float(threshold),
        direction=direction
    )
    db.session.add(alert)
    db.session.commit()
    return jsonify(alert_schema.dump(alert))

#view ur own alerts
@alerts_bp.route('/alerts', methods=['GET'])
def get_alerts():
    user_id=get_current_user()
    user_alerts= Alert.query.filter_by(user_id=user_id).order_by(Alert.creation_date.desc()).all()
    return jsonify(alerts_schema.dump(user_alerts))

#delete alert
@alerts_bp.route('/alerts/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    user_id = get_current_user()

    alert = Alert.query.get(alert_id)

    if not alert:
        return jsonify({"error": "Alert not found"}), 404
    if alert.user_id != user_id:
        return jsonify({"error": "You can only delete your own alerts"}), 403

    db.session.delete(alert)
    db.session.commit()
    return jsonify({"message": "Alert deleted successfully"})

#check which alerts have been trigered
@alerts_bp.route('/alerts/check', methods=['GET'])
def check_alerts():
    user_id=get_current_user()
    
    #first get current exchange rate (average of last 72 hours, as we are ususally taking it) (same logic as "get exchange rate")
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

    user_alerts=Alert.query.filter_by(user_id=user_id).all()
    triggered=[]
    #we keep track of non triggered alert as well, just for nice output, can only focus on triggered ones if we want
    not_triggered=[]
    for alert in user_alerts:
        #pick the relevat avg rate according to the direction of the alert
        avg_rate=avg_usd_to_lbp if alert.usd_to_lbp else avg_lbp_to_usd
        if avg_rate is None:
            continue

        is_triggered = (
            (alert.direction== 'above' and avg_rate > alert.threshold) or
            (alert.direction== 'below' and avg_rate < alert.threshold)
        )

        alert_data={
            **alert_schema.dump(alert),#the stars unpack the dictionary returned by the scema
            "current_rate": round(avg_rate, 4)
        }

        if is_triggered:
            triggered.append(alert_data)
        else:
            not_triggered.append(alert_data)

    return jsonify({
    "triggered_alerts": triggered,
    "untriggered_alerts": not_triggered,
    "current_usd_to_lbp_rate": round(avg_usd_to_lbp, 4) if avg_usd_to_lbp else None,
    "current_lbp_to_usd_rate": round(avg_lbp_to_usd, 4) if avg_lbp_to_usd else None
    })


