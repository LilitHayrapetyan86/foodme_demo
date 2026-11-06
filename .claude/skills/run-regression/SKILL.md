---
name: run-regression
description: Use when the user asks to run regression, run all tests, or check that nothing is broken before a commit/PR.
disable-model-invocation: true
---

# Run regression (FoodMe)

Scope from `$ARGUMENTS`: `backend`, `web`, `admin`, or empty = all three.
Any other value: stop and tell the user the valid options.

| Suite | Folder | Command | Needs |
|---|---|---|---|
| backend | `apps/backend` | `./gradlew test` (PowerShell: `.\gradlew.bat test`) | JDK 17; H2 only, no Postgres |
| web | `apps/web` | `npx playwright test --reporter=list,html --retries=0` | Node, `node_modules`, Chromium, backend on 8081 |
| admin | `apps/admin` | `npx playwright test --reporter=list,html --retries=0` | same as web |

**Hard rule: never modify tests, application code or config during a regression run. Report only.**
No fixes, no `test.skip`, no extra retries, no deleting results.

## 1. Preflight (before running anything)

1. `git status --short`, `git branch --show-current`, `git rev-parse --short HEAD`.
   Note uncommitted changes in the report: results then describe the working tree, not the commit.
2. Tools for the suites in scope: `java -version` (backend); `node -v` and `node_modules` present
   in `apps/web` / `apps/admin` (e2e). Make sure `CI` is not set (it changes retries and `forbidOnly`).
3. For `web` / `admin`: check the backend:
   `curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:8081/api/chef/active?page=0&size=1"`
   must return `200`.
4. If anything required is missing, **STOP** before running any suite. Do not start Postgres or the
   backend and do not install anything yourself. Tell the user what is missing and how to fix it:
   - backend: `docker run -d --name foodme-db -p 5432:5432 -e POSTGRES_DB=foodme -e POSTGRES_USER=foodme -e POSTGRES_PASSWORD=foodme postgres:16`
     (or `docker start foodme-db`), then `./gradlew bootRun` in `apps/backend`;
   - e2e tooling: `npm install` and `npx playwright install chromium` in the app folder.
   Offer a reduced run instead, e.g. `/run-regression backend` when only the backend is down.

## 2. Run the suites

Order: **backend → web → admin** (only those in scope). Continue with the next suite even if one
fails. Record the duration of each suite (start/end time).

- Backend results: `apps/backend/build/test-results/test/TEST-*.xml` (counts, failure messages)
  and the HTML report `apps/backend/build/reports/tests/test/index.html`.
- Playwright results: the `list` output, plus the HTML report in `<app>/playwright-report/`.

**Before any rerun, save the full-run evidence**, because a rerun overwrites it:
copy `apps/backend/build/reports/tests/test/` to `reports/regression-<stamp>/backend-tests/`.
Playwright reruns use `--reporter=list` only, so the full-run HTML report stays intact.

## 3. Rerun failures once, alone

For each failed test, rerun it once in isolation:

- backend: `./gradlew test --tests 'am.foodme.backend.<Class>.<method>'`
- web/admin: `npx playwright test <file>:<line> --reporter=list --retries=0`

Passed on rerun → **FLAKY**. Failed again → **FAILED**.
Order-dependent tests (e.g. FM-FLAKE-02) usually pass alone; that is expected and still FLAKY.

## 4. Classify each FLAKY / FAILED test

Search for markers:
`grep -rn "FM-FLAKE\|FM-BUG" <test file>` and the code under test
(`grep -rn "FM-BUG" apps/*/src`); a `flake-` spec file name also means a known flake.

- **KNOWN**: a marker on or next to the test, or in the code path the failing assertion checks.
  Name the ID (e.g. `FM-FLAKE-02`, `FM-BUG-02`).
- **NEW**: no marker explains it. This includes new flaky tests.
- If unsure, mark it NEW and say why. Never guess an ID.

## 5. Report

Write `reports/regression-YYYY-MM-DD-HHmm.md` (repo root, local time; create `reports/` if
missing; do not commit it unless the user asks). Format:

```markdown
# Regression report: 2026-11-06 14:30

- Branch: main
- Commit: 180c144 (uncommitted changes: yes/no, list files)
- Scope: backend, web, admin

| Suite | Passed | Failed | Flaky | Skipped | Duration |
|---|---|---|---|---|---|
| backend | 14 | 0 | 1 | 0 | 1m 12s |
| web | ... |
| admin | ... |

## NEW failures
### <test name>
- File: `path:line`
- Status: FAILED / FLAKY
- Error: <first meaningful lines of the message>
- Likely cause: <short analysis based on the code; say if it is a guess>

## Known flaky tests / bugs
- `<test>`: FLAKY, FM-FLAKE-02 (order-dependent numbering)

## Not run
- <suite>: <reason>

## Verdict: GREEN | YELLOW | RED

## Reports
- Backend: `reports/regression-<stamp>/backend-tests/index.html`
- Web: `apps/web/playwright-report/index.html`
- Admin: `apps/admin/playwright-report/index.html`
```

Verdict:
- **GREEN**: everything in scope ran and passed.
- **YELLOW**: only KNOWN flaky tests or KNOWN bugs failed.
- **RED**: at least one NEW failure (FAILED or FLAKY).
- A suite in scope that did not run means the verdict can be at most YELLOW, and the report must say so.

## 6. Summary in chat

Short: verdict, the table, NEW failures (one line each), the report path. Do not paste the
whole report.
