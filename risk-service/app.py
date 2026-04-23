from fastapi import FastAPI
from pydantic import BaseModel


class Reading(BaseModel):
    temperature_celsius: float
    ambient_temp: float
    time_on_tarmac_min: float = 0
    delay_minutes: float = 0
    signal_rssi: float = -70
    battery: float = 100


class Context(BaseModel):
    tarmacExposure: bool = False
    delayDetected: bool = False
    handlingGap: bool = False
    temperatureSlope: float = 0


class Status(BaseModel):
    exposureUsed: float = 0
    allowableExposureMinutes: float = 60


class PredictRequest(BaseModel):
    reading: Reading
    weather: dict
    context: Context
    status: Status
    rule: dict


app = FastAPI(title="AeroSentinel X Risk Service", version="1.0.0")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict")
def predict(payload: PredictRequest):
    slope_factor = max(0.0, payload.context.temperatureSlope) * 2.4
    ambient_factor = max(0.0, (payload.reading.ambient_temp - 18) / 20)
    temp_factor = max(0.0, (payload.reading.temperature_celsius - payload.rule.get("maxTempC", 8)) / 6)
    tarmac_factor = 0.22 if payload.context.tarmacExposure else 0.0
    delay_factor = min(0.2, payload.reading.delay_minutes / 90)
    idle_factor = 0.15 if payload.context.handlingGap else 0.0
    exposure_factor = (
        min(1.0, payload.status.exposureUsed / payload.status.allowableExposureMinutes)
        if payload.status.allowableExposureMinutes > 0
        else 0.95
    )
    signal_penalty = 0.05 if payload.reading.signal_rssi <= -95 else 0.0
    battery_penalty = 0.05 if payload.reading.battery <= 20 else 0.0

    risk_score = min(
        0.99,
        max(
            0.02,
            temp_factor * 0.26
            + ambient_factor * 0.12
            + slope_factor * 0.14
            + tarmac_factor
            + delay_factor
            + idle_factor
            + exposure_factor * 0.21
            + signal_penalty
            + battery_penalty,
        ),
    )

    if risk_score >= 0.8:
        risk_level = "HIGH"
    elif risk_score >= 0.55:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    time_to_breach = max(3, round((1 - risk_score) * 45))

    return {
        "risk_score": round(risk_score, 2),
        "time_to_breach_minutes": time_to_breach,
        "risk_level": risk_level,
        "factors": {
            "temperature_trend": round(payload.context.temperatureSlope, 3),
            "ambient_temp": payload.reading.ambient_temp,
            "delay_minutes": payload.reading.delay_minutes,
            "time_on_tarmac_min": payload.reading.time_on_tarmac_min,
            "battery": payload.reading.battery,
            "signal_rssi": payload.reading.signal_rssi,
        },
    }
