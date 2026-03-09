from flask import Blueprint, request, jsonify, abort
import jwt
import datetime
from extensions import db
from model.user import User, user_schema, users_schema
from model.transaction import Transaction
from service.auth_service import extract_auth_token, decode_token
from model.preference import Preference, preference_schema
from model.alert import Alert, alert_schema, alerts_schema

admin_bp=Blueprint('admin', __name__)

def get_current_user():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)

def require_admin():
    user_id = get_current_user()
    user = User.query.get(user_id)
    if not user or user.role != 'ADMIN':
        abort(403)
    return user

#view all users with their basic info as an admin
@admin_bp.route('/admin/users', methods=['GET'])
def get_all_users():
    require_admin()
    users = User.query.all()
    return jsonify(users_schema.dump(users))

#view system wide transaction stats
@admin_bp.route('/admin/stats', methods=['GET'])
def get_system_stats():
    require_admin()

    total_transactions = Transaction.query.count()
    total_users = User.query.count()

    # transactions in last 72 hours (the time window we are usually taking) (can easily change by changing hours=72 below)
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(hours=72)
    recent_transactions = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date)
    ).count()

    #computing average rates as usual
    usd_to_lbp_transactions = Transaction.query.filter_by(usd_to_lbp=True).all()
    lbp_to_usd_transactions = Transaction.query.filter_by(usd_to_lbp=False).all()

    avg_usd_to_lbp = None
    if usd_to_lbp_transactions:
        avg_usd_to_lbp = sum([txn.lbp_amount / txn.usd_amount for txn in usd_to_lbp_transactions]) / len(usd_to_lbp_transactions)

    avg_lbp_to_usd = None
    if lbp_to_usd_transactions:
        avg_lbp_to_usd = sum([txn.lbp_amount / txn.usd_amount for txn in lbp_to_usd_transactions]) / len(lbp_to_usd_transactions)

    return jsonify({
        "total_users": total_users,
        "total_transactions": total_transactions,
        "transactions_last_72h": recent_transactions,
        "overall_avg_usd_to_lbp_rate": round(avg_usd_to_lbp, 4) if avg_usd_to_lbp else None,
        "overall_avg_lbp_to_usd_rate": round(avg_lbp_to_usd, 4) if avg_lbp_to_usd else None
    })

#suspend or ban a user
@admin_bp.route('/admin/users/<int:user_id>/status', methods=['PUT'])
def update_user_status(user_id):
    require_admin()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    new_status = request.json.get('status')
    if new_status not in ['active', 'suspended', 'banned']:
        return jsonify({"error": "Status must be 'active', 'suspended', or 'banned'"}), 400

    user.status = new_status
    db.session.commit()
    return jsonify({
        "message": f"User status updated to '{new_status}'",
        "user": user_schema.dump(user)
    })

#update role: make a user an admin, or make an admin a regular user
@admin_bp.route('/admin/users/<int:user_id>/role', methods=['PUT'])
def update_user_role(user_id):
    require_admin()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    new_role = request.json.get('role')
    if new_role not in ['USER', 'ADMIN']:
        return jsonify({"error": "Role must be 'USER' or 'ADMIN'"}), 400

    user.role = new_role
    db.session.commit()
    return jsonify({
        "message": f"User role updated to '{new_role}'",
        "user": user_schema.dump(user)
    })

#manage preferences (similar to preferences route code)
@admin_bp.route('/admin/users/<int:user_id>/preferences', methods=['GET'])
def get_user_preferences(user_id):
    require_admin()
    preference = Preference.query.filter_by(user_id=user_id).first()
    if not preference:
        return jsonify({"message": "No preferences set for this user"}), 200
    return jsonify(preference_schema.dump(preference))

@admin_bp.route('/admin/users/<int:user_id>/preferences', methods=['POST'])
def create_user_preferences(user_id):
    require_admin()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    existing = Preference.query.filter_by(user_id=user_id).first()
    if existing:
        return jsonify({"error": "Preferences already exist for this user, use PUT to update"}), 400

    default_interval = request.json.get('default_interval', 'daily')
    default_time_range = request.json.get('default_time_range', 72)
    default_usd_to_lbp = request.json.get('default_usd_to_lbp', True)

    if default_interval not in ['hourly', 'daily']:
        return jsonify({"error": "default_interval must be 'hourly' or 'daily'"}), 400
    if not isinstance(default_time_range, int) or default_time_range <= 0:
        return jsonify({"error": "default_time_range must be a positive integer"}), 400

    preference = Preference(
        user_id=user_id,
        default_interval=default_interval,
        default_time_range=default_time_range,
        default_usd_to_lbp=bool(default_usd_to_lbp)
    )
    db.session.add(preference)
    db.session.commit()
    return jsonify(preference_schema.dump(preference))

