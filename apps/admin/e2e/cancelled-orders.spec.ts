import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// FM-10: the admin panel shows customer-cancelled orders and offers no transitions from them.

const API = process.env.VITE_API_BASE_URL || "http://localhost:8081";

async function loginAsAdmin(page: Page) {
  await page.goto("/#/login");
  await expect(page.getByRole("heading", { name: "FoodMe Admin" })).toBeVisible();
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("menuitem", { name: "Orders" })).toBeVisible({ timeout: 15000 });
}

async function createCancelledOrder(request: APIRequestContext): Promise<string> {
  const chefs = await (await request.get(`${API}/api/chef/active?page=0&size=12`)).json();
  const chef = chefs.exploreChefResponseDtoList[0];
  const detail = await (await request.get(`${API}/api/chef/${chef.id}`)).json();
  const dish = detail.dishes[0];
  const registerRes = await request.post(`${API}/api/auth/register`, {
    data: {
      fullName: "Cancel Admin E2E",
      email: `cancel-admin-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
      phoneNumber: "+37495555666",
      password: "secret123",
    },
  });
  expect(registerRes.ok()).toBeTruthy();
  const { token } = await registerRes.json();
  const createRes = await request.post(`${API}/api/order`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      chefId: chef.id,
      receiverName: "Cancel Admin E2E",
      receiverPhoneNumber: "+37495555666",
      receiverEmail: "cancel-admin-e2e@example.com",
      paymentType: "CASH",
      deliveryMethod: "TAKEAWAY",
      note: "admin cancelled order e2e",
      createOrderDishes: [{ dishId: dish.id, quantity: 1 }],
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const { number } = await createRes.json();
  const cancelRes = await request.post(`${API}/api/customer/orders/${number}/cancel`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(cancelRes.ok()).toBeTruthy();
  return number;
}

test.describe("Cancelled orders in admin", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("cancelled order shows its status and no status actions", async ({ page, request }) => {
    const number = await createCancelledOrder(request);
    await page.goto("/#/orders");
    await page.getByRole("button", { name: "Refresh" }).click();

    const row = page.getByRole("row").filter({ hasText: number });
    await expect(row.getByText("CANCELLED")).toBeVisible({ timeout: 15000 });

    await row.click();
    await expect(page.getByRole("heading", { name: `Order ${number}`, level: 5 })).toBeVisible();
    await expect(page.getByText("CANCELLED").first()).toBeVisible();
    await expect(page.getByText("Change status")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Mark as / })).toHaveCount(0);
  });

  test("status filter offers CANCELLED", async ({ page, request }) => {
    const number = await createCancelledOrder(request);
    await page.goto("/#/orders");

    await page.getByLabel("Status").click();
    await page.getByRole("option", { name: "CANCELLED" }).click();

    await expect(page.getByRole("row").filter({ hasText: number })).toBeVisible({ timeout: 15000 });
  });
});
