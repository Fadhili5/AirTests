import { prisma } from "../lib/prisma";
import { AgentQueryResponse } from "@lending/shared";

export const runAgentQuery = async (query: string): Promise<AgentQueryResponse> => {
  const normalized = query.toLowerCase();

  if (normalized.includes("removed cargo")) {
    const pieces = await prisma.event.findMany({
      where: { type: "REMOVED" },
      orderBy: { occurredAt: "desc" },
      take: 20
    });

    return {
      summary: `Found ${pieces.length} cargo removal events in live operations history.`,
      matches: pieces.map((event) => ({
        entity: "event",
        id: event.id,
        title: `Removed ${event.shipmentId}`,
        subtitle: `${event.message} at ${event.location ?? "unknown location"}`,
        confidence: 0.93
      }))
    };
  }

  if (normalized.includes("reloaded")) {
    const events = await prisma.event.findMany({
      where: { type: "RELOADED" },
      orderBy: { occurredAt: "desc" },
      take: 20
    });

    return {
      summary: `Found ${events.length} cargo reload events.`,
      matches: events.map((event) => ({
        entity: "event",
        id: event.id,
        title: `Reloaded ${event.shipmentId}`,
        subtitle: event.message,
        confidence: 0.91
      }))
    };
  }

  if (normalized.includes("custody break")) {
    const rows = await prisma.custodyState.findMany({
      where: { outOfChainMinutes: { gt: 0 } },
      orderBy: { recordedAt: "desc" },
      take: 20
    });

    return {
      summary: `Detected ${rows.length} custody breakpoints across tracked cargo.`,
      matches: rows.map((row) => ({
        entity: "piece",
        id: row.pieceId,
        title: `Piece ${row.pieceId}`,
        subtitle: `Out of chain for ${row.outOfChainMinutes} minutes`,
        confidence: 0.95
      }))
    };
  }

  if (normalized.includes("above 8c") || normalized.includes("above 8°c") || normalized.includes("pharma")) {
    const rows = await prisma.sensorState.findMany({
      where: { internalTempC: { gt: 8 } },
      orderBy: { measuredAt: "desc" },
      take: 20
    });

    return {
      summary: `Found ${rows.length} thermal excursions above 8C.`,
      matches: rows.map((row) => ({
        entity: "piece",
        id: row.pieceId,
        title: `Piece ${row.pieceId}`,
        subtitle: `Internal temperature ${row.internalTempC?.toFixed(1) ?? "n/a"}C`,
        confidence: 0.94
      }))
    };
  }

  if (normalized.includes("suspicious handler")) {
    const rows = await prisma.custodyState.findMany({
      where: { tamperProbability: { gt: 0.5 } },
      orderBy: { tamperProbability: "desc" },
      take: 20
    });

    return {
      summary: `Found ${rows.length} suspicious custody handoffs with elevated tamper probability.`,
      matches: rows.map((row) => ({
        entity: "piece",
        id: row.pieceId,
        title: row.handler ?? "Unknown handler",
        subtitle: `Tamper probability ${Math.round(row.tamperProbability * 100)}%`,
        confidence: 0.88
      }))
    };
  }

  const shipments = await prisma.shipment.findMany({
    where: {
      OR: [
        { id: { contains: query, mode: "insensitive" } },
        { awb: { contains: query, mode: "insensitive" } }
      ]
    },
    take: 10
  });

  return {
    summary: shipments.length
      ? `Matched ${shipments.length} live shipment records.`
      : "No live cargo matches found for that query.",
    matches: shipments.map((shipment) => ({
      entity: "shipment",
      id: shipment.id,
      title: shipment.awb ?? shipment.id,
      subtitle: `${shipment.currentLocation ?? "unknown"} · ${shipment.pieceCount} pieces`,
      confidence: 0.82
    }))
  };
};
