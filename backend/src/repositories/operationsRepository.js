export class OperationsRepository {
  constructor(redis, retentionLimit = 500) {
    this.redis = redis;
    this.retentionLimit = retentionLimit;
  }

  actionKey(uldId) {
    return `uld:${uldId}:actions`;
  }

  workflowKey(uldId) {
    return `uld:${uldId}:workflows`;
  }

  timelineKey(uldId) {
    return `uld:${uldId}:timeline`;
  }

  async appendAction(uldId, action) {
    await this.redis.lPush(this.actionKey(uldId), JSON.stringify(action));
    await this.redis.lTrim(this.actionKey(uldId), 0, this.retentionLimit - 1);
  }

  async appendWorkflow(uldId, workflow) {
    await this.redis.lPush(this.workflowKey(uldId), JSON.stringify(workflow));
    await this.redis.lTrim(this.workflowKey(uldId), 0, this.retentionLimit - 1);
  }

  async appendTimeline(uldId, item) {
    await this.redis.lPush(this.timelineKey(uldId), JSON.stringify(item));
    await this.redis.lTrim(this.timelineKey(uldId), 0, this.retentionLimit - 1);
  }

  async getActions(uldId, limit = 50) {
    const items = await this.redis.lRange(this.actionKey(uldId), 0, limit - 1);
    return items.map((item) => JSON.parse(item));
  }

  async getWorkflows(uldId, limit = 50) {
    const items = await this.redis.lRange(this.workflowKey(uldId), 0, limit - 1);
    return items.map((item) => JSON.parse(item));
  }

  async getTimeline(uldId, limit = 100) {
    const items = await this.redis.lRange(this.timelineKey(uldId), 0, limit - 1);
    return items.map((item) => JSON.parse(item));
  }

  async setAction(action) {
    await this.redis.hSet("actions:index", action.id, JSON.stringify(action));
  }

  async getAction(actionId) {
    const raw = await this.redis.hGet("actions:index", actionId);
    return raw ? JSON.parse(raw) : null;
  }

  async setWorkflow(workflow) {
    await this.redis.hSet("workflows:index", workflow.id, JSON.stringify(workflow));
  }

  async getWorkflow(workflowId) {
    const raw = await this.redis.hGet("workflows:index", workflowId);
    return raw ? JSON.parse(raw) : null;
  }

  async listPendingActions(limit = 100) {
    const rows = await this.redis.hGetAll("actions:index");
    return Object.values(rows)
      .map((row) => JSON.parse(row))
      .filter((action) => action.status !== "VERIFIED")
      .slice(0, limit);
  }

  async listActiveWorkflows(limit = 100) {
    const rows = await this.redis.hGetAll("workflows:index");
    return Object.values(rows)
      .map((row) => JSON.parse(row))
      .filter((workflow) => workflow.status !== "COMPLETED")
      .slice(0, limit);
  }
}
