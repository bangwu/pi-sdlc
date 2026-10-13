---
name: sdlc-plan
description: Captures ideas, tickets and incident follow-ups as intent.md. Use for SDLC discovery, clarifying scope, users, constraints and measurable outcomes before design.
---
# Plan — capture intent once

Read `../CONTRACT.md` before work. Use the active `intent/<id>/intent.md` and bundled `../../templates/intent.md` structure.

1. Read original sources. Preserve the originator's meaning; distinguish evidence, assumptions and proposals.
2. Ask focused questions about users, outcome, constraints, non-goals and success. Do not build while intent is uncertain.
3. Write the problem, proposed outcome, affected users/systems, constraints and owned open questions. Include author, source/ticket and source-of-truth designation.
4. Ask the originator to correct misunderstandings, then hand off for product-owner review. Remove the draft marker only when ready.
5. Wait for human `approve plan` before Design. Suggest a version-control commit; never commit automatically.

Metrics to collect externally: first conversation → intent commit; acceptance rate; changes to intent after first spec commit. Don't derive git-based metrics from local approval timestamps.
