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
  const exposureUsed = Number(
    ((previousState?.exposureUsed || 0) + incrementMinutes).toFixed(2),
  );
  const exposureRemaining = Math.max(
    0,
    Number((rule.allowableExposureMinutes - exposureUsed).toFixed(2)),
  );
  const warningThreshold =
    (rule.allowableExposureMinutes * warningPercent) / 100;

  let status = "NORMAL";
  if (rule.allowableExposureMinutes === 0 && reading.temperature_celsius > rule.maxTempC) {
    status = "BREACH";
  } else if (exposureUsed > rule.allowableExposureMinutes) {
    status = "BREACH";
  } else if (exposureUsed >= warningThreshold && rule.allowableExposureMinutes > 0) {
    status = "WARNING";
  }

  return {
    uldId: reading.uld_id,
    shipmentId: rule.shipmentId,
    productType: rule.productType,
    exposureUsed,
    exposureRemaining,
    allowableExposureMinutes: rule.allowableExposureMinutes,
    status,
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
