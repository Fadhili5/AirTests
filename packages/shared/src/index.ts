import { z } from "zod";

export const oneRecordIngestSchema = z.object({
  source: z.string().min(2).default("manual"),
  document: z.record(z.any())
});

export const interventionStatusValues = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
  "FAILED"
] as const;

export const alertSeverityValues = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const liveQuerySchema = z.object({
  query: z.string().min(3).max(500)
});

export const telemetryIngestSchema = z.object({
  pieceId: z.string().min(1),
  internalTempC: z.number().optional(),
  externalTempC: z.number().optional(),
  humidity: z.number().optional(),
  exposureMinutes: z.number().int().nonnegative().default(0),
  sunlight: z.string().optional(),
  tiltDegrees: z.number().optional(),
  source: z.string().min(2).default("lufthansa-passive")
});

export const custodyIngestSchema = z.object({
  pieceId: z.string().min(1),
  fromZone: z.string().optional(),
  toZone: z.string().optional(),
  handler: z.string().optional(),
  verifiedBy: z.string().optional(),
  status: z.string().min(2),
  outOfChainMinutes: z.number().int().nonnegative().default(0),
  tamperProbability: z.number().min(0).max(1).default(0),
  reloadMatchScore: z.number().min(0).max(1).default(1),
  identityConfidence: z.number().min(0).max(1).default(1)
});

export const ackInterventionSchema = z.object({
  status: z.enum(interventionStatusValues),
  verificationNotes: z.string().max(1000).optional(),
  assignee: z.string().min(2).max(120).optional()
});

export type IngestRequest = z.infer<typeof oneRecordIngestSchema>;
export type LiveQueryRequest = z.infer<typeof liveQuerySchema>;
export type TelemetryIngestRequest = z.infer<typeof telemetryIngestSchema>;
export type CustodyIngestRequest = z.infer<typeof custodyIngestSchema>;
export type AckInterventionRequest = z.infer<typeof ackInterventionSchema>;

export type ShipmentSummary = {
  shipmentId: string;
  awb: string | null;
  revision: number;
  pieceCount: number;
  activeAlerts: number;
  chainOfCustodyScore: number;
  thermalRiskScore: number;
  integrityScore: number;
  specialHandlingCodes: string[];
  currentLocation: string | null;
};

export type DashboardSnapshot = {
  updatedAt: string;
  kpis: {
    shipments: number;
    pieces: number;
    flights: number;
    ulds: number;
    alertsOpen: number;
    interventionsOpen: number;
    thermalBreaches: number;
    custodyBreaks: number;
  };
  shipments: ShipmentSummary[];
  tape: Array<{
    id: string;
    occurredAt: string;
    type: string;
    pieceId: string | null;
    shipmentId: string;
    location: string | null;
    message: string;
    severity: (typeof alertSeverityValues)[number] | "INFO";
  }>;
  alerts: Array<{
    id: string;
    shipmentId: string | null;
    pieceId: string | null;
    type: string;
    severity: (typeof alertSeverityValues)[number];
    title: string;
    description: string;
    createdAt: string;
  }>;
  ulds: Array<{
    id: string;
    serialNumber: string;
    flightNumber: string | null;
    locationCode: string | null;
    latitude: number | null;
    longitude: number | null;
    complianceStatus: string;
    riskLevel: string;
    riskScore: number;
    exposureRemainingMinutes: number;
  }>;
};

export type AgentQueryResponse = {
  summary: string;
  matches: Array<{
    entity: "shipment" | "piece" | "event" | "alert" | "intervention" | "uld";
    id: string;
    title: string;
    subtitle: string;
    confidence: number;
  }>;
};
