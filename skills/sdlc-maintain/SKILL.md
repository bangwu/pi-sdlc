---
name: sdlc-maintain
description: Converts production alerts, tickets and channel incidents into incident.md and a new intent with regression evals. Use for SDLC incident diagnosis, control-band breaches, recovery evidence and closing the lifecycle loop.
---
# Maintain — close the loop without bypassing gates

Read `../CONTRACT.md`. In the guarded end-to-end workflow require Deploy document approval; for an unrelated new incident start a new change with Plan, using the incident as source evidence.

1. Read supplied alert/metric/ticket evidence and deployed revision. Never infer that a signal recovered without observations.
2. Detection belongs to deterministic versioned scripts, not model judgment: stable rolling baseline, explicitly chosen rules (for example Western Electric), tests, deduplication/cooldown and noisy-band tuning.
3. Explain the response tier: 1σ logs, 2σ diagnoses read-only, 3σ proposes a PR or hands off an already-approved runbook. Thresholds must be service-owner approved; generic sigma values are examples, not universal policy.
4. Write incident.md using `../../templates/incident.md`: timeline, observed anomaly, impact, competing causes, authorized actions, recovery evidence and owned follow-ups.
5. Suggest a new `/sdlc init <new-id> <title>` and link its intent to this incident. Do not automatically overwrite earlier accepted artifacts or trigger repairs/rollback.
6. Propose a permanent regression eval and reviewed AGENTS.md/skill lessons for recurring mistakes. Human service owner triages fix-now/schedule/dismiss and routes product decisions to the product owner.

This package does not start a monitor, scheduler, Slack bot or production rollback. External automation can invoke pi headlessly for diagnosis/proposals in a sandbox with read-only/scoped credentials. Headless runs cannot manufacture human approvals. Measure breach → intent latency, merged-fix yield and repeat-incident rate from the external event/PR records.
