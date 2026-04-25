import { env } from "../config/env";
import { cacheOneRecordToken, getCachedOneRecordToken } from "./state-store";

const getAccessToken = async () => {
  const cached = await getCachedOneRecordToken();
  if (cached) return cached;

  if (!env.ONE_RECORD_TOKEN_URL || !env.ONE_RECORD_CLIENT_ID || !env.ONE_RECORD_CLIENT_SECRET) {
    return null;
  }

  const response = await fetch(env.ONE_RECORD_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.ONE_RECORD_CLIENT_ID,
      client_secret: env.ONE_RECORD_CLIENT_SECRET
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`ONE Record token request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { access_token: string; expires_in?: number };
  await cacheOneRecordToken(payload.access_token, Math.max(60, (payload.expires_in ?? 300) - 30));
  return payload.access_token;
};

const oneRecordFetch = async (path: string, init?: RequestInit) => {
  if (!env.ONE_RECORD_BASE_URL) {
    return null;
  }

  const token = await getAccessToken();
  const response = await fetch(`${env.ONE_RECORD_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/ld+json",
      "Content-Type": "application/ld+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`ONE Record request failed with ${response.status}`);
  }

  return response.json();
};

export const oneRecordClient = {
  getUld: (id: string) => oneRecordFetch(`/ulds/${id}`),
  createUld: (document: Record<string, unknown>) =>
    oneRecordFetch("/ulds", { method: "POST", body: JSON.stringify(document) }),
  patchUld: (id: string, document: Record<string, unknown>) =>
    oneRecordFetch(`/ulds/${id}`, { method: "PATCH", body: JSON.stringify(document) })
};
