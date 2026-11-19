---
name: write-e2e-tests
description: Use when the user asks for end-to-end, browser, UI, Playwright or "spec" tests of the FoodMe storefront (apps/web/e2e) or the admin back office (apps/admin/e2e), i.e. user flows through the real UI against a running backend (e.g. "e2e: checkout with delivery", "test that the admin can accept an order"). For backend API tests use write-integration-tests; for isolated logic (zod schemas, useCart) use write-unit-tests. If the level is unclear, ask.
---

# Write Playwright e2e tests (FoodMe)

Also follow `.claude/rules/testing-e2e.md`, `known-issues.md` and `security.md`.

## Setup

| App | Folder | Config | Dev server | Parallel |
|---|---|---|---|---|
| Storefront | `apps/web/e2e/` | `apps/web/playwright.config.ts` | port 5180 (`PLAYWRIGHT_BASE_URL`) | `fullyParallel: true` |
| Admin | `apps/admin/e2e/` | `apps/admin/playwright.config.ts` | port 5174 (`ADMIN_BASE_URL`), hash routes `/#/...` | serial |

- Chromium only. Playwright starts **only the frontend dev server**, not the backend.
- Backend: `localhost:8081` with Postgres and seed data (AGENTS.md: `postgres:16` in docker, then
  `./gradlew bootRun` in `apps/backend`). Override the API with `VITE_API_BASE_URL`.
- The backend adds **200–1500 ms simulated latency** to API calls in this mode.
- Admin login: seeded `admin` / `admin123`.
- **Isolation:** each test gets a fresh browser context, so the cart (IndexedDB) and the login
  start empty. State shared between tests lives only in the backend database (accounts, orders).

## Conventions

- File name `<area>.spec.ts`. The `flake-` prefix is reserved for known flaky tests
  (`FM-FLAKE-NN`); never use it.
- Group with `test.describe("<Area>")`; test names are sentences about behavior.
- Locators: `getByRole` (with `name`), then `getByLabel` / `getByText`, then `getByTestId`.
  CSS used by existing specs (`a.cc_card`, `button.dc_card`, `aside.uc-panel`, `.cic_root`) is
  acceptable only where no accessible locator exists.
- No `page.waitForTimeout`, no `test.only` / `test.skip`. Use web-first assertions and
  `page.waitForResponse` for API calls.
- Do not rely on seed state that other tests modify (orders list, "the first order").

## Known accessible names (storefront)

| Element | Locator |
|---|---|
| Quick add on a dish card | `getByRole("button", { name: /^Add .+ to cart$/ })` (aria-label `Add <dish> to cart`) |
| Add from the dish modal | `getByRole("button", { name: "Add to cart" })` |
| Cart → checkout | `aside.uc-panel` → `getByRole("link", { name: "Go to checkout" })` |
| Checkout auth tabs/form | `getByRole("tab", { name: "Create account" })`, `getByRole("form", { name: "Checkout" })` |
| Delivery method | `getByRole("button", { name: "Delivery To your door" })` |
| Payment | `getByRole("radio", { name: /Cash on delivery/i })` |
| Submit order | `getByRole("button", { name: "Place order" })` → URL `/orders/success`, text `Order placed!` |
| Other chef in cart | panel text `Cart has another kitchen`; dialog `Switch kitchens?` with `Clear & continue` / `Keep cart & browse` |

Verify names in the component before relying on them; UI strings are in the components and in
`apps/web/src/locales/en/translation.json`.

## Helpers and test data

- Storefront, `apps/web/e2e/auth.ts`:
  - `createAccountAtCheckout(page, name?)` registers a unique customer on the checkout page;
    contact fields of the checkout form are then prefilled from the account;
  - `registerCustomerViaApi(request, apiBase)` returns `{ token, email }`.
- Admin, `apps/admin/e2e/admin-flows.spec.ts`: `loginAsAdmin(page)` and
  `createOrderViaApi(request)` are **local, not exported**. `apps/admin` is a separate package and
  cannot import from `apps/web/e2e`. To reuse them, propose moving them to
  `apps/admin/e2e/helpers.ts` and ask the user first (it changes an existing spec).
- Set up data via the `request` fixture (register → `POST /api/order` with
  `Authorization: Bearer <token>`), then verify in the UI. Use unique emails and notes.
- Do not assume what seed chefs offer (e.g. delivery); pick data that has the needed property or
  check it via the API first.

## Workflow

0. **Check the environment:** `node -v`; `npm install` and `npx playwright install chromium` in the
   app folder if needed; backend reachable:
   `curl -s -o /dev/null -w "%{http_code}" "http://localhost:8081/api/chef/active?page=0&size=1"`
   (expect 200). If something is missing you may still write the test, but say clearly that it
   was not run, and list the steps the user needs.
1. **Read** the pages and components involved and similar existing specs. Run
   `grep -rn "FM-BUG" <components>`; `layout.spec.ts` asserts around FM-BUG-02.
2. **List the cases** with the checklist.
3. **Write** the spec using helpers and API setup.
4. **Run** the single file, then the app's whole suite, then repeat the new file
   (`--repeat-each=3`) to catch latency-related flakiness.
5. **Fix** locators and waits in the test. If the app is wrong or a planted defect blocks the
   test, stop and ask the user instead of working around it. Debug with
   `npx playwright show-report` and traces.
6. **Report:** tests added, run or not, passed/failed/flaky counts, what was not verified.

## Coverage checklist

- [ ] Happy path end to end (explore → chef → add dish → checkout → success page)
- [ ] Validation errors in the UI (empty required fields, invalid email or phone)
- [ ] Auth: signed-out vs signed-in, admin bad password, protected pages
- [ ] Edge cases: empty cart, cart from another chef, delivery vs takeaway fields,
      quantity limits, not-found pages
- [ ] Independence: passes alone, in parallel and repeated

## Commands

From `apps/web` (or `apps/admin`):

```bash
npm run test:e2e
npx playwright test e2e/checkout.spec.ts
npx playwright test -g "takeaway checkout"
npx playwright test e2e/checkout.spec.ts --repeat-each=3
npm run test:e2e:all      # from apps/web: web suite, then admin suite
```

## Example (storefront)

```ts
import { test, expect } from "@playwright/test";
import { createAccountAtCheckout } from "./auth";

test.describe("Checkout", () => {
  test("delivery checkout without street shows a validation error", async ({ page }) => {
    await page.goto("/explore");
    await page.locator("a.cc_card").first().click();   // assumes this chef offers delivery
    await expect(page).toHaveURL(/\/chef\/\d+/);
    await page.getByRole("button", { name: /^Add .+ to cart$/ }).first().click();
    await page.locator("aside.uc-panel").getByRole("link", { name: "Go to checkout" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    await createAccountAtCheckout(page);                // name, phone, email get prefilled
    await page.getByRole("button", { name: "Delivery To your door" }).click();
    await page.getByLabel("City").fill("Yerevan");
    // Street left empty on purpose: checkoutSchema requires it for DELIVERY
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByText("Street is required")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
  });
});
```
