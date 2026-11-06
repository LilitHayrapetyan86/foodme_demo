---
paths:
  - "apps/backend/src/test/**"
---

# Backend testing rules

- Use JUnit 5 (`org.junit.jupiter.api`) and AssertJ (`assertThat`). Do not use JUnit 4 or Hamcrest-only assertions.
  For HTTP responses, MockMvc `status()` / `jsonPath()` matchers are fine; use AssertJ for everything else.
- Name test methods `action_condition_expectedResult`,
  e.g. `createOrder_nonCashPayment_rejectedWithBadRequest`, `login_wrongPassword_rejected`.
- Tests must not depend on execution order. Do not add `@Order` or `@TestMethodOrder` to new tests.
- Tests must not depend on data created by other tests or other test classes. All
  `@SpringBootTest` classes with the `test` profile share one cached Spring context and one
  in-memory H2 database, so rows created in one class are visible in the others.
  Create the data each test needs, and assert on that data (by id or unique value),
  not on global counts, "first" rows or sequence numbers such as `FM-100001`.
- Shared fixtures go in `src/test/resources/data.sql`; keep them stable, other tests rely on them.
- Every test must have meaningful assertions on the result (status, body fields, state change).
  A test that only checks "no exception was thrown" is not enough.
- Do not use `@Disabled` without a reason: `@Disabled("why + ticket/marker")`.
- The `test` profile disables Flyway, so these tests do not cover SQL migrations.
  Schema changes still need a check against real Postgres.
- Existing order-dependent tests are marked `FM-FLAKE-NN`; they are intentional, see `known-issues.md`.
