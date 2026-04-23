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
  return (
    shipmentRules[uldId] || {
      uldId,
      shipmentId: `AWB-${uldId}`,
      productType: "Pharma",
      minTempC: defaults.defaultMinTemp,
      maxTempC: defaults.defaultMaxTemp,
      allowableExposureMinutes: defaults.allowableMinutes,
    }
  );
}
