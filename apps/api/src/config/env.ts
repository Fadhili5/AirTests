import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BOT_INTERNAL_TOKEN: z.string().min(16),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(10),
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(10),
  TELEGRAM_MINI_APP_URL: z.string().url(),
  SUPPORT_TELEGRAM_URL: z.string().url(),
  APP_NAME: z.string().default("KopaBot"),
  MPESA_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_BASE_URL: z.string().url(),
  MPESA_CONSUMER_KEY: z.string().min(4),
  MPESA_CONSUMER_SECRET: z.string().min(4),
  MPESA_SHORTCODE: z.string().min(5),
  MPESA_PASSKEY: z.string().min(4),
  MPESA_INITIATOR_NAME: z.string().min(3),
  MPESA_SECURITY_CREDENTIAL: z.string().min(4),
  MPESA_RESULT_URL: z.string().url(),
  MPESA_TIMEOUT_URL: z.string().url(),
  MPESA_CALLBACK_URL: z.string().url(),
  MPESA_CALLBACK_TOKEN: z.string().min(10),
  MPESA_B2C_COMMAND: z.string().default("BusinessPayment"),
  MPESA_B2C_REMARKS: z.string().default("Loan payout"),
  MPESA_QUEUE_TIMEOUT_SECONDS: z.coerce.number().default(120),
  LOAN_BASE_INTEREST_RATE: z.coerce.number().default(12),
  LOAN_MAX_MULTIPLIER: z.coerce.number().default(0.5),
  VERIFICATION_HOLD_AMOUNT: z.coerce.number().default(100)
});

export const env = envSchema.parse(process.env);

