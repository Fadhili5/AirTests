process.env.USE_REDIS_MOCK = "1";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setNonce, consumeNonce, setSession, validateSession, revokeSession, redisClient } from "../src/redis";

describe("redis nonce/session flow", () => {
  beforeAll(async () => {
    // ensure mock is available
    await redisClient.flushall();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  it("sets and consumes a nonce atomically", async () => {
    const nonce = "test-nonce-" + Date.now().toString(36);
    await setNonce(nonce, 10);
    const first = await consumeNonce(nonce);
    expect(first).toBe(true);
    const second = await consumeNonce(nonce);
    expect(second).toBe(false);
  });

  it("sets and validates session token, then revokes it", async () => {
    const sessionId = "sess-" + Date.now().toString(36);
    const token = "tok-" + Math.random().toString(36).slice(2);
    await setSession(sessionId, token, 60);
    const valid = await validateSession(sessionId, token);
    expect(valid).toBe(true);
    await revokeSession(sessionId);
    const validAfter = await validateSession(sessionId, token);
    expect(validAfter).toBe(false);
  });
});
