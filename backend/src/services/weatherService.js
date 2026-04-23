import axios from "axios";
import CircuitBreaker from "opossum";
import { weatherDuration } from "../platform/metrics.js";

export class WeatherService {
  constructor({ redis, config, logger }) {
    this.redis = redis;
    this.config = config;
    this.logger = logger;
    this.breaker = new CircuitBreaker(this.lookupRemote.bind(this), {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    });
  }

  key(lat, lon) {
    return `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  }

  async getWeather(lat, lon) {
    const cacheKey = this.key(lat, lon);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const weather = await this.breaker.fire(lat, lon);
    await this.redis.setEx(
      cacheKey,
      this.config.weather.ttlSeconds,
      JSON.stringify(weather),
    );
    return weather;
  }

  async lookupRemote(lat, lon) {
    if (!this.config.weather.apiKey) {
      return {
        ambient_temp: 18,
        weather_condition: "unknown",
        airport_code: "UNK",
        source: "fallback",
      };
    }

    const timer = weatherDuration.startTimer();
    try {
      const response = await axios.get(this.config.weather.baseUrl, {
        params: {
          lat,
          lon,
          appid: this.config.weather.apiKey,
          units: "metric",
        },
      });

      return {
        ambient_temp: response.data.main.temp,
        weather_condition: response.data.weather?.[0]?.main || "Unknown",
        airport_code: inferAirportCode(lat, lon),
        source: "openweathermap",
      };
    } finally {
      timer();
    }
  }
}

function inferAirportCode(lat, lon) {
  if (lat > 40 && lat < 41 && lon < -73 && lon > -74) return "JFK";
  if (lat > 52 && lat < 53 && lon > 4 && lon < 5.5) return "AMS";
  if (lat > 25 && lat < 26 && lon > 55 && lon < 56) return "DXB";
  return "UNK";
}
