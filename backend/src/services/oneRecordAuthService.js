import axios from "axios";

export class OneRecordAuthService {
  constructor({ config, redis, logger }) {
    this.config = config;
    this.redis = redis;
    this.logger = logger;
    this.cacheKey = "one-record:access-token";
  }

  async getAccessToken() {
    if (this.config.oneRecord.authToken) {
      return this.config.oneRecord.authToken;
    }

    const cached = await this.redis.get(this.cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.config.oneRecord.tokenUrl || !this.config.oneRecord.clientId) {
      return "";
    }

    try {
      const params = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.oneRecord.clientId,
        client_secret: this.config.oneRecord.clientSecret,
      });

      const response = await axios.post(this.config.oneRecord.tokenUrl, params.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 5000,
      });

      const accessToken = response.data.access_token || "";
      const expiresIn = Number(response.data.expires_in || 60);
      const ttl = Math.max(1, expiresIn - this.config.oneRecord.tokenRefreshSkewSeconds);
      if (accessToken) {
        await this.redis.setEx(this.cacheKey, ttl, accessToken);
      }
      return accessToken;
    } catch (error) {
      this.logger.warn({ error: error.message }, "Failed to obtain ONE Record access token");
      return "";
    }
  }
}
