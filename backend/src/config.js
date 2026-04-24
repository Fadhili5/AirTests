import dotenv from "dotenv";

dotenv.config();

const toBool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.parseInt(process.env.PORT || "3000", 10),
  mqtt: {
    url: process.env.MQTT_URL || "mqtt://localhost:1883",
    topic: process.env.MQTT_TOPIC || "uld/+/telemetry",
    clientId: process.env.MQTT_CLIENT_ID || "or-atm-backend",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    disabled: toBool(process.env.REDIS_DISABLED, false),
  },
  postgres: {
    url: process.env.POSTGRES_URL || "",
    disabled: toBool(process.env.POSTGRES_DISABLED, false),
  },
  weather: {
    apiKey: process.env.OPENWEATHER_API_KEY || "",
    baseUrl:
      process.env.OPENWEATHER_BASE_URL ||
      "https://api.openweathermap.org/data/2.5/weather",
    ttlSeconds: Number.parseInt(process.env.WEATHER_CACHE_TTL_SECONDS || "600", 10),
  },
  oneRecord: {
    baseUrl: process.env.ONE_RECORD_BASE_URL || "http://localhost:8080",
    enabled: toBool(process.env.ONE_RECORD_ENABLED, true),
    authToken: process.env.ONE_RECORD_AUTH_TOKEN || "",
    apiPath: process.env.ONE_RECORD_API_PATH || "/api/ulds",
    tokenUrl:
      process.env.ONE_RECORD_TOKEN_URL ||
      "http://localhost:8081/realms/or-atm/protocol/openid-connect/token",
    clientId: process.env.ONE_RECORD_CLIENT_ID || "or-atm-backend",
    clientSecret: process.env.ONE_RECORD_CLIENT_SECRET || "or-atm-backend-secret",
    tokenRefreshSkewSeconds: Number.parseInt(
      process.env.ONE_RECORD_TOKEN_REFRESH_SKEW_SECONDS || "30",
      10,
    ),
    syncRetryDelayMs: Number.parseInt(
      process.env.ONE_RECORD_SYNC_RETRY_DELAY_MS || "15000",
      10,
    ),
  },
  risk: {
    baseUrl: process.env.RISK_SERVICE_URL || "http://localhost:8010",
    enabled: !toBool(process.env.RISK_SERVICE_DISABLED, false),
  },
  auth: {
    disabled: toBool(process.env.AUTH_DISABLED, false),
    issuer:
      process.env.KEYCLOAK_ISSUER ||
      "http://localhost:8081/realms/or-atm",
    audience: process.env.KEYCLOAK_AUDIENCE || "or-atm-api",
    jwksUri:
      process.env.KEYCLOAK_JWKS_URI ||
      "http://localhost:8081/realms/or-atm/protocol/openid-connect/certs",
  },
  smtp: {
    host: process.env.SMTP_HOST || "mailhog",
    port: Number.parseInt(process.env.SMTP_PORT || "1025", 10),
    from: process.env.SMTP_FROM || "alerts@or-atm.local",
  },
  exposure: {
    defaultMinTemp: Number.parseFloat(process.env.DEFAULT_MIN_TEMP_C || "2"),
    defaultMaxTemp: Number.parseFloat(process.env.DEFAULT_MAX_TEMP_C || "8"),
    allowableMinutes: Number.parseFloat(
      process.env.DEFAULT_ALLOWABLE_EXPOSURE_MINUTES || "60",
    ),
    overrideAllowableMinutes: process.env.OVERRIDE_ALLOWABLE_EXPOSURE_MINUTES
      ? Number.parseFloat(process.env.OVERRIDE_ALLOWABLE_EXPOSURE_MINUTES)
      : null,
    overrideMinTemp: process.env.OVERRIDE_MIN_TEMP_C
      ? Number.parseFloat(process.env.OVERRIDE_MIN_TEMP_C)
      : null,
    overrideMaxTemp: process.env.OVERRIDE_MAX_TEMP_C
      ? Number.parseFloat(process.env.OVERRIDE_MAX_TEMP_C)
      : null,
    maxGapMinutes: Number.parseFloat(process.env.MAX_GAP_MINUTES || "30"),
    warningPercent: Number.parseFloat(process.env.WARNING_THRESHOLD_PERCENT || "80"),
  },
  retention: {
    eventListLimit: Number.parseInt(process.env.EVENT_LIST_LIMIT || "500", 10),
  },
  verification: {
    enabled: toBool(process.env.VERIFICATION_ENABLED, true),
    pollIntervalMs: Number.parseInt(
      process.env.VERIFICATION_POLL_INTERVAL_MS || "2000",
      10,
    ),
    batchSize: Number.parseInt(process.env.VERIFICATION_BATCH_SIZE || "20", 10),
    temperatureDriftThresholdCelsius: Number.parseFloat(
      process.env.VERIFICATION_TEMPERATURE_DRIFT_C || "0.5",
    ),
    exposureDriftThresholdMinutes: Number.parseFloat(
      process.env.VERIFICATION_EXPOSURE_DRIFT_MINUTES || "2",
    ),
  },
  operations: {
    airlineCode: process.env.AIRLINE_CODE || "EK",
    primaryFlightNumber: process.env.PRIMARY_FLIGHT_NUMBER || "EK202",
    originAirport: process.env.ORIGIN_AIRPORT || "DXB",
    destinationAirport: process.env.DESTINATION_AIRPORT || "LHR",
  },
  observability: {
    enableMetrics: true,
  },
};
