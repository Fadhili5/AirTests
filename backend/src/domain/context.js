export function buildOperationalContext({ reading, previousState, weather }) {
  const lastLocation = previousState?.lastLocation;
  const movementDelta = lastLocation
    ? haversineKm(lastLocation.lat, lastLocation.lon, reading.lat, reading.lon)
    : 0;
  const idle = movementDelta < 0.15;
  const temperatureDelta =
    reading.temperature_celsius - (previousState?.lastTemperatureCelsius || reading.temperature_celsius);
  const tarmacExposure =
    (reading.airport_zone === "TARMAC" || weather.ambient_temp >= 30) &&
    idle &&
    reading.temperature_celsius >= 7;
  const handlingGap = idle && temperatureDelta > 0.5;
  const delayDetected =
    reading.flight_status === "DELAYED" ||
    (reading.time_on_tarmac_min || 0) >= 15 ||
    (reading.delay_minutes || 0) >= 15;
  const transferExposure =
    ["TRANSFER", "AIRPORT_TRANSIT"].includes(reading.airport_zone) ||
    ((reading.speed_kph || 0) > 10 && (reading.speed_kph || 0) < 60);
  const inFlightExposure = (reading.speed_kph || 0) >= 200;
  const sensorHealth =
    reading.battery <= 20 || reading.signal_rssi <= -95 ? "DEGRADED" : "HEALTHY";

  return {
    airportZone: reading.airport_zone || inferAirportZone(reading),
    movementKm: Number(movementDelta.toFixed(3)),
    idleMinutes: idle ? reading.time_on_tarmac_min || 5 : 0,
    tarmacExposure,
    delayDetected,
    handlingGap,
    transferExposure,
    inFlightExposure,
    sensorHealth,
    battery: reading.battery,
    signalRssi: reading.signal_rssi,
    flightStatus: reading.flight_status || "ON_TIME",
    delayMinutes: reading.delay_minutes || 0,
    weatherCondition: weather.weather_condition,
    ambientTemp: weather.ambient_temp,
    temperatureSlope: Number((temperatureDelta / 5).toFixed(3)),
  };
}

function inferAirportZone(reading) {
  if ((reading.time_on_tarmac_min || 0) >= 10) return "TARMAC";
  if ((reading.speed_kph || 0) > 200) return "IN_FLIGHT";
  if ((reading.speed_kph || 0) > 10) return "AIRPORT_TRANSIT";
  return "COLD_ZONE";
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
