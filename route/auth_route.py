from flask import Blueprint, request, jsonify, abort
from extensions import db, bcrypt
from model.user import User, user_schema
from service.auth_service import create_token

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
    return jsonify(user_schema.dump(user))
#the authentication route done in lab1 and 2
@auth_bp.route('/authentication', methods=['POST'])
def authenticate():
    user_name= request.json.get("user_name")
    password= request.json.get("password")
    if not user_name or not password: 
        abort(400)
    user = User.query.filter_by(user_name=user_name).first()
    if not user:
        abort(403)
    if not bcrypt.check_password_hash(user.hashed_password, password):
        abort(403)
    token=create_token(user.id)
    return jsonify({"token": token})
