import axios from "axios";
import nodemailer from "nodemailer";
import { alertCounter } from "../platform/metrics.js";

export class AlertService {
  constructor({ subscriptions, smtp, logger }) {
    this.subscriptions = subscriptions;
    this.logger = logger;
    this.mailer = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: false,
      ignoreTLS: true,
    });
    this.from = smtp.from;
  }

  async handleAlert(alert) {
    alertCounter.inc({ severity: alert.status });
    const subscribers = await this.subscriptions.getSubscriptions();

    await Promise.allSettled(
      subscribers.map(async (subscription) => {
        if (subscription.webhookUrl) {
          await axios.post(subscription.webhookUrl, alert, {
            timeout: 5000,
          });
        }

        if (subscription.email) {
          await this.mailer.sendMail({
            from: this.from,
            to: subscription.email,
            subject: `[OR-ATM] ${alert.status} for ${alert.uld_id}`,
            text: JSON.stringify(alert, null, 2),
          });
        }
      }),
    );
  }
}
