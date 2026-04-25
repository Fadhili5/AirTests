import Redis from "ioredis";
import { DashboardSnapshot } from "@lending/shared";
import { env } from "../config/env";

const redisEnabled = !env.REDIS_DISABLED;
const redis = redisEnabled
  ? new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    })
  : null;

let connected = false;
let memoryDashboardSnapshot: DashboardSnapshot | null = null;
let memoryOneRecordToken: { token: string; expiresAt: number } | null = null;

const ensureConnected = async () => {
  if (!redisEnabled || !redis) {
    return null;
  }

  if (!connected) {
    await redis.connect();
    connected = true;
  }

  return redis;
};

export const publishLiveUpdate = async (event: Record<string, unknown>) => {
  const client = await ensureConnected();
  if (!client) {
    return;
  }

  await client.publish("aerosentinel:stream", JSON.stringify(event));
};

export const cacheDashboardSnapshot = async (snapshot: DashboardSnapshot) => {
  memoryDashboardSnapshot = snapshot;
  const client = await ensureConnected();
  if (!client) {
    return;
  }

  await client.set("aerosentinel:dashboard", JSON.stringify(snapshot), "EX", 30);
};

export const getCachedDashboardSnapshot = async (): Promise<DashboardSnapshot | null> => {
  const client = await ensureConnected();
  if (!client) {
    return memoryDashboardSnapshot;
  }

  const value = await client.get("aerosentinel:dashboard");
  return value ? (JSON.parse(value) as DashboardSnapshot) : memoryDashboardSnapshot;
};

export const cacheOneRecordToken = async (token: string, ttlSeconds: number) => {
  memoryOneRecordToken = {
    token,
    expiresAt: Date.now() + ttlSeconds * 1000
  };

  const client = await ensureConnected();
  if (!client) {
    return;
  }

  await client.set("aerosentinel:onerecord:token", token, "EX", ttlSeconds);
};

export const getCachedOneRecordToken = async () => {
  const client = await ensureConnected();
  if (!client) {
    return memoryOneRecordToken && memoryOneRecordToken.expiresAt > Date.now()
      ? memoryOneRecordToken.token
      : null;
  }

  return client.get("aerosentinel:onerecord:token");
};

export const getRedisClient = async () => ensureConnected();
