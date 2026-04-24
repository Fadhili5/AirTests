export class ReconciliationService {
  constructor({
    config,
    exposureRepository,
    verificationQueueRepository,
    oneRecordService,
    auditStore,
    logger,
  }) {
    this.config = config;
    this.exposureRepository = exposureRepository;
    this.verificationQueueRepository = verificationQueueRepository;
    this.oneRecordService = oneRecordService;
    this.auditStore = auditStore;
    this.logger = logger;
  }

  async start() {
    if (!this.config.verification.enabled) {
      return;
    }
    await this.verificationQueueRepository.registerProcessor(async (job) => {
      try {
        await this.verify(job);
      } catch (error) {
        this.logger.warn({ error: error.message, job }, "Verification job failed");
        await this.verificationQueueRepository.appendFailure({
          ...job,
          failedAt: new Date().toISOString(),
          reason: error.message,
        });
      }
    });
  }

  async stop() {
    await this.verificationQueueRepository.stop();
  }

  async enqueueVerification(uldId, trigger = "read") {
    await this.verificationQueueRepository.enqueue({
      id: `${uldId}-${Date.now()}`,
      uldId,
      trigger,
      queuedAt: new Date().toISOString(),
    });
  }

  async listAudits(limit = 100) {
    return this.verificationQueueRepository.listAudits(limit);
  }

  async verify(job) {
    const redisState = await this.exposureRepository.getState(job.uldId);
    const oneRecordState = await this.oneRecordService.getUld(job.uldId);
    const drift = compareStates(redisState, oneRecordState, this.config.verification);
    const actionTaken = await this.reconcile(job.uldId, redisState, oneRecordState, drift);

    const auditEntry = {
      uld_id: job.uldId,
      timestamp: new Date().toISOString(),
      redis_state: redisState,
      one_record_state: oneRecordState,
      drift_detected: drift.detected,
      drift_details: drift.details,
      action_taken: actionTaken,
      trigger: job.trigger,
    };

    await this.verificationQueueRepository.appendAudit(
      auditEntry,
      this.config.retention.eventListLimit,
    );
    await this.auditStore.log("verification", auditEntry);
  }

  async reconcile(uldId, redisState, oneRecordState, drift) {
    if (!drift.detected) {
      return "NONE";
    }

    if (!oneRecordState && redisState) {
      await this.oneRecordService.syncOperationalState({ uldId, redisState });
      return "PATCHED_ONE_RECORD";
    }

    if (!redisState && oneRecordState?.operationalState) {
      await this.exposureRepository.saveState(uldId, oneRecordState.operationalState);
      await this.exposureRepository.saveLatestFleetStatus(
        uldId,
        oneRecordState.operationalState,
      );
      return "UPDATED_REDIS";
    }

    if (redisState && oneRecordState) {
      await this.oneRecordService.syncOperationalState({ uldId, redisState });
      return "REALIGNED_ONE_RECORD";
    }

    return "NONE";
  }
}

function compareStates(redisState, oneRecordState, verificationConfig) {
  const details = [];
  const twinState = oneRecordState?.operationalState || null;

  if (!redisState || !twinState) {
    return {
      detected: Boolean(redisState || twinState),
      details: [{ type: "state_missing", redisPresent: Boolean(redisState), oneRecordPresent: Boolean(twinState) }],
    };
  }

  const temperatureDelta = Math.abs(
    Number(redisState.lastTemperatureCelsius || 0) -
      Number(twinState.lastTemperatureCelsius || 0),
  );
  if (temperatureDelta > verificationConfig.temperatureDriftThresholdCelsius) {
    details.push({ type: "temperature", delta: Number(temperatureDelta.toFixed(2)) });
  }

  const exposureDelta = Math.abs(
    Number(redisState.exposureUsed || 0) - Number(twinState.exposureUsed || 0),
  );
  if (exposureDelta > verificationConfig.exposureDriftThresholdMinutes) {
    details.push({ type: "exposure", delta: Number(exposureDelta.toFixed(2)) });
  }

  if (String(redisState.lastRisk?.level || "LOW") !== String(twinState.lastRisk?.level || "LOW")) {
    details.push({
      type: "risk_level",
      redis: redisState.lastRisk?.level || "LOW",
      oneRecord: twinState.lastRisk?.level || "LOW",
    });
  }

  return {
    detected: details.length > 0,
    details,
  };
}
