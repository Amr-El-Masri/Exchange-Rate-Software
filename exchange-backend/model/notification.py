from extensions import db, ma
import datetime
from marshmallow import fields

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime)

    def __init__(self, user_id, title, message):
        super(Notification, self).__init__(
            user_id=user_id,
            title=title,
            message=message,
            is_read=False,
            created_at=datetime.datetime.now()
        )

class NotificationSchema(ma.Schema):
    id = fields.Int()
    user_id = fields.Int()
    title = fields.Str()
    message = fields.Str()
    is_read = fields.Bool()
    created_at = fields.DateTime()

notification_schema = NotificationSchema()
notifications_schema = NotificationSchema(many=True)