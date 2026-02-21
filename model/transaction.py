from extensions import db, ma
import datetime
from marshmallow import fields

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usd_amount = db.Column(db.Float, nullable=False)
    lbp_amount = db.Column(db.Float, nullable=False)
    usd_to_lbp = db.Column(db.Boolean, nullable=False)
    added_date = db.Column(db.DateTime)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    def __init__(self, usd_amount, lbp_amount, usd_to_lbp, user_id):
        super(Transaction, self).__init__(
            usd_amount=usd_amount,
            lbp_amount=lbp_amount,
            usd_to_lbp=usd_to_lbp,
            user_id=user_id,
            added_date=datetime.datetime.now()
        )

class TransactionSchema(ma.Schema):
    class Meta:
       
        fields = ("id", "usd_amount", "lbp_amount", "usd_to_lbp", "added_date", "user_id")
        #model = Transaction

    #the above way wasnt working, so after some research it seems that explicit fields are required with ma.Schema since it doesn't auto-generate fields from the model
    #id = fields.Int()
    #usd_amount = fields.Float()
    #lbp_amount = fields.Float()
    #usd_to_lbp = fields.Bool()
    #added_date = fields.DateTime()
    #user_id = fields.Int(allow_none=True)

transaction_schema = TransactionSchema()
transactions_schema = TransactionSchema(many=True)