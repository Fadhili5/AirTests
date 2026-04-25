import { RiskLevel } from "@prisma/client";

export type NormalizedPiece = {
  pieceId: string;
  description: string | null;
  skeleton: boolean;
  specialHandlingCodes: string[];
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  volumeCm3: number | null;
  dimensionalWeightKg: number | null;
  volumetricScore: number | null;
  densityScore: number | null;
  stackability: number | null;
  thermalExposureSurfaceArea: number | null;
  fragilityRisk: number | null;
  requiredZone: string;
  inspectionProtocol: string;
  fireRisk: string;
  riskFlags: string[];
};

export type NormalizedEvent = {
  occurredAt: Date;
  type:
    | "SCANNED_IN"
    | "SCANNED_OUT"
    | "RFID_VERIFIED"
    | "MOVED"
    | "STORED"
    | "LOADED"
    | "REMOVED"
    | "RELOADED"
    | "OPENED"
    | "INSPECTED"
    | "DELIVERED"
    | "CUSTODY_TRANSFER"
    | "THERMAL_UPDATE"
    | "CUSTOMS_HOLD"
    | "ALERT_RAISED";
  location: string | null;
  zone: string | null;
  handler: string | null;
  message: string;
  metadata?: Record<string, unknown>;
};

export type NormalizedShipment = {
  shipmentId: string;
  revision: number;
  objectType: string;
  awb: string | null;
  weightPayment: string | null;
  otherCharges: string | null;
  source: string;
  specialHandlingCodes: string[];
  pieces: NormalizedPiece[];
  events: NormalizedEvent[];
  currentLocation: string | null;
  customsStatus: string | null;
  delayPredictionMin: number;
  theftRiskScore: number;
  rawDocument: Record<string, unknown>;
};

export type PieceRiskEvaluation = {
  thermalScore: number;
  chainOfCustodyScore: number;
  integrityScore: number;
  theftRiskScore: number;
  customsRiskScore: number;
  delayPredictionMin: number;
  flags: string[];
  riskScore: number;
  riskLevel: RiskLevel;
  predictedBreachMin: number | null;
  interventions: Array<{
    action: string;
    assignedRole: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    notes: string;
  }>;
};
