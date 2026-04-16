import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const schema = z.object({
  BOT_PORT: z.coerce.number().default(5000),
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(10),
  TELEGRAM_MINI_APP_URL: z.string().url(),
  SUPPORT_TELEGRAM_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  BOT_INTERNAL_TOKEN: z.string().min(16)
});

export const env = schema.parse(process.env);

