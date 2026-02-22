from flask import Blueprint, request, jsonify, abort
import jwt
import datetime
from extensions import db
from model.preference import Preference, preference_schema
from service.auth_service import extract_auth_token, decode_token

preferences_bp = Blueprint('preferences', __name__)

def get_current_user():
    token = extract_auth_token(request)
    if not token:
        abort(401)
    try:
        return decode_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        abort(401)

#create preferences
@preferences_bp.route('/preferences', methods=['POST'])
def create_preferences():
    user_id=get_current_user()
    existing_prefs= Preference.query.filter_by(user_id=user_id).first()
    if existing_prefs:
        return jsonify({"error": "Preferences already exist, use PUT request to update"}), 400

    default_interval = request.json.get('default_interval', 'daily')
    default_time_range = request.json.get('default_time_range', 72)
    default_usd_to_lbp = request.json.get('default_usd_to_lbp', True)

    if default_interval not in ['hourly', 'daily']:
        return jsonify({"error": "default_interval must be 'hourly' or 'daily'"}), 400
    if not isinstance(default_time_range, int) or default_time_range <= 0:
        return jsonify({"error": "default_time_range must be a positive integer (hours)"}), 400
    if default_usd_to_lbp not in [True, False]:
        return jsonify({"error": "default_usd_to_lbp must be a boolean"}), 400
    
    preferences = Preference(
        user_id=user_id,
        default_interval=default_interval,
        default_time_range=default_time_range,
        default_usd_to_lbp=bool(default_usd_to_lbp)
    )

    db.session.add(preferences)
    db.session.commit()
    return jsonify(preference_schema.dump(preferences))

#view ur prefs
@preferences_bp.route('/preferences', methods=['GET'])
def get_preferences():
    user_id = get_current_user()

    preference = Preference.query.filter_by(user_id=user_id).first()
    if not preference:
        return jsonify({"message": "No preferences set, defaults are: interval=daily, time_range=72h, usd_to_lbp=true"}), 200

    return jsonify(preference_schema.dump(preference))

#update prefs
@preferences_bp.route('/preferences', methods=['PUT'])
def update_preferences():
    user_id = get_current_user()

    preference = Preference.query.filter_by(user_id=user_id).first()
    if not preference:
        return jsonify({"error": "No preferences found, use POST to create them first"}), 404

    #just update the sent fieds, no need to change id and stuff
    default_interval = request.json.get('default_interval')
    default_time_range = request.json.get('default_time_range')
    default_usd_to_lbp = request.json.get('default_usd_to_lbp')

    if default_interval is not None:
        if default_interval not in ['hourly', 'daily']:
            return jsonify({"error": "default_interval must be 'hourly' or 'daily'"}), 400
        preference.default_interval = default_interval

    if default_time_range is not None:
        if not isinstance(default_time_range, int) or default_time_range <= 0:
            return jsonify({"error": "default_time_range must be a positive integer (hours)"}), 400
        preference.default_time_range = default_time_range

    if default_usd_to_lbp is not None:
        if default_usd_to_lbp not in [True, False]:
            return jsonify({"error": "default_usd_to_lbp must be a boolean"}), 400
        preference.default_usd_to_lbp = bool(default_usd_to_lbp)

    preference.updated_at = datetime.datetime.now()
    db.session.commit()
    return jsonify(preference_schema.dump(preference))

#delete prefs (restore them back to defaults)
@preferences_bp.route('/preferences', methods=['DELETE'])
def reset_preferences():
    user_id = get_current_user()

    preference = Preference.query.filter_by(user_id=user_id).first()
    if not preference:
        return jsonify({"error": "No preferences found, they are still default"}), 404

    db.session.delete(preference)
    db.session.commit()
    return jsonify({"message": "Preferences reset to defaults successfully"})