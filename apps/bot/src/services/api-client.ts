import axios from "axios";
import { env } from "../utils/env";

const api = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15000,
  headers: {
    "x-bot-token": env.BOT_INTERNAL_TOKEN
  }
});

export const registerBotUser = async (payload: {
  telegramId: string;
  username?: string | null;
  fullName?: string | null;
}) => {
  const response = await api.post("/internal/telegram/register", payload);
  return response.data.user;
};

export const fetchBotUserStatus = async (telegramId: string) => {
  const response = await api.get(`/internal/telegram/status/${telegramId}`);
  return response.data.user;
};

