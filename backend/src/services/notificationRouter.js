export class NotificationRouter {
  constructor({ alertService, auditStore, io }) {
    this.alertService = alertService;
    this.auditStore = auditStore;
    this.io = io;
  }

  async publishNotifications(notifications, envelope) {
    for (const notification of notifications) {
      const alert = {
        id: `${envelope.uldId}-${notification.level}-${Date.now()}`,
        uld_id: envelope.uldId,
        status: notification.level,
        temperature: envelope.temperature,
        exposure_used: envelope.exposureUsed,
        occurred_at: envelope.occurredAt,
        message: notification.message,
        airport_code: envelope.airportCode,
      };
      await this.alertService.handleAlert(alert);
      await this.auditStore.log("notification", alert);
      this.io.emit("alert", alert);
    }
  }
}
