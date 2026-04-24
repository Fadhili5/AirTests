export function computeExposureState({
  previousState,
  reading,
  rule,
  maxGapMinutes,
  warningPercent,
}) {
  const readingTime = new Date(reading.timestamp);
  const priorTime = previousState?.lastReadingAt
    ? new Date(previousState.lastReadingAt)
    : null;
  const elapsedMinutes = priorTime
    ? Math.max(0, (readingTime.getTime() - priorTime.getTime()) / 60000)
    : 5;
  const boundedElapsedMinutes = Math.min(elapsedMinutes, maxGapMinutes);
  const missingDataPenalty = elapsedMinutes > maxGapMinutes ? maxGapMinutes : 0;
  const incrementMinutes =
    reading.temperature_celsius > rule.maxTempC
      ? boundedElapsedMinutes || 5
      : missingDataPenalty;
  const stage = determineExposureStage(reading);
  const previousPhaseExposure = previousState?.phaseExposure || {
    tarmacMinutes: 0,
    groundDelayMinutes: 0,
    transferMinutes: 0,
    inflightMinutes: 0,
  };
  const phaseExposure = {
    tarmacMinutes:
      previousPhaseExposure.tarmacMinutes + (stage === "TARMAC" ? incrementMinutes : 0),
    groundDelayMinutes:
      previousPhaseExposure.groundDelayMinutes +
      (stage === "GROUND_DELAY" ? incrementMinutes : 0),
    transferMinutes:
      previousPhaseExposure.transferMinutes + (stage === "TRANSFER" ? incrementMinutes : 0),
    inflightMinutes:
      previousPhaseExposure.inflightMinutes + (stage === "IN_FLIGHT" ? incrementMinutes : 0),
  };
  const exposureUsed = Number(
    ((previousState?.exposureUsed || 0) + incrementMinutes).toFixed(2),
  );
  const exposureRemaining = Math.max(
    0,
    Number((rule.allowableExposureMinutes - exposureUsed).toFixed(2)),
  );
  const warningThreshold =
    (rule.allowableExposureMinutes * warningPercent) / 100;

  let status = "OK";
  if (rule.allowableExposureMinutes === 0 && reading.temperature_celsius > rule.maxTempC) {
    status = "BREACH";
  } else if (exposureUsed > rule.allowableExposureMinutes) {
    status = "BREACH";
  } else if (exposureUsed >= warningThreshold && rule.allowableExposureMinutes > 0) {
    status = "AT_RISK";
  }

  const exposureRatePerHour = Number(((incrementMinutes / Math.max(elapsedMinutes || 5, 1)) * 60).toFixed(2));
  const timeToThresholdBreachMinutes =
    rule.allowableExposureMinutes > 0
      ? Number(Math.max(0, (rule.allowableExposureMinutes - exposureUsed).toFixed(2)))
      : 0;

  return {
    uldId: reading.uld_id,
    shipmentId: rule.shipmentId,
    productType: rule.productType,
    exposureUsed,
    exposureRemaining,
    allowableExposureMinutes: rule.allowableExposureMinutes,
    status,
    exposureStage: stage,
    exposureRatePerHour,
    timeToThresholdBreachMinutes,
    phaseExposure,
    lastTemperatureCelsius: reading.temperature_celsius,
    lastReadingAt: reading.timestamp,
    lastLocation: {
      lat: reading.lat,
      lon: reading.lon,
      airportCode: reading.airport_code,
    },
    weather: {
      ambientTempCelsius: reading.ambient_temp,
      weatherCondition: reading.weather_condition,
    },
    breachedAt:
      status === "BREACH"
        ? previousState?.breachedAt || reading.timestamp
        : previousState?.breachedAt || null,
  };
}

function determineExposureStage(reading) {
  const zone = String(reading.airport_zone || "").toUpperCase();
  const flightStatus = String(reading.flight_status || "").toUpperCase();

  if ((reading.speed_kph || 0) > 200 || zone.includes("IN_FLIGHT")) {
    return "IN_FLIGHT";
  }
  if (flightStatus === "DELAYED" || (reading.delay_minutes || 0) >= 15) {
    return "GROUND_DELAY";
  }
  if (zone.includes("TRANSFER") || zone.includes("TRANSIT")) {
    return "TRANSFER";
  }
  return "TARMAC";
}
