from extensions import db, ma
import datetime
from marshmallow import fields

class WatchlistItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    label = db.Column(db.String(100), nullable=False)
    usd_to_lbp = db.Column(db.Boolean, nullable=False)
    target_rate = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime)

    def __init__(self, user_id, label, usd_to_lbp, target_rate=None):
        super(WatchlistItem, self).__init__(
            user_id=user_id,
            label=label,
            usd_to_lbp=usd_to_lbp,
            target_rate=target_rate,
            created_at=datetime.datetime.now()
        )

class WatchlistItemSchema(ma.Schema):
    id = fields.Int()
    user_id = fields.Int()
    label = fields.Str()
    usd_to_lbp = fields.Bool()
    target_rate = fields.Float(allow_none=True)
    created_at = fields.DateTime()

watchlist_item_schema = WatchlistItemSchema()
watchlist_items_schema = WatchlistItemSchema(many=True) 