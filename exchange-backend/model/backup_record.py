from extensions import db, ma
import datetime
from marshmallow import fields

class BackupRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    triggered_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timestamp = db.Column(db.DateTime)
    status = db.Column(db.String(10), nullable=False)  #succeeeded  or failed
    record_counts = db.Column(db.String(255), nullable=False)  # JSON string of counts

    def __init__(self, triggered_by, status, record_counts):
        super(BackupRecord, self).__init__(
            triggered_by=triggered_by,
            timestamp=datetime.datetime.now(),
            status=status,
            record_counts=record_counts
        )

class BackupRecordSchema(ma.Schema):
    id = fields.Int()
    triggered_by = fields.Int()
    timestamp = fields.DateTime()
    status = fields.Str()
    record_counts = fields.Str()

backup_record_schema = BackupRecordSchema()
backup_records_schema = BackupRecordSchema(many=True)