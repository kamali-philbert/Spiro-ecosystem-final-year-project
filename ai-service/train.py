import os
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

# Ensure model directory exists
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "soh_model.pkl")

def generate_sample_data(num_samples=1000):
    """
    Generates synthetic telemetry data and corresponding SoH values.
    Features: voltage, temperature, current, internal_resistance, soc
    Target: soh (100 to 0)
    """
    np.random.seed(42)
    
    # Generate realistic base data
    voltage = np.random.normal(70, 5, num_samples) # e.g. 72V system
    temperature = np.random.normal(30, 10, num_samples) # 10 to 50 Celsius
    current = np.random.normal(20, 15, num_samples) # Discharge current
    internal_resistance = np.random.uniform(0.01, 0.2, num_samples) # up to 200mOhm
    soc = np.random.uniform(10, 100, num_samples) # 10% to 100%
    
    # Simple physical degradation heuristic for synthetic SoH:
    # High resistance -> low SoH
    # High temperature exposure averages -> lower SoH (simplified)
    # SoH base is 100. Resistance penalty up to ~80 SoH drop.
    soh = 100 - (internal_resistance * 400) - ((temperature > 40) * np.random.uniform(0, 10, num_samples))
    soh = np.clip(soh, 0, 100) # Keep within 0-100% bounds
    
    data = pd.DataFrame({
        "voltage": voltage,
        "temperature": temperature,
        "current": current,
        "internal_resistance": internal_resistance,
        "soc": soc,
        "soh": soh
    })
    
    return data

def train_model():
    print("Generating synthetic sample data...")
    df = generate_sample_data(2000)
    
    X = df[["voltage", "temperature", "current", "internal_resistance", "soc"]]
    y = df["soh"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest model...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model Training Complete. MSE: {mse:.2f}, R2 Score: {r2:.4f}")
    
    # Save model
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
        
    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_model()
