import { RiskLevel } from "@prisma/client";
import { env } from "../config/env";
import { NormalizedPiece, PieceRiskEvaluation } from "./types";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const toRiskLevel = (score: number): RiskLevel => {
  if (score >= 0.9) return RiskLevel.CRITICAL;
  if (score >= 0.75) return RiskLevel.HIGH;
  if (score >= 0.55) return RiskLevel.ELEVATED;
  if (score >= 0.3) return RiskLevel.GUARDED;
  return RiskLevel.LOW;
};

export const evaluatePieceRisk = (piece: NormalizedPiece): PieceRiskEvaluation => {
  const thermalBias = piece.specialHandlingCodes.includes("ELI") ? 0.28 : 0.12;
  const densityBias = piece.densityScore ? 1 - clamp(piece.densityScore / 100) : 0.2;
  const volumetricBias = piece.volumetricScore ? clamp(piece.volumetricScore) : 0.15;
  const fragilityBias = piece.fragilityRisk ? clamp(piece.fragilityRisk / 2) : 0.15;
  const custodyPenalty = piece.requiredZone === "controlled" ? 0.18 : 0.08;
  const firePenalty = piece.fireRisk === "high" ? 0.22 : piece.fireRisk === "medium" ? 0.12 : 0.04;
  const customsRiskScore = piece.riskFlags.includes("customs-sensitive") ? 0.67 : 0.18;
  const theftRiskScore = piece.riskFlags.includes("theft-watch") ? 0.72 : 0.24;
  const thermalScore = clamp(thermalBias + firePenalty + volumetricBias / 2);
  const chainOfCustodyScore = clamp(1 - custodyPenalty - theftRiskScore / 3);
  const integrityScore = clamp(1 - fragilityBias - densityBias / 3);
  const delayPredictionMin = Math.round((volumetricBias + custodyPenalty + thermalBias) * 90);
  const predictedBreachMin = Math.max(
    0,
    Math.round(env.RISK_EXPOSURE_MINUTES - thermalScore * env.RISK_EXPOSURE_MINUTES)
  );
  const riskScore = clamp(
    thermalScore * 0.35 +
      (1 - chainOfCustodyScore) * 0.25 +
      (1 - integrityScore) * 0.2 +
      theftRiskScore * 0.1 +
      customsRiskScore * 0.1
  );
  const riskLevel = toRiskLevel(riskScore);

  const flags = [...piece.riskFlags];
  if (predictedBreachMin < 20) flags.push("breach-imminent");
  if (integrityScore < 0.65) flags.push("fragility-watch");
  if (piece.stackability !== null && piece.stackability < 1.5) flags.push("non-stackable");

  const interventions: PieceRiskEvaluation["interventions"] = [];
  if (thermalScore >= 0.55) {
    interventions.push({
      action: "Move piece to controlled storage and apply thermal protection",
      assignedRole: "Ramp Control",
      priority: riskLevel === RiskLevel.CRITICAL ? "CRITICAL" : "HIGH",
      notes: "Thermal profile indicates elevated excursion risk."
    });
  }
  if (chainOfCustodyScore <= 0.72) {
    interventions.push({
      action: "Verify custody handoff and restrict handler roster",
      assignedRole: "Security Supervisor",
      priority: "HIGH",
      notes: "Sensitive cargo requires verified handoff."
    });
  }

  return {
    thermalScore,
    chainOfCustodyScore,
    integrityScore,
    theftRiskScore,
    customsRiskScore,
    delayPredictionMin,
    flags: [...new Set(flags)],
    riskScore,
    riskLevel,
    predictedBreachMin,
    interventions
  };
};
