import {
  AlertSeverity,
  AlertStatus,
  EventType,
  InterventionStatus,
  Prisma,
  RiskLevel,
  SyncStatus
} from "@prisma/client";
import { DashboardSnapshot, ShipmentSummary } from "@lending/shared";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { cacheDashboardSnapshot, publishLiveUpdate } from "./state-store";
import { evaluatePieceRisk } from "./risk-engine";
import { normalizeOneRecordDocument } from "./one-record-normalizer";

const toShipmentSummary = (
  shipment: Prisma.ShipmentGetPayload<{ include: { alerts: true } }>
): ShipmentSummary => ({
  shipmentId: shipment.id,
  awb: shipment.awb,
  revision: shipment.revision,
  pieceCount: shipment.pieceCount,
  activeAlerts: shipment.alerts.filter((alert) => alert.status === AlertStatus.OPEN).length,
  chainOfCustodyScore: shipment.chainOfCustodyScore,
  thermalRiskScore: shipment.thermalRiskScore,
  integrityScore: shipment.integrityScore,
  specialHandlingCodes: shipment.specialHandlingCodes,
  currentLocation: shipment.currentLocation
});

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

export const getDashboardSnapshot = async (): Promise<DashboardSnapshot> => {
  const [shipments, alerts, interventions, events, ulds, flights, pieces, thermal, custody] =
    await Promise.all([
      prisma.shipment.findMany({
        include: { alerts: true },
        orderBy: { updatedAt: "desc" },
        take: 20
      }),
      prisma.alert.findMany({
        where: { status: AlertStatus.OPEN },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.intervention.findMany({
        where: {
          status: {
            in: [InterventionStatus.OPEN, InterventionStatus.ACKNOWLEDGED, InterventionStatus.IN_PROGRESS]
          }
        }
      }),
      prisma.event.findMany({
        orderBy: { occurredAt: "desc" },
        take: 30
      }),
      prisma.uld.findMany({
        include: { flight: true },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.flight.count(),
      prisma.piece.count(),
      prisma.thermalState.count({ where: { riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] } } }),
      prisma.custodyState.count({ where: { outOfChainMinutes: { gt: 0 } } })
    ]);

  return {
    updatedAt: new Date().toISOString(),
    kpis: {
      shipments: shipments.length,
      pieces,
      flights,
      ulds: ulds.length,
      alertsOpen: alerts.length,
      interventionsOpen: interventions.length,
      thermalBreaches: thermal,
      custodyBreaks: custody
    },
    shipments: shipments.map(toShipmentSummary),
    tape: events.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt.toISOString(),
      type: event.type,
      pieceId: event.pieceId,
      shipmentId: event.shipmentId,
      location: event.location,
      message: event.message,
      severity: event.type === EventType.CUSTOMS_HOLD ? "HIGH" : "INFO"
    })),
    alerts: alerts.map((alert) => ({
      id: alert.id,
      shipmentId: alert.shipmentId,
      pieceId: alert.pieceId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      createdAt: alert.createdAt.toISOString()
    })),
    ulds: ulds.map((uld) => ({
      id: uld.id,
      serialNumber: uld.serialNumber,
      flightNumber: uld.flight?.flightNumber ?? null,
      locationCode: uld.locationCode,
      latitude: uld.latitude,
      longitude: uld.longitude,
      complianceStatus: uld.complianceStatus,
      riskLevel: uld.riskLevel,
      riskScore: uld.riskScore,
      exposureRemainingMinutes: uld.exposureRemainingMinutes
    }))
  };
};

export const ingestOneRecordDocument = async (source: string, document: Record<string, unknown>) => {
  const shipment = normalizeOneRecordDocument(source, document);

  const pieceEvaluations = shipment.pieces.map((piece) => ({
    piece,
    evaluation: evaluatePieceRisk(piece)
  }));

  const shipmentThermalRiskScore =
    pieceEvaluations.reduce((sum, entry) => sum + entry.evaluation.thermalScore, 0) /
      Math.max(1, pieceEvaluations.length) || 0;
  const shipmentCustodyScore =
    pieceEvaluations.reduce((sum, entry) => sum + entry.evaluation.chainOfCustodyScore, 0) /
      Math.max(1, pieceEvaluations.length) || 1;
  const shipmentIntegrityScore =
    pieceEvaluations.reduce((sum, entry) => sum + entry.evaluation.integrityScore, 0) /
      Math.max(1, pieceEvaluations.length) || 1;

  const persisted = await prisma.$transaction(async (tx) => {
    await tx.shipment.upsert({
      where: { id: shipment.shipmentId },
      create: {
        id: shipment.shipmentId,
        revision: shipment.revision,
        objectType: shipment.objectType,
        awb: shipment.awb,
        weightPayment: shipment.weightPayment,
        otherCharges: shipment.otherCharges,
        source: shipment.source,
        pieceCount: shipment.pieces.length,
        currentLocation: shipment.currentLocation,
        customsStatus: shipment.customsStatus,
        chainOfCustodyScore: shipmentCustodyScore,
        thermalRiskScore: shipmentThermalRiskScore,
        integrityScore: shipmentIntegrityScore,
        delayPredictionMin: shipment.delayPredictionMin,
        theftRiskScore: shipment.theftRiskScore,
        specialHandlingCodes: shipment.specialHandlingCodes,
        rawDocument: toJsonValue(shipment.rawDocument)
      },
      update: {
        revision: shipment.revision,
        awb: shipment.awb,
        weightPayment: shipment.weightPayment,
        otherCharges: shipment.otherCharges,
        source: shipment.source,
        pieceCount: shipment.pieces.length,
        currentLocation: shipment.currentLocation,
        customsStatus: shipment.customsStatus,
        chainOfCustodyScore: shipmentCustodyScore,
        thermalRiskScore: shipmentThermalRiskScore,
        integrityScore: shipmentIntegrityScore,
        delayPredictionMin: shipment.delayPredictionMin,
        theftRiskScore: shipment.theftRiskScore,
        specialHandlingCodes: shipment.specialHandlingCodes,
        rawDocument: toJsonValue(shipment.rawDocument)
      }
    });

    await tx.waybill.upsert({
      where: { shipmentId: shipment.shipmentId },
      create: {
        shipmentId: shipment.shipmentId,
        awb: shipment.awb,
        weightPayment: shipment.weightPayment,
        otherCharges: shipment.otherCharges
      },
      update: {
        awb: shipment.awb,
        weightPayment: shipment.weightPayment,
        otherCharges: shipment.otherCharges
      }
    });

    await tx.intervention.deleteMany({ where: { shipmentId: shipment.shipmentId } });
    await tx.alert.deleteMany({ where: { shipmentId: shipment.shipmentId } });
    await tx.riskState.deleteMany({ where: { shipmentId: shipment.shipmentId } });
    await tx.event.deleteMany({ where: { shipmentId: shipment.shipmentId } });
    await tx.sensorState.deleteMany({ where: { piece: { shipmentId: shipment.shipmentId } } });
    await tx.custodyState.deleteMany({ where: { piece: { shipmentId: shipment.shipmentId } } });
    await tx.thermalState.deleteMany({ where: { piece: { shipmentId: shipment.shipmentId } } });
    await tx.piece.deleteMany({ where: { shipmentId: shipment.shipmentId } });

    for (const { piece, evaluation } of pieceEvaluations) {
      await tx.piece.create({
        data: {
          id: piece.pieceId,
          shipmentId: shipment.shipmentId,
          description: piece.description,
          skeleton: piece.skeleton,
          specialHandlingCodes: piece.specialHandlingCodes,
          lengthCm: piece.lengthCm,
          widthCm: piece.widthCm,
          heightCm: piece.heightCm,
          volumeCm3: piece.volumeCm3,
          dimensionalWeightKg: piece.dimensionalWeightKg,
          volumetricScore: piece.volumetricScore,
          densityScore: piece.densityScore,
          stackability: piece.stackability,
          thermalExposureSurfaceArea: piece.thermalExposureSurfaceArea,
          fragilityRisk: piece.fragilityRisk,
          currentZone: piece.requiredZone,
          currentStatus: "INGESTED",
          handlerChain: [],
          customsStatus: shipment.customsStatus,
          chainOfCustodyScore: evaluation.chainOfCustodyScore,
          thermalScore: evaluation.thermalScore,
          integrityScore: evaluation.integrityScore,
          theftRiskScore: evaluation.theftRiskScore,
          metadata: toJsonValue({
            riskFlags: piece.riskFlags,
            inspectionProtocol: piece.inspectionProtocol,
            fireRisk: piece.fireRisk
          })
        }
      });

      await tx.riskState.create({
        data: {
          shipmentId: shipment.shipmentId,
          pieceId: piece.pieceId,
          calculatedAt: new Date(),
          riskScore: evaluation.riskScore,
          riskLevel: evaluation.riskLevel,
          predictedBreachMin: evaluation.predictedBreachMin,
          delayPredictionMin: evaluation.delayPredictionMin,
          theftRiskScore: evaluation.theftRiskScore,
          integrityScore: evaluation.integrityScore,
          customsRiskScore: evaluation.customsRiskScore,
          flags: evaluation.flags
        }
      });

      await tx.thermalState.create({
        data: {
          pieceId: piece.pieceId,
          recordedAt: new Date(),
          status: evaluation.predictedBreachMin !== null && evaluation.predictedBreachMin < 20 ? "AtRisk" : "OK",
          exposureUsedMinutes: Math.max(0, env.RISK_EXPOSURE_MINUTES - (evaluation.predictedBreachMin ?? env.RISK_EXPOSURE_MINUTES)),
          exposureRemainingMinutes: evaluation.predictedBreachMin ?? env.RISK_EXPOSURE_MINUTES,
          predictedBreachMinutes: evaluation.predictedBreachMin,
          riskLevel: evaluation.riskLevel
        }
      });

      for (const intervention of evaluation.interventions) {
        const alert = await tx.alert.create({
          data: {
            shipmentId: shipment.shipmentId,
            pieceId: piece.pieceId,
            type: intervention.action.toUpperCase().replace(/\s+/g, "_"),
            severity: intervention.priority as AlertSeverity,
            status: AlertStatus.OPEN,
            title: intervention.action,
            description: intervention.notes
          }
        });

        await tx.intervention.create({
          data: {
            alertId: alert.id,
            shipmentId: shipment.shipmentId,
            pieceId: piece.pieceId,
            action: intervention.action,
            assignedRole: intervention.assignedRole,
            slaDeadline: new Date(Date.now() + 20 * 60 * 1000),
            priority: intervention.priority as AlertSeverity,
            status: InterventionStatus.OPEN,
            verificationNotes: intervention.notes
          }
        });
      }
    }

    for (const event of shipment.events) {
      await tx.event.create({
        data: {
          shipmentId: shipment.shipmentId,
          occurredAt: event.occurredAt,
          type: event.type as EventType,
          location: event.location,
          zone: event.zone,
          handler: event.handler,
          message: event.message,
          metadata: event.metadata ? toJsonValue(event.metadata) : undefined
        }
      });
    }

    await tx.auditLog.create({
      data: {
        entityType: "Shipment",
        entityId: shipment.shipmentId,
        actionTaken: "ingested-one-record-document",
        syncStatus: SyncStatus.PENDING
      }
    });

    return tx.shipment.findUniqueOrThrow({
      where: { id: shipment.shipmentId },
      include: {
        pieces: true,
        alerts: true
      }
    });
  });

  const snapshot = await getDashboardSnapshot();
  await cacheDashboardSnapshot(snapshot);
  await publishLiveUpdate({
    type: "shipment.ingested",
    shipmentId: shipment.shipmentId,
    at: new Date().toISOString()
  });

  return persisted;
};

