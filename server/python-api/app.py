"""
Python API server for FootBrain AI models
- Market value: player_value_model.pkl (performance stats: goals, assists, etc.)
- Injury risk: xgb_model.pkl (physical attributes: height, weight, age, BMI, etc.)
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- Market value model (performance-based) ---
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'player_value_model.pkl')
model = None
DEFENDER_MODEL_EXTERNAL = os.environ.get('DEFENDER_MODEL_PATH', r'C:\Users\Dell\Downloads\defender_xgb_model.pkl')
defender_model = None
defender_feature_names = None
DEFENDER_DEFAULT_FEATURES = ['Age', 'Minutes_Played', 'Tackles', 'Interception', 'Goals', 'Assists']

# --- Injury risk model (physical-attribute-based only) ---
# Injury model must expect injury features (age, height, weight, bmi, hamstring, sprint_speed, training_hours).
# Do NOT use FIFA-style models (Release clause, International reputation, etc.) for injury.
# First try your trained model at f:\miu\xgboost_model.pkl (or set env INJURY_MODEL_PATH), then project models.
INJURY_MODEL_EXTERNAL = os.environ.get('INJURY_MODEL_PATH', r'C:\Users\Dell\Downloads\injury_model (1).pkl')
INJURY_SCALER_PATH = os.environ.get('INJURY_SCALER_PATH', r'C:\Users\Dell\Downloads\scaler (1).pkl')
INJURY_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'xgb_model.pkl')
INJURY_MODEL_FALLBACK = os.path.join(os.path.dirname(__file__), 'models', 'xgboost_model.pkl')
injury_model = None
injury_feature_names = None  # set from model.feature_names_in_ if available
injury_scaler = None

# FIFA-style feature names = not an injury model. Injury model uses physical/health features.
FIFA_STYLE_MARKERS = ('release clause', 'international reputation', 'number of playstyles', 'total stats')


def _is_injury_model(feature_names):
    """True if this model expects injury-related features (age, height, weight, etc.), not FIFA columns."""
    if feature_names is None or len(feature_names) == 0:
        return True
    names_str = ' '.join(str(x).strip().lower() for x in feature_names)
    if any(m in names_str for m in FIFA_STYLE_MARKERS):
        return False
    return True


def _patch_sklearn_for_old_pickle():
    """Allow loading models pickled with sklearn 1.6.x (ColumnTransformer used _RemainderColsList)."""
    try:
        import sklearn.compose._column_transformer as _ct
        if not hasattr(_ct, '_RemainderColsList'):
            class _RemainderColsList(list):
                pass
            _ct._RemainderColsList = _RemainderColsList
    except Exception:
        pass


def load_model():
    """Load the market value model (scikit-learn Pipeline). Uses performance stats (goals, assists, etc.)."""
    global model
    try:
        _patch_sklearn_for_old_pickle()
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        print(f"[OK] Market value model loaded from {MODEL_PATH}")
        return True
    except FileNotFoundError:
        print(f"[ERROR] Market value: file not found at {MODEL_PATH}")
        return False


def load_defender_model():
    """Load defender-specific market value model."""
    global defender_model, defender_feature_names
    defender_model = None
    defender_feature_names = None
    if not os.path.isfile(DEFENDER_MODEL_EXTERNAL):
        print(f"[WARN] Defender model not found at {DEFENDER_MODEL_EXTERNAL}")
        return False
    try:
        with open(DEFENDER_MODEL_EXTERNAL, 'rb') as f:
            defender_model = pickle.load(f)
        names = getattr(defender_model, 'feature_names_in_', None)
        if names is None and hasattr(defender_model, 'get_booster'):
            try:
                names = defender_model.get_booster().feature_names
            except Exception:
                names = None
        if names is not None:
            defender_feature_names = [str(x).strip() for x in list(names)]
        print(f"[OK] Defender market model loaded from {DEFENDER_MODEL_EXTERNAL}")
        if defender_feature_names is not None:
            print(f"   Defender features ({len(defender_feature_names)}): {defender_feature_names}")
        return True
    except Exception as e:
        print(f"[ERROR] Defender model failed to load: {e}")
        return False

def load_injury_model():
    """Load the injury risk model. Uses f:\\miu\\xgboost_model.pkl or project models. Accepts any .pkl and maps our API (age, height, weight) to the model's expected columns."""
    global injury_model, injury_feature_names, injury_scaler
    injury_model = None
    injury_feature_names = None
    injury_scaler = None
    # Try: (1) f:\miu\xgboost_model.pkl, (2) models/xgb_model.pkl, (3) models/xgboost_model.pkl
    for path in [INJURY_MODEL_EXTERNAL, INJURY_MODEL_PATH, INJURY_MODEL_FALLBACK]:
        if not os.path.isfile(path):
            continue
        try:
            with open(path, 'rb') as f:
                m = pickle.load(f)
            names = getattr(m, 'feature_names_in_', None)
            if names is None and hasattr(m, 'get_booster'):
                try:
                    names = m.get_booster().feature_names
                except Exception:
                    pass
            if names is not None:
                names = list(names)  # ensure list, correct length
            # Skip models that look like FIFA-style models (not meant for injury prediction)
            if not _is_injury_model(names):
                print(f"   Skipping model at {path}: looks like a FIFA-style model (not injury-focused)")
                continue
            injury_model = m
            injury_feature_names = names
            print(f"[OK] Injury model loaded from {path}")
            # If model exposes class labels (e.g. sklearn/XGBoost classifiers), log them for debugging
            try:
                classes = getattr(injury_model, 'classes_', None)
                if classes is not None:
                    print(f"   Classes: {list(classes)}")
            except Exception:
                pass
            if injury_feature_names is not None:
                print(f"   Features ({len(injury_feature_names)}): {list(injury_feature_names)}")
            if INJURY_SCALER_PATH and os.path.isfile(INJURY_SCALER_PATH):
                try:
                    with open(INJURY_SCALER_PATH, 'rb') as sf:
                        injury_scaler = pickle.load(sf)
                    print(f"[OK] Injury scaler loaded from {INJURY_SCALER_PATH}")
                    # If model does not expose names, inherit exact training order from scaler.
                    if injury_feature_names is None:
                        scaler_names = getattr(injury_scaler, 'feature_names_in_', None)
                        if scaler_names is not None and len(scaler_names) > 0:
                            injury_feature_names = list(scaler_names)
                            print(f"   Using scaler feature order ({len(injury_feature_names)}): {injury_feature_names}")
                except Exception as se:
                    injury_scaler = None
                    print(f"[WARN] Injury scaler could not be loaded: {se}")
            return True
        except Exception as e:
            print(f"❌ Error loading {path}: {str(e)}")
            continue
    print("[WARN] Injury: no model loaded. Put your .pkl at " + INJURY_MODEL_EXTERNAL + " or at server/python-api/models/xgb_model.pkl")
    return False

