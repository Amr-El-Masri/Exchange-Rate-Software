from flask import Blueprint, request, jsonify, abort
import jwt
from extensions import db
from model.watchlist import WatchlistItem, watchlist_item_schema, watchlist_items_schema
from service.auth_service import extract_auth_token, decode_token

watchlist_bp = Blueprint('watchlist', __name__)

def get_current_user():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)

#add watchlist item
@watchlist_bp.route('/watchlist', methods=['POST'])
def add_to_watchlist():
    user_id=get_current_user()
    label=request.json.get('label')
    usd_to_lbp = request.json.get('usd_to_lbp')
    target_rate = request.json.get('target_rate', None)

    if not label or usd_to_lbp is None:
        return jsonify({"error": "label and usd_to_lbp are required"}), 400
    if usd_to_lbp not in [True, False]:
        return jsonify({"error": "usd_to_lbp must be a boolean"}), 400
    if target_rate is not None and float(target_rate) <= 0:
        return jsonify({"error": "target_rate must be positive"}), 400
    
    item = WatchlistItem(
        user_id=user_id,
        label=label,
        usd_to_lbp=bool(usd_to_lbp),
        target_rate=float(target_rate) if target_rate is not None else None
    )

    db.session.add(item)
    db.session.commit()
    return jsonify(watchlist_item_schema.dump(item))

#get watchlist items
@watchlist_bp.route('/watchlist', methods=['GET'])
def get_watchlist():
    user_id=get_current_user()
    watchlist_items=WatchlistItem.query.filter_by(user_id=user_id).order_by(WatchlistItem.created_at.desc()).all()
    return jsonify (watchlist_items_schema.dump(watchlist_items))

#delet item from watchlist
@watchlist_bp.route('/watchlist/<int:item_id>', methods=['DELETE'])
def remove_from_watchlist(item_id):
    user_id = get_current_user()
    item = WatchlistItem.query.get(item_id)

    if not item:
        return jsonify({"error": "Watchlist item not found"}), 404
    if item.user_id != user_id:
        return jsonify({"error": "You can only remove your own watchlist items"}), 403

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item removed from watchlist successfully"})