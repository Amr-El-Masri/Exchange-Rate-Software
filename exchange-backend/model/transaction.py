from extensions import db, ma
import datetime
from marshmallow import fields

class Transaction(db.Model):
    #the below is a format that is compatible with the new ma.Schema version
    id = db.Column(db.Integer, primary_key=True)
    usd_amount = db.Column(db.Float, nullable=False)
    lbp_amount = db.Column(db.Float, nullable=False)
    usd_to_lbp = db.Column(db.Boolean, nullable=False)
    added_date = db.Column(db.DateTime)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    source = db.Column(db.String(20), nullable=False, default='internal')  #internal or external
    is_outlier = db.Column(db.Boolean, default=False)

    def __init__(self, usd_amount, lbp_amount, usd_to_lbp, user_id, source='internal'):
        super(Transaction, self).__init__(
            usd_amount=usd_amount,
            lbp_amount=lbp_amount,
            usd_to_lbp=usd_to_lbp,
            user_id=user_id,
            added_date=datetime.datetime.now(),
            source=source,
            is_outlier=False
        )

class TransactionSchema(ma.Schema):
    # class Meta:
       
    #     fields = ("id", "usd_amount", "lbp_amount", "usd_to_lbp", "added_date", "user_id")
    #     model = Transaction

    #the below is a format that is compatible with the new ma.Schema version
    id = fields.Int()
    usd_amount = fields.Float()
    lbp_amount = fields.Float()
    usd_to_lbp = fields.Bool()
    added_date = fields.DateTime()
    user_id = fields.Int(allow_none=True)
    source = fields.Str()
    is_outlier = fields.Bool()

transaction_schema = TransactionSchema()
transactions_schema = TransactionSchema(many=True)