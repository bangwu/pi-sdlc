---
name: sdlc-deploy
description: Prepares policy-based review.md and release.md with human production gates and rollback evidence. Use for SDLC PR review, release readiness, review-comment triage and safe CI/CD handoff; never deploys production.
---
# Deploy — prepare everything up to the production gate

Read `../CONTRACT.md`. Require valid Test approval. This phase is document preparation/review only: no shell, publication, MCP mutation or production action.

1. Read REVIEW.md, intent/spec/plan, verification evidence and the diff supplied by the operator (or inspect changed files). If a complete diff/base is unavailable, state that review is incomplete.
2. Run separate bugs, security and compliance review passes. Include file:line, severity, concrete evidence and impact. Distinguish Important from Nit; cap nits at five by default. Skip generated/style issues already enforced by CI unless security requires attention.
3. Check the diff against intent/spec/plan and identify stale AGENTS.md. Findings alone never authorize merge.
4. Write review.md using `../../templates/review.md`, with counts, unresolved findings, limitations and human code-owner handoff.
5. Write release.md using `../../templates/release.md`: candidate revision, CI evidence, environment, named release manager, approved deployment route, staging-rehearsed rollback and metric/control-band monitoring.
6. Request human `approve deploy` to acknowledge documents only. Real merge/release needs branch protection and a protected deployment platform; a local approval is not production authorization.

For PR babysitting, triage comments and failed checks in an authorized separate integration. Clear fixes return to implement/test and invalidate old approvals; conflicting requirements or critical risk escalate. Never claim GitHub integration exists merely because pi supports MCP.

Metrics come from PR/CI/platform data: time to first review, review comments resolved, escaped defects, failure-triage share and DORA measures.