@admin_bp.route('/admin/users/<int:user_id>/preferences', methods=['PUT'])
def update_user_preferences(user_id):
    require_admin()
    preference = Preference.query.filter_by(user_id=user_id).first()
    if not preference:
        return jsonify({"error": "No preferences found for this user"}), 404

    default_interval = request.json.get('default_interval')
    default_time_range = request.json.get('default_time_range')
    default_usd_to_lbp = request.json.get('default_usd_to_lbp')

    if default_interval is not None:
        if default_interval not in ['hourly', 'daily']:
            return jsonify({"error": "default_interval must be 'hourly' or 'daily'"}), 400
        preference.default_interval = default_interval
    if default_time_range is not None:
        if not isinstance(default_time_range, int) or default_time_range <= 0:
            return jsonify({"error": "default_time_range must be a positive integer"}), 400
        preference.default_time_range = default_time_range
    if default_usd_to_lbp is not None:
        preference.default_usd_to_lbp = bool(default_usd_to_lbp)

    preference.updated_at = datetime.datetime.now()
    db.session.commit()
    return jsonify(preference_schema.dump(preference))

@admin_bp.route('/admin/users/<int:user_id>/preferences', methods=['DELETE'])
def delete_user_preferences(user_id):
    require_admin()
    preference = Preference.query.filter_by(user_id=user_id).first()
    if not preference:
        return jsonify({"error": "No preferences found for this user"}), 404
    db.session.delete(preference)
    db.session.commit()
    return jsonify({"message": "User preferences deleted successfully"})

#manage user alerts(similar to alert route code)
@admin_bp.route('/admin/users/<int:user_id>/alerts', methods=['GET'])
def get_user_alerts(user_id):
    require_admin()
    user_alerts = Alert.query.filter_by(user_id=user_id).all()
    return jsonify(alerts_schema.dump(user_alerts))

@admin_bp.route('/admin/users/<int:user_id>/alerts', methods=['POST'])
def create_user_alert(user_id):
    require_admin()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    usd_to_lbp = request.json.get('usd_to_lbp')
    threshold = request.json.get('threshold')
    direction = request.json.get('direction')

    if usd_to_lbp is None or threshold is None or direction is None:
        return jsonify({"error": "usd_to_lbp, threshold, and direction are required"}), 400
    if float(threshold) <= 0:
        return jsonify({"error": "Threshold must be positive"}), 400
    if direction not in ['above', 'below']:
        return jsonify({"error": "Direction must be 'above' or 'below'"}), 400

    alert = Alert(
        user_id=user_id,
        usd_to_lbp=bool(usd_to_lbp),
        threshold=float(threshold),
        direction=direction
    )
    db.session.add(alert)
    db.session.commit()
    return jsonify(alert_schema.dump(alert))

@admin_bp.route('/admin/users/<int:user_id>/alerts/check', methods=['GET'])
def check_user_alerts(user_id):
    require_admin()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

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
        avg_usd_to_lbp = sum(t.lbp_amount / t.usd_amount for t in usd_to_lbp_transactions) / len(usd_to_lbp_transactions)

    avg_lbp_to_usd = None
    if lbp_to_usd_transactions:
        avg_lbp_to_usd = sum(t.lbp_amount / t.usd_amount for t in lbp_to_usd_transactions) / len(lbp_to_usd_transactions)

    user_alerts = Alert.query.filter_by(user_id=user_id).all()
    triggered = []
    not_triggered = []

    for alert in user_alerts:
        avg_rate = avg_usd_to_lbp if alert.usd_to_lbp else avg_lbp_to_usd
        if avg_rate is None:
            continue
        is_triggered = (
            (alert.direction == 'above' and avg_rate > alert.threshold) or
            (alert.direction == 'below' and avg_rate < alert.threshold)
        )
        alert_data = {
            **alert_schema.dump(alert),
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

@admin_bp.route('/admin/alerts/<int:alert_id>', methods=['DELETE'])
def delete_user_alert(alert_id):
    require_admin()
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404
    db.session.delete(alert)
    db.session.commit()
    return jsonify({"message": "Alert deleted successfully"})