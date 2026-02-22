from flask import Blueprint, request, jsonify, abort
import jwt
from extensions import db
from model.notification import Notification, notification_schema, notifications_schema
from service.auth_service import extract_auth_token, decode_token

notifications_bp = Blueprint('notifications', __name__)

def get_current_user():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)

@notifications_bp.route('/notifications', methods=['GET'])
def get_notifications():
    user_id = get_current_user()
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({
        "unread_count": unread_count,
        "notifications": notifications_schema.dump(notifications)
    })

@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_as_read(notification_id):
    user_id = get_current_user()
    notification = Notification.query.get(notification_id)
    if not notification:
        return jsonify({"error": "Notification not found"}), 404
    if notification.user_id != user_id:
        return jsonify({"error": "You can only mark your own notifications as read"}), 403
    notification.is_read = True
    db.session.commit()
    return jsonify(notification_schema.dump(notification))

@notifications_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
def delete_notification(notification_id):
    user_id = get_current_user()
    notification = Notification.query.get(notification_id)
    if not notification:
        return jsonify({"error": "Notification not found"}), 404
    if notification.user_id != user_id:
        return jsonify({"error": "You can only delete your own notifications"}), 403
    db.session.delete(notification)
    db.session.commit()
    return jsonify({"message": "Notification deleted successfully"})

@notifications_bp.route('/notifications', methods=['DELETE'])
def delete_all_notifications():
    user_id = get_current_user()
    Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"message": "All notifications deleted successfully"})