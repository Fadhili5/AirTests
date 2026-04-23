export const shipmentRules = {
  "JTN-7890": {
    uldId: "JTN-7890",
    shipmentId: "AWB-172-55550001",
    productType: "Vaccines 2-8C",
    minTempC: 2,
    maxTempC: 8,
    allowableExposureMinutes: 60,
  },
  "JTN-8972": {
    uldId: "JTN-8972",
    shipmentId: "AWB-172-55550002",
    productType: "Vaccines 2-8C",
    minTempC: 2,
    maxTempC: 8,
    allowableExposureMinutes: 60,
  },
  "JTN-4421": {
    uldId: "JTN-4421",
    shipmentId: "AWB-172-55550003",
    productType: "Biologics 15-25C",
    minTempC: 15,
    maxTempC: 25,
    allowableExposureMinutes: 0,
  },
};

export function getRuleForUld(uldId, defaults) {
  const knownRule = shipmentRules[uldId];

  if (knownRule) {
    return {
      ...knownRule,
      allowableExposureMinutes:
        defaults.overrideAllowableMinutes ?? knownRule.allowableExposureMinutes,
      minTempC: defaults.overrideMinTemp ?? knownRule.minTempC,
      maxTempC: defaults.overrideMaxTemp ?? knownRule.maxTempC,
    };
  }

  return (
    {
      uldId,
      shipmentId: `AWB-${uldId}`,
      productType: "Pharma",
      minTempC: defaults.overrideMinTemp ?? defaults.defaultMinTemp,
      maxTempC: defaults.overrideMaxTemp ?? defaults.defaultMaxTemp,
      allowableExposureMinutes:
        defaults.overrideAllowableMinutes ?? defaults.allowableMinutes,
    }
  );
}
