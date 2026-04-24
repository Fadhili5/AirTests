import { createClient } from "redis";
import { logger } from "./logger.js";

class InMemoryRedis {
  constructor() {
    this.isInMemory = true;
    this.kv = new Map();
    this.lists = new Map();
    this.hashes = new Map();
  }

  async connect() {
    return undefined;
  }

  on() {
    return undefined;
  }

  async get(key) {
    return this.kv.has(key) ? this.kv.get(key) : null;
  }

  async set(key, value) {
    this.kv.set(key, value);
  }

  async setEx(key, _ttlSeconds, value) {
    this.kv.set(key, value);
  }

  async del(key) {
    this.kv.delete(key);
    this.lists.delete(key);
    this.hashes.delete(key);
  }

  async lPush(key, value) {
    const list = this.lists.get(key) || [];
    list.unshift(value);
    this.lists.set(key, list);
  }

  async rPush(key, value) {
    const list = this.lists.get(key) || [];
    list.push(value);
    this.lists.set(key, list);
  }

  async lTrim(key, start, stop) {
    const list = this.lists.get(key) || [];
    this.lists.set(key, list.slice(start, stop + 1));
  }

  async lRange(key, start, stop) {
    const list = this.lists.get(key) || [];
    const end = stop < 0 ? list.length : stop + 1;
    return list.slice(start, end);
  }

  async rPop(key) {
    const list = this.lists.get(key) || [];
    const value = list.pop() ?? null;
    this.lists.set(key, list);
    return value;
  }

  async lLen(key) {
    const list = this.lists.get(key) || [];
    return list.length;
  }

  async hSet(key, field, value) {
    const hash = this.hashes.get(key) || new Map();
    hash.set(field, value);
    this.hashes.set(key, hash);
  }

  async hGet(key, field) {
    const hash = this.hashes.get(key) || new Map();
    return hash.has(field) ? hash.get(field) : null;
  }

  async hGetAll(key) {
    const hash = this.hashes.get(key) || new Map();
    return Object.fromEntries(hash.entries());
  }
}

export async function createRedisClient(url, options = {}) {
  if (options.disabled) {
    logger.warn("REDIS_DISABLED=true, using in-memory state store");
    return new InMemoryRedis();
  }

  const client = createClient({
    url,
    socket: {
      connectTimeout: 1000,
      reconnectStrategy: false,
    },
  });
  client.on("error", (error) => logger.error({ error }, "Redis error"));
  try {
    await client.connect();
    return client;
  } catch (error) {
    logger.warn({ error: error.message }, "Redis unavailable, using in-memory state store");
    return new InMemoryRedis();
  }
}
