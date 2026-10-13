# pi-sdlc

Bring the artifact-driven workflows, human governance and continuous feedback loop of the *AI Native SDLC Playbook* to **pi packages**. Reuse one package across projects: 1 extension, 6 stage skills, 3 shortcut prompts and 7 artifact templates.

The current version is a locally usable MVP, **not yet published to npm**. It orchestrates workflows, records human approvals and checks artifact dependencies. It does not configure monitoring, create GitHub PRs, deploy to production or start background agents.

## Installation

Requires Node.js ≥22.19 and pi (validated during development with version 1.2.0). Test/Deploy approvals also require Git. Run pi from the target repository root.

Install from npm using Pi's package source syntax:

```bash
pi install npm:pi-sdlc
pi
```

**The package has not yet been published to npm.** These npm commands become available after publication; use the local development installation below until then.

Install for the current project only:

```bash
pi install --local npm:pi-sdlc
```

Pin a published version for reproducible installation:

```bash
pi install npm:pi-sdlc@0.1.0
```

Review project resources before granting project trust. Pi loads the package's TypeScript dynamically; no build is required. Run `/reload` in an existing pi session after installation.

Try a published package without changing installation settings:

```bash
pi -e npm:pi-sdlc
```

### Local development installation

Before npm publication, or when testing local changes, use the package's absolute path:

```bash
pi install /absolute/path/to/pi-sdlc
```

For a temporary local session:

```bash
pi -e /absolute/path/to/pi-sdlc
```

## Complete workflow

Run these commands step by step in pi. After each `run`, complete the artifacts and review their content and actual evidence before the accountable person executes `approve`. Do not paste the entire sequence at once.

```text
/sdlc init claims-status Customer self-service claim status
/sdlc run plan
/sdlc approve plan Product Owner
/sdlc run design
/sdlc approve design Product Owner
/sdlc run build
/sdlc approve build Technical Lead
/sdlc run implement
/sdlc run test
/sdlc approve test Code Owner
/sdlc run deploy
/sdlc approve deploy Release Manager
/sdlc run maintain
```

- **Plan** → `intent.md`: problem, outcome, users, constraints and open questions.
- **Design** → `spec.md`: requirements and design together, with explicit policy conflicts and risks.
- **Build** → `plan.md`: exploration and planning only; list files, steps, risks and proof.
- **Implement**: the execution step within Build, not a seventh SDLC stage; modify code only after plan approval.
- **Test** → `verification.md`: actual commands, exit codes, logs, acceptance coverage and residual risk.
- **Deploy** → `review.md` + `release.md`: three review passes, release preparation and rollback evidence; **does not perform deployment**.
- **Maintain** → `incident.md`: read external observations, diagnose and document incidents, and propose new intent and permanent regression evals.

Templates contain `<!-- sdlc:draft -->`. Remove it after completing the content; artifacts with this marker cannot be approved. The marker check is not a content-quality assessment. Reviewers must still check TODOs, evidence, risks and acceptance results.

For larger repositories, enable additional read-only tools with `pi --tools +grep,+find,+ls` (the defaults are read/bash/edit/write).

Production releases run through an external protected environment or deployment platform. After deployment, use Maintain to record actual monitoring or incident evidence. For a new alert, start directly with `/sdlc init <new-id> <title>` → Plan, using the alert as input; do not fabricate a prior Deploy approval.

## State and cross-session use

```text
/sdlc status
/sdlc use claims-status
/sdlc run test
/sdlc help
/sdlc off
```

- Artifacts: `intent/<id>/`.
- Human approvals, content SHA-256 hashes and history: `.sdlc/changes/<id>.json`.
- Active change/phase: a custom entry on the pi session branch, restored with that branch. Use `use` to select a change in a new session.
- Multiple changes can coexist. Use separate Git worktrees for parallel implementation. Test/Deploy fingerprints include all Git-tracked and non-ignored files in a worktree, so other concurrent changes also invalidate approvals.
- Changes to upstream artifacts invalidate downstream approvals. Test/Deploy also bind source content, filenames, deletion state and file modes, including untracked but non-ignored files. They exclude `intent/` and `.sdlc/` and do not cover Git-ignored files, external service state or model configuration. Source symlinks are not currently supported for these two approval stages.
- A lock serializes cross-process init/approve writes, and state files are replaced atomically. Lock conflicts report an error rather than overwrite data. If an interrupted process leaves a lock behind, confirm that all processes using it have stopped before removing `.sdlc/mutation.lock/`.
- Review artifacts, approval state and code together through Git/PR review. The package never commits or pushes automatically. Local approval is neither a Git commit nor a tamper-proof audit store.

