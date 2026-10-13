---
name: sdlc-test
description: Verifies changes with actual tests, builds, lint and UI checks, and records verification.md. Use for SDLC acceptance testing, bug regression proof, feedback loops and agent-configuration evals.
---
# Test — show proof, not confidence

Read `../CONTRACT.md` and the approved plan/spec. Use `../../templates/verification.md`.

1. Find one-command build/test/lint targets in AGENTS.md; verify commands and healthy output rather than inventing them.
2. Run each required check. Record command, exit code, actual output/log location and source revision. Map requirements to tests and exercise neighboring flows.
3. For bug fixes, preserve the failing-before/fixed-after proof. Never delete/skip failing tests or lower assertions merely to pass.
4. Fix implementation errors and rerun. A plan deviation requires renewed human approval. Missing environments or checks mean BLOCKED, not PASS.
5. For UI, include mock comparison and screenshots using an explicitly authorized browser workflow; active extension blocks unknown tools, so the operator must arrange the separate visual-check session and supply evidence.
6. Write verification.md; remove the draft marker only when the record is truthful. A human reviews evidence with `approve test`. Source changes invalidate test/deploy approvals.

For agent configuration changes: build 20–50 real representative evals over time, each with prompt and deterministic acceptance checks. Run in isolated workspaces on AGENTS.md/Skills/extension/prompt/model changes and on a schedule. Add every incident as a permanent regression eval; track pass-rate drops and CI versus production escapes. Package unit tests are not a substitute for behavioral model evals.
