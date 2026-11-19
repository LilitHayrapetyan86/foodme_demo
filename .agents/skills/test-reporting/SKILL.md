---
name: test-reporting
description: Use for step 10 of the agent-driven STLC (/test-reporting <T>) - write runs/<T>/report.md (coverage, manual and automated results, untriaged mismatches and failures, judge findings, human approvals), runs/<T>/found_issues.json and the HTML report runs/<T>/report.html, get the human's approval in chat, push the cases and results to Qase project FOODME, and file a Jira bug for every issue the human approves.
---

# Step 10: Report

Argument: `T`. Run dir `R = agentic-workflows/functional-testing/runs/<T>/`. You write:

- `R/report.md`;
- `R/found_issues.json` (the bug candidates and what happened to each);
- `R/report.html`, the HTML report built from the template `templates/report.html` (next to this file) and every file in `R`;
- the `report_push` and `issues` entries of `R/gates.yaml`, each right after the human decides;
- each case's `qase_id` in `spec.yaml` when you push.

Qase project code: **FOODME**. Jira project: **KAN**.

## Gate

Every case has `execution.result` and `spec`, `tests.approved: true`, and `R/results.json` exists. Otherwise: `STATUS: BLOCKED: <the step that isn't done>`.

Resume, in this order:

1. If `report.md` doesn't exist, start at "Write".
2. If `report_push` isn't set, go to "Human review".
3. If `report_push.approved: true` and `report.md` has no **Qase** section, go to "Push".
4. If `issues` isn't set in `gates.yaml`, go to "Issues review". If `found_issues.json` doesn't exist yet (a run reported before this file existed), write it first, as described in "Write `R/found_issues.json`", and add the **Found issues** section to `report.md`.
5. If an issue in `found_issues.json` has `status: approved` and no `jira.key`, go to "File in Jira".

Never rewrite a `report.md` or `found_issues.json` that already exists. Only add to them. `report.html` is different: it is only a view of the run files, so build it again ("Build `R/report.html`") every time this skill writes a run file, and before "End".

## Write `R/report.md`

Read `spec.yaml`, `plan.md`, `execution.md`, `results.json`, `gates.yaml` and `verdicts/` (if present). Use only what these files say. Don't re-test or re-judge anything.

1. **Summary**: one paragraph. Is the feature ready? Name the cases that block it.
2. **Coverage**: `AC | cases | manual (05) | automated (08)`, with ✅ / ❌ / ⏸ in each cell.
3. **Cases**: `case | title | 05 result | confidence | test title | 08 result`. Take the 08 result from `results.json`, matched by test title. When a human checked a case in 05 (`human_check`), show it as `<result> (checked by <by>)`.
4. **Not triaged**: every 05 `mismatch` and every 08 failure, with expected vs observed (or the Playwright error) quoted. Triage is not part of this run, so don't guess a root cause.
5. **Still unsure**: every case whose 05 confidence is still `unsure` (no human check, or the human chose "Can't check now"), with its `unsure_reason`. Write "None" if there are none.
6. **Questions answered**: each Q-n with its answer and who answered it.
7. **Review**: one line per gate in `gates.yaml` (`requirements`, `plan`, `cases`, `manual_check`, `tests`: approved by `<by>` at `<at>`, note). For steps 04 and 07, the judge verdicts in order, with each non-PASS check (check, item, reason).
8. **Not tested**: out-of-scope items and blocked cases, with reasons.
9. **Found issues**: one line per candidate in `found_issues.json`: `id | title | cases | status`. Add the Jira key once it's filed.

No customer PII.

## Write `R/found_issues.json`

Make one candidate for each of these:

- every 05 `mismatch`;
- every 08 failure whose case matched in 05, where the error comes from an assertion in the spec file (an automated-only mismatch).

Don't make a candidate for these; list them in the report only:

- an 08 failure inside setup (sign-up, navigation, a helper in `e2e/*.ts`, or a timeout before the first assertion). That is a problem with the test, not with the app;
- a case that is still `unsure`.