## Tool guardrails

These apply only in a session activated through `/sdlc init/use/run`:

- Plan/Design/Build/Deploy/Maintain: allow `read/grep/find/ls`, `sdlc_status` and writes to the current stage's designated artifacts; block shell execution, source edits and unknown/MCP tools.
- Implement/Test: allow source edits and local shell commands after checking valid prerequisite approvals; block direct `.sdlc`/`.git` file edits and obvious deploy/rollback, infrastructure and Git publication commands.
- To change an approved artifact, return to its authoring stage and obtain renewed approval. Test can write its own `verification.md`, but cannot directly modify plan/spec artifacts.
- The model has only the read-only `sdlc_status` tool, not an approval tool. Human `approve` requires interactive/RPC confirmation; headless mode rejects approval. Changes during confirmation prevent the approval from being recorded.

**These are collaboration guardrails, not a security sandbox.** Shell wrappers, aliases, custom tools or `/sdlc off` can bypass local constraints. Local reviewer names do not authenticate identity, and operating-system users can rewrite state files. Enforce mandatory controls through OS/container isolation, short-lived credentials, network policy, branch protection, CODEOWNERS and protected environments. A tool allowlist does not make shell commands read-only or automatically freeze test files.

Teams requiring MCP/browser access, remote PR diffs or strict test-file protection should configure separate controlled integrations and external checks. The current safe defaults do not silently enable these capabilities.

## Reuse skills and prompts independently

```text
/skill:sdlc-plan A new product idea
/skill:sdlc-design Write a spec from the existing intent
/skill:sdlc-build Write an implementation plan for this requirement
/skill:sdlc-test Check acceptance coverage
/skill:sdlc-deploy Review this diff and prepare release documentation
/skill:sdlc-maintain Analyze this alert evidence
/sdlc-capture Customers cannot see their order status
/sdlc-review Authentication and risk in this change
/sdlc-context Test commands and recurring mistakes
```

Standalone skills/prompts are advisory instructions. **They do not activate the extension's approvals or guardrails.** Use `/sdlc` for the complete workflow; load individual skills for focused tasks.

## Team customization

1. Maintain a short, accurate `AGENTS.md` in the target repository: commands and healthy output, architecture, conventions, frozen paths and recurring mistakes.
2. Define Bugs/Security/Compliance review passes, Important/Nit criteria, exclusions and volume limits in `REVIEW.md`.
3. Write security/compliance/brand/UX skills in the project's `.pi/skills/`, with owners, sources and versions. Mandatory policies also require independent CI/platform checks.
4. Declare one source of truth for each artifact. If Jira/ServiceNow is authoritative, Markdown is a working copy; link record IDs and commit SHAs in both directions. MCP synchronization needs separate authorization.
5. Build agent evals from real tasks, run regressions when skills, AGENTS.md, prompts, extensions or models change, and turn incidents into permanent evals. See `docs/adoption.md`.

## Development and distribution

```bash
npm ci --ignore-scripts
npm run check
npm test
npm pack
```

`npm pack` includes extensions/lib/skills/prompts/templates/docs. **It excludes the reference PDF, tests, node_modules and this project's local approval data.** The MIT license applies to the implementation, not the original PDF. Before publishing, adjust the npm name/version and confirm your organization's usage policies. `npm publish` has not been run.

Reference: the user-supplied `AI Native SDLC Playbook_designv2.pdf`, Louis Claxton / Anthropic, 54 pages. See `docs/adoption.md` for the mapping and implementation scope.
