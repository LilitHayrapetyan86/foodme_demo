---
paths:
  - "apps/web/e2e/**"
  - "apps/admin/e2e/**"
---

# Playwright e2e rules

- Never commit `test.only`, `test.describe.only`, `test.skip` or `test.fixme`.
- Do not use `page.waitForTimeout()`. The backend adds 200–1500 ms simulated latency to
  `/api/**` and `/admin/**`, so fixed sleeps are either too short (flaky) or too long (slow).
  Rely on Playwright auto-waiting and web-first assertions:
  `await expect(locator).toBeVisible()`, `toHaveText()`, `toHaveURL()`, `toHaveCount()`.
  To wait for an API call, use `page.waitForResponse()`.
- Prefer user-facing locators: `getByRole` (with `name`), then `getByLabel` / `getByText`,
  then `getByTestId`. Avoid CSS/XPath selectors tied to classes or DOM structure.
- Each test must be independent: do not rely on state left by other tests (cart contents,
  logged-in user, created orders). Set up what you need in the test or a `beforeEach`.
  Web tests run with `fullyParallel: true`, so order is not guaranteed.
- Create unique data per test (e.g. unique emails) instead of reusing accounts from other tests.
  Reuse helpers such as `apps/web/e2e/auth.ts`.
- The `flake-` file prefix is reserved for known flaky tests (`FM-FLAKE-NN`).
  Never use it for new tests. Name new spec files `<area>.spec.ts`.
- Existing flaky code (e.g. the `waitForTimeout` in `flake-dish-modal.spec.ts`) is intentional,
  see `known-issues.md`; do not copy its patterns.
- Playwright does not start the backend: it must already run on `localhost:8081` with seed data.
