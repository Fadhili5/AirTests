import axios from "axios";

export class OneRecordService {
  constructor({ config, logger }) {
    this.config = config;
    this.logger = logger;
  }

  async upsertTwin({ reading, status, risk, actions = [], workflows = [], context }) {
    if (!this.config.oneRecord.enabled) {
      return null;
    }

    const payload = {
      "@context": "https://onerecord.iata.org/ns/cargo",
      "@id": `${this.config.oneRecord.baseUrl}/uld/${reading.uld_id}`,
      "@type": "ULD",
      serialNumber: reading.uld_id,
      latestTemperatureRecord: {
        "@type": "TemperatureRecord",
        measuredAtTime: reading.timestamp,
        temperatureValue: reading.temperature_celsius,
        temperatureUnit: "CEL",
        sensor: {
          "@id": `${this.config.oneRecord.baseUrl}/uld/${reading.uld_id}/sensor/main`,
        },
        location: {
          "@type": "Location",
          coordinates: `${reading.lat},${reading.lon}`,
          airportCode: reading.airport_code,
        },
      },
      temperatureComplianceStatus: {
        "@type": "TemperatureComplianceStatus",
        exposureUsed: status.exposureUsed,
        exposureRemaining: status.exposureRemaining,
        status: status.status,
      },
      riskScore: {
        "@type": "RiskScore",
        value: risk?.risk_score,
        riskLevel: risk?.risk_level,
        timeToBreachMinutes: risk?.time_to_breach_minutes,
      },
      operationalContext: {
        "@type": "OperationalContext",
        airportZone: context?.airportZone,
        delayDetected: context?.delayDetected,
        handlingGap: context?.handlingGap,
        tarmacExposure: context?.tarmacExposure,
      },
      actionHistory: actions.map((action) => ({
        "@type": "MitigationAction",
        action: action.action,
        status: action.status,
        responseTimeMinutes: action.responseTimeMinutes,
      })),
      workflowHistory: workflows.map((workflow) => ({
        "@type": "WorkflowExecution",
        name: workflow.name,
        status: workflow.status,
      })),
    };

    try {
      await axios.patch(
        `${this.config.oneRecord.baseUrl}/api/uld/${reading.uld_id}`,
        payload,
        {
          headers: {
            "Content-Type": "application/ld+json",
            Authorization: this.config.oneRecord.authToken
              ? `Bearer ${this.config.oneRecord.authToken}`
              : undefined,
          },
          timeout: 5000,
        },
      );
    } catch (error) {
      this.logger.warn(
        { error: error.message, uldId: reading.uld_id },
        "ONE Record update failed",
      );
    }

    return payload;
  }
}