One candidate per case. Don't merge cases or guess a shared cause yourself; the human can ask you to merge them in the review.

```json
{
  "run": "KAN-27",
  "sut": "https://foodme-armanayvazyan-5cz9.onrender.com/",
  "issues": [
    {
      "id": "KAN-27-ISSUE-01",
      "title": "Bug: <what the customer sees go wrong, one line>",
      "cases": ["KAN-27-TC-05"],
      "source": "05 mismatch",
      "covers": ["AC-2"],
      "expected": "<the case's expected, word for word>",
      "observed": "<copied from execution.md or the Playwright error, word for word>",
      "steps": ["<the case's steps, word for word>"],
      "evidence": ["execution.md#kan-27-tc-05", "results.json: KAN-27-TC-05: …"],
      "observed_at": "<UTC time from execution.md>",
      "priority": "Highest",
      "priority_reason": "<one line, from the rubric in the jira skill>",
      "status": "proposed",
      "decision": { "by": "", "at": "", "note": "" },
      "jira": { "key": "", "url": "", "sprint": "" }
    }
  ]
}
```

- `status`: `proposed`, then `approved` or `rejected` (from the human), then `filed` (after Jira).
- `priority`: pick it from the bug rubric in the `jira` skill (load the skill first). Base it on what the run files show, not on the case's own wording.
- If there are no candidates, write the file with `"issues": []`.

## Build `R/report.html`

