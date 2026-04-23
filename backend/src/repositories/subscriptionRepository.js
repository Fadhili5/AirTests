export class SubscriptionRepository {
  constructor(redis) {
    this.redis = redis;
  }

  async addSubscription(subscription) {
    await this.redis.rPush("alerts:subscribers", JSON.stringify(subscription));
  }

  async getSubscriptions() {
    const items = await this.redis.lRange("alerts:subscribers", 0, -1);
    return items.map((item) => JSON.parse(item));
  }
}
