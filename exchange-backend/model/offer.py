from extensions import db, ma
import datetime
from marshmallow import fields

class Offer(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    user_id=db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    usd_amount = db.Column(db.Float, nullable=False)
    lbp_amount = db.Column(db.Float, nullable=False)
    usd_to_lbp = db.Column(db.Boolean, nullable=False)
    status=db.Column(db.String(10), nullable=False, default='available')
    creation_date=db.Column(db.DateTime)
    accepted_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    accepted_at = db.Column(db.DateTime, nullable=True)

    def __init__(self, user_id, usd_amount, lbp_amount, usd_to_lbp):
        super(Offer, self).__init__(
            user_id=user_id,
            usd_amount=usd_amount,
            lbp_amount=lbp_amount,
            usd_to_lbp=usd_to_lbp,
            status='available',
            creation_date=datetime.datetime.now(),
            accepted_by=None,
            accepted_at=None
        )

class OfferSchema(ma.Schema):
    id = fields.Int()
    user_id = fields.Int()
    usd_amount = fields.Float()
    lbp_amount = fields.Float()
    usd_to_lbp = fields.Bool()
    status = fields.Str()
    creation_date = fields.DateTime()
    accepted_by = fields.Int(allow_none=True)
    accepted_at = fields.DateTime(allow_none=True)

offer_schema= OfferSchema()
offers_schema= OfferSchema(many=True)
