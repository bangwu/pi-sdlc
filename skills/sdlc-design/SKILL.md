---
name: sdlc-design
description: Turns accepted intent into spec.md with requirements and design in one pass. Use for SDLC specifications, acceptance criteria, architecture/UX choices and policy-conflict escalation.
---
# Design — requirements and design together

Read `../CONTRACT.md`. In the guarded workflow, require current human Plan approval.

1. Read intent.md, current code/architecture and relevant brand, security, compliance and UX skills. Record their versions and owners in spec.md.
2. Specify requirements with stable IDs, measurable acceptance checks, contracts, UX states, failure modes, data flow and compatibility.
3. Explain alternatives and trade-offs. Link each design decision to intent and each requirement to a verification method.
4. Address intent questions or carry them forward with named owners. Flag contradictory policies and high-risk design; do not pretend missing policy is satisfied.
5. Write spec.md using `../../templates/spec.md`; resolve flagged concerns with the product/policy owner before handing off.
6. Request human `approve design`; higher-risk work also needs the organization's technical lead. Approval starts Build planning, not implementation.

Metrics: intent commit → spec commit; spec revisions after the first plan commit.