const interpolateRoute = (
  origin: { latitude: number | null; longitude: number | null },
  destination: { latitude: number | null; longitude: number | null },
  progress: number
) => {
  if (
    origin.latitude === null ||
    origin.longitude === null ||
    destination.latitude === null ||
    destination.longitude === null
  ) {
    return { latitude: null, longitude: null };
  }

  return {
    latitude: origin.latitude + (destination.latitude - origin.latitude) * progress,
    longitude: origin.longitude + (destination.longitude - origin.longitude) * progress
  };
};

const fetchLiveFlightState = async (flight: Prisma.FlightGetPayload<{ include: { origin: true; destination: true; ulds: true } }>) => {
  if (
    flight.origin.latitude === null ||
    flight.origin.longitude === null ||
    flight.destination.latitude === null ||
    flight.destination.longitude === null
  ) {
    return null;
  }

  const minLat = Math.min(flight.origin.latitude, flight.destination.latitude) - 3;
  const maxLat = Math.max(flight.origin.latitude, flight.destination.latitude) + 3;
  const minLon = Math.min(flight.origin.longitude, flight.destination.longitude) - 3;
  const maxLon = Math.max(flight.origin.longitude, flight.destination.longitude) + 3;

  try {
    const response = await fetch(
      `https://opensky-network.org/api/states/all?lamin=${minLat}&lomin=${minLon}&lamax=${maxLat}&lomax=${maxLon}`,
      { cache: "no-store", signal: AbortSignal.timeout(4000) }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      states?: Array<
        [
          string,
          string | null,
          string,
          number | null,
          number | null,
          number | null,
          number | null,
          number | null,
          boolean,
          number | null,
          number | null,
          number | null,
          number | null,
          number | null
        ]
      >;
    };

    const flightHint = flight.flightNumber.replace(/\s+/g, "").toUpperCase().replace(/^CX/, "CPA").slice(-4);
    const match = payload.states?.find((state) => (state[1] ?? "").replace(/\s+/g, "").toUpperCase().includes(flightHint));
    if (!match) {
      return null;
    }

    return {
      latitude: match[6],
      longitude: match[5],
      altitudeFt: Math.round(((match[13] ?? match[7] ?? 0) * 3.28084) / 100) * 100,
      speedKph: Math.round((match[9] ?? 0) * 3.6),
      heading: Math.round(match[10] ?? 0),
      onGround: match[8]
    };
  } catch {
    return null;
  }
};

export const listFlights = async () => {
  const flights = await prisma.flight.findMany({
    include: {
      origin: true,
      destination: true,
      ulds: true
    },
    orderBy: { scheduledDeparture: "asc" }
  });

  return Promise.all(
    flights.map(async (flight) => {
      const now = Date.now();
      const departure = flight.actualDeparture ?? flight.scheduledDeparture;
      const arrival = flight.actualArrival ?? flight.scheduledArrival;
      const total = Math.max(1, arrival.getTime() - departure.getTime());
      const progress = Math.max(0, Math.min(1, (now - departure.getTime()) / total));
      const fallbackPosition = interpolateRoute(flight.origin, flight.destination, progress);
      const live = await fetchLiveFlightState(flight);
      const etaMinutes = Math.max(0, Math.round((arrival.getTime() - now) / 60000));
      const delayMinutes = Math.max(0, Math.round((departure.getTime() - flight.scheduledDeparture.getTime()) / 60000));

      return {
        ...flight,
        livePosition: {
          latitude: live?.latitude ?? fallbackPosition.latitude,
          longitude: live?.longitude ?? fallbackPosition.longitude
        },
        altitudeFt: live?.altitudeFt ?? (flight.status === "AIRBORNE" ? 34000 : flight.status === "BOARDING" ? 0 : 12000),
        speedKph: live?.speedKph ?? (flight.status === "AIRBORNE" ? 910 : flight.status === "BOARDING" ? 0 : 640),
        heading: live?.heading ?? 92,
        etaMinutes,
        delayMinutes,
        cargoLoad: flight.ulds.length,
        source: live ? "live" : "estimated"
      };
    })
  );
};

