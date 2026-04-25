import { Queue, Worker } from "bullmq";

export class VerificationQueueRepository {
  constructor({ redis, config, logger }) {
    this.redis = redis;
    this.config = config;
    this.logger = logger;
    this.auditKey = "verification:audits";
    this.failureKey = "verification:failures";
    this.queueName = "verification-jobs";
    this.localQueue = [];
    this.localProcessor = null;
    this.localDrainScheduled = false;
    this.localProcessing = false;

    if (!redis.isInMemory) {
      const connection = createBullMqConnection(config.redis.url);
      this.queue = new Queue(this.queueName, { connection });
      this.worker = null;
      this.connection = connection;
    }
  }

  async enqueue(job) {
    if (this.queue) {
      await this.queue.add("verify-uld", job, {
        jobId: job.id,
        removeOnComplete: 250,
        removeOnFail: 250,
        attempts: 3,
        backoff: {
          type: "fixed",
          delay: Math.max(1000, this.config.oneRecord.syncRetryDelayMs),
        },
      });
      return;
    }

    this.localQueue.push(job);
    this.scheduleLocalDrain();
  }

  async registerProcessor(processor) {
    if (this.queue) {
      if (this.worker) {
        return;
      }

      this.worker = new Worker(
        this.queueName,
        async (job) => processor(job.data),
        {
          connection: this.connection,
          concurrency: Math.max(1, this.config.verification.batchSize),
        },
      );

      this.worker.on("failed", (job, error) => {
        this.logger.warn(
          {
            jobId: job?.id,
            error: error?.message,
          },
          "Verification worker job failed",
        );
      });
      return;
    }

    this.localProcessor = processor;
    this.scheduleLocalDrain();
  }

  async stop() {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }

    if (this.queue) {
      await this.queue.close();
    }
  }

  async size() {
    if (this.queue) {
      const counts = await this.queue.getJobCounts(
        "waiting",
        "delayed",
        "active",
        "prioritized",
      );
      return Object.values(counts).reduce((total, count) => total + count, 0);
    }

    return this.localQueue.length;
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

  scheduleLocalDrain() {
    if (this.localDrainScheduled || !this.localProcessor) {
      return;
    }

    this.localDrainScheduled = true;
    queueMicrotask(() => {
      this.localDrainScheduled = false;
      void this.drainLocal();
    });
  }

  async drainLocal() {
    if (this.localProcessing || !this.localProcessor) {
      return;
    }

    this.localProcessing = true;
    try {
      while (this.localQueue.length > 0) {
        const job = this.localQueue.shift();
        await this.localProcessor(job);
      }
    } finally {
      this.localProcessing = false;
    }
  }
}

function createBullMqConnection(redisUrl) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number.parseInt(url.port || "6379", 10),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname && url.pathname !== "/" ? Number.parseInt(url.pathname.slice(1), 10) : 0,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
