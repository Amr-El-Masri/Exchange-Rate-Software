from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os


#from db_config import DB_CONFIG
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
app.config['SECRET_KEY']= os.getenv("SECRET_KEY")

from extensions import db, ma, bcrypt, limiter
db.init_app(app)
ma.init_app(app)
bcrypt.init_app(app)
limiter.init_app(app)
CORS(app)

#get the blueprint objects defined in the route files and plug them into the app
from route.auth_route import auth_bp
from route.transaction_route import transactions_bp
from route.analytics_route import analytics_bp
from route.marketplace_route import marketplace_bp
from route.alert_route import alerts_bp
app.register_blueprint(auth_bp)
app.register_blueprint(transactions_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(marketplace_bp)
app.register_blueprint(alerts_bp)
    
if __name__ == "__main__":
    app.run(debug=False)
    