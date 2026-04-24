import { getRuleForUld } from "../domain/rules.js";
import { computeExposureState } from "../domain/exposure.js";
import { buildOperationalContext } from "../domain/context.js";
import { buildDecisionPackage } from "../domain/decision.js";
import { getPrimaryFlight } from "../domain/flightModel.js";
import { ingestCounter } from "../platform/metrics.js";

export class TelemetryPipeline {
  constructor({
    config,
    exposureRepository,
    operationsRepository,
    weatherService,
    riskService,
    actionOrchestrator,
    notificationRouter,
    auditStore,
    alertService,
    oneRecordService,
    reconciliationService,
    io,
  }) {
    this.config = config;
    this.exposureRepository = exposureRepository;
    this.operationsRepository = operationsRepository;
    this.weatherService = weatherService;
    this.riskService = riskService;
    this.actionOrchestrator = actionOrchestrator;
    this.notificationRouter = notificationRouter;
    this.auditStore = auditStore;
    this.alertService = alertService;
    this.oneRecordService = oneRecordService;
    this.reconciliationService = reconciliationService;
    this.io = io;
  }

  async process(reading) {
    ingestCounter.inc();

    const weather = await this.weatherService.getWeather(reading.lat, reading.lon);
    const enriched = {
      ...reading,
      ambient_temp: weather.ambient_temp,
      weather_condition: weather.weather_condition,
      airport_code: weather.airport_code,
    };
    const rule = getRuleForUld(reading.uld_id, this.config.exposure);
    const previous = await this.exposureRepository.getState(reading.uld_id);
    const status = computeExposureState({
      previousState: previous,
      reading: enriched,
      rule,
      maxGapMinutes: this.config.exposure.maxGapMinutes,
      warningPercent: this.config.exposure.warningPercent,
    });
    const operationalContext = buildOperationalContext({
      reading: enriched,
      previousState: previous,
      weather,
    });
    const risk = await this.riskService.getRisk({
      reading: enriched,
      weather,
      context: operationalContext,
      status,
      rule,
    });
    const decisionPackage = buildDecisionPackage({
      rule,
      status,
      risk,
      context: operationalContext,
    });

    status.lastRisk = {
      score: risk.risk_score,
      level: risk.risk_level,
      timeToBreachMinutes: risk.time_to_breach_minutes,
    };
    status.minTempC = rule.minTempC;
    status.maxTempC = rule.maxTempC;
    status.operationalContext = operationalContext;

    await this.exposureRepository.saveState(reading.uld_id, status);
    await this.exposureRepository.saveLatestFleetStatus(reading.uld_id, status);
    await this.exposureRepository.appendTelemetry(reading.uld_id, enriched);
    const shouldRespond = shouldCreateOperationalResponse(previous, status, risk, operationalContext);
    const orchestration = shouldRespond
      ? await this.actionOrchestrator.orchestrate({
          uldId: reading.uld_id,
          decisionPackage,
          reading: enriched,
        })
      : { actions: [], workflows: [] };
    const digitalTwin = await this.oneRecordService.upsertTwin({
      reading: enriched,
      status,
      risk,
      actions: orchestration.actions,
      workflows: orchestration.workflows,
      context: operationalContext,
      flight: getPrimaryFlight(),
    });
    await this.reconciliationService.enqueueVerification(reading.uld_id, "telemetry");

    const event = {
      reading: enriched,
      status,
      risk,
      operationalContext,
      decisions: decisionPackage,
      orchestration,
      digitalTwin,
    };
    await this.operationsRepository.appendTimeline(reading.uld_id, {
      type: "TELEMETRY",
      at: reading.timestamp,
      reading: enriched,
      status,
      risk,
      operationalContext,
    });
    await this.auditStore.log("telemetry", event);
    this.io.emit("telemetry", event);
    this.io.emit("risk-update", {
      uldId: reading.uld_id,
      risk,
      operationalContext,
    });

    const previousStatus = previous?.status || "OK";
    const nextStatus = status.status;

    if (shouldEmitAlert(previousStatus, nextStatus)) {
      const alert = buildAlert({
        reading,
        enriched,
        previousStatus,
        nextStatus,
        status,
      });
      await this.exposureRepository.appendAlert(alert);
      await this.alertService.handleAlert(alert);
      this.io.emit("alert", alert);
    }

    if (shouldRespond && decisionPackage.notifications.length > 0) {
      await this.notificationRouter.publishNotifications(decisionPackage.notifications, {
        uldId: reading.uld_id,
        temperature: reading.temperature_celsius,
        exposureUsed: status.exposureUsed,
        occurredAt: reading.timestamp,
        airportCode: enriched.airport_code,
      });
    }

    return event;
  }
}

function shouldCreateOperationalResponse(previous, status, risk, context) {
  if (!previous) return true;
  if (previous.status !== status.status) return true;
  if (previous.lastRisk?.level !== risk.risk_level) return true;
  if (!previous.operationalContext?.delayDetected && context.delayDetected) return true;
  if (!previous.operationalContext?.handlingGap && context.handlingGap) return true;
  if (!previous.operationalContext?.tarmacExposure && context.tarmacExposure) return true;
  return false;
}

function shouldEmitAlert(previousStatus, nextStatus) {
  if (previousStatus !== nextStatus && (nextStatus === "AT_RISK" || nextStatus === "BREACH")) {
    return true;
  }

  if ((previousStatus === "AT_RISK" || previousStatus === "BREACH") && nextStatus === "OK") {
    return true;
  }

  return false;
}

function buildAlert({ reading, enriched, previousStatus, nextStatus, status }) {
  if (nextStatus === "BREACH") {
    return {
      id: `${reading.uld_id}-${Date.now()}-breach`,
      uld_id: reading.uld_id,
      status: "BREACH",
      temperature: reading.temperature_celsius,
      exposure_used: status.exposureUsed,
      airport_code: enriched.airport_code,
      weather_condition: enriched.weather_condition,
      occurred_at: reading.timestamp,
      message: "Exceeded allowable exposure",
    };
  }

  if (nextStatus === "AT_RISK") {
    return {
      id: `${reading.uld_id}-${Date.now()}-warning`,
      uld_id: reading.uld_id,
      status: "WARNING",
      temperature: reading.temperature_celsius,
      exposure_used: status.exposureUsed,
      airport_code: enriched.airport_code,
      weather_condition: enriched.weather_condition,
      occurred_at: reading.timestamp,
      message: "Approaching allowable exposure threshold",
    };
  }

  return {
    id: `${reading.uld_id}-${Date.now()}-recovery`,
    uld_id: reading.uld_id,
    status: "RECOVERY",
    temperature: reading.temperature_celsius,
    exposure_used: status.exposureUsed,
    airport_code: enriched.airport_code,
    weather_condition: enriched.weather_condition,
    occurred_at: reading.timestamp,
    message: `Recovered to normal operating range from ${previousStatus.toLowerCase()}`,
  };
}
