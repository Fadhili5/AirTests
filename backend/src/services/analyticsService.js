export class AnalyticsService {
  constructor({ exposureRepository, operationsRepository }) {
    this.exposureRepository = exposureRepository;
    this.operationsRepository = operationsRepository;
  }

  async getSummary() {
    const fleet = await this.exposureRepository.getFleetStatus();
    const pendingActions = await this.operationsRepository.listPendingActions(200);
    const activeWorkflows = await this.operationsRepository.listActiveWorkflows(200);

    const compliant = fleet.filter((item) => item.status === "OK").length;
    const avgExposure =
      fleet.length > 0
        ? fleet.reduce((sum, item) => sum + item.exposureUsed, 0) / fleet.length
        : 0;

    return {
      totalUlds: fleet.length,
      compliantShipmentsPercent:
        fleet.length > 0 ? Number(((compliant / fleet.length) * 100).toFixed(1)) : 100,
      averageExposureMinutes: Number(avgExposure.toFixed(2)),
      warningCount: fleet.filter((item) => item.status === "AT_RISK").length,
      breachCount: fleet.filter((item) => item.status === "BREACH").length,
      pendingActions: pendingActions.length,
      activeWorkflows: activeWorkflows.length,
      handlerPerformance: [
        { handler: "JFK Ground Ops", compliancePercent: 94, avgResponseMinutes: 8 },
        { handler: "AMS Cool Chain", compliancePercent: 97, avgResponseMinutes: 6 },
        { handler: "DXB Ramp Control", compliancePercent: 91, avgResponseMinutes: 10 },
      ],
    };
  }
}
