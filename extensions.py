from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()
db = SQLAlchemy()
ma= Marshmallow()
