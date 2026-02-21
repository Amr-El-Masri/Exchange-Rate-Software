from flask import Blueprint, request, jsonify
import datetime
from model.transaction import Transaction

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
        return jsonify({"error": "Invalid date format. Use: MM/DD/YYYY"}), 400 ##khaliya hk awjust m d y

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
