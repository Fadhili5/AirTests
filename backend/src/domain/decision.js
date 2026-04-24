export function buildDecisionPackage({ rule, status, risk, context }) {
  const actions = [];
  const workflows = [];
  const notifications = [];

  if (risk.risk_score >= 0.8) {
    actions.push(actionTemplate("Move ULD to controlled storage", "Ramp Supervisor", "CRITICAL", 10));
    actions.push(actionTemplate("Apply thermal protection", "Ground Handler", "HIGH", 15));
    workflows.push(workflowTemplate("PreventiveCoolingWorkflow", [
      "Move ULD to cold zone within 10 minutes",
      "Apply thermal cover",
      "Confirm temperature trend is stabilizing",
    ]));
    notifications.push({
      level: "WARNING",
      channel: "webhook",
      message: "High predictive risk detected. Preventive action required.",
    });
  }

  if (context.delayDetected) {
    actions.push(actionTemplate("Prioritize handling", "Airport Control", "HIGH", 5));
    workflows.push(workflowTemplate("DelayEscalationWorkflow", [
      "Notify ground handler",
      "Update ops dashboard",
      "Confirm revised handling slot",
    ]));
  }

  if (context.handlingGap) {
    actions.push(actionTemplate("Expedite loading", "Load Controller", "HIGH", 7));
  }

  if (status.status === "BREACH") {
    actions.push(actionTemplate("Require QA inspection", "Quality Lead", "CRITICAL", 5));
    actions.push(actionTemplate("Escalate shipper disposition", "Ops Control", "CRITICAL", 3));
    workflows.push(workflowTemplate("CriticalBreachWorkflow", [
      "Move ULD to controlled environment immediately",
      "Notify QA and shipper",
      "Record disposition decision",
    ]));
    notifications.push({
      level: "CRITICAL",
      channel: "email",
      message: "Temperature exposure breach detected. Escalation required.",
    });
  }

  if (status.status === "AT_RISK" && status.exposureRemaining <= 1) {
    actions.push(actionTemplate("Expedite loading", "Load Controller", "HIGH", 5));
  }

  return {
    risk,
    actions,
    workflows,
    notifications,
    recommendedSop: buildSop(rule, context, status),
  };
}

function actionTemplate(action, assignedRole, priority, slaMinutes) {
  return {
    action,
    assignedRole,
    priority,
    slaMinutes,
  };
}

function workflowTemplate(name, steps) {
  return {
    name,
    steps,
  };
}

function buildSop(rule, context, status) {
  return {
    requiredColdZoneEntryMinutes: 10,
    currentExposureStatus: status.status,
    productBand: `${rule.minTempC}C to ${rule.maxTempC}C`,
    handlerComplianceTargetPercent: 95,
    contextTriggers: {
      tarmacExposure: context.tarmacExposure,
      handlingGap: context.handlingGap,
      delayDetected: context.delayDetected,
    },
  };
}
