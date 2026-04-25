import { expandShcCodes } from "./shc-intelligence";
import { NormalizedShipment, type NormalizedEvent, type NormalizedPiece } from "./types";

const normalizeKey = (input: string) => input.toLowerCase().replace(/[^a-z0-9]/g, "");

const getValueBySuffix = (node: Record<string, unknown>, suffixes: string[]) => {
  const candidates = Object.entries(node);
  for (const [key, value] of candidates) {
    const normalized = normalizeKey(key);
    if (suffixes.some((suffix) => normalized.endsWith(normalizeKey(suffix)))) {
      return value;
    }
  }
  return undefined;
};

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

const asString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown>;
    const literal = node["@value"] ?? node["value"] ?? node["@id"];
    return typeof literal === "string" || typeof literal === "number" ? String(literal) : null;
  }
  return null;
};

const asNumber = (value: unknown): number | null => {
  const stringValue = asString(value);
  if (stringValue === null) return null;
  const parsed = Number(stringValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const asBoolean = (value: unknown): boolean => {
  const stringValue = asString(value);
  return stringValue === "true" || stringValue === "1";
};

const getNodeId = (node: Record<string, unknown>) =>
  asString(node["@id"]) ??
  asString(getValueBySuffix(node, ["pieceId", "shipmentId", "id"])) ??
  crypto.randomUUID();

const computeMetrics = (lengthCm: number | null, widthCm: number | null, heightCm: number | null) => {
  if (!lengthCm || !widthCm || !heightCm) {
    return {
      volumeCm3: null,
      dimensionalWeightKg: null,
      volumetricScore: null,
      densityScore: null,
      stackability: null,
      thermalExposureSurfaceArea: null,
      fragilityRisk: null
    };
  }

  const volumeCm3 = lengthCm * widthCm * heightCm;
  const dimensionalWeightKg = Number((volumeCm3 / 6000).toFixed(2));
  const maxDimension = Math.max(lengthCm, widthCm, heightCm);
  const minDimension = Math.min(lengthCm, widthCm, heightCm);
  const volumetricScore = Number((dimensionalWeightKg / 100).toFixed(2));
  const densityScore = Number(((minDimension / maxDimension) * 100).toFixed(2));
  const stackability = Number((((lengthCm * widthCm) / volumeCm3) * 1000).toFixed(2));
  const thermalExposureSurfaceArea = Number(
    (2 * (lengthCm * widthCm + widthCm * heightCm + lengthCm * heightCm)).toFixed(2)
  );
  const fragilityRisk = Number((maxDimension / 120 + (heightCm > 100 ? 0.4 : 0.1)).toFixed(2));

  return {
    volumeCm3,
    dimensionalWeightKg,
    volumetricScore,
    densityScore,
    stackability,
    thermalExposureSurfaceArea,
    fragilityRisk
  };
};

const normalizePiece = (pieceNode: Record<string, unknown>): NormalizedPiece => {
  const pieceId = getNodeId(pieceNode);
  const description =
    asString(getValueBySuffix(pieceNode, ["description", "goodsdescription"])) ?? null;
  const skeleton = asBoolean(getValueBySuffix(pieceNode, ["skeleton"]));
  const specialHandlingCodes = asArray(getValueBySuffix(pieceNode, ["specialhandlingcodes", "specialhandlingcode"]))
    .map(asString)
    .filter((code): code is string => Boolean(code))
    .map((code) => code.toUpperCase());
  const lengthCm = asNumber(getValueBySuffix(pieceNode, ["length", "lengthvalue", "lengthcm"]));
  const widthCm = asNumber(getValueBySuffix(pieceNode, ["width", "widthvalue", "widthcm"]));
  const heightCm = asNumber(getValueBySuffix(pieceNode, ["height", "heightvalue", "heightcm"]));
  const metrics = computeMetrics(lengthCm, widthCm, heightCm);
  const intelligence = expandShcCodes(specialHandlingCodes);

  return {
    pieceId,
    description,
    skeleton,
    specialHandlingCodes,
    lengthCm,
    widthCm,
    heightCm,
    ...metrics,
    requiredZone: intelligence.requiredZone,
    inspectionProtocol: intelligence.inspectionProtocol,
    fireRisk: intelligence.fireRisk,
    riskFlags: intelligence.riskFlags
  };
};

const normalizeEvent = (eventNode: Record<string, unknown>, shipmentId: string): NormalizedEvent => {
  const typeLiteral = asString(getValueBySuffix(eventNode, ["eventtype", "type"])) ?? "MOVED";
  const occurredAtString =
    asString(getValueBySuffix(eventNode, ["occurredat", "eventtime", "timestamp"])) ??
    new Date().toISOString();

  const eventType = normalizeKey(typeLiteral).includes("scanout")
    ? "SCANNED_OUT"
    : normalizeKey(typeLiteral).includes("scanin")
      ? "SCANNED_IN"
      : normalizeKey(typeLiteral).includes("rfid")
        ? "RFID_VERIFIED"
        : normalizeKey(typeLiteral).includes("reloaded")
          ? "RELOADED"
          : normalizeKey(typeLiteral).includes("removed")
            ? "REMOVED"
            : normalizeKey(typeLiteral).includes("loaded")
              ? "LOADED"
              : normalizeKey(typeLiteral).includes("customs")
                ? "CUSTOMS_HOLD"
                : normalizeKey(typeLiteral).includes("thermal")
                  ? "THERMAL_UPDATE"
                  : normalizeKey(typeLiteral).includes("custody")
                    ? "CUSTODY_TRANSFER"
                    : "MOVED";

  return {
    occurredAt: new Date(occurredAtString),
    type: eventType,
    location: asString(getValueBySuffix(eventNode, ["location", "airportcode"])),
    zone: asString(getValueBySuffix(eventNode, ["zone", "warehousezone"])),
    handler: asString(getValueBySuffix(eventNode, ["handler", "actor"])),
    message:
      asString(getValueBySuffix(eventNode, ["message", "description"])) ??
      `${shipmentId} ${typeLiteral}`,
    metadata: eventNode
  };
};

export const normalizeOneRecordDocument = (
  source: string,
  document: Record<string, unknown>
): NormalizedShipment => {
  const shipmentId = getNodeId(document);
  const revision = asNumber(getValueBySuffix(document, ["revision"])) ?? 0;
  const objectType = asString(document["@type"]) ?? "Shipment";
  const awb = asString(getValueBySuffix(document, ["awb", "waybillnumber", "airwaybillnumber"]));
  const weightPayment = asString(getValueBySuffix(document, ["weightpayment"]));
  const otherCharges = asString(getValueBySuffix(document, ["othercharges"]));
  const customsStatus = asString(getValueBySuffix(document, ["customsstatus"]));
  const currentLocation = asString(getValueBySuffix(document, ["location", "airportcode", "currentlocation"]));
  const shipmentCodes = asArray(getValueBySuffix(document, ["specialhandlingcodes", "specialhandlingcode"]))
    .map(asString)
    .filter((code): code is string => Boolean(code))
    .map((code) => code.toUpperCase());

  const rawPieces = asArray(getValueBySuffix(document, ["pieces", "piece"]))
    .filter((piece): piece is Record<string, unknown> => Boolean(piece && typeof piece === "object"));
  const pieces = rawPieces.map(normalizePiece);
  const pieceCodes = pieces.flatMap((piece) => piece.specialHandlingCodes);
  const specialHandlingCodes = [...new Set([...shipmentCodes, ...pieceCodes])];

  const rawEvents = asArray(getValueBySuffix(document, ["events", "event"]))
    .filter((event): event is Record<string, unknown> => Boolean(event && typeof event === "object"));
  const events = rawEvents.map((event) => normalizeEvent(event, shipmentId));

  const delayPredictionMin = specialHandlingCodes.includes("ELI") ? 18 : 6;
  const theftRiskScore = specialHandlingCodes.some((code) => ["ECC", "VUN"].includes(code)) ? 0.68 : 0.22;

  return {
    shipmentId,
    revision,
    objectType,
    awb,
    weightPayment,
    otherCharges,
    source,
    specialHandlingCodes,
    pieces,
    events,
    currentLocation,
    customsStatus,
    delayPredictionMin,
    theftRiskScore,
    rawDocument: document
  };
};