export const listShipments = async () =>
  prisma.shipment.findMany({
    include: {
      pieces: true,
      alerts: true,
      riskStates: { orderBy: { calculatedAt: "desc" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" }
  });

export const listAlerts = async () =>
  prisma.alert.findMany({
    include: {
      interventions: true
    },
    orderBy: { createdAt: "desc" }
  });

export const listInterventions = async () =>
  prisma.intervention.findMany({
    include: {
      alert: true
    },
    orderBy: { createdAt: "desc" }
  });

export const updateInterventionStatus = async (
  interventionId: string,
  payload: { status: string; verificationNotes?: string; assignee?: string }
) => {
  const intervention = await prisma.intervention.update({
    where: { id: interventionId },
    data: {
      status: payload.status as InterventionStatus,
      verificationNotes: payload.verificationNotes,
      assignee: payload.assignee
    }
  });

  await publishLiveUpdate({
    type: "intervention.updated",
    interventionId,
    status: payload.status,
    at: new Date().toISOString()
  });

  return intervention;
};

export const ingestTelemetry = async (payload: {
  pieceId: string;
  internalTempC?: number;
  externalTempC?: number;
  humidity?: number;
  exposureMinutes: number;
  sunlight?: string;
  tiltDegrees?: number;
  source: string;
}) => {
  const piece = await prisma.piece.findUniqueOrThrow({ where: { id: payload.pieceId } });
  const breachDelta =
    payload.internalTempC !== undefined && payload.internalTempC > env.RISK_TEMP_MAX_C
      ? payload.internalTempC - env.RISK_TEMP_MAX_C
      : 0;
  const predictedBreachMinutes = Math.max(
    0,
    env.RISK_EXPOSURE_MINUTES - payload.exposureMinutes - Math.round(breachDelta * 6)
  );
  const riskScore = Math.min(1, breachDelta * 0.18 + payload.exposureMinutes / env.RISK_EXPOSURE_MINUTES);
  const riskLevel =
    riskScore >= 0.9
      ? RiskLevel.CRITICAL
      : riskScore >= 0.75
        ? RiskLevel.HIGH
        : riskScore >= 0.5
          ? RiskLevel.ELEVATED
          : RiskLevel.LOW;

  await prisma.sensorState.create({
    data: {
      pieceId: payload.pieceId,
      measuredAt: new Date(),
      internalTempC: payload.internalTempC,
      externalTempC: payload.externalTempC,
      humidity: payload.humidity,
      exposureMinutes: payload.exposureMinutes,
      sunlight: payload.sunlight,
      tiltDegrees: payload.tiltDegrees,
      source: payload.source
    }
  });

  await prisma.thermalState.create({
    data: {
      pieceId: payload.pieceId,
      recordedAt: new Date(),
      status: predictedBreachMinutes < 1 ? "Breach" : predictedBreachMinutes < 20 ? "AtRisk" : "OK",
      temperatureC: payload.internalTempC,
      ambientTemperatureC: payload.externalTempC,
      exposureUsedMinutes: payload.exposureMinutes,
      exposureRemainingMinutes: predictedBreachMinutes,
      predictedBreachMinutes,
      riskLevel
    }
  });

  await prisma.event.create({
    data: {
      shipmentId: piece.shipmentId,
      pieceId: payload.pieceId,
      occurredAt: new Date(),
      type: EventType.THERMAL_UPDATE,
      location: piece.currentZone,
      zone: piece.currentZone,
      message: `Passive sensor update: ${payload.internalTempC?.toFixed(1) ?? "n/a"}C internal`
    }
  });

  if (predictedBreachMinutes < 20) {
    const alert = await prisma.alert.create({
      data: {
        shipmentId: piece.shipmentId,
        pieceId: payload.pieceId,
        type: "THERMAL_EXCURSION",
        severity: predictedBreachMinutes < 1 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        status: AlertStatus.OPEN,
        title: "Thermal excursion risk",
        description: `Piece ${payload.pieceId} is approaching its thermal threshold.`
      }
    });

    await prisma.intervention.create({
      data: {
        alertId: alert.id,
        shipmentId: piece.shipmentId,
        pieceId: payload.pieceId,
        action: "Move ULD to controlled storage",
        assignedRole: "Warehouse Lead",
        slaDeadline: new Date(Date.now() + 10 * 60 * 1000),
        priority: predictedBreachMinutes < 1 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        status: InterventionStatus.OPEN,
        verificationNotes: "Generated from passive temperature telemetry."
      }
    });
  }

  const snapshot = await getDashboardSnapshot();
  await cacheDashboardSnapshot(snapshot);
  await publishLiveUpdate({ type: "telemetry.ingested", pieceId: payload.pieceId, at: new Date().toISOString() });
};

export const ingestCustody = async (payload: {
  pieceId: string;
  fromZone?: string;
  toZone?: string;
  handler?: string;
  verifiedBy?: string;
  status: string;
  outOfChainMinutes: number;
  tamperProbability: number;
  reloadMatchScore: number;
  identityConfidence: number;
}) => {
  const piece = await prisma.piece.findUniqueOrThrow({ where: { id: payload.pieceId } });

  await prisma.custodyState.create({
    data: {
      pieceId: payload.pieceId,
      recordedAt: new Date(),
      fromZone: payload.fromZone,
      toZone: payload.toZone,
      handler: payload.handler,
      verifiedBy: payload.verifiedBy,
      status: payload.status,
      outOfChainMinutes: payload.outOfChainMinutes,
      tamperProbability: payload.tamperProbability,
      reloadMatchScore: payload.reloadMatchScore,
      identityConfidence: payload.identityConfidence
    }
  });

  await prisma.event.create({
    data: {
      shipmentId: piece.shipmentId,
      pieceId: payload.pieceId,
      occurredAt: new Date(),
      type: EventType.CUSTODY_TRANSFER,
      location: payload.toZone ?? payload.fromZone,
      zone: payload.toZone,
      handler: payload.handler,
      message: `Custody transfer verified for ${payload.pieceId}`
    }
  });

  if (payload.outOfChainMinutes > 0 || payload.tamperProbability > 0.5) {
    await prisma.alert.create({
      data: {
        shipmentId: piece.shipmentId,
        pieceId: payload.pieceId,
        type: "CUSTODY_BREAK",
        severity: payload.outOfChainMinutes > 10 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        status: AlertStatus.OPEN,
        title: "Custody breakpoint detected",
        description: `Piece ${payload.pieceId} left chain of custody for ${payload.outOfChainMinutes} minutes.`
      }
    });
  }

  const snapshot = await getDashboardSnapshot();
  await cacheDashboardSnapshot(snapshot);
  await publishLiveUpdate({ type: "custody.ingested", pieceId: payload.pieceId, at: new Date().toISOString() });
};

export const bootstrapOperationalModel = async () => {
  const airports = [
    {
      code: env.OPS_PRIMARY_ORIGIN,
      name: "Dubai International",
      country: "United Arab Emirates",
      timezone: "Asia/Dubai",
      latitude: 25.2532,
      longitude: 55.3657
    },
    {
      code: env.OPS_PRIMARY_DESTINATION,
      name: "Heathrow",
      country: "United Kingdom",
      timezone: "Europe/London",
      latitude: 51.47,
      longitude: -0.4543
    },
    {
      code: "HKG",
      name: "Hong Kong International",
      country: "Hong Kong",
      timezone: "Asia/Hong_Kong",
      latitude: 22.308,
      longitude: 113.9185
    },
    {
      code: "LAX",
      name: "Los Angeles International",
      country: "United States",
      timezone: "America/Los_Angeles",
      latitude: 33.9416,
      longitude: -118.4085
    },
    {
      code: "JFK",
      name: "John F. Kennedy International",
      country: "United States",
      timezone: "America/New_York",
      latitude: 40.6413,
      longitude: -73.7781
    },
    {
      code: "FRA",
      name: "Frankfurt Airport",
      country: "Germany",
      timezone: "Europe/Berlin",
      latitude: 50.0379,
      longitude: 8.5622
    },
    {
      code: "AMS",
      name: "Amsterdam Schiphol",
      country: "Netherlands",
      timezone: "Europe/Amsterdam",
      latitude: 52.31,
      longitude: 4.7683
    }
  ];

  for (const airport of airports) {
    await prisma.airport.upsert({
      where: { code: airport.code },
      create: airport,
      update: airport
    });
  }

  const flights = [
    {
      flightNumber: env.OPS_PRIMARY_FLIGHT,
      callsign: `${env.OPS_PRIMARY_FLIGHT}C`,
      originCode: env.OPS_PRIMARY_ORIGIN,
      destinationCode: env.OPS_PRIMARY_DESTINATION,
      status: "DELAYED" as const,
      scheduledDeparture: new Date(Date.now() + 30 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 8 * 60 * 60 * 1000),
      aircraftCode: "B77W"
    },
    {
      flightNumber: "CX880",
      callsign: "CPA880",
      originCode: "HKG",
      destinationCode: "LAX",
      status: "BOARDING" as const,
      scheduledDeparture: new Date(Date.now() + 45 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 13 * 60 * 60 * 1000),
      aircraftCode: "B77W"
    },
    {
      flightNumber: "CX840",
      callsign: "CPA840",
      originCode: "HKG",
      destinationCode: "JFK",
      status: "SCHEDULED" as const,
      scheduledDeparture: new Date(Date.now() + 90 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 16 * 60 * 60 * 1000),
      aircraftCode: "B77W"
    },
    {
      flightNumber: "CX289",
      callsign: "CPA289",
      originCode: "HKG",
      destinationCode: "FRA",
      status: "DELAYED" as const,
      scheduledDeparture: new Date(Date.now() + 20 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 12 * 60 * 60 * 1000),
      aircraftCode: "A359"
    },
    {
      flightNumber: "CX271",
      callsign: "CPA271",
      originCode: "HKG",
      destinationCode: "AMS",
      status: "BOARDING" as const,
      scheduledDeparture: new Date(Date.now() + 65 * 60 * 1000),
      scheduledArrival: new Date(Date.now() + 12 * 60 * 60 * 1000),
      aircraftCode: "A359"
    }
  ];

  for (const flight of flights) {
    await prisma.flight.upsert({
      where: { flightNumber: flight.flightNumber },
      create: flight,
      update: flight
    });
  }

  if (!env.CARGO_SEED_DEMO && env.NODE_ENV === "production") {
    return;
  }

  const seedScenarios = [
    {
      shipmentId: "seed-hkg-lax-pharma",
      awb: "160-88001001",
      source: "seed",
      currentLocation: "HKG-COLD-ROOM-A",
      customsStatus: "Cleared",
      specialHandlingCodes: ["EAP", "ELI"],
      flightNumber: "CX880",
      uldSerial: "AKE90001CX",
      uldLocationCode: "HKG-RAMP-A",
      uldRiskLevel: RiskLevel.HIGH,
      uldRiskScore: 0.78,
      pieces: [
        {
          id: "piece-hkg-lax-1",
          description: "PHARMA SENSOR KIT",
          lengthCm: 120,
          widthCm: 80,
          heightCm: 96,
          volumeCm3: 921600,
          dimensionalWeightKg: 153.6,
          volumetricScore: 0.82,
          densityScore: 0.58,
          stackability: 1.18,
          thermalExposureSurfaceArea: 57600,
          fragilityRisk: 0.84,
          thermalScore: 0.74,
          chainOfCustodyScore: 0.8,
          integrityScore: 0.69,
          theftRiskScore: 0.42,
          currentZone: "COLD_ROOM",
          currentStatus: "STORED",
          specialHandlingCodes: ["EAP", "ELI"]
        },
        {
          id: "piece-hkg-lax-2",
          description: "THERMAL PALLET",
          lengthCm: 104,
          widthCm: 84,
          heightCm: 92,
          volumeCm3: 803712,
          dimensionalWeightKg: 133.95,
          volumetricScore: 0.73,
          densityScore: 0.62,
          stackability: 1.29,
          thermalExposureSurfaceArea: 52192,
          fragilityRisk: 0.71,
          thermalScore: 0.63,
          chainOfCustodyScore: 0.83,
          integrityScore: 0.73,
          theftRiskScore: 0.38,
          currentZone: "DOCK-3",
          currentStatus: "MOVED",
          specialHandlingCodes: ["EAP"]
        }
      ],
      events: [
        { type: EventType.SCANNED_IN, message: "Cargo scanned in at Hong Kong cool chain gate", location: "HKG-COLD-ROOM-A" },
        { type: EventType.THERMAL_UPDATE, message: "Passive temp alert: temp rise +1.4C on dock approach", location: "HKG-DOCK-3" },
        { type: EventType.CUSTODY_TRANSFER, message: "Custody transfer verified from warehouse to ramp", location: "HKG-RAMP-A" }
      ],
      alerts: [
        {
          type: "THERMAL_EXCURSION",
          severity: AlertSeverity.HIGH,
          title: "Thermal pressure on HKG -> LAX lane",
          description: "Ramp dwell is compressing exposure remaining for pharma cargo."
        }
      ]
    },
    {
      shipmentId: "seed-hkg-jfk-electronics",
      awb: "160-84001002",
      source: "seed",
      currentLocation: "HKG-SECURE-STAGING",
      customsStatus: "Security Review",
      specialHandlingCodes: ["ECC", "VUN", "EAP"],
      flightNumber: "CX840",
      uldSerial: "AKE90002CX",
      uldLocationCode: "HKG-SECURE-BAY",
      uldRiskLevel: RiskLevel.ELEVATED,
      uldRiskScore: 0.61,
      pieces: [
        {
          id: "piece-hkg-jfk-1",
          description: "HIGH VALUE ELECTRONICS",
          lengthCm: 95,
          widthCm: 74,
          heightCm: 79,
          volumeCm3: 555370,
          dimensionalWeightKg: 92.56,
          volumetricScore: 0.64,
          densityScore: 0.7,
          stackability: 1.33,
          thermalExposureSurfaceArea: 40402,
          fragilityRisk: 0.68,
          thermalScore: 0.45,
          chainOfCustodyScore: 0.71,
          integrityScore: 0.76,
          theftRiskScore: 0.73,
          currentZone: "SECURE_STAGING",
          currentStatus: "RFID_VERIFIED",
          specialHandlingCodes: ["ECC", "VUN", "EAP"]
        }
      ],
      events: [
        { type: EventType.RFID_VERIFIED, message: "RFID verified for high-value cargo", location: "HKG-SECURE-STAGING" },
        { type: EventType.CUSTOMS_HOLD, message: "Security hold pending outbound screening release", location: "HKG-CUSTOMS" }
      ],
      alerts: [
        {
          type: "CUSTODY_BREAK",
          severity: AlertSeverity.HIGH,
          title: "Sensitive cargo requires restricted handling roster",
          description: "High-value lane flagged for enhanced chain-of-custody control."
        }
      ]
    },
    {
      shipmentId: "seed-hkg-fra-pharma",
      awb: "160-28901003",
      source: "seed",
      currentLocation: "HKG-APRON-WEST",
      customsStatus: "Cleared",
      specialHandlingCodes: ["EAP", "ELI"],
      flightNumber: "CX289",
      uldSerial: "PMC70001CX",
      uldLocationCode: "HKG-APRON-WEST",
      uldRiskLevel: RiskLevel.CRITICAL,
      uldRiskScore: 0.91,
      pieces: [
        {
          id: "piece-hkg-fra-1",
          description: "BIOPHARMA ACTIVE CONTAINER",
          lengthCm: 140,
          widthCm: 96,
          heightCm: 118,
          volumeCm3: 1585920,
          dimensionalWeightKg: 264.32,
          volumetricScore: 0.93,
          densityScore: 0.52,
          stackability: 1.02,
          thermalExposureSurfaceArea: 82624,
          fragilityRisk: 0.91,
          thermalScore: 0.89,
          chainOfCustodyScore: 0.76,
          integrityScore: 0.62,
          theftRiskScore: 0.41,
          currentZone: "APRON",
          currentStatus: "MOVED",
          specialHandlingCodes: ["EAP", "ELI"]
        }
      ],
      events: [
        { type: EventType.MOVED, message: "Moved cold room to apron staging", location: "HKG-APRON-WEST" },
        { type: EventType.THERMAL_UPDATE, message: "Temp rise +2.1C during apron hold", location: "HKG-APRON-WEST" },
        { type: EventType.ALERT_RAISED, message: "Critical exposure threshold approaching before FRA departure", location: "HKG-APRON-WEST" }
      ],
      alerts: [
        {
          type: "THERMAL_EXCURSION",
          severity: AlertSeverity.CRITICAL,
          title: "Critical thermal escalation on HKG -> FRA cargo",
          description: "Exposure remaining is below intervention threshold."
        }
      ]
    },
    {
      shipmentId: "seed-hkg-ams-general",
      awb: "160-27101004",
      source: "seed",
      currentLocation: "HKG-BONDED-AREA",
      customsStatus: "Bonded Hold",
      specialHandlingCodes: ["ECC"],
      flightNumber: "CX271",
      uldSerial: "AKE90003CX",
      uldLocationCode: "HKG-BONDED-AREA",
      uldRiskLevel: RiskLevel.GUARDED,
      uldRiskScore: 0.39,
      pieces: [
        {
          id: "piece-hkg-ams-1",
          description: "CONSOL E-COMMERCE",
          lengthCm: 84,
          widthCm: 64,
          heightCm: 53,
          volumeCm3: 285312,
          dimensionalWeightKg: 47.55,
          volumetricScore: 0.42,
          densityScore: 0.76,
          stackability: 1.51,
          thermalExposureSurfaceArea: 26456,
          fragilityRisk: 0.44,
          thermalScore: 0.28,
          chainOfCustodyScore: 0.84,
          integrityScore: 0.83,
          theftRiskScore: 0.54,
          currentZone: "BONDED_AREA",
          currentStatus: "STORED",
          specialHandlingCodes: ["ECC"]
        }
      ],
      events: [
        { type: EventType.STORED, message: "Cargo staged in bonded area awaiting load release", location: "HKG-BONDED-AREA" },
        { type: EventType.CUSTODY_TRANSFER, message: "Custody transfer verified to export warehouse team", location: "HKG-BONDED-AREA" }
      ],
      alerts: []
    }
  ];

  const riskLevelRank: Record<RiskLevel, number> = {
    LOW: 1,
    GUARDED: 2,
    ELEVATED: 3,
    HIGH: 4,
    CRITICAL: 5
  };

  for (const scenario of seedScenarios) {
    const flight = await prisma.flight.findUniqueOrThrow({ where: { flightNumber: scenario.flightNumber } });

    await prisma.shipment.upsert({
      where: { id: scenario.shipmentId },
      create: {
        id: scenario.shipmentId,
        revision: 0,
        objectType: "Shipment",
        awb: scenario.awb,
        source: scenario.source,
        pieceCount: scenario.pieces.length,
        currentLocation: scenario.currentLocation,
        customsStatus: scenario.customsStatus,
        chainOfCustodyScore:
          scenario.pieces.reduce((sum, piece) => sum + piece.chainOfCustodyScore, 0) / scenario.pieces.length,
        thermalRiskScore:
          scenario.pieces.reduce((sum, piece) => sum + piece.thermalScore, 0) / scenario.pieces.length,
        integrityScore:
          scenario.pieces.reduce((sum, piece) => sum + piece.integrityScore, 0) / scenario.pieces.length,
        delayPredictionMin: Math.round(
          scenario.pieces.reduce((sum, piece) => sum + piece.thermalScore * 30, 0) / scenario.pieces.length
        ),
        theftRiskScore:
          scenario.pieces.reduce((sum, piece) => sum + piece.theftRiskScore, 0) / scenario.pieces.length,
        specialHandlingCodes: scenario.specialHandlingCodes,
        rawDocument: toJsonValue({
          seed: true,
          lane: `${flight.originCode}-${flight.destinationCode}`
        })
      },
      update: {
        awb: scenario.awb,
        pieceCount: scenario.pieces.length,
        currentLocation: scenario.currentLocation,
        customsStatus: scenario.customsStatus,
        specialHandlingCodes: scenario.specialHandlingCodes,
        rawDocument: toJsonValue({
          seed: true,
          lane: `${flight.originCode}-${flight.destinationCode}`
        })
      }
    });

    await prisma.waybill.upsert({
      where: { shipmentId: scenario.shipmentId },
      create: {
        shipmentId: scenario.shipmentId,
        awb: scenario.awb,
        weightPayment: "Prepaid",
        otherCharges: "Prepaid"
      },
      update: {
        awb: scenario.awb,
        weightPayment: "Prepaid",
        otherCharges: "Prepaid"
      }
    });

    await prisma.uld.upsert({
      where: { serialNumber: scenario.uldSerial },
      create: {
        serialNumber: scenario.uldSerial,
        flightId: flight.id,
        shipmentId: scenario.shipmentId,
        locationCode: scenario.uldLocationCode,
        complianceStatus: riskLevelRank[scenario.uldRiskLevel] >= riskLevelRank[RiskLevel.HIGH] ? "AtRisk" : "OK",
        exposureUsedMinutes: Math.round(scenario.uldRiskScore * env.RISK_EXPOSURE_MINUTES),
        exposureRemainingMinutes: Math.max(0, env.RISK_EXPOSURE_MINUTES - Math.round(scenario.uldRiskScore * env.RISK_EXPOSURE_MINUTES)),
        riskLevel: scenario.uldRiskLevel,
        riskScore: scenario.uldRiskScore
      },
      update: {
        flightId: flight.id,
        shipmentId: scenario.shipmentId,
        locationCode: scenario.uldLocationCode,
        complianceStatus: riskLevelRank[scenario.uldRiskLevel] >= riskLevelRank[RiskLevel.HIGH] ? "AtRisk" : "OK",
        exposureUsedMinutes: Math.round(scenario.uldRiskScore * env.RISK_EXPOSURE_MINUTES),
        exposureRemainingMinutes: Math.max(0, env.RISK_EXPOSURE_MINUTES - Math.round(scenario.uldRiskScore * env.RISK_EXPOSURE_MINUTES)),
        riskLevel: scenario.uldRiskLevel,
        riskScore: scenario.uldRiskScore
      }
    });

    await prisma.intervention.deleteMany({ where: { shipmentId: scenario.shipmentId } });
    await prisma.alert.deleteMany({ where: { shipmentId: scenario.shipmentId } });
    await prisma.event.deleteMany({ where: { shipmentId: scenario.shipmentId } });
    await prisma.sensorState.deleteMany({ where: { piece: { shipmentId: scenario.shipmentId } } });
    await prisma.custodyState.deleteMany({ where: { piece: { shipmentId: scenario.shipmentId } } });
    await prisma.thermalState.deleteMany({ where: { piece: { shipmentId: scenario.shipmentId } } });
    await prisma.riskState.deleteMany({ where: { shipmentId: scenario.shipmentId } });
    await prisma.piece.deleteMany({ where: { shipmentId: scenario.shipmentId } });

    for (const piece of scenario.pieces) {
      await prisma.piece.create({
        data: {
          id: piece.id,
          shipmentId: scenario.shipmentId,
          description: piece.description,
          skeleton: false,
          specialHandlingCodes: piece.specialHandlingCodes,
          lengthCm: piece.lengthCm,
          widthCm: piece.widthCm,
          heightCm: piece.heightCm,
          volumeCm3: piece.volumeCm3,
          dimensionalWeightKg: piece.dimensionalWeightKg,
          volumetricScore: piece.volumetricScore,
          densityScore: piece.densityScore,
          stackability: piece.stackability,
          thermalExposureSurfaceArea: piece.thermalExposureSurfaceArea,
          fragilityRisk: piece.fragilityRisk,
          currentZone: piece.currentZone,
          currentStatus: piece.currentStatus,
          handlerChain: ["Warehouse Ops", "Ramp Control"],
          customsStatus: scenario.customsStatus,
          chainOfCustodyScore: piece.chainOfCustodyScore,
          thermalScore: piece.thermalScore,
          integrityScore: piece.integrityScore,
          theftRiskScore: piece.theftRiskScore,
          uldId: (await prisma.uld.findUniqueOrThrow({ where: { serialNumber: scenario.uldSerial } })).id,
          metadata: toJsonValue({
            seed: true,
            lane: `${flight.originCode}-${flight.destinationCode}`
          })
        }
      });

      const pieceRiskLevel =
        piece.thermalScore > 0.85
          ? RiskLevel.CRITICAL
          : piece.thermalScore > 0.65
            ? RiskLevel.HIGH
            : piece.thermalScore > 0.45
              ? RiskLevel.ELEVATED
              : RiskLevel.GUARDED;

      await prisma.riskState.create({
        data: {
          shipmentId: scenario.shipmentId,
          pieceId: piece.id,
          calculatedAt: new Date(),
          riskScore: Math.max(piece.thermalScore, piece.theftRiskScore),
          riskLevel: pieceRiskLevel,
          predictedBreachMin: Math.max(0, Math.round(env.RISK_EXPOSURE_MINUTES * (1 - piece.thermalScore))),
          delayPredictionMin: Math.round(piece.thermalScore * 40),
          theftRiskScore: piece.theftRiskScore,
          integrityScore: piece.integrityScore,
          customsRiskScore: scenario.customsStatus === "Security Review" ? 0.74 : 0.28,
          flags: piece.specialHandlingCodes
        }
      });

      await prisma.thermalState.create({
        data: {
          pieceId: piece.id,
          recordedAt: new Date(),
          status: piece.thermalScore > 0.8 ? "BreachWatch" : piece.thermalScore > 0.55 ? "AtRisk" : "OK",
          temperatureC: piece.thermalScore > 0.8 ? 9.4 : piece.thermalScore > 0.55 ? 7.2 : 4.8,
          ambientTemperatureC: flight.originCode === "HKG" ? 31.2 : 24.5,
          exposureUsedMinutes: Math.round(piece.thermalScore * env.RISK_EXPOSURE_MINUTES),
          exposureRemainingMinutes: Math.max(0, env.RISK_EXPOSURE_MINUTES - Math.round(piece.thermalScore * env.RISK_EXPOSURE_MINUTES)),
          predictedBreachMinutes: Math.max(0, Math.round(env.RISK_EXPOSURE_MINUTES * (1 - piece.thermalScore))),
          riskLevel: pieceRiskLevel
        }
      });

      await prisma.sensorState.create({
        data: {
          pieceId: piece.id,
          measuredAt: new Date(),
          internalTempC: piece.thermalScore > 0.8 ? 9.4 : piece.thermalScore > 0.55 ? 7.2 : 4.8,
          externalTempC: flight.originCode === "HKG" ? 31.2 : 24.5,
          humidity: 68,
          exposureMinutes: Math.round(piece.thermalScore * env.RISK_EXPOSURE_MINUTES),
          sunlight: piece.currentZone === "APRON" ? "high" : "medium",
          tiltDegrees: 2,
          source: "seed-hkg-lanes"
        }
      });

      await prisma.custodyState.create({
        data: {
          pieceId: piece.id,
          recordedAt: new Date(),
          fromZone: "RECEIVING",
          toZone: piece.currentZone,
          handler: "Ground Handler Team Alpha",
          verifiedBy: "Ops Supervisor",
          status: piece.currentStatus,
          outOfChainMinutes: piece.theftRiskScore > 0.6 ? 12 : 0,
          tamperProbability: piece.theftRiskScore > 0.6 ? 0.58 : 0.14,
          reloadMatchScore: 0.94,
          identityConfidence: 0.96
        }
      });
    }

    for (const event of scenario.events) {
      await prisma.event.create({
        data: {
          shipmentId: scenario.shipmentId,
          pieceId: scenario.pieces[0]?.id,
          occurredAt: new Date(Date.now() - 15 * 60 * 1000),
          type: event.type,
          location: event.location,
          zone: event.location,
          handler: "Operations Control",
          message: event.message
        }
      });
    }

    for (const alert of scenario.alerts) {
      const createdAlert = await prisma.alert.create({
        data: {
          shipmentId: scenario.shipmentId,
          pieceId: scenario.pieces[0]?.id,
          type: alert.type,
          severity: alert.severity,
          status: AlertStatus.OPEN,
          title: alert.title,
          description: alert.description
        }
      });

      await prisma.intervention.create({
        data: {
          alertId: createdAlert.id,
          shipmentId: scenario.shipmentId,
          pieceId: scenario.pieces[0]?.id,
          action:
            alert.severity === AlertSeverity.CRITICAL
              ? "Expedite loading and apply thermal protection"
              : "Verify custody handoff and adjust staging zone",
          assignedRole: alert.severity === AlertSeverity.CRITICAL ? "Ramp Control" : "Security Supervisor",
          slaDeadline: new Date(Date.now() + (alert.severity === AlertSeverity.CRITICAL ? 10 : 20) * 60 * 1000),
          priority: alert.severity,
          status: InterventionStatus.OPEN,
          verificationNotes: "Seeded operational intervention for control tower validation."
        }
      });
    }
  }
};

export const getPlatformSummary = async () => {
  const snapshot = await getDashboardSnapshot();
  return {
    name: "AeroSentinel",
    mode: env.NODE_ENV,
    productionPosture: {
      allowSimulatorData: env.ALLOW_SIMULATOR_DATA,
      requireSignedIntegrations: env.REQUIRE_SIGNED_INTEGRATIONS,
      cargoSeedDemo: env.CARGO_SEED_DEMO
    },
    loop: ["Sense", "Analyze", "Predict", "Act", "Verify", "Audit"],
    snapshot
  };
};

export const getFleetView = async () => {
  const flights = await listFlights();
  return flights.map((flight) => ({
    id: flight.id,
    flightNumber: flight.flightNumber,
    aircraftCode: flight.aircraftCode,
    status: flight.status,
    route: `${flight.originCode} -> ${flight.destinationCode}`,
    uldCount: flight.ulds.length
  }));
};

export const getControlCenter = async () => {
  const [snapshot, interventions] = await Promise.all([getDashboardSnapshot(), listInterventions()]);
  return {
    tower: snapshot,
    interventions: interventions.slice(0, 10),
    priorities: snapshot.alerts.slice(0, 5)
  };
};

export const getAnalyticsSummary = async () => {
  const shipments = await listShipments();
  const pieces = shipments.flatMap((shipment) => shipment.pieces);
  const average = (values: Array<number | null>) => {
    const usable = values.filter((value): value is number => value !== null);
    return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
  };

  return {
    shipments: shipments.length,
    pieces: pieces.length,
    avgHeightCm: average(pieces.map((piece) => piece.heightCm)),
    avgWidthCm: average(pieces.map((piece) => piece.widthCm)),
    avgLengthCm: average(pieces.map((piece) => piece.lengthCm)),
    denseCargoCount: pieces.filter((piece) => (piece.densityScore ?? 0) > 65).length,
    fragileCargoCount: pieces.filter((piece) => (piece.fragilityRisk ?? 0) > 0.75).length,
    specialHandlingCluster: [...new Set(pieces.flatMap((piece) => piece.specialHandlingCodes))]
  };
};

export const listAuditLogs = async () =>
  prisma.auditLog.findMany({
    orderBy: { loggedAt: "desc" },
    take: 100
  });

export const getVerificationAudit = async () =>
  prisma.auditLog.findMany({
    where: { entityType: "ULD" },
    orderBy: { loggedAt: "desc" },
    take: 100
  });

export const getUldStatus = async (uldId: string) =>
  prisma.uld.findUniqueOrThrow({
    where: { id: uldId },
    include: { flight: true, pieces: true }
  });

export const getUldActions = async (uldId: string) =>
  prisma.intervention.findMany({
    where: {
      OR: [{ piece: { uldId } }, { shipment: { ulds: { some: { id: uldId } } } }]
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

export const getUldWorkflows = async (uldId: string) =>
  prisma.alert.findMany({
    where: {
      OR: [{ piece: { uldId } }, { shipment: { ulds: { some: { id: uldId } } } }]
    },
    include: { interventions: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });

export const getUldTimeline = async (uldId: string) =>
  prisma.event.findMany({
    where: {
      OR: [{ piece: { uldId } }, { shipment: { ulds: { some: { id: uldId } } } }]
    },
    orderBy: { occurredAt: "desc" },
    take: 100
  });

export const listCargoCustody = async () =>
  prisma.custodyState.findMany({
    include: { piece: true },
    orderBy: { recordedAt: "desc" },
    take: 200
  });

export const getCargoHistory = async (cargoId: string) =>
  prisma.event.findMany({
    where: { pieceId: cargoId },
    orderBy: { occurredAt: "desc" },
    take: 100
  });

export const getCargoLocation = async (cargoId: string) => {
  const piece = await prisma.piece.findUniqueOrThrow({ where: { id: cargoId } });
  const latestCustody = await prisma.custodyState.findFirst({
    where: { pieceId: cargoId },
    orderBy: { recordedAt: "desc" }
  });
  return {
    cargoId,
    zone: latestCustody?.toZone ?? piece.currentZone,
    status: piece.currentStatus,
    customsStatus: piece.customsStatus
  };
};

export const getCargoRisk = async (cargoId: string) => {
  const piece = await prisma.piece.findUniqueOrThrow({
    where: { id: cargoId },
    include: {
      riskStates: { orderBy: { calculatedAt: "desc" }, take: 1 },
      thermalStates: { orderBy: { recordedAt: "desc" }, take: 1 }
    }
  });

  return {
    cargoId,
    thermalScore: piece.thermalScore,
    chainOfCustodyScore: piece.chainOfCustodyScore,
    integrityScore: piece.integrityScore,
    theftRiskScore: piece.theftRiskScore,
    latestRisk: piece.riskStates[0] ?? null,
    latestThermal: piece.thermalStates[0] ?? null
  };
};

const appendCargoEvent = async (
  cargoId: string,
  type: EventType,
  message: string,
  zone?: string,
  handler?: string
) => {
  const piece = await prisma.piece.findUniqueOrThrow({ where: { id: cargoId } });
  await prisma.event.create({
    data: {
      shipmentId: piece.shipmentId,
      pieceId: cargoId,
      occurredAt: new Date(),
      type,
      location: zone ?? piece.currentZone,
      zone: zone ?? piece.currentZone,
      handler,
      message
    }
  });
  await prisma.piece.update({
    where: { id: cargoId },
    data: {
      currentZone: zone ?? piece.currentZone,
      currentStatus: type
    }
  });
  await publishLiveUpdate({ type: "cargo.event", cargoId, eventType: type, at: new Date().toISOString() });
};

export const cargoScanOut = async (cargoId: string, zone?: string, handler?: string) =>
  appendCargoEvent(cargoId, EventType.SCANNED_OUT, `Cargo ${cargoId} scanned out`, zone, handler);

export const cargoScanIn = async (cargoId: string, zone?: string, handler?: string) =>
  appendCargoEvent(cargoId, EventType.SCANNED_IN, `Cargo ${cargoId} scanned in`, zone, handler);

export const cargoVerify = async (cargoId: string, zone?: string, handler?: string) =>
  appendCargoEvent(cargoId, EventType.RFID_VERIFIED, `RFID verified for ${cargoId}`, zone, handler);

export const cargoReload = async (cargoId: string, zone?: string, handler?: string) =>
  appendCargoEvent(cargoId, EventType.RELOADED, `Cargo ${cargoId} reloaded`, zone, handler);

export const getCargoVideo = async (cargoId: string) => {
  const history = await getCargoHistory(cargoId);
  return {
    cargoId,
    clips: history.slice(0, 10).map((event, index) => ({
      eventId: event.id,
      clipType: event.type.toLowerCase(),
      anomalyMarkers: event.type === EventType.CUSTOMS_HOLD || event.type === EventType.ALERT_RAISED ? [12, 28] : [18],
      replayUrl: `/api/cargo/video/${cargoId}/${event.id}/replay`,
      keyframes: [0, 12, 24].map((frameIndex) => ({
        frameIndex,
        url: `/api/cargo/video/${cargoId}/${event.id}/frame/${frameIndex}`
      })),
      generatedAt: new Date(Date.now() - index * 30_000).toISOString()
    }))
  };
};

export const getCargoVideoReplay = async (cargoId: string, eventId: string) => {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  return {
    cargoId,
    eventId,
    context: event.message,
    anomalyMarkers: [6, 18, 32],
    frames: Array.from({ length: 40 }, (_, index) => ({
      frameIndex: index,
      label: `${event.type} frame ${index}`,
      url: `/api/cargo/video/${cargoId}/${eventId}/frame/${index}`
    }))
  };
};

export const getCargoVideoFrame = async (cargoId: string, eventId: string, frameIndex: number) => ({
  cargoId,
  eventId,
  frameIndex,
  renderedOverlay: {
    title: "Forensic replay frame",
    annotations: [`Cargo ${cargoId}`, `Frame ${frameIndex}`, "Anomaly overlay available"]
  }
});

export const getReferenceShipment = async () =>
  prisma.shipment.findFirst({
    include: { pieces: true, waybill: true },
    orderBy: { createdAt: "asc" }
  });

const toJsonLdContext = [
  "https://onerecord.iata.org/ns/cargo#",
  "https://onerecord.iata.org/ns/api#",
  "https://onerecord.iata.org/ns/code-lists/",
  "https://vocabulary.uncefact.org/"
];

export const getUldJsonLd = async (uldId: string) => {
  const uld = await prisma.uld.findUniqueOrThrow({
    where: { id: uldId },
    include: { flight: true, shipment: true, pieces: true }
  });
  return {
    "@context": toJsonLdContext,
    "@id": uld.id,
    "@type": "LogisticsObject",
    serialNumber: uld.serialNumber,
    flightNumber: uld.flight?.flightNumber ?? null,
    locationCode: uld.locationCode,
    TemperatureComplianceStatus: {
      status: uld.complianceStatus,
      exposureUsedMinutes: uld.exposureUsedMinutes,
      exposureRemainingMinutes: uld.exposureRemainingMinutes
    },
    RiskAssessment: {
      riskScore: uld.riskScore,
      riskLevel: uld.riskLevel
    },
    contents: uld.pieces.map((piece) => ({
      pieceId: piece.id,
      description: piece.description,
      specialHandlingCodes: piece.specialHandlingCodes
    }))
  };
};

export const createUldJsonLd = async (payload: {
  serialNumber: string;
  flightNumber?: string;
  locationCode?: string;
  complianceStatus?: string;
  exposureUsedMinutes?: number;
  exposureRemainingMinutes?: number;
  riskLevel?: RiskLevel;
  riskScore?: number;
}) => {
  const flight = payload.flightNumber
    ? await prisma.flight.findUnique({ where: { flightNumber: payload.flightNumber } })
    : null;

  const uld = await prisma.uld.create({
    data: {
      serialNumber: payload.serialNumber,
      flightId: flight?.id,
      locationCode: payload.locationCode,
      complianceStatus: payload.complianceStatus ?? "OK",
      exposureUsedMinutes: payload.exposureUsedMinutes ?? 0,
      exposureRemainingMinutes: payload.exposureRemainingMinutes ?? env.RISK_EXPOSURE_MINUTES,
      riskLevel: payload.riskLevel ?? RiskLevel.LOW,
      riskScore: payload.riskScore ?? 0
    }
  });

  return getUldJsonLd(uld.id);
};

export const patchUldJsonLd = async (
  uldId: string,
  payload: {
    locationCode?: string;
    complianceStatus?: string;
    exposureUsedMinutes?: number;
    exposureRemainingMinutes?: number;
    riskLevel?: RiskLevel;
    riskScore?: number;
  }
) => {
  await prisma.uld.update({
    where: { id: uldId },
    data: payload
  });
  return getUldJsonLd(uldId);
};

export const getContractSchemas = () => ({
  telemetry: {
    type: "object",
    required: ["pieceId", "exposureMinutes"],
    properties: {
      pieceId: { type: "string" },
      internalTempC: { type: "number" },
      externalTempC: { type: "number" },
      humidity: { type: "number" },
      exposureMinutes: { type: "integer" }
    }
  },
  custody: {
    type: "object",
    required: ["pieceId", "status"],
    properties: {
      pieceId: { type: "string" },
      status: { type: "string" },
      outOfChainMinutes: { type: "integer" },
      tamperProbability: { type: "number" }
    }
  }
});

export const getOpenApiContract = () => ({
  openapi: "3.1.0",
  info: {
    title: "AeroSentinel Operational API",
    version: "1.0.0"
  },
  paths: {
    "/api/integrations/iot/http": { post: { summary: "Trusted telemetry ingestion" } },
    "/api/ulds/{id}": { get: { summary: "Fetch JSON-LD ULD" }, patch: { summary: "Patch JSON-LD ULD" } },
    "/api/ulds": { post: { summary: "Create JSON-LD ULD" } }
  }
});

const fallbackWeatherByAirport: Record<string, { temperatureC: number; humidity: number; windKph: number; weatherCode: number }> = {
  DXB: { temperatureC: 42, humidity: 32, windKph: 19, weatherCode: 0 },
  HKG: { temperatureC: 31, humidity: 78, windKph: 24, weatherCode: 3 },
  LAX: { temperatureC: 24, humidity: 61, windKph: 16, weatherCode: 1 },
  JFK: { temperatureC: 18, humidity: 58, windKph: 21, weatherCode: 2 },
  FRA: { temperatureC: 16, humidity: 73, windKph: 14, weatherCode: 61 },
  AMS: { temperatureC: 15, humidity: 76, windKph: 17, weatherCode: 61 },
  LHR: { temperatureC: 14, humidity: 82, windKph: 20, weatherCode: 63 }
};

const classifyWeatherRisk = (temperatureC: number, humidity: number, windKph: number) => {
  if (temperatureC >= 38 || humidity >= 85) return "critical";
  if (temperatureC >= 30 || windKph >= 28 || humidity >= 70) return "warning";
  return "healthy";
};

export const getWeatherOverview = async () => {
  const airports = await prisma.airport.findMany({ orderBy: { code: "asc" } });

  return Promise.all(
    airports.map(async (airport) => {
      let current = fallbackWeatherByAirport[airport.code] ?? {
        temperatureC: 22,
        humidity: 60,
        windKph: 12,
        weatherCode: 1
      };

      try {
        if (airport.latitude !== null && airport.longitude !== null) {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${airport.latitude}&longitude=${airport.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=auto`,
            { cache: "no-store" }
          );
          if (response.ok) {
            const payload = (await response.json()) as {
              current?: {
                temperature_2m?: number;
                relative_humidity_2m?: number;
                apparent_temperature?: number;
                wind_speed_10m?: number;
                weather_code?: number;
              };
            };
            if (payload.current) {
              current = {
                temperatureC: payload.current.apparent_temperature ?? payload.current.temperature_2m ?? current.temperatureC,
                humidity: payload.current.relative_humidity_2m ?? current.humidity,
                windKph: payload.current.wind_speed_10m ?? current.windKph,
                weatherCode: payload.current.weather_code ?? current.weatherCode
              };
            }
          }
        }
      } catch {
        // fall back to seeded operational values when live weather is unavailable
      }

      const apronTemperatureC = Number((current.temperatureC + (airport.code === "DXB" ? 6 : airport.code === "HKG" ? 4 : 2)).toFixed(1));
      const heatStressIndex = Number((apronTemperatureC + current.humidity / 10).toFixed(1));
      const solarExposure = apronTemperatureC >= 38 ? "high" : apronTemperatureC >= 28 ? "medium" : "low";
      const risk = classifyWeatherRisk(apronTemperatureC, current.humidity, current.windKph);

      return {
        code: airport.code,
        name: airport.name,
        latitude: airport.latitude,
        longitude: airport.longitude,
        timezone: airport.timezone,
        temperatureC: current.temperatureC,
        apronTemperatureC,
        humidity: current.humidity,
        windKph: current.windKph,
        heatStressIndex,
        solarExposure,
        stormWarning: current.weatherCode >= 60 || current.windKph >= 30,
        risk
      };
    })
  );
};

export const getUldMonitoring = async () => {
  const ulds = await prisma.uld.findMany({
    include: {
      flight: true,
      pieces: {
        include: {
          sensorStates: { orderBy: { measuredAt: "desc" }, take: 1 },
          thermalStates: { orderBy: { recordedAt: "desc" }, take: 1 }
        }
      },
      shipment: true
    },
    orderBy: { updatedAt: "desc" }
  });

  const weather = await getWeatherOverview();
  const weatherByAirport = new Map(weather.map((entry) => [entry.code, entry]));

  return ulds.map((uld) => {
    const primaryPiece = uld.pieces[0];
    const sensor = primaryPiece?.sensorStates[0];
    const thermal = primaryPiece?.thermalStates[0];
    const airportCode = uld.flight?.originCode ?? uld.locationCode?.split("-")[0] ?? null;
    const airportWeather = airportCode ? weatherByAirport.get(airportCode) : undefined;
    const riskBand = uld.riskLevel === "CRITICAL" ? "red" : uld.riskLevel === "HIGH" || uld.riskLevel === "ELEVATED" ? "amber" : "green";

    return {
      id: uld.id,
      uldId: uld.serialNumber,
      flightNumber: uld.flight?.flightNumber ?? "Unassigned",
      location: uld.locationCode ?? "Unknown",
      airport: airportCode,
      cargoType: primaryPiece?.description ?? uld.shipment?.awb ?? "Mixed cargo",
      internalTempC: sensor?.internalTempC ?? thermal?.temperatureC ?? null,
      externalTempC: sensor?.externalTempC ?? airportWeather?.apronTemperatureC ?? null,
      humidity: sensor?.humidity ?? airportWeather?.humidity ?? null,
      doorState: uld.locationCode?.includes("APRON") ? "loading" : "sealed",
      thermalCoverState: (primaryPiece?.thermalScore ?? 0) > 0.7 ? "removed" : "secured",
      exposureTimerMinutes: thermal?.exposureUsedMinutes ?? uld.exposureUsedMinutes,
      riskScore: uld.riskScore,
      alertState: riskBand,
      status: riskBand,
      projectedBreachMinutes: thermal?.predictedBreachMinutes ?? null,
      weatherImpact: airportWeather?.risk ?? "healthy"
    };
  });
};
