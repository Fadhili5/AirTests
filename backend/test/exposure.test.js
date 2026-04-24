import test from "node:test";
import assert from "node:assert/strict";
import { computeExposureState } from "../src/domain/exposure.js";

test("increments cumulative exposure when above threshold", () => {
  const state = computeExposureState({
    previousState: {
      exposureUsed: 30,
      lastReadingAt: "2026-04-23T10:00:00.000Z",
    },
    reading: {
      uld_id: "JTN-7890",
      timestamp: "2026-04-23T10:05:00.000Z",
      temperature_celsius: 9.1,
      lat: 1,
      lon: 1,
      airport_code: "JFK",
      ambient_temp: 18,
      weather_condition: "Clear",
    },
    rule: {
      shipmentId: "AWB-1",
      productType: "Vaccines",
      minTempC: 2,
      maxTempC: 8,
      allowableExposureMinutes: 60,
    },
    maxGapMinutes: 30,
    warningPercent: 80,
  });

  assert.equal(state.exposureUsed, 35);
  assert.equal(state.status, "OK");
});

test("caps missing data gap at 30 minutes", () => {
  const state = computeExposureState({
    previousState: {
      exposureUsed: 0,
      lastReadingAt: "2026-04-23T10:00:00.000Z",
    },
    reading: {
      uld_id: "JTN-7890",
      timestamp: "2026-04-23T11:30:00.000Z",
      temperature_celsius: 11,
      lat: 1,
      lon: 1,
      airport_code: "JFK",
      ambient_temp: 18,
      weather_condition: "Clear",
    },
    rule: {
      shipmentId: "AWB-1",
      productType: "Vaccines",
      minTempC: 2,
      maxTempC: 8,
      allowableExposureMinutes: 60,
    },
    maxGapMinutes: 30,
    warningPercent: 80,
  });

  assert.equal(state.exposureUsed, 30);
  assert.equal(state.phaseExposure.tarmacMinutes, 30);
});
