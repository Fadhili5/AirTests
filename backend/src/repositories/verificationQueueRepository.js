export class VerificationQueueRepository {
  constructor(redis) {
    this.redis = redis;
    this.queueKey = "verification:queue";
    this.auditKey = "verification:audits";
    this.failureKey = "verification:failures";
  }

  async enqueue(job) {
    await this.redis.lPush(this.queueKey, JSON.stringify(job));
  }

  async dequeue() {
    const raw = await this.redis.rPop(this.queueKey);
    return raw ? JSON.parse(raw) : null;
  }

  async size() {
    return this.redis.lLen(this.queueKey);
  }

  async appendAudit(entry, retentionLimit = 500) {
    await this.redis.lPush(this.auditKey, JSON.stringify(entry));
    await this.redis.lTrim(this.auditKey, 0, retentionLimit - 1);
  }

  async listAudits(limit = 100) {
    const items = await this.redis.lRange(this.auditKey, 0, limit - 1);
    return items.map((item) => JSON.parse(item));
  }

  async appendFailure(entry, retentionLimit = 200) {
    await this.redis.lPush(this.failureKey, JSON.stringify(entry));
    await this.redis.lTrim(this.failureKey, 0, retentionLimit - 1);
  }
}
