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
  weather: {
    apiKey: process.env.OPENWEATHER_API_KEY || "",
    baseUrl:
      process.env.OPENWEATHER_BASE_URL ||
      "https://api.openweathermap.org/data/2.5/weather",
    ttlSeconds: Number.parseInt(process.env.WEATHER_CACHE_TTL_SECONDS || "600", 10),
  },
  oneRecord: {
    baseUrl: process.env.ONE_RECORD_BASE_URL || "http://localhost:8080",
    authToken: process.env.ONE_RECORD_AUTH_TOKEN || "",
    enabled: toBool(process.env.ONE_RECORD_ENABLED, true),
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
    maxGapMinutes: Number.parseFloat(process.env.MAX_GAP_MINUTES || "30"),
    warningPercent: Number.parseFloat(process.env.WARNING_THRESHOLD_PERCENT || "80"),
  },
  retention: {
    eventListLimit: Number.parseInt(process.env.EVENT_LIST_LIMIT || "500", 10),
  },
  observability: {
    enableMetrics: true,
  },
};
