const SHC_DEFINITIONS: Record<
  string,
  {
    label: string;
    cargoClass: string;
    riskFlags: string[];
    requiredZone: string;
    inspectionProtocol: string;
    fireRisk: string;
    loadingRestrictions: string[];
    temperatureConsiderations: string[];
  }
> = {
  ECC: {
    label: "Electronic Commerce Cargo",
    cargoClass: "high-value-ecommerce",
    riskFlags: ["high-value", "customs-sensitive", "theft-watch"],
    requiredZone: "controlled",
    inspectionProtocol: "enhanced",
    fireRisk: "low",
    loadingRestrictions: ["prioritize secure hold"],
    temperatureConsiderations: ["avoid prolonged apron exposure"]
  },
  VUN: {
    label: "Vulnerable Cargo",
    cargoClass: "security-sensitive",
    riskFlags: ["tamper-watch", "restricted-access"],
    requiredZone: "controlled",
    inspectionProtocol: "dual-custody",
    fireRisk: "low",
    loadingRestrictions: ["restricted handler roster"],
    temperatureConsiderations: ["monitor ambient transitions"]
  },
  EAP: {
    label: "Electrical Apparatus",
    cargoClass: "electronics",
    riskFlags: ["shock-sensitive", "battery-screening"],
    requiredZone: "controlled",
    inspectionProtocol: "enhanced",
    fireRisk: "medium",
    loadingRestrictions: ["segregate from heat sources"],
    temperatureConsiderations: ["limit direct sunlight exposure"]
  },
  ELI: {
    label: "Lithium Ion Batteries",
    cargoClass: "dangerous-goods",
    riskFlags: ["lithium-battery", "thermal-runaway-watch", "fire-containment"],
    requiredZone: "controlled",
    inspectionProtocol: "enhanced",
    fireRisk: "high",
    loadingRestrictions: ["fire containment required", "no damaged packages"],
    temperatureConsiderations: ["strict thermal monitoring"]
  }
};

export const expandShcCodes = (codes: string[]) => {
  const intelligence = codes
    .map((code) => SHC_DEFINITIONS[code.toUpperCase()])
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const riskFlags = [...new Set(intelligence.flatMap((entry) => entry.riskFlags))];
  const requiredZone = intelligence.some((entry) => entry.requiredZone === "controlled")
    ? "controlled"
    : "general";
  const inspectionProtocol = intelligence.some((entry) => entry.inspectionProtocol === "dual-custody")
    ? "dual-custody"
    : intelligence.some((entry) => entry.inspectionProtocol === "enhanced")
      ? "enhanced"
      : "standard";
  const fireRisk = intelligence.some((entry) => entry.fireRisk === "high")
    ? "high"
    : intelligence.some((entry) => entry.fireRisk === "medium")
      ? "medium"
      : "low";

  return {
    definitions: intelligence,
    riskFlags,
    requiredZone,
    inspectionProtocol,
    fireRisk
  };
};
