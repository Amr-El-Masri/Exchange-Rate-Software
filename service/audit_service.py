from extensions import db
from model.audit_log import AuditLog

def log_event(event_type, description, user_id=None):
    log = AuditLog(
        event_type=event_type,
        description=description,
        user_id=user_id
    )
    db.session.add(log)
    db.session.commit()