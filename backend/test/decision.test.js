import test from "node:test";
import assert from "node:assert/strict";
import { buildOperationalContext } from "../src/domain/context.js";
import { buildDecisionPackage } from "../src/domain/decision.js";

test("detects tarmac exposure and handling gap", () => {
  const context = buildOperationalContext({
    reading: {
      lat: 40.6413,
      lon: -73.7781,
      temperature_celsius: 9.8,
      battery: 82,
      signal_rssi: -88,
      airport_zone: "TARMAC",
      time_on_tarmac_min: 18,
      flight_status: "DELAYED",
      delay_minutes: 22,
    },
    previousState: {
      lastLocation: { lat: 40.64131, lon: -73.77811 },
      lastTemperatureCelsius: 8.9,
    },
    weather: {
      ambient_temp: 34,
      weather_condition: "Clear",
    },
  });

  assert.equal(context.tarmacExposure, true);
  assert.equal(context.delayDetected, true);
  assert.equal(context.handlingGap, true);
});

test("creates preventive and critical actions from risk and breach", () => {
  const decision = buildDecisionPackage({
    rule: { minTempC: 2, maxTempC: 8 },
    status: { status: "BREACH", exposureRemaining: 0 },
    risk: { risk_score: 0.91, risk_level: "HIGH" },
    context: {
      delayDetected: true,
      handlingGap: true,
      tarmacExposure: true,
    },
  });

  assert.equal(decision.actions.some((item) => item.action === "Move ULD to controlled storage"), true);
  assert.equal(decision.actions.some((item) => item.action === "Require QA inspection"), true);
  assert.equal(decision.workflows.length > 0, true);
  assert.equal(decision.notifications.length > 0, true);
});
