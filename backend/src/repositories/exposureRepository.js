export class ExposureRepository {
  constructor(redis, retentionLimit = 500) {
    this.redis = redis;
    this.retentionLimit = retentionLimit;
  }

  stateKey(uldId) {
    return `uld:${uldId}:exposure`;
  }

  telemetryKey(uldId) {
    return `uld:${uldId}:telemetry`;
  }

  async getState(uldId) {
    const raw = await this.redis.get(this.stateKey(uldId));
    return raw ? JSON.parse(raw) : null;
  }

  async saveState(uldId, state) {
    await this.redis.set(this.stateKey(uldId), JSON.stringify(state));
  }

  async resetState(uldId) {
    await this.redis.del(this.stateKey(uldId));
    await this.redis.del(this.telemetryKey(uldId));
  }

  async appendTelemetry(uldId, payload) {
    await this.redis.lPush(this.telemetryKey(uldId), JSON.stringify(payload));
    await this.redis.lTrim(this.telemetryKey(uldId), 0, this.retentionLimit - 1);
  }

  async getTelemetry(uldId, limit = 100) {
    const items = await this.redis.lRange(this.telemetryKey(uldId), 0, limit - 1);
    return items.map((item) => JSON.parse(item)).reverse();
  }

  async saveLatestFleetStatus(uldId, state) {
    await this.redis.hSet("fleet:status", uldId, JSON.stringify(state));
  }

  async getFleetStatus() {
    const rows = await this.redis.hGetAll("fleet:status");
    return Object.values(rows).map((entry) => JSON.parse(entry));
  }
}
