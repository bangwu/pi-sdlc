# Playbook → pi: implementation scope

This is a repository-focused engineering adaptation. It does not claim feature-for-feature equivalence with Claude Code or replicate its managed settings.

## Core mapping

- PDF pp. 11–13, Capture as intent.md: `sdlc-plan` + `intent.md`, preserving the original intent and product-owner approval.
- pp. 15–17, Requirements and design: `sdlc-design` + `spec.md`, loading organization policy skills and identifying conflicts and accountable owners.
- pp. 19–21, Plan mode / auto mode: `run build` restricts source edits and shell execution; `run implement` follows human approval of plan.md. These are not native pi plan/auto modes and do not change global permission settings.
- pp. 22–26, Source of truth / CLAUDE.md / Skills: record links, `AGENTS.md` and portable Agent Skills. Establish an authoritative record to prevent contradictory copies.
- pp. 27–29, Hooks / parallel sessions / subagents: extension `tool_call` events provide session-level guards; humans explicitly create worktrees. No subagent runner is included.
- pp. 31–35, Feedback loop / evals: `sdlc-test` + verification.md require actual failure/success evidence and guide independent agent evals. The current automated tests cover package logic, not model evaluation across 20–50 real tasks.
- pp. 37–46, Review / approval gates / CI/CD: `sdlc-deploy` + review.md/release.md provide three review passes and human handoff; production authorization remains on an external platform. No PR bot, deployment MCP integration or enterprise sandbox is installed.
- pp. 48–52, Maintain / close the loop / channel first responder: `sdlc-maintain` + incident.md + intent for a new change. No monitor, scheduler or channel bot is started.

## Modular adoption

Install only skills/prompts to reuse individual capabilities in an existing workflow. Pi package resource filters can disable the extension; for example, set `extensions: []` on the package object in settings. All controls are then advisory.

`/sdlc` provides a stricter, complete dependency chain to prevent coding without approved intent/spec/plan artifacts. It does not support skipping prerequisite approvals or agents elevating their own permissions. Organizations that need automated headless stage transitions must first validate artifacts, permissions and trusted approvals in an independent pipeline, while preserving an escalation path for risk. Do not let an agent edit this package's approval JSON.

## CI adoption recommendations

Start with deterministic package checks, then add model work to isolated evaluations:

```bash
npm ci --ignore-scripts
npm run check
npm test
```

Run model evals in disposable containers/worktrees without production credentials. Never execute unreviewed commands from PR text. Each case should include the original prompt, fixed fixtures, model/skill/prompt versions, executable acceptance checks, allowed tools, budget/time limits and output evidence. Judge results with deterministic checks, not the model's claim that work is "done." Set thresholds using team data, and require configuration-owner review when a change reduces the pass rate.

Skills can also be reused through a non-interactive entry point:

```bash
pi --offline --no-session --tools read,grep,find,ls --print \
  '/skill:sdlc-maintain Diagnose only from the alert evidence supplied in the repository; do not modify code or deploy'
```

Install this package and configure model credentials first. `--offline` disables only Pi's automatic network activity; it does not block API calls to the selected model or tool network access. This example is not an OS sandbox. The invoking platform must configure tool restrictions, short-lived tokens and container network limits. This entry point does not use `/sdlc run` or grant approvals; its output is only a proposal awaiting review.

## Minimum requirements for an external closed loop

- Monitoring scripts calculate control bands deterministically and have unit tests. Specify behavior for insufficient samples, zero standard deviation, outliers, cooldowns, deduplication and repeated alerts.
- The 1σ/2σ/3σ tiers are examples from the playbook. Calibrate thresholds to the service's actual costs and stability.
- Alert-triggered diagnosis uses read permissions. Fix proposals enter protected PRs. Production rollback uses only a rehearsed, authorized runbook.
- An independent reviewer or deterministic gate checks the preceding stage. The agent that writes code must not approve its own work.
- Preserve original signals, actions, approvals, recovery observations and triage decisions. Produce the next intent and a permanent regression eval.

## Measuring effectiveness

Use actual Git/PR/CI/incident-platform records rather than inventing metrics from local state JSON: intent-to-design cycle time, plan-to-merge cycle time, first-pass CI success rate, review waiting time, change failure rate, production-anomaly-to-intent latency and repeat-incident rate. Observe speed alongside rework and escaped defects. The current package records approval timestamps only; it does not calculate these metrics automatically.
