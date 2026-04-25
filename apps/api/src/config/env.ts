import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32).default("change-me-in-production-change-me-now"),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  AUTH_DISABLED: z.coerce.boolean().default(false),
  REDIS_DISABLED: z.coerce.boolean().default(false),
  POSTGRES_DISABLED: z.coerce.boolean().default(false),
  RISK_SERVICE_DISABLED: z.coerce.boolean().default(false),
  ONE_RECORD_ENABLED: z.coerce.boolean().default(true),
  ALLOW_SIMULATOR_DATA: z.coerce.boolean().default(true),
  REQUIRE_SIGNED_INTEGRATIONS: z.coerce.boolean().default(false),
  CARGO_SEED_DEMO: z.coerce.boolean().default(false),
  IOT_SIGNING_SECRET: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  MPESA_CALLBACK_TOKEN: z.string().optional(),
  BOT_INTERNAL_TOKEN: z.string().optional(),
  ONE_RECORD_BASE_URL: z.string().url().optional(),
  ONE_RECORD_TOKEN_URL: z.string().url().optional(),
  ONE_RECORD_CLIENT_ID: z.string().optional(),
  ONE_RECORD_CLIENT_SECRET: z.string().optional(),
  KEYCLOAK_REALM: z.string().optional(),
  NEO4J_URI: z.string().optional(),
  NEO4J_USERNAME: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),
  KAFKA_BROKERS: z.string().optional(),
  OBJECT_STORAGE_BUCKET: z.string().optional(),
  RISK_TEMP_MAX_C: z.coerce.number().default(8),
  RISK_TEMP_MIN_C: z.coerce.number().default(2),
  RISK_EXPOSURE_MINUTES: z.coerce.number().default(45),
  OPS_AIRLINE_NAME: z.string().default("Emirates SkyCargo"),
  OPS_PRIMARY_FLIGHT: z.string().default("EK202"),
  OPS_PRIMARY_ORIGIN: z.string().default("DXB"),
  OPS_PRIMARY_DESTINATION: z.string().default("LHR")
});

export const env = envSchema.parse(process.env);
