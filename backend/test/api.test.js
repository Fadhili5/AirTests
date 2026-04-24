import test from "node:test";
import assert from "node:assert/strict";
import { authMiddleware } from "../src/middleware/auth.js";
import { buildApiRouter } from "../src/routes/api.js";

class FakeExposureRepository {
  async getState() {
    return { status: "OK", exposureUsed: 10 };
  }

  async getTelemetry() {
    return [];
  }

  async getFleetStatus() {
    return [{ uldId: "JTN-7890" }];
  }

  async getAlerts() {
    return [];
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

class FakeReconciliationService {
  constructor() {
    this.jobs = [];
  }

  async enqueueVerification(uldId, trigger) {
    this.jobs.push({ uldId, trigger });
  }

  async listAudits() {
    return [];
  }
}

class FakeOneRecordService {
  async getUld() {
    return {
      payload: {
        "@context": "https://onerecord.iata.org/ns/cargo",
        "@id": "http://localhost:8080/api/ulds/JTN-7890",
        "@type": "LogisticsObject",
      },
    };
  }

  async createUld(payload) {
    return payload;
  }

  async updateUld(_uldId, payload) {
    return payload;
  }
}

test("auth middleware rejects missing bearer token when auth enabled", async () => {
  const middleware = authMiddleware({
    auth: {
      disabled: false,
      issuer: "http://example.com",
      audience: "api",
      jwksUri: "http://example.com/jwks",
    },
  });

  const response = createResponseRecorder();
  await middleware({ headers: {} }, response, () => {});

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error, "Missing bearer token");
});

test("status route returns data and enqueues verification when auth disabled", async () => {
  const reconciliationService = new FakeReconciliationService();
  const router = buildApiRouter({
    config: {
      auth: { disabled: true },
      operations: {
        airlineCode: "EK",
        primaryFlightNumber: "EK202",
        originAirport: "DXB",
        destinationAirport: "LHR",
      },
    },
    exposureRepository: new FakeExposureRepository(),
    operationsRepository: new FakeOperationsRepository(),
    analyticsService: new FakeAnalyticsService(),
    actionOrchestrator: { completeAction: async () => null },
    auditStore: new FakeAuditStore(),
    subscriptionRepository: new FakeSubscriptionRepository(),
    reconciliationService,
    oneRecordService: new FakeOneRecordService(),
    authMiddleware: (_req, _res, next) => next(),
  });

  const routeLayer = router.stack.find(
    (layer) => layer.route?.path === "/uld/:id/status" && layer.route?.methods?.get,
  );
  assert.ok(routeLayer, "Expected /uld/:id/status route");

  const response = createResponseRecorder();
  const req = { params: { id: "JTN-7890" } };

  await routeLayer.route.stack[0].handle(req, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status.status, "OK");
  assert.deepEqual(reconciliationService.jobs, [
    { uldId: "JTN-7890", trigger: "uld_status_read" },
  ]);
});

test("strict JSON-LD create route is exposed at /ulds", async () => {
  const router = buildApiRouter({
    config: {
      auth: { disabled: true },
      operations: {
        airlineCode: "EK",
        primaryFlightNumber: "EK202",
        originAirport: "DXB",
        destinationAirport: "LHR",
      },
    },
    exposureRepository: new FakeExposureRepository(),
    operationsRepository: new FakeOperationsRepository(),
    analyticsService: new FakeAnalyticsService(),
    actionOrchestrator: { completeAction: async () => null },
    auditStore: new FakeAuditStore(),
    subscriptionRepository: new FakeSubscriptionRepository(),
    reconciliationService: new FakeReconciliationService(),
    oneRecordService: new FakeOneRecordService(),
    authMiddleware: (_req, _res, next) => next(),
  });

  const routeLayer = router.stack.find(
    (layer) => layer.route?.path === "/ulds" && layer.route?.methods?.post,
  );
  assert.ok(routeLayer, "Expected /ulds POST route");

  const response = createResponseRecorder();
  const req = {
    headers: { "content-type": "application/ld+json" },
    body: {
      "@context": "https://onerecord.iata.org/ns/cargo",
      "@type": "LogisticsObject",
      serialNumber: "JTN-7890",
    },
  };

  await routeLayer.route.stack[0].handle(req, response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.headers["Content-Type"], "application/ld+json");
  assert.equal(response.body.serialNumber, "JTN-7890");
});

test("strict JSON-LD create route rejects non JSON-LD content type", async () => {
  const router = buildApiRouter({
    config: {
      auth: { disabled: true },
      operations: {
        airlineCode: "EK",
        primaryFlightNumber: "EK202",
        originAirport: "DXB",
        destinationAirport: "LHR",
      },
    },
    exposureRepository: new FakeExposureRepository(),
    operationsRepository: new FakeOperationsRepository(),
    analyticsService: new FakeAnalyticsService(),
    actionOrchestrator: { completeAction: async () => null },
    auditStore: new FakeAuditStore(),
    subscriptionRepository: new FakeSubscriptionRepository(),
    reconciliationService: new FakeReconciliationService(),
    oneRecordService: new FakeOneRecordService(),
    authMiddleware: (_req, _res, next) => next(),
  });

  const routeLayer = router.stack.find(
    (layer) => layer.route?.path === "/ulds" && layer.route?.methods?.post,
  );
  assert.ok(routeLayer, "Expected /ulds POST route");

  const response = createResponseRecorder();
  const req = {
    headers: { "content-type": "application/json" },
    body: {
      "@context": "https://onerecord.iata.org/ns/cargo",
      "@type": "LogisticsObject",
      serialNumber: "JTN-7890",
    },
  };

  await routeLayer.route.stack[0].handle(req, response);

  assert.equal(response.statusCode, 415);
  assert.equal(response.body.error, "Content-Type must be application/ld+json");
});

function createResponseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}
