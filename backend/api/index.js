export default async function handler(req, res) {
  // Mock data for serverless deployment
  const mockData = {
    ulds: [
      {
        id: "ULD-001",
        airport: "JFK",
        phase: "Ground",
        temperature: 4.5,
        humidity: 65,
        battery: 85,
        signal: -72,
        exposureScore: 35,
        riskScore: 0.25,
        risk: "LOW",
        trend: "Stable",
        status: "Normal",
        groundDelayExposure: 15,
        tarmacExposure: 20,
        inflightExposure: 0,
        totalExposure: 35,
      },
      {
        id: "ULD-002",
        airport: "LHR",
        phase: "Tarmac",
        temperature: 7.2,
        humidity: 58,
        battery: 72,
        signal: -68,
        exposureScore: 62,
        riskScore: 0.58,
        risk: "MEDIUM",
        trend: "Rising",
        status: "Warning",
        groundDelayExposure: 25,
        tarmacExposure: 37,
        inflightExposure: 0,
        totalExposure: 62,
      },
    ],
    alerts: [
      {
        id: "ALT-001",
        uldId: "ULD-002",
        severity: "WARNING",
        message: "Temperature approaching upper limit",
        timestamp: new Date().toISOString(),
      },
    ],
    tasks: [
      {
        id: "TSK-001",
        uldId: "ULD-002",
        action: "Inspect temperature sensor",
        status: "Pending",
        priority: "HIGH",
      },
    ],
  };

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Route handling
  const path = req.url || "";

  if (path.includes("/control-center")) {
    res.status(200).json(mockData);
  } else if (path.includes("/fleet")) {
    res.status(200).json(mockData.ulds);
  } else if (path.includes("/alerts")) {
    res.status(200).json(mockData.alerts);
  } else if (path.includes("/tasks")) {
    res.status(200).json(mockData.tasks);
  } else {
    res.status(200).json(mockData);
  }
}
