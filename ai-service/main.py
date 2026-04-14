from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import os

from predict import predict_soh

# Load environment variables
load_dotenv()

app = FastAPI(title="Spiro AI Service", description="AI service for predicting battery State of Health (SoH)")

@app.get("/")
def read_root():
    return {"status": "success", "message": "Spiro AI Service API is running"}

class TelemetryData(BaseModel):
    voltage: float
    temperature: float
    current: float
    internal_resistance: float
    soc: float

@app.post("/predict/soh")
def get_soh_prediction(data: TelemetryData):
    """
    Endpoint to receive telemetry data and return predicted SoH.
    """
    prediction = predict_soh(data.dict())
    return {
        "status": "success",
        "predicted_soh": prediction["soh"],
        "failure_score": prediction["failure_score"],
        "flag_for_maintenance": prediction["flag_for_maintenance"],
        "severity": prediction["severity"],
        "recommendation": prediction["recommendation"]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
