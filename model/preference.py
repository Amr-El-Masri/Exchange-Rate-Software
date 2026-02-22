from extensions import db, ma
import datetime
from marshmallow import fields

class Preference(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)#one set of preferences per user
    default_interval = db.Column(db.String(10), nullable=False, default='daily')
    default_time_range = db.Column(db.Integer, nullable=False, default=72)  #in hrs
    default_usd_to_lbp = db.Column(db.Boolean, nullable=False, default=True)
    updated_at = db.Column(db.DateTime)# gd for logging later (when the user updated his prefs)

    def __init__(self, user_id, default_interval='daily', default_time_range=72, default_usd_to_lbp=True):
        super(Preference, self).__init__(
            user_id=user_id,
            default_interval=default_interval,
            default_time_range=default_time_range,
            default_usd_to_lbp=default_usd_to_lbp,
            updated_at=datetime.datetime.now()
        )

class PreferenceSchema(ma.Schema):
    id = fields.Int()
    user_id = fields.Int()
    default_interval = fields.Str()
    default_time_range = fields.Int()
    default_usd_to_lbp = fields.Bool()
    updated_at = fields.DateTime()

preference_schema = PreferenceSchema()