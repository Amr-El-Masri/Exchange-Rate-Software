from extensions import db, ma, bcrypt
from marshmallow import fields

class User(db.Model):
    #the below is a format that is compatible with the new ma.Schema version
    id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(30), unique=True, nullable=False)
    hashed_password = db.Column(db.String(128))
    role = db.Column(db.String(10), nullable=False, default='USER')# role: regular user or admin
    status = db.Column(db.String(10), nullable=False, default='active')#usr satatus: active(normal), suspended, or banned
    def __init__ (self, user_name, password, role='USER'):
        super(User, self).__init__(user_name=user_name, role=role, status='active')
        self.hashed_password = bcrypt.generate_password_hash(password)

class UserSchema (ma.Schema):
    #class Meta:
        #fields=("id", "user_name")
        #model=User

    #the below is a format that is compatible with the new ma.Schema version
    id = fields.Int()
    user_name = fields.Str()
    role = fields.Str()
    status = fields.Str()
    
user_schema= UserSchema()
users_schema = UserSchema(many=True)