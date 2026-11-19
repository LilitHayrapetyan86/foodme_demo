---
name: test-planning
description: Use for step 02 of the agent-driven STLC (/test-planning <T>) - write runs/<T>/plan.md, the test plan for approved requirements (scope, partitions and boundaries per AC, test level, test data, environment, risks, exit criteria).
---

# Step 02: Test plan

Argument: `T`. Run dir `R = agentic-workflows/functional-testing/runs/<T>/`. You write `R/plan.md`, and the `plan` entry of `R/gates.yaml` after the human approves.

If `R/plan.md` already exists, skip to "Human review" (a resumed review).

## Gate

`R/gates.yaml` must have `requirements.approved: true`, and every question in `R/spec.yaml` must have an `answer`. Otherwise: `STATUS: BLOCKED: step 01 is not approved`.

## Read

- `R/spec.yaml`: the acs, out_of_scope, answered questions and sut. The answers are now part of the requirements.
- The doc in `sources.doc`, for shared facts such as launch data and fees.
- Live test data: find a chef and dishes with read-only GETs on the SUT's public API (`curl -s <sut>api/...`, endpoints in `apps/web/src/api/foodme.ts`). Write down names and prices exactly.

Don't read the app's source code to decide what is correct. The app may be wrong.

## Write `R/plan.md`

Short and concrete:

1. **Scope**: the ACs in scope (ids), what is out of scope (from spec.yaml), and anything else you won't test, with a reason.
2. **Approach per AC**: a table `AC | partitions / boundaries | technique | level (manual 05 / automated 06) | cases planned`. Use equivalence partitions, boundary values (below / at / above a minimum) and state transitions (apply → replace → remove). Name the answered question that settles each expected value.
3. **Test data**: the chef, dishes, quantities and resulting subtotals for each partition, with the arithmetic shown. Reuse the same data where you can.
4. **Environment**: the SUT URL, the browser tool for step 05 (Playwright MCP, Claude in Chrome as fallback), a customer the human signs in to that browser before step 05, and the intended noise to ignore: random 200–1500 ms API latency, a cold start of up to a minute, heartbeat errors in GlitchTip, and `/api/debug/boom`.
5. **Risks**: what could make a correct app look broken (latency, cold start, a cart left over from earlier) and what could make a broken app look correct (asserting what the app shows instead of what the AC says).
6. **Exit criteria**: every AC covered by at least one case, every case executed and automated, every mismatch and failure listed in the report.

Aim for about 8–14 cases in total, with no duplicate partitions.

## Human review (in chat)

Show the approach table and the test data in chat, and give the path `runs/<T>/plan.md`. Then ask with **AskUserQuestion**: `Approve plan` / `Request changes`.

- `Request changes`: update `plan.md` with the notes, show what changed, and ask again.
- `Approve`: write the `plan` entry in `R/gates.yaml` (keep the other entries): `{ approved: true, by: <git config user.name>, at: <UTC now>, note: <the human's note or ""> }`.

## End

`STATUS: DONE: plan approved; next /test-case-design <T>`, or `NEEDS_HUMAN: <what is still open>`, or `BLOCKED: <reason>`.
