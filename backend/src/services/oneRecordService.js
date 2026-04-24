import axios from "axios";

export class OneRecordService {
  constructor({ config, logger, authService, redis }) {
    this.config = config;
    this.logger = logger;
    this.authService = authService;
    this.redis = redis;
  }

  twinKey(uldId) {
    return `one-record:twin:${uldId}`;
  }

  async getUld(uldId) {
    const cached = await this.redis.get(this.twinKey(uldId));
    const cachedTwin = cached ? JSON.parse(cached) : null;

    if (!this.config.oneRecord.enabled) {
      return cachedTwin;
    }

    try {
      const response = await axios.get(this.uldUrl(uldId), {
        headers: await this.headers(),
        timeout: 5000,
      });
      const normalized = normalizeTwin(response.data);
      await this.redis.set(this.twinKey(uldId), JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      this.logger.warn({ error: error.message, uldId }, "ONE Record fetch failed");
      return cachedTwin;
    }
  }

  async createUld(payload) {
    return this.write("post", this.baseCollectionUrl(), payload);
  }

  async updateUld(uldId, payload) {
    return this.write("patch", this.uldUrl(uldId), payload);
  }

  async upsertTwin({ reading, status, risk, actions = [], workflows = [], context, flight }) {
    const payload = buildTwinPayload({
      baseUrl: this.config.oneRecord.baseUrl,
      reading,
      status,
      risk,
      actions,
      workflows,
      context,
      flight,
    });

    const result = await this.updateUld(reading.uld_id, payload);
    const normalized = {
      payload,
      operationalState: status,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: result ? "SYNCED" : "DEGRADED",
    };
    await this.redis.set(this.twinKey(reading.uld_id), JSON.stringify(normalized));
    return normalized;
  }

  async syncOperationalState({ uldId, redisState }) {
    const cached = await this.redis.get(this.twinKey(uldId));
    const parsed = cached ? JSON.parse(cached) : {};
    const payload = {
      ...(parsed.payload || defaultTwinPayload(this.config.oneRecord.baseUrl, uldId)),
      operationalState: buildOperationalStateNode(redisState),
    };
    await this.updateUld(uldId, payload);
    await this.redis.set(
      this.twinKey(uldId),
      JSON.stringify({
        payload,
        operationalState: redisState,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: "SYNCED",
      }),
    );
  }

  async write(method, url, payload) {
    if (!this.config.oneRecord.enabled) {
      return null;
    }

    try {
      const response = await axios({
        method,
        url,
        data: payload,
        headers: await this.headers(),
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      this.logger.warn({ error: error.message, url }, "ONE Record write failed");
      return null;
    }
  }

  async headers() {
    const token = await this.authService.getAccessToken();
    return {
      "Content-Type": "application/ld+json",
      Accept: "application/ld+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  baseCollectionUrl() {
    return `${this.config.oneRecord.baseUrl}${this.config.oneRecord.apiPath}`;
  }

  uldUrl(uldId) {
    return `${this.baseCollectionUrl()}/${uldId}`;
  }
}

function buildTwinPayload({ baseUrl, reading, status, risk, actions, workflows, context, flight }) {
  return {
    "@context": "https://onerecord.iata.org/ns/cargo",
    "@id": `${baseUrl}/ulds/${reading.uld_id}`,
    "@type": "LogisticsObject",
    serialNumber: reading.uld_id,
    linkedFlight: {
      "@type": "FlightMovement",
      flightNumber: flight?.id || "EK202",
      origin: flight?.originAirport || "DXB",
      destination: flight?.destinationAirport || "LHR",
      stage: flight?.stage || "TRANSFER_HUB",
      status: flight?.status || "DELAYED",
    },
    latestTemperatureRecord: {
      "@type": "TemperatureRecord",
      measuredAtTime: reading.timestamp,
      temperatureValue: reading.temperature_celsius,
      unit: "CEL",
      location: {
        "@type": "Location",
        lat: reading.lat,
        lon: reading.lon,
        airportCode: reading.airport_code,
      },
    },
    temperatureComplianceStatus: {
      "@type": "TemperatureComplianceStatus",
      rangeMin: status.minTempC ?? 2,
      rangeMax: status.maxTempC ?? 8,
      exposureUsedMinutes: status.exposureUsed,
      exposureRemainingMinutes: status.exposureRemaining,
      status: normalizeComplianceStatus(status.status),
    },
    riskAssessment: {
      "@type": "RiskAssessment",
      riskScore: risk?.risk_score ?? 0,
      riskLevel: risk?.risk_level ?? "LOW",
      predictedBreachMinutes: risk?.time_to_breach_minutes ?? status.timeToThresholdBreachMinutes ?? 0,
    },
    operationalState: buildOperationalStateNode(status),
    operationalContext: {
      "@type": "OperationalContext",
      airportZone: context?.airportZone,
      delayDetected: context?.delayDetected,
      handlingGap: context?.handlingGap,
      tarmacExposure: context?.tarmacExposure,
      transferExposure: context?.transferExposure,
      inFlightExposure: context?.inFlightExposure,
      ambientTemp: context?.ambientTemp,
    },
    interventions: actions.map((action) => ({
      "@type": "LogisticsEvent",
      action: action.action,
      assignedRole: action.assignedRole,
      priority: action.priority,
      slaDeadline: action.slaDeadline,
      status: action.status,
    })),
    workflowExecutions: workflows.map((workflow) => ({
      "@type": "LogisticsEvent",
      name: workflow.name,
      status: workflow.status,
    })),
  };
}

function buildOperationalStateNode(status) {
  return {
    uldId: status.uldId,
    shipmentId: status.shipmentId,
    productType: status.productType,
    exposureUsed: status.exposureUsed,
    exposureRemaining: status.exposureRemaining,
    allowableExposureMinutes: status.allowableExposureMinutes,
    status: status.status,
    phaseExposure: status.phaseExposure,
    exposureRatePerHour: status.exposureRatePerHour,
    timeToThresholdBreachMinutes: status.timeToThresholdBreachMinutes,
    lastTemperatureCelsius: status.lastTemperatureCelsius,
    lastReadingAt: status.lastReadingAt,
    lastLocation: status.lastLocation,
    lastRisk: status.lastRisk,
    operationalContext: status.operationalContext,
  };
}

function normalizeTwin(payload) {
  return {
    payload,
    operationalState: payload.operationalState || null,
    lastSyncedAt: new Date().toISOString(),
    syncStatus: "SYNCED",
  };
}

function defaultTwinPayload(baseUrl, uldId) {
  return {
    "@context": "https://onerecord.iata.org/ns/cargo",
    "@id": `${baseUrl}/ulds/${uldId}`,
    "@type": "LogisticsObject",
    serialNumber: uldId,
  };
}

function normalizeComplianceStatus(status) {
  if (status === "BREACH") return "Breach";
  if (status === "AT_RISK") return "AtRisk";
  return "OK";
}
