from extensions import db, ma, bcrypt
from marshmallow import fields

class User(db.Model):
    #the below is a format that is compatible with the new ma.Schema version
    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(30), unique=True, nullable=False)
    hashed_password = db.Column(db.String(128))
    def __init__ (self, user_name, password):
        super(User, self).__init__(user_name=user_name)
        self.hashed_password = bcrypt.generate_password_hash(password)

class UserSchema (ma.Schema):
    #class Meta:
        #fields=("id", "user_name")
        #model=User

    #the below is a format that is compatible with the new ma.Schema version
    id = fields.Int()
    user_name = fields.Str()
user_schema= UserSchema()