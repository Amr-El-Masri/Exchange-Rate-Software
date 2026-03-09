from extensions import db
from model.notification import Notification
from model.alert import Alert
from model.transaction import Transaction
import datetime

def check_and_notify(session):
    # recompute the current exchange rates from last 72 hours
    end_date = datetime.datetime.now()
    start_date = end_date - datetime.timedelta(hours=72)

    usd_to_lbp_txns = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date),
        Transaction.usd_to_lbp == True
    ).all()

    lbp_to_usd_txns = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date),
        Transaction.usd_to_lbp == False
    ).all()

    avg_usd_to_lbp = sum(t.lbp_amount / t.usd_amount for t in usd_to_lbp_txns) / len(usd_to_lbp_txns) if usd_to_lbp_txns else None
    avg_lbp_to_usd = sum(t.lbp_amount / t.usd_amount for t in lbp_to_usd_txns) / len(lbp_to_usd_txns) if lbp_to_usd_txns else None

    # check all the alert in the system
    all_alerts = Alert.query.all()
    for alert in all_alerts:
        current_rate = avg_usd_to_lbp if alert.usd_to_lbp else avg_lbp_to_usd
        if current_rate is None:
            continue
        is_triggered = (
            (alert.direction == 'above' and current_rate > alert.threshold) or
            (alert.direction == 'below' and current_rate < alert.threshold)
        )
        if is_triggered:
            notification = Notification(
                user_id=alert.user_id,
                title="Alert Triggered",
                message=f"Your alert #{alert.id} was triggered: rate is {round(current_rate, 2)}, threshold was {alert.direction} {alert.threshold}"
            )
            session.add(notification)
    session.commit()

def send_notification(session, user_id, title, message):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message
    )
    session.add(notification)
    session.commit()