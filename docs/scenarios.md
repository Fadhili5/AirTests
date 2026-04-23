# AeroSentinel X Demo Scenarios

## Scenario 1: Tarmac Heat Risk

1. ULD enters `TARMAC` zone.
2. Ambient temperature rises.
3. Risk score crosses `HIGH`.
4. System creates preventive actions:
   - `MoveToColdZone`
   - `ApplyThermalCover`
5. Workflow opens and alert feed updates in real time.

## Scenario 2: Delay To Breach

1. Flight status becomes `DELAYED`.
2. Exposure accumulates while ULD remains idle.
3. Decision engine escalates to critical actions.
4. Action timeline records SLA escalation and QA inspection.

## Scenario 3: Recovery

1. ULD is moved back into compliant operating conditions.
2. Recovery alert is emitted.
3. Workflow can be completed by the operator.
4. Audit trail preserves the full mitigation history.
