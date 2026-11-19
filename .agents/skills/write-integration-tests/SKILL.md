---
name: write-integration-tests
description: Use when the user asks for backend API, endpoint, controller, MockMvc or integration tests in apps/backend, i.e. requests to /api/** or /admin/** through the full Spring context and H2, including security/JWT/role checks (e.g. "test POST /api/order", "integration tests for ChefController"). For a service class tested in isolation with mocks, use write-unit-tests; for UI flows, use write-e2e-tests. If the level is unclear, ask.
---

# Write backend integration tests (FoodMe)

Also follow `.claude/rules/testing-backend.md`, `known-issues.md` and `security.md`.

## Setup used by the existing tests

- Location: `apps/backend/src/test/java/am/foodme/backend/`, name `<Controller>Test.java`
  (`ChefControllerTest`, `CustomerAuthControllerTest`, `DishControllerTest`, `OrderControllerTest`).
- Class annotations: `@SpringBootTest` + `@AutoConfigureMockMvc` + `@ActiveProfiles("test")`.
  `@Autowired` `MockMvc` and `ObjectMapper`. **No `@MockBean`**: the real
  controller → service → repository → H2 chain and the real `SecurityConfig` are under test.
- Profile `test` (`src/main/resources/application-test.properties`): H2 in PostgreSQL mode,
  `ddl-auto=create-drop`, Flyway **off**, fixtures from `src/test/resources/data.sql`,
  latency 0, images not seeded (`/api/images/**` returns nothing).
- Assert with `status()` and `jsonPath(...)`; AssertJ for values parsed from the response.
- Method names: `action_condition_expectedResult`, e.g. `createOrder_withoutToken_unauthorized`.
- Errors come from `GlobalExceptionHandler` as `{ "message": ... }`. For bean validation the
  message is the **first** field error only, and field order is not guaranteed: make exactly one
  field invalid per test when asserting `$.message`.

## Known pitfalls

- **No order dependence.** Do not add `@Order` / `@TestMethodOrder`. `OrderControllerTest` uses
  them on purpose (FM-FLAKE-02/04): do not copy or "fix" that.
- **One shared database.** All classes with the same configuration share one cached Spring
  context and one H2 database. Never assume an order number such as `FM-100001`, global counts,
  "the first row" or data from another test. Assert on what *your* test created.
- **New orders break FM-FLAKE-02.** `OrderControllerTest.createOrder_firstOrderGetsNumber100001`
  expects to create the first order in the database. Any new test that creates orders and runs
  before it makes it fail. This is the known flake, not a bug in your test: report it to the user,
  do not change or disable that test.
- **Put new tests in a new class** (`<Feature>ControllerTest`) unless they clearly belong to an
  existing one. In `OrderControllerTest` (`@TestMethodOrder`) methods without `@Order` run last.
- **Create the data you need** (unique emails via `UUID`) or use stable fixtures from `data.sql`.
  New shared fixtures go in `data.sql` and must not break other tests.
- **Dates:** do not assert "today" across time zones (FM-FLAKE-04).
- **Migrations are not covered.** H2 builds the schema from entities. If the change includes a
  `V<n>__*.sql` migration, tell the user it must be checked against real Postgres (`bootRun`).

## Security: verify, don't assume

Read `security/SecurityConfig` before writing auth cases. Current rules:

- `/api/customer/**` and `POST /api/order` need role `CUSTOMER`; other `/api/**` is public.
- No token on a protected route → **401** (`HttpStatusEntryPoint`); valid token with the wrong
  role on a `hasRole` route → **403** (Spring default).
- `/admin/auth/login` and `GET /admin/dish/**` are public; the rest of `/admin/**` only requires
  *an* authenticated user (`.authenticated()`, no `hasRole("ADMIN")`).

If the expected secure behavior differs from the actual one (e.g. a CUSTOMER token reaching
`/admin/**`), **do not write a test that asserts the insecure behavior as correct**. Report the
discrepancy to the user and ask whether to add a test for the secure behavior (it will fail).

## Tokens for protected endpoints

```java
// CUSTOMER: register a fresh account (pattern from CustomerAuthControllerTest / OrderControllerTest)
private String customerToken() throws Exception {
    String body = objectMapper.writeValueAsString(Map.of(
            "fullName", "Ann",
            "email", "it-" + UUID.randomUUID() + "@example.com",
            "phoneNumber", "+37491234567",
            "password", "secret123"));
    String response = mockMvc.perform(post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
    return objectMapper.readTree(response).get("token").asText();
}

// ADMIN: admin seeded in data.sql (same hash as V1__init.sql, password admin123)
private String adminToken() throws Exception {
    String response = mockMvc.perform(post("/admin/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("username", "admin", "password", "admin123"))))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
    return objectMapper.readTree(response).get("token").asText();
}
// usage: .header("Authorization", "Bearer " + customerToken())
```

## Workflow

0. **Check the environment:** `java -version` (JDK 17). The first Gradle run downloads
   dependencies and is slow. Postgres is not needed.
1. **Read** the controller, service, DTOs (validation annotations), `SecurityConfig`,
   `GlobalExceptionHandler` and the relevant rows in `data.sql`. Run `grep -n "FM-BUG"` on them.
2. **List the cases** with the checklist; share them with the user if there are many.
3. **Write** the test class, reusing the helpers above.
4. **Run** the single class, then the **whole suite**: cross-class data leaks only show up there.
5. **If a test hits a planted defect** (`FM-BUG-NN`) or a security discrepancy, stop and ask the
   user. Fix the test, not production code, unless the user agrees it is a real bug.
6. **Report:** tests added, run or not, passed/failed counts, FM-FLAKE failures seen, what was
   not verified.

## Coverage checklist

- [ ] Happy path: 200 and the key response fields
- [ ] Validation: one invalid field per test → 400 with that field's message
- [ ] Auth: no token → 401; wrong role → 403 (where `hasRole` applies); valid token → 200
- [ ] Not found: unknown id or number → 404
- [ ] Business rules: only `CASH` payment accepted, inactive dishes hidden, duplicate email rejected
- [ ] Independence: passes alone and in the full suite, in any order

## Commands

```powershell
# PowerShell, from apps/backend
.\gradlew.bat test --tests "am.foodme.backend.OrderNumberControllerTest"
.\gradlew.bat test --tests "am.foodme.backend.OrderNumberControllerTest.createOrder_cashTakeaway_orderIsReadableByItsNumber"
.\gradlew.bat test
```
```bash
./gradlew test --tests 'am.foodme.backend.OrderNumberControllerTest'
./gradlew test
```

## Example (new class; imports as in `OrderControllerTest`)

```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderNumberControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    // customerToken() as above

    private String cashTakeawayOrder() throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "chefId", 1,                                   // chef and dish 1 come from data.sql
                "receiverName", "Ann",
                "receiverPhoneNumber", "+37491234567",
                "receiverEmail", "ann@example.com",
                "paymentType", "CASH",
                "deliveryMethod", "TAKEAWAY",
                "note", "integration test",
                "createOrderDishes", List.of(Map.of("dishId", 1, "quantity", 2))));
    }

    @Test
    void createOrder_cashTakeaway_orderIsReadableByItsNumber() throws Exception {
        String response = mockMvc.perform(post("/api/order")
                        .header("Authorization", "Bearer " + customerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cashTakeawayOrder()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String number = objectMapper.readTree(response).get("number").asText();

        // assert on the order this test created, never on "FM-100001"
        mockMvc.perform(get("/api/order/number/" + number))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value(number));
    }
}
```

Note: this test creates an order, so it can trigger the FM-FLAKE-02 failure described above.
