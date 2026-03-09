from flask import Blueprint, request, jsonify, abort, make_response
import jwt
import json
import datetime
from extensions import db
from model.user import User, users_schema
from model.transaction import Transaction, transactions_schema
from model.offer import Offer, offers_schema
from model.alert import Alert, alerts_schema
from model.preference import Preference, preference_schema
from model.watchlist import WatchlistItem, watchlist_items_schema
from model.notification import Notification, notifications_schema
from model.backup_record import BackupRecord, backup_record_schema, backup_records_schema
from service.auth_service import extract_auth_token, decode_token

backup_bp = Blueprint('backup', __name__)

def require_admin():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        user_id = decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)
    user = User.query.get(user_id)
    if not user or user.role != 'ADMIN':
        abort(403)
    return user_id

#trigger a manual backup (as an admin)
@backup_bp.route('/admin/backup', methods=['POST'])
def create_backup():
    admin_id = require_admin()

    try:
        # collect all data
        users = User.query.all()
        transactions = Transaction.query.all()
        offers = Offer.query.all()
        alerts = Alert.query.all()
        preferences = Preference.query.all()
        watchlist_items = WatchlistItem.query.all()
        notifications = Notification.query.all()

        backup_data = {
            "backup_timestamp": datetime.datetime.now().isoformat(),
            "users": users_schema.dump(users),
            "transactions": transactions_schema.dump(transactions),
            "offers": offers_schema.dump(offers),
            "alerts": alerts_schema.dump(alerts),
            "preferences": [preference_schema.dump(p) for p in preferences],
            "watchlist_items": watchlist_items_schema.dump(watchlist_items),
            "notifications": notifications_schema.dump(notifications)
        }

        #record the counts for status tracking
        counts = {
            "users": len(users),
            "transactions": len(transactions),
            "offers": len(offers),
            "alerts": len(alerts),
            "preferences": len(preferences),
            "watchlist_items": len(watchlist_items),
            "notifications": len(notifications)
        }

        #save backup record to db
        record = BackupRecord(
            triggered_by=admin_id,
            status='success',
            record_counts=json.dumps(counts)
        )
        db.session.add(record)
        db.session.commit()

        #return as downloadable json file
        response = make_response(json.dumps(backup_data, indent=2, default=str))
        response.headers['Content-Type'] = 'application/json'
        response.headers['Content-Disposition'] = f'attachment; filename=backup_{datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        return response

    except Exception as e:
        #record failed backup attempt
        record = BackupRecord(
            triggered_by=admin_id,
            status='failed',
            record_counts=json.dumps({})
        )
        db.session.add(record)
        db.session.commit()
        return jsonify({"error": f"Backup failed: {str(e)}"}), 500
    
#restore data from  json backup
@backup_bp.route('/admin/restore', methods=['POST'])
def restore_backup():
    require_admin()

    backup_data = request.json
    if not backup_data:
        return jsonify({"error": "No backup data provided"}), 400

    try:
        #restore users
        for u in backup_data.get('users', []):
            existing = User.query.get(u['id'])
            if not existing:
                user = User.__new__(User)
                user.id = u['id']
                user.user_name = u['user_name']
                user.hashed_password = ''
                user.role = u.get('role', 'USER')
                user.status = u.get('status', 'active')
                db.session.add(user)

        #restore transactions
        for t in backup_data.get('transactions', []):
            existing = Transaction.query.get(t['id'])
            if not existing:
                txn = Transaction.__new__(Transaction)
                txn.id = t['id']
                txn.usd_amount = t['usd_amount']
                txn.lbp_amount = t['lbp_amount']
                txn.usd_to_lbp = t['usd_to_lbp']
                txn.user_id = t.get('user_id')
                txn.added_date = datetime.datetime.fromisoformat(t['added_date']) if t.get('added_date') else datetime.datetime.now()
                txn.source = t.get('source', 'internal')
                txn.is_outlier = t.get('is_outlier', False)
                db.session.add(txn)

        #restore offers
        for o in backup_data.get('offers', []):
            existing = Offer.query.get(o['id'])
            if not existing:
                offer = Offer.__new__(Offer)
                offer.id = o['id']
                offer.user_id = o['user_id']
                offer.usd_amount = o['usd_amount']
                offer.lbp_amount = o['lbp_amount']
                offer.usd_to_lbp = o['usd_to_lbp']
                offer.status = o.get('status', 'open')
                offer.created_at = datetime.datetime.fromisoformat(o['created_at']) if o.get('created_at') else datetime.datetime.now()
                offer.accepted_by = o.get('accepted_by')
                offer.accepted_at = datetime.datetime.fromisoformat(o['accepted_at']) if o.get('accepted_at') else None
                db.session.add(offer)

        #restore alerts
        for a in backup_data.get('alerts', []):
            existing = Alert.query.get(a['id'])
            if not existing:
                alert = Alert.__new__(Alert)
                alert.id = a['id']
                alert.user_id = a['user_id']
                alert.usd_to_lbp = a['usd_to_lbp']
                alert.threshold = a['threshold']
                alert.direction = a['direction']
                alert.creation_date = datetime.datetime.fromisoformat(a['creation_date']) if a.get('creation_date') else datetime.datetime.now()
                db.session.add(alert)

        #restore preferences
        for p in backup_data.get('preferences', []):
            existing = Preference.query.get(p['id'])
            if not existing:
                pref = Preference.__new__(Preference)
                pref.id = p['id']
                pref.user_id = p['user_id']
                pref.default_interval = p.get('default_interval', 'daily')
                pref.default_time_range = p.get('default_time_range', 72)
                pref.default_usd_to_lbp = p.get('default_usd_to_lbp', True)
                pref.updated_at = datetime.datetime.fromisoformat(p['updated_at']) if p.get('updated_at') else datetime.datetime.now()
                db.session.add(pref)

        db.session.commit()
        return jsonify({
            "message": "Backup restored successfully",
            "restored_at": datetime.datetime.now().isoformat()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Restore failed: {str(e)}"}), 500
    
#check backup history and status
@backup_bp.route('/admin/backup/status', methods=['GET'])
def get_backup_status():
    require_admin()

    records = BackupRecord.query.order_by(BackupRecord.timestamp.desc()).all()

    if not records:
        return jsonify({"message": "No backups have been performed yet"}), 200

    last_backup = records[0]

    return jsonify({
        "last_backup": {
            "timestamp": last_backup.timestamp.isoformat(),
            "status": last_backup.status,
            "triggered_by": last_backup.triggered_by,
            "record_counts": json.loads(last_backup.record_counts)
        },
        "total_backups": len(records),
        "backup_history": backup_records_schema.dump(records)
    })