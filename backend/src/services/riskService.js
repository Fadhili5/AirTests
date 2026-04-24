import axios from "axios";
import CircuitBreaker from "opossum";

export class RiskService {
  constructor({ config, logger }) {
    this.config = config;
    this.logger = logger;
    this.breaker = new CircuitBreaker(this.fetchRemoteRisk.bind(this), {
      timeout: 4000,
      errorThresholdPercentage: 50,
      resetTimeout: 20000,
    });
  }

  async getRisk(payload) {
    if (!this.config.risk.enabled) {
      return localRiskFallback(payload);
    }

    try {
      return await this.breaker.fire(payload);
    } catch (error) {
      this.logger.warn({ error: error.message }, "Risk service unavailable, using fallback");
      return localRiskFallback(payload);
    }
  }

  async fetchRemoteRisk(payload) {
    const response = await axios.post(
      `${this.config.risk.baseUrl}/predict`,
      payload,
      { timeout: 4000 },
    );
    return response.data;
  }
}

function localRiskFallback({ reading, weather, context, status }) {
  const normalizedTemp = Math.max(0, (reading.temperature_celsius - 5) / 8);
  const normalizedAmbient = Math.max(0, (weather.ambient_temp - 20) / 20);
  const slope = Math.max(0, context.temperatureSlope * 4);
  const tarmac = context.tarmacExposure ? 0.2 : 0;
  const delayed = context.delayDetected ? 0.15 : 0;
  const handlingGap = context.handlingGap ? 0.1 : 0;
  const exposure = status.allowableExposureMinutes
    ? Math.min(1, status.exposureUsed / status.allowableExposureMinutes)
    : 0.9;

  const riskScore = clamp(
    normalizedTemp * 0.22 +
      normalizedAmbient * 0.14 +
      slope * 0.16 +
      exposure * 0.22 +
      tarmac +
      delayed +
      handlingGap,
    0,
    0.99,
  );

  return {
    risk_score: Number(riskScore.toFixed(2)),
    time_to_breach_minutes:
      riskScore >= 0.95
        ? 5
        : Math.max(5, Math.round((1 - riskScore) * 60)),
    risk_level:
      riskScore >= 0.85 ? "CRITICAL" : riskScore >= 0.65 ? "HIGH" : riskScore >= 0.45 ? "MEDIUM" : "LOW",
    factors: {
      temperatureTrend: Number(context.temperatureSlope.toFixed(3)),
      ambientTemp: weather.ambient_temp,
      tarmacExposure: context.tarmacExposure,
      delayDetected: context.delayDetected,
      handlingGap: context.handlingGap,
    },
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
