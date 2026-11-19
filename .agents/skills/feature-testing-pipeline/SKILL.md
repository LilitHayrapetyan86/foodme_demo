---
name: feature-testing-pipeline
description: Use when asked to test a Jira feature ticket with the agent-driven STLC (/feature-testing-pipeline <T>) - runs the whole flow end to end in one session (requirements → plan → cases + judge → manual run → Playwright spec + judge → run → report), pausing only for the human's reviews. Also resumes a run from where it stopped.
---

# Agent-driven STLC with a human in the loop

This skill **runs the whole flow**, step after step, in this session. It pauses only when the human must review or act. The human never creates or edits a file: every pause is a review of something an agent just created, done in chat.

Rule: **agents create, judges check (read-only), the human reviews and decides.**

Argument: only `T`, the ticket key (e.g. `KAN-27`; if none was given, ask). The SUT is known and fixed: `https://foodme-armanayvazyan-5cz9.onrender.com/`. Never ask the human for it.

## Run directory `R = agentic-workflows/functional-testing/runs/<T>/`

| File | Written by |
|---|---|
| `spec.yaml` | 01 (acs, out_of_scope, questions and the human's answers given in chat), 03 (test_cases), 05/06 (per-case status) |
| `plan.md` | 02 |
| `gates.yaml` | the step, **only right after the human approves in chat**. It is the record of each review. |
| `verdicts/04-NN.json`, `verdicts/07-NN.json` | 03 / 06, which call the judge agent and save its JSON word for word (phase 2) |
| `execution.md` | 05 (with a run plan and each case's confidence) |
| `results.json` | 06, which runs the suite after the human approved the tests |
| `report.md` | 10 |
| `found_issues.json` | 10: one bug candidate per mismatch, its approval and its Jira key |
| `report.html` | 10: the HTML report (tabs: plan, gates, spec, results with automation status per case, verdicts, issues), rebuilt from the run files |
| `status` | this skill: one line for the Claude Code status line (see below) |

## The steps, in order

| # | Step skill | Creates | Pauses for the human |
|---|---|---|---|
| 01 | `requirements-gathering` | `spec.yaml` | answers to the gap questions, then approval → `requirements` |
| 02 | `test-planning` | `plan.md` | approval → `plan` |
| 03 + 04 | `test-case-design` (calls `case-judge` in phase 2) | `test_cases`, `verdicts/04-*` | approval → `cases` |
| 05 | `test-execution` (Playwright MCP; Claude in Chrome as fallback) | `execution.md` | sign-in if the browser isn't signed in as a customer; a manual check of every case the agent isn't 100% sure about → `manual_check` |
| 06 + 07 + 08 | `test-automation` (calls `test-judge` in phase 2, then runs the suite) | `e2e/<t>-*.spec.ts`, `verdicts/07-*`, `results.json` | approval → `tests` |
| 10 | `test-reporting` | `report.md`, `found_issues.json`, `report.html`, Qase, Jira bugs | approval → `report_push`; which issues are real bugs → `issues`, then a Jira ticket for each approved one |

Step 09 (triage) is not part of this lesson. Mismatches from 05 and failures from 08 go into the report as **not triaged**.

## How to run

1. Work out the first step that isn't finished (a fresh run starts at 01):
   - 01: `spec.yaml` has `acs`, every question has an `answer`, and `requirements.approved: true`.
   - 02: `plan.md` exists and `plan.approved: true`.
   - 03 + 04: `test_cases` is not empty and `cases.approved: true`.
   - 05: every case has `execution.result`, and every case with `confidence: unsure` has a `human_check`.
   - 06 + 07 + 08: every case has `spec`, `tests.approved: true`, and `results.json` exists.
   - 10: `report.md` exists, `report_push` is set (and if it is `approved: true`, `report.md` has a **Qase** section), `issues` is set, and no issue in `found_issues.json` is `approved` without a `jira.key`.
2. Print one line: `Run <T>: starting at step NN` (plus which steps are already done).
3. **Load that step's skill with the Skill tool** (passing only `T`) and follow it completely, including its review.
4. When the step ends with `STATUS: DONE`, **go straight on to the next step in the same turn**. Don't end your turn, don't summarise, and don't ask "shall I continue?". Moving to the next step is not a decision for the human; the reviews inside the steps are.
5. Repeat until step 10 is done.

### Status line (`R/status`)

The Claude Code status line shows the first line of `R/status`. Overwrite that file (one line) every time the state changes: when a step starts, right before every AskUserQuestion, after the answer, when a judge runs, and when you stop.

```
Feature Testing <T> │ ✅01 ✅02 ▶03 ⏳04 ⏳05 ⏳06 ⏳07 ⏳08 ⏳10 │ 03 Test cases · <what is happening now>
```

- One mark per step: `✅` done, `▶` running, `🧑` waiting for the human, `⛔` blocked, `⏳` not started.
- The last part is short, e.g. `writing cases`, `case-judge round 2`, `🧑 review the cases`, `🧑 sign in to the browser`, `🧑 check 2 unsure cases`, `🧑 pick the bugs to file`, `filing Jira bugs`, `running Playwright on the SUT`, `⛔ Qase 401`, `done`.
- The file only shows the state. Never read it to decide what to do; the step rules above decide that.

### When to stop (and only then)

- **A review**: a step asks the human with AskUserQuestion. That is a pause inside the step, not a stop. Carry on after the answer.
- **`STATUS: NEEDS_HUMAN`**: the human chose to stop, or something only they can do is still open (e.g. re-open the requirements). Stop and show the summary below.
- **`STATUS: BLOCKED`**: stop and show the summary below with the reason.

Never set a gate yourself to keep the flow moving. A gate is set only by the step, right after the human's `Approve`.

## Final reply (at the end of the run, or when stopped)

```markdown
Run: <T> · agentic-workflows/functional-testing/runs/<T>/

| # | Step | State |
|---|---|---|
| 01 | Requirements | ✅ approved by <by> at <at> · 🧑 waiting for you · ⛔ blocked · ⏳ not started |
| …  | one row per step: 01, 02, 03, 04, 05, 06, 07, 08, 10 | |

<done: the report path, the Qase link, and the Jira keys of the filed bugs> or <stopped: why, and what you need to do>
To resume: /feature-testing-pipeline <T>

STATUS: DONE | NEEDS_HUMAN: <what> | BLOCKED: <reason>
```
