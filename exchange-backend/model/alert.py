from extensions import db, ma
import datetime
from marshmallow import fields

class Alert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    usd_to_lbp = db.Column(db.Boolean, nullable=False)
    threshold = db.Column(db.Float, nullable=False)
    direction = db.Column(db.String(5), nullable=False)  # above or below threshold
    creation_date = db.Column(db.DateTime)

    def __init__(self, user_id, usd_to_lbp, threshold, direction):
        super(Alert, self).__init__(
            user_id=user_id,
            usd_to_lbp=usd_to_lbp,
            threshold=threshold,
            direction=direction,
            creation_date=datetime.datetime.now(),
        )

class AlertSchema(ma.Schema):
    id=fields.Int()
    user_id=fields.Int()
    usd_to_lbp=fields.Bool()
    threshold = fields.Float()
    direction = fields.Str()
    creation_date = fields.DateTime()

alert_schema=AlertSchema()
alerts_schema=AlertSchema(many=True)