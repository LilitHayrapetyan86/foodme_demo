# Known issues: FM-BUG and FM-FLAKE markers

This is a QA / observability training project. Some defects are planted on purpose.

- `FM-BUG-NN` comments mark intentional defects in application code.
- `FM-FLAKE-NN` comments mark intentionally flaky or order-dependent tests.
- The catalogue (`docs/planted-defects.md`, `instructor/`) is gitignored and not available here.

Rules:

- Never remove, "fix", refactor away or hide these defects or their markers unless the user
  explicitly asks to fix that specific ID.
- Do not "fix" them as a side effect of other work (cleanup, refactoring, lint fixes, new tests).
  If your change touches marked code, keep the behavior and the marker as they are.
- Do not mask them: no `@Disabled`, `test.skip`, extra retries, broader timeouts or
  catch-and-ignore added to make a marked test or bug stop failing.
- If something behaves strangely, check for a nearby marker before treating it as an accident,
  and mention it to the user instead of changing it.
- When the user asks to fix one, change only that defect, update tests that assert around it
  (e.g. `apps/web/e2e/layout.spec.ts` for FM-BUG-02), and cite the ID in the commit message.
