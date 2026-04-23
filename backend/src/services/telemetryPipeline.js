import { getRuleForUld } from "../domain/rules.js";
import { computeExposureState } from "../domain/exposure.js";
import { ingestCounter } from "../platform/metrics.js";

export class TelemetryPipeline {
  constructor({
    config,
    exposureRepository,
    weatherService,
    alertService,
    oneRecordService,
    io,
  }) {
    this.config = config;
    this.exposureRepository = exposureRepository;
    this.weatherService = weatherService;
    this.alertService = alertService;
    this.oneRecordService = oneRecordService;
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

    await this.exposureRepository.saveState(reading.uld_id, status);
    await this.exposureRepository.saveLatestFleetStatus(reading.uld_id, status);
    await this.exposureRepository.appendTelemetry(reading.uld_id, enriched);
    const digitalTwin = await this.oneRecordService.upsertTwin({
      reading: enriched,
      status,
    });

    const event = { reading: enriched, status, digitalTwin };
    this.io.emit("telemetry", event);

    if (status.status === "WARNING" || status.status === "BREACH") {
      const alert = {
        uld_id: reading.uld_id,
        status: status.status,
        temperature: reading.temperature_celsius,
        exposure_used: status.exposureUsed,
        message:
          status.status === "BREACH"
            ? "Exceeded allowable exposure"
            : "Approaching allowable exposure threshold",
      };
      await this.alertService.handleAlert(alert);
      this.io.emit("alert", alert);
    }

    return event;
  }
}
