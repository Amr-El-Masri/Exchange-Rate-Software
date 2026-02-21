from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_marshmallow import Marshmallow
from flask_bcrypt import Bcrypt
from flask import abort
import jwt
import datetime
from marshmallow import fields
from flask_cors import CORS
#from db_config import DB_CONFIG


load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
SECRET_KEY = os.getenv("SECRET_KEY")# I used the key from my venv instead of hardcoding
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
app.config['SECRET_KEY']= SECRET_KEY

from extensions import db, ma, bcrypt
db.init_app(app)
#ma.init_app(app)
bcrypt.init_app(app)
CORS(app)
#I kept the DB configuration as below since I already put my DB config parameters in my venv since the beginning
#but if we want to use the db_config.py file we just replace the below by: app.config['SQLALCHEMY_DATABASE_URI'] = DB_CONFIG and uncomment the import from db_config above



limiter = Limiter(key_func=get_remote_address)
limiter.init_app(app)

from model.user import User, user_schema
from model.transaction import Transaction, transaction_schema, transactions_schema


def create_token(user_id):
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=4),
        'iat': datetime.datetime.utcnow(),
        'sub': str(user_id)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token.decode("utf-8") if isinstance(token, bytes) else token

def extract_auth_token(authenticated_request):
    auth_header = authenticated_request.headers.get('Authorization')
    if auth_header:
        return auth_header.split(" ")[1]
    else:
        return None

def decode_token(token):
    payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    return int(payload['sub'])

@app.route('/user', methods=['POST'])
def add_user():
    user_name= request.json.get("user_name")
    password= request.json.get("password")

    if not user_name or not password:
        return jsonify ({"error": "username and password required"}), 400

    user= User(user_name=user_name, password=password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user_schema.dump(user))

@app.route('/authentication', methods=['POST'])
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

@app.route('/transaction', methods=['POST'])
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

@app.route('/transaction', methods=['GET'])
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

@app.route('/exchangeRate', methods=['GET'])
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

    
if __name__ == "__main__":
    app.run(debug=False)
    