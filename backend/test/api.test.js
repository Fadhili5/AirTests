import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import pino from "pino";
import { buildApp } from "../src/app.js";

class FakeExposureRepository {
  async getState() {
    return { status: "NORMAL", exposureUsed: 10 };
  }

  async getTelemetry() {
    return [];
  }

  async getFleetStatus() {
    return [{ uldId: "JTN-7890" }];
  }

  async resetState() {
    return undefined;
  }
}

class FakeSubscriptionRepository {
  async addSubscription(subscription) {
    return subscription;
  }
}

class FakeOperationsRepository {
  async listPendingActions() {
    return [];
  }

  async listActiveWorkflows() {
    return [];
  }

  async getActions() {
    return [];
  }

  async getWorkflows() {
    return [];
  }

  async getTimeline() {
    return [];
  }
}

class FakeAnalyticsService {
  async getSummary() {
    return {
      compliantShipmentsPercent: 100,
      averageExposureMinutes: 0,
    };
  }
}

class FakeAuditStore {
  async list() {
    return [];
  }
}

test("health endpoint is protected when auth enabled", async () => {
  const app = buildApp({
    config: {
      auth: {
        disabled: false,
        issuer: "http://example.com",
        audience: "api",
        jwksUri: "http://example.com/jwks",
      },
    },
    logger: pino({ enabled: false }),
    exposureRepository: new FakeExposureRepository(),
    operationsRepository: new FakeOperationsRepository(),
    analyticsService: new FakeAnalyticsService(),
    actionOrchestrator: { completeAction: async () => null },
    auditStore: new FakeAuditStore(),
    subscriptionRepository: new FakeSubscriptionRepository(),
  });

  const response = await request(app).get("/api/health");
  assert.equal(response.statusCode, 401);
});

test("status endpoint returns data when auth disabled", async () => {
  const app = buildApp({
    config: {
      auth: { disabled: true },
    },
    logger: pino({ enabled: false }),
    exposureRepository: new FakeExposureRepository(),
    operationsRepository: new FakeOperationsRepository(),
    analyticsService: new FakeAnalyticsService(),
    actionOrchestrator: { completeAction: async () => null },
    auditStore: new FakeAuditStore(),
    subscriptionRepository: new FakeSubscriptionRepository(),
  });

  const response = await request(app).get("/api/uld/JTN-7890/status");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status.status, "NORMAL");
});
