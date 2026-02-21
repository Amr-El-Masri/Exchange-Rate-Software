from flask import Blueprint, request, jsonify, abort
import jwt
import datetime
from extensions import db, limiter
from model.offer import Offer, offer_schema, offers_schema
from service.auth_service import extract_auth_token, decode_token

marketplace_bp=Blueprint('marketplace', __name__)

def get_current_user():
    token=extract_auth_token(request)
    if not token:
        abort(401)
    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort (401)

#create a new offer
@marketplace_bp.route('/market/offers', methods=['POST'])
def create_offer():
    user_id = get_current_user()
    usd_amount = request.json.get('usd_amount')
    lbp_amount = request.json.get('lbp_amount')
    usd_to_lbp = request.json.get('usd_to_lbp')

    if usd_amount is None or lbp_amount is None or usd_to_lbp is None:
        return jsonify({"error": "usd_amount, lbp_amount, and usd_to_lbp are required"}), 400
    if float(usd_amount) <= 0 or float(lbp_amount) <= 0:
        return jsonify({"error": "Amounts must be positive"}), 400
    if usd_to_lbp not in [True, False]:
        return jsonify({"error": "usd_to_lbp must be a boolean"}), 400
    
    offer = Offer(
        user_id=user_id, 
        usd_amount=float(usd_amount),
        lbp_amount=float(lbp_amount),
        usd_to_lbp=bool(usd_to_lbp)
    )
    db.session.add(offer)
    db.session.commit()
    return jsonify(offer_schema.dump(offer))

#view/browse available offers 
@marketplace_bp.route('/market/offers', methods=['GET'])
def get_available_offers():
    #can filter by transac direction by addin this:
    # usd_to_lbp_str = request.args.get('usd_to_lbp')
    
    # query = Offer.query.filter_by(status='available')
    # if usd_to_lbp_str is not None:
    #     usd_to_lbp = usd_to_lbp_str.lower() == 'true'
    #     query = query.filter_by(usd_to_lbp=usd_to_lbp)

    available_offers=Offer.query.filter_by(status='available').order_by(Offer.creation_date.desc()).all()
    return jsonify(offers_schema.dump(available_offers))

#accept offer      
@marketplace_bp.route('/market/offers/<int:offer_id>/accept', methods=['POST'])
@limiter.limit("10 per minute")
def accept_offer(offer_id):
    user_id = get_current_user()
    offer = Offer.query.get(offer_id)

    if not offer:
        return jsonify({"error": "Offer not found"}), 404
    if offer.status != 'available':
        return jsonify({"error": "Offer is no longer available"}), 400
    if offer.user_id == user_id:
        return jsonify({"error": "You can't accept your own offer"}), 400

    offer.status = 'accepted'
    offer.accepted_by = user_id
    offer.accepted_at = datetime.datetime.now()
    db.session.commit()
    return jsonify(offer_schema.dump(offer))

#cancel/delete offer
@marketplace_bp.route('/market/offers/<int:offer_id>', methods=['DELETE'])
def cancel_offer(offer_id):
    user_id = get_current_user()
    offer = Offer.query.get(offer_id)

    if not offer:
        return jsonify({"error": "Offer not found"}), 404
    if offer.user_id != user_id:
        return jsonify({"error": "You can only cancel your own offers"}), 403
    if offer.status != 'available':
        return jsonify({"error": "Only available offers can be canceled"}), 400

    offer.status = 'canceled'
    db.session.commit()
    return jsonify({"message": "Offer canceled successfully", "offer": offer_schema.dump(offer)})

#view personal trade history
@marketplace_bp.route('/market/trades', methods=['GET'])
def get_my_trades():
    user_id=get_current_user()
    trades= Offer.query.filter(
        Offer.status=='accepted',
        db.or_(Offer.user_id == user_id, Offer.accepted_by == user_id)
    ).order_by(Offer.accepted_at.desc()).all()
    return jsonify(offers_schema.dump(trades))
