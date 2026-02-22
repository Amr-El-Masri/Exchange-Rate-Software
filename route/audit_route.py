from flask import Blueprint, request, jsonify, abort
import jwt
from extensions import db
from model.audit_log import AuditLog, audit_log_schema, audit_logs_schema
from model.user import User
from service.auth_service import extract_auth_token, decode_token

audit_bp = Blueprint('audit', __name__)

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
    return user_id


#view all logs ( as an admin)
@audit_bp.route('/audit/logs', methods=['GET'])
def get_all_logs():
    require_admin()
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).all()
    return jsonify(audit_logs_schema.dump(logs))

#view ur own logs(as a user)
@audit_bp.route('/audit/logs/me', methods=['GET'])
def get_my_logs():
    user_id = get_current_user()
    logs = AuditLog.query.filter_by(user_id=user_id).order_by(AuditLog.timestamp.desc()).all()
    return jsonify(audit_logs_schema.dump(logs))