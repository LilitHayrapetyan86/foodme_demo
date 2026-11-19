---
name: test-automation
description: Use for step 06 of the agent-driven STLC (/test-automation <T>) - turn the executed test cases of runs/<T>/spec.yaml into one Playwright spec apps/web/e2e/<t>-<slug>.spec.ts, have it judged by the test-judge agent (phase 2), get the human's approval in chat, then run it against the SUT (step 08) into runs/<T>/results.json.
---

# Step 06: Automate (with step 07: test judge, and step 08: run)

Argument: `T`. Run dir `R = agentic-workflows/functional-testing/runs/<T>/`. You write:

- one spec, `apps/web/e2e/<t>-<slug>.spec.ts` (`<t>` = the key in lower case, e.g. `kan-27-promo-codes.spec.ts`), plus a new `apps/web/e2e/<t>-*.ts` helper if you need one;
- in `spec.yaml`, only each case's `status` and `spec`;
- `R/verdicts/07-NN.json` (phase 2), the `tests` entry of `R/gates.yaml` after the human approves, and `R/results.json`.

Don't touch app code, config or `e2e/auth.ts`.

## Gate

Every case in `R/spec.yaml` has `execution.result` (step 05 is done). Otherwise: `STATUS: BLOCKED: step 05 is not done`.

Resume: if the spec file exists, don't rewrite it. If `tests.approved` isn't set, go to "Judge" (phase 2) or "Human review" (phase 1). If it is set and `results.json` is missing, go to "Run".

## Read first

- `R/spec.yaml` (the cases) and `R/execution.md` (what the page really looked like: labels, roles, waits).
- `.agents/rules/web.md`, and the "Web and admin (Playwright)" part of `.agents/skills/test-review/SKILL.md`.
- `apps/web/e2e/auth.ts` and `apps/web/playwright.config.ts`.

## Rules (the test judge checks these in phase 2, and the human in phase 1)

- **One `test()` per case**, with the case id first in the title: `test("KAN-27-TC-03: <case title>", ...)`.
- **Assert the case's `expected`, not what step 05 observed.** If a case mismatched in 05, its test must fail on the current app. Never "fix" a test to match the app.
- Every amount and message in an assertion comes from that case's `expected`. Don't assert anything no case states.
- Locators: `getByRole`, `getByLabel`, `getByText`. Use `{ exact: true }` where one name is a prefix of another (e.g. `getByLabel("Promo code", { exact: true })` vs the **Remove promo code** button). No `data-testid`, CSS classes, or `nth()` on structure.
- Web-first assertions only: `await expect(locator).toHaveText(...)`, `toBeVisible()`, `toContainText(...)`. No `waitForTimeout`. The API has a random 200–1500 ms delay on purpose, and retrying assertions handle it.
- Sign in with `createAccountAtCheckout(page, name)` from `./auth`. Each test makes its own customer and cart, because `fullyParallel` is on.
- Relative URLs only (`page.goto("/chef/24")`). `baseURL` comes from `PLAYWRIGHT_BASE_URL`.
- No `test.only`, `test.skip`, `test.fixme`, `try/catch` around actions, or `if (visible)` branches.
- If a case places an order, put `STLC <T> <case-id>` in the order note.

## Check

From `apps/web`, run `npx playwright test e2e/<file> --list`. The file must compile and list every case id. Don't run it against the SUT yet.

Then set each automated case's `status: automated` and `spec: "<the exact test title>"`.

## Judge (phase 2 only: the `test-judge` agent exists)

1. Run the `test-judge` agent (Agent tool, `subagent_type: test-judge`) with the prompt `Judge the Playwright spec of <T>`.
2. Save its final fenced JSON block **word for word** to `R/verdicts/07-NN.json` (`NN` = the next free number). Don't edit, summarise or re-judge it.
3. On the verdict:
   - `pass`: go to "Human review".
   - `fail`: fix exactly the checks with `result: FAIL` and nothing else, re-run the `--list` check, then run the judge again. Allow at most **2** fix rounds. If it still fails, go to "Human review" with the remaining FAILs shown.
   - `unsure`: go to "Human review" with the UNSURE checks shown.
   - `blocked`: don't fix anything and don't re-run the judge. Go to "Human review" with the judge's `obstacles` shown (`what | problem | needs`).

## Human review (in chat)

Show in chat: the spec path, a table `case id | 05 result | test title | asserted values`, and in phase 2 the verdict files with every non-PASS check (`check | item | reason`, with both quotes) and any obstacles. Say which tests are expected to fail because their case mismatched in 05.

Ask with **AskUserQuestion**: `Approve tests and run them against the SUT` / `Request changes`.

- `Request changes`: apply the notes (same rules), re-run `--list`, in phase 2 run the judge again (a new verdict file), then ask again.
- `Approve`: write the `tests` entry in `R/gates.yaml` (keep the other entries): `{ approved: true, by: <git config user.name>, at: <UTC now>, note: <"judge 07-NN <verdict>" in phase 2, plus the human's note> }`. Then go to "Run".

## Run (step 08)

From `apps/web`, run exactly once:

```bash
PLAYWRIGHT_BASE_URL=<sut without trailing slash> npx playwright test e2e/<t>-*.spec.ts --reporter=json \
  > ../../agentic-workflows/functional-testing/runs/<T>/results.json; echo "exit: $?"
```

Exit `0` means every test passed; any other code means at least one failed. Don't re-run a failing test until it passes, and don't edit the spec to make it pass. A failure is a result, not a problem to fix here.

## End

Print `case id | test title | passed / failed` from `results.json`. Then `STATUS: DONE: next /test-reporting <T>`, or `NEEDS_HUMAN: <what is still open>`, or `BLOCKED: <reason>`.
