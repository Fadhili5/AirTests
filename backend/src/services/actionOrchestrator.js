export class ActionOrchestrator {
  constructor({ operationsRepository, auditStore, io }) {
    this.operationsRepository = operationsRepository;
    this.auditStore = auditStore;
    this.io = io;
  }

  async orchestrate({ uldId, decisionPackage, reading }) {
    const existingActions = await this.operationsRepository.getActions(uldId, 200);
    const existingWorkflows = await this.operationsRepository.getWorkflows(uldId, 200);
    const actions = [];
    const workflows = [];

    for (const actionTemplate of decisionPackage.actions) {
      const alreadyOpen = existingActions.some(
        (action) =>
          action.action === actionTemplate.action && action.status !== "COMPLETED",
      );
      if (alreadyOpen) {
        continue;
      }

      const action = {
        id: `${uldId}-${actionTemplate.action}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        uldId,
        action: actionTemplate.action,
        priority: actionTemplate.priority,
        slaMinutes: actionTemplate.slaMinutes,
        status: actionTemplate.priority === "AUTOMATED" ? "COMPLETED" : "PENDING",
        createdAt: reading.timestamp,
        completedAt:
          actionTemplate.priority === "AUTOMATED" ? new Date().toISOString() : null,
        responseTimeMinutes:
          actionTemplate.priority === "AUTOMATED" ? 1 : null,
      };
      await this.operationsRepository.appendAction(uldId, action);
      await this.operationsRepository.setAction(action);
      await this.operationsRepository.appendTimeline(uldId, {
        type: "ACTION",
        ...action,
      });
      await this.auditStore.log("action", action);
      this.io.emit("action", action);
      actions.push(action);
    }

    for (const workflowTemplate of decisionPackage.workflows) {
      const alreadyOpen = existingWorkflows.some(
        (workflow) =>
          workflow.name === workflowTemplate.name && workflow.status !== "COMPLETED",
      );
      if (alreadyOpen) {
        continue;
      }

      const workflow = {
        id: `${uldId}-${workflowTemplate.name}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        uldId,
        name: workflowTemplate.name,
        status: "OPEN",
        steps: workflowTemplate.steps.map((step, index) => ({
          id: `${workflowTemplate.name}-${index + 1}`,
          label: step,
          status: index === 0 ? "READY" : "QUEUED",
        })),
        createdAt: reading.timestamp,
      };
      await this.operationsRepository.appendWorkflow(uldId, workflow);
      await this.operationsRepository.setWorkflow(workflow);
      await this.operationsRepository.appendTimeline(uldId, {
        type: "WORKFLOW",
        ...workflow,
      });
      await this.auditStore.log("workflow", workflow);
      this.io.emit("workflow", workflow);
      workflows.push(workflow);
    }

    return { actions, workflows };
  }

  async completeAction(actionId) {
    const action = await this.operationsRepository.getAction(actionId);
    if (!action) return null;

    const completed = {
      ...action,
      status: "COMPLETED",
      completedAt: new Date().toISOString(),
      responseTimeMinutes: action.responseTimeMinutes || 3,
    };
    await this.operationsRepository.setAction(completed);
    await this.operationsRepository.appendTimeline(completed.uldId, {
      type: "ACTION_UPDATE",
      ...completed,
    });
    await this.auditStore.log("action-completed", completed);
    this.io.emit("action", completed);
    return completed;
  }
}
