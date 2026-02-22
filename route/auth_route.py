from flask import Blueprint, request, jsonify, abort
from extensions import db, bcrypt, limiter
from model.user import User, user_schema
from service.auth_service import create_token
from service.audit_service import log_event

# a blueprint is something that holds a bunch of routes, here it is called auth
auth_bp= Blueprint('auth', __name__)

#here are the routes we put in this blueprint
#the user route done in lab1 and 2
@auth_bp.route('/user', methods=['POST'])
def add_user():
    user_name= request.json.get("user_name")
    password= request.json.get("password")

    if not user_name or not password:
        return jsonify ({"error": "username and password required"}), 400

    user= User(user_name=user_name, password=password)
    db.session.add(user)
    db.session.commit()
    log_event('USER_REGISTERED', f"New user registered: {user_name}", user_id=user.id)
    return jsonify(user_schema.dump(user))
#the authentication route done in lab1 and 2
@auth_bp.route('/authentication', methods=['POST'])
@limiter.limit("5 per minute")#note: this automatically returns the 429 error too many requests
def authenticate():
    user_name= request.json.get("user_name")
    password= request.json.get("password")
    if not user_name or not password: 
        abort(400)
    user = User.query.filter_by(user_name=user_name).first()
    if not user:
        abort(403)
    if not bcrypt.check_password_hash(user.hashed_password, password):
        log_event('LOGIN_FAILED', f"Failed login attempt for: {user_name}")
        abort(403)
    
    #if the user is banned or suspended, let them know and dont give them a token (dont autherize them to access the functionalities)
    if user.status in ['suspended', 'banned']:
        log_event('LOGIN_BLOCKED', f"Blocked login attempt for {user.status} account: {user_name}", user_id=user.id)
        return jsonify({"error": f"Account is {user.status}"}), 403

    token=create_token(user.id)
    log_event('LOGIN_SUCCESSFUL', f"User logged in: {user_name}", user_id=user.id)
    return jsonify({"token": token})
