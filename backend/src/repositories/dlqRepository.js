export class DlqRepository {
  constructor(redis) {
    this.redis = redis;
  }

  async push(message) {
    await this.redis.lPush("mqtt:dead-letter", JSON.stringify(message));
  }
}