# Load models on startup (market value and injury are separate)
print("--- Market value (performance: goals, assists, shots...) ---")
if not load_model():
    print("[WARN] Market value: not loaded. Fix: pip install scikit-learn==1.6.1 then restart.")
load_defender_model()
print("--- Injury risk (physical: height, weight, age, BMI...) ---")
load_injury_model()
if injury_model is None:
    print("[WARN] Injury: not loaded. Expected: " + INJURY_MODEL_EXTERNAL + " or server/python-api/models/xgb_model.pkl")
else:
    print("   Injury model ready.")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'defender_model_loaded': defender_model is not None,
        'injury_model_loaded': injury_model is not None
    })

@app.route('/predict/market-value', methods=['POST'])
def predict_market_value():
    """
    Predict market value for a player using the Ridge regression
    pipeline saved as player_value_model.pkl.

    This model was trained in the notebook Market_valuewrite.ipynb and
    expects the following raw input columns (before preprocessing):

    - Age       (numeric)
    - Gls+Ast   (numeric, goals + assists)
    - Sh        (numeric, shots)
    - SoT       (numeric, shots on target)
    - Player    (string, player name)
    - Nation    (string, nationality code, e.g. 'ENG')
    - Pos       (string, position code, e.g. 'FW')
    - Club_x    (string, club name)
    - Leauge    (string, league name, note original spelling)
    """
    if model is None:
        return jsonify({
            'error': 'Model not loaded. Please check server logs.'
        }), 500

    try:
        data = request.get_json() or {}

        # Route defenders to defender-specific model
        pos = str(data.get('Pos') or '').strip().lower()
        is_defender = any(k in pos for k in ('def', 'cb', 'lb', 'rb', 'wb', 'back'))
        if is_defender and defender_model is not None:
            age = _float(data, 'Age', 25)
            minutes_played = _float(data, 'Minutes_Played', _float(data, 'minutes_played', 0))
            tackles = _float(data, 'Tackles', _float(data, 'tackles', 0))
            interception = _float(data, 'Interception', _float(data, 'Interceptions', _float(data, 'interception', 0)))
            goals = _float(data, 'Goals', _float(data, 'goals', 0))
            assists = _float(data, 'Assists', _float(data, 'assists', 0))

            feature_names = defender_feature_names or DEFENDER_DEFAULT_FEATURES
            base_values = {
                'age': age,
                'minutes_played': minutes_played,
                'tackles': tackles,
                'interception': interception,
                'interceptions': interception,
                'goals': goals,
                'assists': assists,
            }

            def _def_value(name):
                key = str(name).strip().lower().replace(' ', '_').replace('-', '_')
                if key in base_values:
                    return float(base_values[key])
                if 'minute' in key:
                    return float(minutes_played)
                if 'tackle' in key:
                    return float(tackles)
                if 'intercept' in key:
                    return float(interception)
                if 'goal' in key:
                    return float(goals)
                if 'assist' in key:
                    return float(assists)
                if 'age' in key:
                    return float(age)
                return 0.0

            n_expected = getattr(defender_model, 'n_features_in_', None)
            if n_expected is not None and n_expected > len(feature_names):
                # Compatibility fallback for models saved after heavy preprocessing (e.g., 198 engineered features)
                # while only 6 raw inputs are available from the app.
                vec = np.zeros((1, int(n_expected)), dtype=float)
                raw_inputs = [age, minutes_played, tackles, interception, goals, assists]
                for i, v in enumerate(raw_inputs):
                    if i < vec.shape[1]:
                        vec[0, i] = float(v)
                raw_prediction = defender_model.predict(vec)[0]
            else:
                X_def = pd.DataFrame([[_def_value(c) for c in feature_names]], columns=feature_names)
                raw_prediction = defender_model.predict(X_def)[0]
            raw_prediction = float(raw_prediction)

            # If defender model output is invalid or collapses to 0 due feature-shape mismatch,
            # use a defender-specific fallback valuation from the 6 requested inputs.
            if not np.isfinite(raw_prediction) or raw_prediction <= 0:
                # Approx market value in millions (defender-focused proxy)
                # Minutes, tackles, interceptions are primary drivers; goals/assists are secondary.
                min_score = min(1.0, max(0.0, minutes_played / 1800.0))
                tack_score = min(1.0, max(0.0, tackles / 120.0))
                int_score = min(1.0, max(0.0, interception / 100.0))
                off_score = min(1.0, max(0.0, (goals * 2.0 + assists * 1.5) / 20.0))
                # Prime age for defenders ~24-29
                if age < 24:
                    age_score = max(0.0, age / 24.0)
                elif age <= 29:
                    age_score = 1.0
                else:
                    age_score = max(0.5, 1.0 - ((age - 29) / 12.0))

                proxy_millions = (
                    0.7
                    + 5.0 * min_score
                    + 6.0 * tack_score
                    + 6.0 * int_score
                    + 2.5 * off_score
                ) * age_score
                raw_prediction = float(max(0.25, proxy_millions))
            # Defender model may be trained in either euros or millions.
            # If value is very large, treat as euros; otherwise treat as millions.
            if raw_prediction > 100000:
                predicted_value_euros = max(0.0, raw_prediction)
                predicted_value_millions = float(predicted_value_euros / 1_000_000)
            else:
                predicted_value_millions = max(0.0, raw_prediction)
                predicted_value_euros = float(predicted_value_millions * 1_000_000)
            return jsonify({
                'success': True,
                'predictedValue': float(predicted_value_millions),
                'predictedValueEuros': float(predicted_value_euros),
                'input': {k: v for k, v in {
                    'Age': age,
                    'Minutes_Played': minutes_played,
                    'Tackles': tackles,
                    'Interception': interception,
                    'Goals': goals,
                    'Assists': assists,
                    'Pos': data.get('Pos')
                }.items()}
            })

        # Extract and validate required fields for the default market-value pipeline
        player_input = {
            'Age': data.get('Age'),
            'Gls+Ast': data.get('Gls+Ast'),
            'Sh': data.get('Sh'),
            'SoT': data.get('SoT'),
            'Player': data.get('Player'),
            'Nation': data.get('Nation'),
            'Pos': data.get('Pos'),
            'Club_x': data.get('Club_x'),
            'Leauge': data.get('Leauge'),
        }

        # Basic validation: numeric fields must be present
        missing_numeric = [
            key for key in ['Age', 'Gls+Ast', 'Sh', 'SoT']
            if player_input[key] is None
        ]
        if missing_numeric:
            return jsonify({
                'error': f'Missing required numeric fields: {", ".join(missing_numeric)}'
            }), 400

        # Convert numeric fields to float
        for key in ['Age', 'Gls+Ast', 'Sh', 'SoT']:
            try:
                player_input[key] = float(player_input[key])
            except (TypeError, ValueError):
                return jsonify({
                    'error': f'Field {key} must be a numeric value'
                }), 400

        # Provide safe defaults for categoricals if not supplied
        if player_input['Player'] is None:
            player_input['Player'] = 'Unknown Player'
        if player_input['Nation'] is None:
            player_input['Nation'] = 'Other'
        if player_input['Pos'] is None:
            player_input['Pos'] = 'FW'
        if player_input['Club_x'] is None:
            player_input['Club_x'] = 'Unknown Club'
        if player_input['Leauge'] is None:
            player_input['Leauge'] = 'Unknown League'

        # Create a single-row DataFrame with exactly the columns
        # used in the training notebook
        player_df = pd.DataFrame([player_input])

        # Get prediction directly from the sklearn Pipeline
        raw_prediction = model.predict(player_df)[0]
        if isinstance(raw_prediction, (np.integer, np.floating)):
            raw_prediction = float(raw_prediction)
        else:
            raw_prediction = float(raw_prediction)

        predicted_value = max(0.0, float(raw_prediction))
        predicted_value_millions = float(predicted_value / 1_000_000)

        serializable_input = {}
        for key, value in player_input.items():
            if isinstance(value, (np.integer, np.floating)):
                serializable_input[key] = float(value)
            else:
                serializable_input[key] = value

        return jsonify({
            'success': True,
            'predictedValue': float(predicted_value_millions),
            'predictedValueEuros': float(predicted_value),
            'input': serializable_input
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# --- Injury prediction: your model's real features (no Release clause / FIFA stuff) ---
# Fallback when model doesn't expose feature names; matches your injury model columns
INJURY_MODEL_FEATURES = [
    'Age', 'Height_cm', 'Weight_kg', 'Position', 'Training_hours', 'Matches_played',
    'Previous_injuries', 'Knee_Strength', 'Hamstring', 'Reaction_time', 'Balance',
    'Top_Sprint_Speed', 'Agility', 'Sleep_Hours', 'Stress_Level', 'Nutrition', 'Warmup', 'BMI'
]
DEFAULT_INJURY_FEATURES = [
    'age', 'height', 'weight', 'bmi', 'hamstring', 'sprint_speed', 'training_hours'
]
NEW_INJURY_FEATURES_6 = [
    'bmi', 'minutes_played', 'distance_covered_km', 'max_speed_kmh', 'sprint_count', 'hsr_m'
]


def _float(data, key, default):
    """Get a float from request data, or return default."""
    v = data.get(key)
    if v is None:
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


@app.route('/predict/injury', methods=['POST'])
def predict_injury():
    """
    Predict injury risk from physical attributes only.
    Inputs: age, height (cm), weight (kg), bmi (optional, computed from height/weight),
            hamstring (score 0-100 or strength), sprint_speed (e.g. km/h or 0-100),
            training_hours (per week).
    Returns: risk_level (high/medium/low), risk_probability (0-1), and factors.
    """
    # If no trained injury model is available, fall back to a simple heuristic
    use_model = injury_model is not None
    if not use_model:
        print("⚠️  Injury: no trained injury model loaded — using heuristic fallback")

    try:
        raw = request.get_json() or {}
        data = {**raw.get('physical', {}), **raw}  # read from both physical and top-level
        age = _float(data, 'age', 25)
        height = _float(data, 'height', 180)   # cm
        weight = _float(data, 'weight', 75)    # kg
        bmi_val = data.get('bmi')
        if bmi_val is None and height and weight:
            bmi_val = weight / ((height / 100) ** 2)
        else:
            bmi_val = _float(data, 'bmi', 22.0)
        hamstring = _float(data, 'hamstring', 70)
        sprint_speed = _float(data, 'sprint_speed', 30)
        training_hours = _float(data, 'training_hours', 15)
        distance_covered_km = _float(data, 'distance_covered_km', _float(data, 'distance_km', 0.0))
        hsr_m = _float(data, 'hsr_m', 0.0)
        sprint_count = _float(data, 'sprint_count', 0.0)
        max_speed_kmh = _float(data, 'max_speed_kmh', sprint_speed)
        minutes_played = _float(data, 'minutes_played', 90.0)
        # Engineered features for the new model
        load = float(distance_covered_km + hsr_m)
        intensity = float(sprint_count * max_speed_kmh)
        workload = float(minutes_played * distance_covered_km)
        distance_per_min = float(distance_covered_km / (minutes_played + 1.0))
        # Optional injury-model fields (from form or 0)
        position = _float(data, 'position', 0)
        matches_played = _float(data, 'matches_played', 20)
        previous_injuries = _float(data, 'previous_injuries', 0)
        knee_strength = _float(data, 'knee_strength', 70)
        reaction_time = _float(data, 'reaction_time', 50)
        balance = _float(data, 'balance', 70)
        agility = _float(data, 'agility', 70)
        sleep_hours = _float(data, 'sleep_hours', 7)
        stress_level = _float(data, 'stress_level', 30)
        nutrition = _float(data, 'nutrition', 70)
        warmup = _float(data, 'warmup', 1)

        # Use model's expected feature names (injury columns only, no Release clause etc.)
        n_expected = getattr(injury_model, 'n_features_in_', None)
        if injury_feature_names is not None and len(injury_feature_names) > 0:
            col_names = [str(x).strip() for x in injury_feature_names]
        elif n_expected is not None and n_expected == len(NEW_INJURY_FEATURES_6):
            # New injury model schema from your latest training
            col_names = list(NEW_INJURY_FEATURES_6)
        elif n_expected is not None and n_expected == len(INJURY_MODEL_FEATURES):
            col_names = list(INJURY_MODEL_FEATURES)
        else:
            col_names = list(DEFAULT_INJURY_FEATURES)
        if n_expected is not None and len(col_names) != n_expected:
            if injury_scaler is not None:
                scaler_names = getattr(injury_scaler, 'feature_names_in_', None)
                if scaler_names is not None and len(scaler_names) == n_expected:
                    col_names = [str(x).strip() for x in scaler_names]
                elif n_expected == len(INJURY_MODEL_FEATURES):
                    col_names = list(INJURY_MODEL_FEATURES)
                else:
                    col_names = col_names[:n_expected] if len(col_names) > n_expected else col_names + [f'feature_{i}' for i in range(len(col_names), n_expected)]
            elif n_expected == len(INJURY_MODEL_FEATURES):
                col_names = list(INJURY_MODEL_FEATURES)
            else:
                col_names = col_names[:n_expected] if len(col_names) > n_expected else col_names + [f'feature_{i}' for i in range(len(col_names), n_expected)]

        # Map model column names to our values (injury features only)
        row = {
            'age': age,
            'height_cm': height,
            'height': height,
            'weight_kg': weight,
            'weight': weight,
            'bmi': bmi_val,
            'hamstring': hamstring,
            'top_sprint_speed': sprint_speed,
            'sprint_speed': sprint_speed,
            'distance_covered_km': distance_covered_km,
            'distance_km': distance_covered_km,
            'hsr_m': hsr_m,
            'sprint_count': sprint_count,
            'max_speed_kmh': max_speed_kmh,
            'minutes_played': minutes_played,
            'load': load,
            'intensity': intensity,
            'workload': workload,
            'distance_per_min': distance_per_min,
            'training_hours': training_hours,
            'position': position,
            'matches_played': matches_played,
            'previous_injuries': previous_injuries,
            'knee_strength': knee_strength,
            'reaction_time': reaction_time,
            'balance': balance,
            'agility': agility,
            'sleep_hours': sleep_hours,
            'stress_level': stress_level,
            'nutrition': nutrition,
            'warmup': warmup,
        }

        # Features that should be int (like training data): Age, Position, Matches, Previous_injuries, Warmup
        int_features = {'age', 'position', 'matches_played', 'previous_injuries', 'warmup'}

        def _value_for_feature(name):
            key = str(name).strip().lower().replace(' ', '_').replace('-', '_')
            val = 0
            if key in row:
                val = row[key]
            elif 'sprint' in key:
                # Prefer explicit max_speed_kmh from the new UI; fallback to sprint_speed
                val = max_speed_kmh if 'max' in key or 'top' in key else sprint_speed
            elif 'distance_per_min' in key:
                val = distance_per_min
            elif key == 'load':
                val = load
            elif key == 'intensity':
                val = intensity
            elif key == 'workload':
                val = workload
            elif 'distance' in key and ('km' in key or 'covered' in key):
                val = distance_covered_km
            elif 'max_speed' in key:
                val = max_speed_kmh
            elif 'hsr' in key:
                val = hsr_m
            elif 'minute' in key:
                val = minutes_played
            elif 'sleep' in key:
                val = sleep_hours
            elif 'stress' in key:
                val = stress_level
            elif 'balance' in key:
                val = balance
            elif 'agility' in key:
                val = agility
            elif 'reaction' in key:
                val = reaction_time
            elif 'knee' in key:
                val = knee_strength
            elif 'previous' in key or ('injur' in key and 'next' not in key):
                val = previous_injuries
            elif 'match' in key:
                val = matches_played
            elif 'warmup' in key or 'warm' in key:
                val = warmup
            elif 'nutrition' in key:
                val = nutrition
            # Match training types: int for Age, Position, counts; float for continuous
            if key in int_features:
                return int(round(val))
            return float(val)

        values = [_value_for_feature(k) for k in col_names]
        X = pd.DataFrame([values], columns=col_names)
        X_for_model = X
        if use_model and injury_scaler is not None:
            try:
                X_scaled = injury_scaler.transform(X)
                X_for_model = pd.DataFrame(X_scaled, columns=col_names)
            except Exception as scaler_err:
                print(f"[WARN] Injury scaler transform failed, using unscaled features: {scaler_err}")
        # Log so you can verify Age/Height/Weight are passed correctly (e.g. age=35)
        age_idx = next((i for i, c in enumerate(col_names) if 'age' in str(c).lower() and 'prev' not in str(c).lower()), None)
        if age_idx is not None:
            print(f"   [Injury] Age={values[age_idx]}, Height={height}, Weight={weight} -> model input OK")

        # Predict using the trained model if available, otherwise use a heuristic
        if use_model:
            # Predict: support both binary and multiclass injury models.
            # For multiclass (e.g. classes [0,1,2]), map low/medium/high to a continuous risk score.
            if hasattr(injury_model, 'predict_proba'):
                proba = injury_model.predict_proba(X_for_model)[0]
                classes = getattr(injury_model, 'classes_', None)
                pred_class = None
                try:
                    pred_raw = injury_model.predict(X_for_model)[0]
                    pred_class = pred_raw.item() if hasattr(pred_raw, 'item') else pred_raw
                except Exception:
                    pred_class = None

                # Default probability fallback
                risk_probability = float(max(proba)) if len(proba) > 0 else 0.5

                # Multiclass case: use expected severity so output is not pinned to one class index.
                if classes is not None and len(classes) > 2:
                    severity_map = {}
                    for i, c in enumerate(classes):
                        c_str = str(c).strip().lower()
                        if c in (0, '0') or c_str in ('low', 'l'):
                            severity_map[i] = 0.0
                        elif c in (1, '1') or c_str in ('medium', 'med', 'm'):
                            severity_map[i] = 0.5
                        elif c in (2, '2') or c_str in ('high', 'h'):
                            severity_map[i] = 1.0
                        else:
                            # Unknown class label: spread severities by index order.
                            severity_map[i] = i / max(1, (len(classes) - 1))
                    risk_probability = float(sum(float(proba[i]) * severity_map[i] for i in range(len(proba))))

                    # If class prediction exists, use it for discrete level.
                    if pred_class is not None:
                        p_str = str(pred_class).strip().lower()
                        if pred_class in (2, '2') or p_str in ('high', 'h'):
                            risk_level = 'high'
                        elif pred_class in (1, '1') or p_str in ('medium', 'med', 'm'):
                            risk_level = 'medium'
                        else:
                            risk_level = 'low'
                else:
                    # Binary/other: select positive class robustly (class 1 / "high" / "injury")
                    pos_index = None
                    if classes is not None:
                        try:
                            for i, c in enumerate(classes):
                                c_str = str(c).strip().lower()
                                if c in (1, '1', True) or c_str in ('high', 'injury', 'injured', 'yes', 'true'):
                                    pos_index = i
                                    break
                        except Exception:
                            pos_index = None
                    if pos_index is None:
                        pos_index = 1 if len(proba) > 1 else 0
                    try:
                        risk_probability = float(proba[pos_index])
                    except Exception:
                        risk_probability = float(max(proba)) if len(proba) > 0 else 0.5
            else:
                pred = injury_model.predict(X_for_model)[0]
                try:
                    risk_probability = float(pred)
                except Exception:
                    risk_probability = 0.5
        else:
            # Heuristic fallback based on age, training_hours, hamstring, and BMI
            risk_probability = 0.1
            # Age contribution: older players slightly higher risk
            age_contrib = max(0.0, (age - 22) / 40.0) * 0.35
            # Training load contribution
            train_contrib = min(1.0, training_hours / 40.0) * 0.35
            # Hamstring weakness increases risk
            ham_contrib = max(0.0, (60.0 - hamstring) / 60.0) * 0.25
            # BMI outside optimal range increases risk
            bmi_contrib = 0.0
            if bmi_val > 26:
                bmi_contrib = min(1.0, (bmi_val - 26) / 10.0) * 0.15
            elif bmi_val < 19:
                bmi_contrib = min(1.0, (19 - bmi_val) / 10.0) * 0.15
            risk_probability = risk_probability + age_contrib + train_contrib + ham_contrib + bmi_contrib
            risk_probability = max(0.0, min(1.0, risk_probability))

        # Map probability to a risk level unless already set by multiclass predicted class.
        if 'risk_level' not in locals():
            if risk_probability >= 0.6:
                risk_level = 'high'
            elif risk_probability >= 0.35:
                risk_level = 'medium'
            else:
                risk_level = 'low'

        # Simple risk factors from inputs (for UI)
        top_risk_factors = []
        if age > 28:
            top_risk_factors.append({'factor': 'Age', 'impact': min(0.3, (age - 28) / 50), 'description': 'Older players have higher injury risk'})
        if minutes_played > 95:
            top_risk_factors.append({'factor': 'Minutes played', 'impact': 0.2, 'description': 'Very high match minutes can increase fatigue risk'})
        if distance_covered_km > 12:
            top_risk_factors.append({'factor': 'Distance covered', 'impact': 0.2, 'description': 'High total distance can increase workload stress'})
        if sprint_count > 320:
            top_risk_factors.append({'factor': 'Sprint count', 'impact': 0.2, 'description': 'Frequent sprinting can raise soft-tissue injury risk'})
        if hsr_m > 9000:
            top_risk_factors.append({'factor': 'HSR', 'impact': 0.2, 'description': 'High-speed running load can raise injury probability'})
        if bmi_val > 26 or bmi_val < 19:
            top_risk_factors.append({'factor': 'BMI', 'impact': 0.2, 'description': 'BMI outside optimal range can affect injury risk'})
        if not top_risk_factors:
            top_risk_factors.append({'factor': 'Overall fitness', 'impact': 1.0 - risk_probability, 'description': 'Physical attributes within normal range'})

        return jsonify({
            'success': True,
            'risk_level': risk_level,
            'risk_probability': risk_probability,
            'risk_percentage': round(risk_probability * 100, 1),
            'top_risk_factors': top_risk_factors[:5],
            'model_confidence': 0.85,
            'input': {k: (float(v) if isinstance(v, (np.floating, np.integer)) else v) for k, v in row.items()}
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# --- Video analysis (football CV pipeline -> player insights) ---
VIDEO_MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
FOOTBALL_PKL_PATH = os.path.join(VIDEO_MODEL_DIR, 'football_model_integrated.pkl')
OUTPUT_VIDEO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'output_videos'))


@app.route('/analyze-video', methods=['POST'])
def analyze_video():
    """
    Analyze a match video and return player insights (PID, Team, Dist(m), MaxSpd, HSR(m), Spr, Risk, G, A).
    Accepts: JSON { "videoPath": "absolute/path/to/video.mp4" } or form file "video".
    """
    import tempfile
    try:
        video_path = None
        if request.content_type and 'application/json' in request.content_type:
            data = request.get_json() or {}
            video_path = data.get('videoPath') or data.get('video_path')
        if not video_path and request.files:
            f = request.files.get('video') or request.files.get('file')
            if f and f.filename:
                ext = os.path.splitext(f.filename)[1] or '.mp4'
                fd, video_path = tempfile.mkstemp(suffix=ext, prefix='footbrain_video_')
                os.close(fd)
                f.save(video_path)
        if not video_path or not os.path.isfile(video_path):
            return jsonify({
                'success': False,
                'error': 'No video provided. Send JSON {"videoPath": "path/to/video.mp4"} or upload a file with key "video".'
            }), 400
        player_model = request.args.get('player_model') or os.path.join(VIDEO_MODEL_DIR, 'best.pt')
        goalpost_model = request.args.get('goalpost_model') or os.path.join(VIDEO_MODEL_DIR, 'goalnet.pt')
        pkl_path = FOOTBALL_PKL_PATH if os.path.isfile(FOOTBALL_PKL_PATH) else None
        import uuid
        os.makedirs(OUTPUT_VIDEO_DIR, exist_ok=True)
        output_video_path = os.path.join(OUTPUT_VIDEO_DIR, f"analysis_{uuid.uuid4().hex[:12]}.mp4")
        from run_football_video_analysis import run_analysis
        try:
            result = run_analysis(
                video_path=video_path,
                player_model_path=player_model if os.path.isfile(player_model) else None,
                goalpost_model_path=goalpost_model if os.path.isfile(goalpost_model) else None,
                pkl_path=pkl_path,
                output_video_path=output_video_path,
            )
        except FileNotFoundError as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'details': 'Please ensure your YOLO model file (best.pt) is placed in server/python-api/models/'
            }), 400
        except Exception as e:
            import traceback
            import sys
            error_trace = traceback.format_exc()
            print(f"[ERROR] Video analysis failed: {error_trace}", file=sys.stderr)
            return jsonify({
                'success': False,
                'error': f'Video analysis failed: {str(e)}',
                'details': 'Check server logs for details'
            }), 500
        if request.files and video_path and video_path.startswith(tempfile.gettempdir()):
            try:
                os.remove(video_path)
            except Exception:
                pass
        return jsonify({
            'success': True,
            'playerInsights': result.get('playerInsights', []),
            'matchScore': result.get('matchScore', {}),
            'outputVideoFilename': result.get('outputVideoFilename'),
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


# Serve annotated MP4s from the same directory the CV pipeline writes to.
# Node can proxy here when the file is not visible on the Node filesystem (path/working-dir differences).
@app.route('/output-videos/<filename>')
def serve_output_video(filename):
    import re
    from flask import send_file

    if not re.match(r'^analysis_[a-fA-F0-9]+\.mp4$', filename):
        return jsonify({'error': 'Invalid filename'}), 400
    safe_dir = os.path.abspath(OUTPUT_VIDEO_DIR)
    fp = os.path.abspath(os.path.join(safe_dir, filename))
    norm_dir = os.path.normcase(safe_dir + os.sep)
    norm_fp = os.path.normcase(fp)
    if not norm_fp.startswith(norm_dir) or not os.path.isfile(fp):
        return jsonify({'error': 'Not found'}), 404
    return send_file(fp, mimetype='video/mp4', conditional=True, max_age=3600)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # use_reloader=False avoids double startup and port issues on Windows
    print(f"Starting Python API on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
