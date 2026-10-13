---
name: sdlc-build
description: Produces plan.md before implementation and executes only an accepted plan. Use for SDLC implementation planning, controlled coding, feedback loops and worktree-isolated parallel tasks.
---
# Build — plan before code

Read `../CONTRACT.md`. First determine whether the active phase is `build` (planning) or `implement` (coding).

## build: read-only exploration and plan
1. Read intent.md, spec.md, AGENTS.md and relevant policy skills. Inspect repository with read/grep/find/ls; shell is blocked in this phase.
2. Write plan.md using `../../templates/plan.md`: exact files, ordered tasks, dependencies, tests/expected output, blast radius, alternatives and rollback.
3. Ask what could break and which step is riskiest. The plan must be executable by someone who did not see the conversation.
4. Do not edit source or tests. Request human `approve build` before `/sdlc run implement`.

## implement: execute accepted plan
1. Confirm approvals via sdlc_status. Keep changes within the approved plan. If scope changes, stop, return to Build, revise and request new approval.
2. For bug fixes, reproduce with a failing test before fixing; show the expected failure. Preserve the regression test; do not weaken tests to make code pass. For strict protection use external checks or a test-path guard administered by the team.
3. Implement in small steps; run the agreed feedback loop after each meaningful change. Capture actual output and unexpected behavior.
4. Independent work can use separate git worktrees created by the human. Tasks sharing files run sequentially. pi has no built-in subagent guarantee; do not invent one.
5. Hand off to Test with a summary of diff, checks, deviations and risks. Never self-approve or publish code.

Institutional knowledge belongs in a short reviewed AGENTS.md (commands, conventions, architecture, recurring mistakes). Policies needing consistent application belong in versioned Skills; mandatory policies also need deterministic external enforcement.