A single HTML file with tabs: **Overview** (counts, gates, AC coverage, summary), **Plan** (`plan.md`), **Gates** (`gates.yaml`: who approved what, when), **Spec** (ACs, out of scope, questions and answers, every test case with its automation status), **Results** (per case: 05 result and confidence, automation status, 08 result and Playwright error, the case's `execution.md` section), **Verdicts** (each judge round with its non-PASS checks), **Issues** (`found_issues.json`) and **Files** (every run file as is).

Don't write the HTML yourself and don't edit the template. Run this from the repo root; it copies the template and puts every file in `R` (except `report.html`) into it, escaped:

```bash
R=agentic-workflows/functional-testing/runs/<T>
TPL=agentic-workflows/functional-testing/skills/test-reporting/templates/report.html
{
  sed '/@@RUN_FILES@@/,$d' "$TPL"
  (cd "$R" && find . -type f ! -name report.html | sed 's#^\./##' | sort) | while IFS= read -r f; do
    printf '<script type="text/plain" data-file="%s">\n' "$f"
    sed -e 's#</script#<\\/script#g' -e 's#<!--#<\\!--#g' "$R/$f"
    printf '</script>\n'
  done
  sed '1,/@@RUN_FILES@@/d' "$TPL"
} > "$R/report.html"
```

The page renders everything from the embedded files in the browser, so it shows exactly what the run files say. It loads js-yaml, marked and DOMPurify from cdnjs; offline, only the Files tab and the JSON parts are complete.

Automation status per case, as the page shows it: `automated · passed|failed|timedOut|…` (the case has `spec` and the test with that title is in `results.json`), `automated · not run` (`spec` set, no such test), `blocked`, or `not automated`.

## Human review (in chat)

Build `R/report.html`. Show the Summary, the Coverage table, the Not triaged list and the Still unsure list in chat, and give the paths `runs/<T>/report.md`, `runs/<T>/found_issues.json` and `runs/<T>/report.html` (the human can open the HTML report in a browser). Say exactly what the push will create in Qase: the suite title, the number of cases, and one run with N passed / N failed / N blocked.

Ask with **AskUserQuestion**: `Approve report and push to Qase` / `Approve report, don't push` / `Request changes`.

- `Request changes`: update `report.md` with the notes (only from the run files; never change a result), and ask again.
- `Approve report, don't push`: write `report_push: { approved: false, by, at, note: "report approved, push declined" }`. Then go to "Issues review".
- `Approve report and push`: write the `report_push` entry in `R/gates.yaml` (keep the other entries): `{ approved: true, by: <git config user.name>, at: <UTC now>, note: <the human's note or ""> }`. Then go to "Push".

## Push

Only with `report_push.approved: true` in `gates.yaml`.

1. Call `qase_project_context` with code `FOODME`, then find or create the suite (one per ticket, titled `<T> <feature>`) with `qase_suite_upsert`.
2. Create every case without a `qase_id` in **one** `qase_case_bulk_create` call. Title `<case id>: <title>`, one classic step per `steps` item, with the last step carrying `expected_result: <expected>`. Set `automation: "Automated"` and tags `[<T>, stlc]`. Write each returned id back as `qase_id` in `spec.yaml`, in order.
3. Make one `qase_ci_report` call titled `<T> STLC <date>`, with one result per case: `passed` if its test passed in `results.json`; `failed` if it failed (the error as `comment`); `blocked` if the case was blocked.
4. Append the Qase run id and link to `report.md` under **Qase**, and show the link in chat.

If a Qase call fails (e.g. 401), stop with `STATUS: BLOCKED: Qase <error>`. Don't retry with other tools.

Then go to "Issues review".

## Issues review (in chat)

If `found_issues.json` has no candidates, write `issues: { approved: true, by, at, note: "no candidates" }` in `gates.yaml` and go to "End".

Otherwise show a table `id | title | cases | expected → observed (short) | priority + reason`. Then ask with **AskUserQuestion** (`multiSelect: true`, header `Bugs`): "Which issues are real bugs to file in Jira?" with one option per candidate (`<id>: <title>`, up to 4 per question; use more questions if needed). The human can add a note through "Other", for example "merge 01 and 02" or "priority High for 03".

- A selected candidate becomes `status: approved`. One that isn't selected becomes `rejected`. Fill in `decision` with `by`, `at` and the human's note.
- If the note asks for a merge, merge those candidates into the first one: join `cases`, `observed` and `evidence`, and mark the others `rejected` with the note `merged into <id>`. If the note changes a priority, use the human's priority and put the note in `priority_reason`.
- Write the `issues` entry in `R/gates.yaml` (keep the other entries): `{ approved: true, by: <git config user.name>, at: <UTC now>, note: "<n> approved, <n> rejected" }`.

Never file a candidate in Jira that the human didn't approve.

## File in Jira

Follow the `jira` skill. For each `approved` issue:

1. Search for duplicates: `project = KAN AND summary ~ "<keywords>" ORDER BY created DESC`. If one exists, add a comment to it with this run's expected, observed and evidence, instead of creating a new ticket. Record that ticket's key and set `jira.sprint` to `"existing ticket"`.
2. Otherwise call `createJiraIssue` with:
   - `projectKey: "KAN"`, issue type `Task`, and the summary `title`;
   - a description from `templates/bug-report.md` in the jira skill, filled with `steps`, `expected`, `observed`, `observed_at`, the SUT, and a link back to the ticket `<T>`;
   - `priority`, and labels `bug`, `agent-ready` plus the area labels;
   - `assignToSprint: "active"`.

   Write no customer PII. Order numbers and the test data from the cases are fine.
3. Write `jira.key`, `jira.url` and `jira.sprint` (`"active"`, or `"failed: <error>"`) back to the issue, and set `status: filed`.
4. If the sprint assignment fails, say so in chat and name the ticket. If `createJiraIssue` itself fails, keep `status: approved`, stop and report `STATUS: BLOCKED: Jira <error>`. A resumed run files the rest.

Then add the keys to **Found issues** in `report.md`, and show `id | Jira key | priority | sprint` in chat.

## End

Build `R/report.html` again so it includes the Qase run and the Jira keys, and give its path. Then `STATUS: DONE`, or `NEEDS_HUMAN: <what is still open>`, or `BLOCKED: <reason>`.
