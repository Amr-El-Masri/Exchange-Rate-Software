from extensions import db, ma
import datetime
from marshmallow import fields

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    event_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime)

    def __init__(self, event_type, description, user_id=None, ip_address=None):
        super(AuditLog, self).__init__(
            event_type=event_type,
            description=description,
            user_id=user_id,
            timestamp=datetime.datetime.now()
        )

class AuditLogSchema(ma.Schema):
    id = fields.Int()
    user_id = fields.Int(allow_none=True)
    event_type = fields.Str()
    description = fields.Str()
    timestamp = fields.DateTime()

audit_log_schema = AuditLogSchema()
audit_logs_schema = AuditLogSchema(many=True)