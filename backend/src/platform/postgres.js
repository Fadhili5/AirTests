import pg from "pg";
import { logger } from "./logger.js";

const { Pool } = pg;

class MemoryAuditStore {
  constructor() {
    this.events = [];
  }

  async log(type, payload) {
    this.events.unshift({
      id: `${type}-${Date.now()}`,
      type,
      payload,
      loggedAt: new Date().toISOString(),
    });
    this.events = this.events.slice(0, 1000);
  }

  async list(limit = 100) {
    return this.events.slice(0, limit);
  }
}

class PostgresAuditStore {
  constructor(pool) {
    this.pool = pool;
  }

  async ensureSchema() {
    await this.pool.query(`
      create table if not exists audit_events (
        id text primary key,
        type text not null,
        payload jsonb not null,
        logged_at timestamptz not null default now()
      )
    `);
  }

  async log(type, payload) {
    await this.pool.query(
      "insert into audit_events (id, type, payload) values ($1, $2, $3)",
      [`${type}-${Date.now()}`, type, payload],
    );
  }

  async list(limit = 100) {
    const result = await this.pool.query(
      "select id, type, payload, logged_at from audit_events order by logged_at desc limit $1",
      [limit],
    );
    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      payload: row.payload,
      loggedAt: row.logged_at,
    }));
  }
}

export async function createAuditStore(connectionString, disabled = false) {
  if (disabled || !connectionString) {
    logger.warn("PostgreSQL audit store disabled, using in-memory audit log");
    return new MemoryAuditStore();
  }

  try {
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 1500,
      idleTimeoutMillis: 5000,
    });
    const store = new PostgresAuditStore(pool);
    await store.ensureSchema();
    return store;
  } catch (error) {
    logger.warn({ error: error.message }, "PostgreSQL unavailable, using in-memory audit log");
    return new MemoryAuditStore();
  }
}
