from flask import Blueprint, request, jsonify
import datetime
from model.transaction import Transaction
from model.transaction import Transaction, transactions_schema

analytics_bp= Blueprint('analytics', __name__)

@analytics_bp.route('/analytics', methods=['GET'])
def get_analytics():
    start_str= request.args.get('start_date')
    end_str= request.args.get('end_date')
    usd_to_lbp= request.args.get('usd_to_lbp', 'true').lower() == 'true'

    #input validation and defaults
    try:
        if start_str and end_str:
            start_date= datetime.datetime.strptime(start_str, "%m/%d/%Y")
            end_date= datetime.datetime.strptime(end_str, "%m/%d/%Y").replace(hour=23, minute=59, second=59)#note here we add this cz otherwise it will give stats till end_date at 12 am, so the transactions on that day wouldnt be counted
        else:
            #default values in case user doesnt put a start/end date
            end_date= datetime.datetime.now()
            start_date= end_date - datetime.timedelta(hours=72)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use: MM/DD/YYYY"}), 400 

    if start_date >= end_date:
        return jsonify({"error": "start_date must be before end_date"}), 400
    
    #get the transactions between the wanted dates
    transactions = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date),
        Transaction.usd_to_lbp == usd_to_lbp
    ).all()

    if not transactions:
        return jsonify({"message": "No transactions found for the given time range", "data": None}), 200
    
    #calc rate fr each transac
    rates = []
    for txn in transactions:
        rates.append(txn.lbp_amount / txn.usd_amount)

    avg_rate = sum(rates) / len(rates)
    min_rate = min(rates)
    max_rate = max(rates)
    first_rate = rates[0]
    last_rate = rates[-1]
    percentage_change = ((last_rate - first_rate) / first_rate) * 100
    #in addition to the stats mentioned in the assignment, I calc the volatility: according to equals money: Exchange rate volatility refers to the frequency and magnitude of fluctuations in a currency pair's value over a specific period (basically how stable the exch rate is)
    volatility = (max_rate - min_rate) / avg_rate * 100

    return jsonify({
        "direction": "usd_to_lbp" if usd_to_lbp else "lbp_to_usd",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "transaction_count": len(transactions),
        "average_rate": round(avg_rate, 4),
        "min_rate": round(min_rate, 4),
        "max_rate": round(max_rate, 4),
        "percentage_change": round(percentage_change, 4),
        "volatility_percent": round(volatility, 4)
    })

@analytics_bp.route('/exchangeRateHistory', methods=['GET'])
def get_exchange_rate_history():
    start_str= request.args.get('start_date')
    end_str= request.args.get('end_date')
    usd_to_lbp= request.args.get('usd_to_lbp', 'true').lower() == 'true'
    interval= request.args.get('interval', 'daily').lower()

    if interval not in ['hourly', 'daily']:
        return jsonify({"error": "Invalid interval, use 'hourly' or 'daily'"}), 400
    
    try:
        if start_str and end_str:
            start_date= datetime.datetime.strptime(start_str, "%m/%d/%Y")
            end_date= datetime.datetime.strptime(end_str, "%m/%d/%Y").replace(hour=23, minute=59, second=59)#note here we add this cz otherwise it will give stats till end_date at 12 am, so the transactions on that day wouldnt be counted
        else:
            #default values in case user doesnt put a start/end date
            end_date= datetime.datetime.now()
            start_date= end_date - datetime.timedelta(hours=72)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use: MM/DD/YYYY"}), 400 

    if start_date >= end_date:
        return jsonify({"error": "start_date must be before end_date"}), 400
    
    transactions = Transaction.query.filter(
        Transaction.added_date.between(start_date, end_date),
        Transaction.usd_to_lbp == usd_to_lbp
    ).order_by(Transaction.added_date).all()

    if not transactions:
        return jsonify({"message": "No transactions found for the given range", "data": []}), 200
    
    def get_bucket(transac_dt, interval):
        #the below basically rounds down every transac to the start of its bucket (hour/day)
        if interval =='hourly':
            return transac_dt.replace(minute=0, second=0, microsecond=0)
        else:
            return transac_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        
    #the keys are bucket timestamps, teh values are lists of rates of that date bucket. put each transac in its correct bucket (date/time chunk)
    buckets={}
    for txn in transactions:
        bucket_key=get_bucket(txn.added_date, interval)
        if bucket_key not in buckets:
            buckets[bucket_key]=[]
        buckets[bucket_key].append(txn.lbp_amount/txn.usd_amount)

    #computing teh avg rate per bucket
    hist=[]
    for bucket_time, rates in sorted(buckets.items()):
        avg_rate=sum(rates)/len(rates)
        hist.append({
            "timestamp": bucket_time.isoformat(),
            "average_rate": round(avg_rate, 4),
            "transaction_count": len(rates)
        })

    return jsonify({
        "direction": "usd_to_lbp" if usd_to_lbp else "lbp_to_usd",
        "interval":interval,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "data": hist
    })

@analytics_bp.route('/admin/data_quality', methods=['GET'])
def get_data_quality():
    #import here to avoid circular imports
    #for example here, analytics_route.py imports from model/user.py, and
    # if model/user.py (or something it imports) in turn imports from analytics_route.py,
    from model.user import User
    import jwt
    from service.auth_service import extract_auth_token, decode_token
    from flask import abort

    #require being an admin for this endpoint
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

    #get all transactions grouped by source
    internal_count = Transaction.query.filter_by(source='internal').count()
    external_count = Transaction.query.filter_by(source='external').count()
    outlier_count = Transaction.query.filter_by(is_outlier=True).count()
    total_count = Transaction.query.count()

    #get recent outliers for review
    outliers = Transaction.query.filter_by(is_outlier=True).order_by(Transaction.added_date.desc()).all()

    return jsonify({
        "total_transactions": total_count,
        "internal_transactions": internal_count,
        "external_transactions": external_count,
        "outlier_count": outlier_count,
        "outliers": transactions_schema.dump(outliers)
    })
