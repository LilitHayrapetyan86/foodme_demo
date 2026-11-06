---
name: write-unit-tests
description: Use when the user asks for unit tests, Mockito tests or Vitest tests of FoodMe code in isolation (no Spring context, no HTTP, no browser), i.e. a backend service class in apps/backend/.../service (e.g. "tests for CustomerAuthService") or storefront logic in apps/web/src such as zod schemas (src/schemas) or the cart (src/hooks/useCart.ts). If the user names an endpoint or controller, use write-integration-tests; a UI flow, use write-e2e-tests. If the level is unclear ("add tests for orders"), ask which level.
---

# Write unit tests (FoodMe)

The project has **no unit tests yet**. Existing backend tests are `@SpringBootTest` integration
tests; the frontends only have Playwright. Also follow `.claude/rules/testing-backend.md`,
`known-issues.md` and `security.md`.

| Target | Stack | Location | Name |
|---|---|---|---|
| Backend services | JUnit 5 + Mockito + AssertJ (all in `spring-boot-starter-test`) | `apps/backend/src/test/java/am/foodme/backend/` | `<ClassName>Test.java` |
| Web logic (zod schemas, `useCart`) | Vitest + `@testing-library/react` + `fake-indexeddb` | next to the code | `*.test.ts` / `*.test.tsx` |

## Workflow

0. **Check the environment.** Backend: `java -version` (JDK 17). Web: `node -v` and
   `apps/web/node_modules` exists. If something is missing, tell the user before writing code
   you cannot run.
1. **Read the code under test** and its collaborators (repositories, `JwtService`,
   `PasswordEncoder`, `db` in `src/lib/db.ts`). Run `grep -n "FM-BUG" <file>`. Prefer classes
   without markers; e.g. `ChefService.getActiveChefsPage` contains FM-BUG-02.
2. **List the cases** with the checklist below; show them to the user before writing many tests.
3. **Web only: set up Vitest, with permission.** Read `apps/web/package.json`: Vitest is NOT
   installed. **Ask the user** before installing dependencies or adding a `"test"` script.
   Proposed setup (see "Vitest setup" below).
4. **Write the tests.**
   - Backend: `@ExtendWith(MockitoExtension.class)`, `@Mock` dependencies, `@InjectMocks` the
     service. **No** `@SpringBootTest`, `@MockBean`, H2 or MockMvc. Method names
     `action_condition_expectedResult`. AssertJ for values, `verify(...)` for side effects.
     `MockitoExtension` uses strict stubs: an unused `when(...)` fails with
     `UnnecessaryStubbingException`. Remove the stub; do not add `lenient()` to silence it.
   - Web: test pure functions directly (`checkoutSchema.safeParse`, `addDishToCart`,
     `decrementCartItem`); use `renderHook` + `waitFor` only for the `useCart` hook itself.
5. **Run** the narrowest command, then the whole suite.
6. **If a test hits a planted defect** (`FM-BUG-NN`), stop and ask the user whether to assert the
   correct behavior (the test will fail) or skip that case. Never change production code to make
   a test pass without saying so.
7. **Report:** which tests were added, whether they were run, passed/failed counts, what was not
   verified and why.

## Vitest setup (only after the user agreed)

```powershell
cd apps/web
npm i -D vitest jsdom @testing-library/react @testing-library/dom fake-indexeddb
```

- Use a Vitest version that supports the project's Vite major version (Vite 8); check
  `npm view vitest peerDependencies` if unsure.
- Separate `apps/web/vitest.config.ts` (keeps `vite.config.ts` untouched):

```ts
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],      // contains: import "fake-indexeddb/auto";
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],   // Playwright specs are not Vitest tests
  },
}));
```

- Script: `"test": "vitest run"`.
- `tsconfig.app.json` includes all of `src`, so test files are type-checked by `npm run build`
  (`tsc -b`). Either accept that (tests must compile) or exclude `src/**/*.test.*` there and
  tell the user which you chose.

## Coverage checklist

- [ ] Happy path with realistic values (shapes from `src/test/resources/data.sql` / seed data)
- [ ] Validation errors: blank/invalid input, zod issue `path` and `message`
- [ ] Auth logic: wrong password, duplicate email, token generated with the right role
- [ ] Not found / empty: `Optional.empty()`, empty cart
- [ ] Edge cases: email trim + lower-case, minimum quantity, cart from another chef,
      `replaceOtherChef`, same dish with different additions = separate cart line
- [ ] Side effects verified: saved / not saved, cart cleared / not cleared

## Commands

```powershell
# backend, from apps/backend
.\gradlew.bat test --tests "am.foodme.backend.CustomerAuthServiceTest"   # PowerShell
./gradlew test --tests 'am.foodme.backend.CustomerAuthServiceTest'       # bash

# web, from apps/web (after the Vitest setup)
npx vitest run src/hooks/useCart.test.ts
npm test
```

## Example: backend service (`CustomerAuthService`)

```java
package am.foodme.backend;

import am.foodme.backend.dto.CustomerRegisterRequestDto;
import am.foodme.backend.exceptionHandler.BadRequestException;
import am.foodme.backend.repository.CustomerRepository;
import am.foodme.backend.security.JwtService;
import am.foodme.backend.service.CustomerAuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerAuthServiceTest {

    @Mock CustomerRepository customerRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @InjectMocks CustomerAuthService service;

    @Test
    void register_duplicateEmail_throwsBadRequestAndDoesNotSave() {
        CustomerRegisterRequestDto request = new CustomerRegisterRequestDto();
        request.setFullName("Ann Test");
        request.setEmail("  Ann@Example.com ");   // service normalizes to ann@example.com
        request.setPhoneNumber("+37491234567");
        request.setPassword("secret123");
        when(customerRepository.existsByEmail("ann@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email already registered");
        verify(customerRepository, never()).save(any());
    }
}
```

## Example: "one chef per cart" rule (`useCart.ts`)

```ts
// apps/web/src/hooks/useCart.test.ts  (fake-indexeddb is loaded in setupFiles)
import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { db } from "@/lib/db";
import { addDishToCart, useCart } from "@/hooks/useCart";
import type { DishDto } from "@/types";

const dish = (id: number, chefId: number, price = 1000) =>
  ({ id, chefId, price, nameEn: `Dish ${id}`, url: "", minimumOrderCount: 1 }) as DishDto;

describe("addDishToCart", () => {
  beforeEach(async () => {
    await db.products.clear();
  });

  it("returns mismatch and keeps the cart when the dish is from another chef", async () => {
    await addDishToCart(dish(1, 1));
    expect(await addDishToCart(dish(2, 2))).toBe("mismatch");
    expect((await db.products.toArray()).map((i) => i.chefId)).toEqual([1]);
  });

  it("replaces the cart when replaceOtherChef is set", async () => {
    await addDishToCart(dish(1, 1));
    expect(await addDishToCart(dish(2, 2), 1, { replaceOtherChef: true })).toBe("ok");
    expect((await db.products.toArray()).map((i) => i.chefId)).toEqual([2]);
  });
});

describe("useCart", () => {
  beforeEach(async () => {
    await db.products.clear();
  });

  it("returns subtotal and count for the cart (useLiveQuery is async)", async () => {
    await addDishToCart(dish(1, 1, 1500), 2);
    const { result } = renderHook(() => useCart());
    await waitFor(() => expect(result.current.totalCount).toBe(2));
    expect(result.current.subtotal).toBe(3000);
  });
});
```
