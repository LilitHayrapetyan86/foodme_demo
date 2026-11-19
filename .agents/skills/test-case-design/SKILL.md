---
name: test-case-design
description: Use for step 03 of the agent-driven STLC (/test-case-design <T>) - write the test cases into runs/<T>/spec.yaml from the approved plan, have them judged by the case-judge agent (phase 2), fix judge FAILs, and get the human's approval in chat.
---

# Step 03: Test cases (and step 04: case judge)

Argument: `T`. Run dir `R = agentic-workflows/functional-testing/runs/<T>/`. You write `test_cases` in `R/spec.yaml`, the judge verdicts in `R/verdicts/04-NN.json`, and the `cases` entry of `R/gates.yaml` after the human approves. Never change `acs`, `out_of_scope` or `questions`.

## Gate

`R/gates.yaml` must have `plan.approved: true`. Otherwise: `STATUS: BLOCKED: step 02 is not approved`.

If `test_cases` is already filled in, don't rewrite it. Go to "Judge" (phase 2) or "Human review" (phase 1).

## Write the cases

Read `R/spec.yaml`, `R/plan.md` and the doc in `sources.doc`. Write one case per row of the plan's "cases planned".

```yaml
test_cases:
  - id: KAN-27-TC-01            # <T>-TC-nn, two digits, in order
    title: "SAVE10 with a 2,900 AMD subtotal is rejected with the missing amount"
    covers: [AC-3]
    blocked_by: []              # questions this case depends on (they must be answered)
    steps:
      - "Open <sut>chef/24, signed in, with an empty cart"
      - "Add 1 × Curry Rice with Eggs (2,900 AMD) to the cart"
      - "Go to checkout"
      - "Type SAVE10 in Promo code and press Apply"
    expected: "The page shows \"Add 100 AMD more to use this code\"; no discount line"
    expected_source: AC-3       # the AC or answered Q-n the expected value comes from
    status: draft
```

Rules (the case judge checks these in phase 2, and the human checks them in phase 1):

- **`expected` comes from the sources, never from the app.** Use only facts that follow from `expected_source`, the launch data, the shared setup and arithmetic. Don't add UI wording, colours, toasts or layout the sources don't state. Messages are the AC's text with the placeholders filled in.
- If a value needs a rule that only an answered question gives (e.g. whether delivery is discounted), `expected_source` is that `Q-n`, and it goes in `blocked_by`.
- Use concrete data in every step: chef, dish names, quantities, prices, code, delivery method. Never "a valid code" or "some items".
- One input partition per case. Don't test anything in `out_of_scope`.
- Every AC is covered by at least one case.
- `status: draft`. Don't add `execution`, `spec` or `qase_id`.

## Judge (phase 2 only: the `case-judge` agent exists)

1. Run the `case-judge` agent (Agent tool, `subagent_type: case-judge`) with the prompt `Judge the test cases of <T>`.
2. Save its final fenced JSON block **word for word** to `R/verdicts/04-NN.json` (`NN` = the next free number, `01`, `02`, …). Don't edit, summarise or re-judge it.
3. On the verdict:
   - `pass`: go to "Human review".
   - `fail`: fix the cases (see below), then run the judge again. Allow at most **2** fix rounds. If it still fails, go to "Human review" with the remaining FAILs shown.
   - `unsure`: go to "Human review" with the UNSURE checks shown.
   - `blocked`: don't fix anything and don't re-run the judge. Go to "Human review" with the judge's `obstacles` shown (`what | problem | needs`).

### Fixing a judge FAIL

For each check with `result: FAIL`, fix exactly what its `reason` and quotes name. Don't touch cases or fields the verdict didn't fail, and don't reword passing cases.

- A **C2** FAIL (a missing question) is not yours to fix. Stop fixing and go to "Human review": the human decides whether to re-run step 01 to add the question.
- **UNSURE** checks are for the human, not for you.

## Human review (in chat)

Show in chat:

- A coverage table `AC | case ids`, and one line per case: `id | title | expected`.
- Phase 2: the verdict files in order, and every non-PASS check (`check | item | reason`, with both quotes) and any obstacles.

Then ask with **AskUserQuestion**: `Approve cases` / `Request changes`. In phase 2 with an open C2 FAIL, add a third option: `Re-open requirements (step 01)`.

- `Request changes`: apply the notes to the cases (same rules as above). In phase 2 run the judge again (a new verdict file), then ask again.
- `Re-open requirements`: change nothing and end with `STATUS: NEEDS_HUMAN: re-run /requirements-gathering <T> to add the missing question`.
- `Approve`: write the `cases` entry in `R/gates.yaml` (keep the other entries): `{ approved: true, by: <git config user.name>, at: <UTC now>, note: <"judge 04-NN <verdict>" in phase 2, plus the human's note> }`. Set every case's `status: accepted`.

## End

`STATUS: DONE: cases approved; next /test-execution <T>`, or `NEEDS_HUMAN: <what is still open>`, or `BLOCKED: <reason>`.
