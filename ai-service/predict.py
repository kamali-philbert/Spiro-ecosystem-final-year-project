import os
import pickle
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "soh_model.pkl")

def get_severity_and_recommendation(soh: float):
    """Return severity level and actionable recommendation based on SoH."""
    if soh >= 60:
        return {
            "severity": "GOOD",
            "recommendation": "Your battery is in good health. Keep charging before it drops below 20% to maintain longevity."
        }
    elif soh >= 40:
        return {
            "severity": "MODERATE",
            "recommendation": "Battery health is moderate. Avoid leaving it fully discharged overnight. Swap soon at a station."
        }
    elif soh >= 20:
        return {
            "severity": "WARNING",
            "recommendation": "Battery is degrading. You may notice reduced range. Plan a swap at the nearest station soon."
        }
    else:
        return {
            "severity": "CRITICAL",
            "recommendation": "Battery is critically degraded. A technician has been notified. Please swap immediately at the nearest station."
        }

def predict_soh(telemetry: dict):
    """
    Predict State of Health based on incoming telemetry.
    telemetry dict shape: {voltage, temperature, current, internal_resistance, soc}
    """
    if not os.path.exists(MODEL_PATH):
        simulated_soh = 100.0 - (telemetry.get("internal_resistance", 0) * 10) - (max(0, telemetry.get("temperature", 25) - 35) * 0.5)
        simulated_soh = max(0.0, min(100.0, simulated_soh))
        failure_score = 100 - simulated_soh
        flag = failure_score > 80
    else:
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        features = pd.DataFrame([telemetry])
        predicted_soh = model.predict(features)[0]
        simulated_soh = max(0.0, min(100.0, float(predicted_soh)))
        failure_score = 100.0 - simulated_soh
        flag = simulated_soh < 20.0

    advice = get_severity_and_recommendation(simulated_soh)

    return {
        "soh": round(simulated_soh, 2),
        "failure_score": round(failure_score, 2),
        "flag_for_maintenance": flag,
        "severity": advice["severity"],
        "recommendation": advice["recommendation"]
    }
