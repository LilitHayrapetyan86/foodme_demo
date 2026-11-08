import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

// FM-9: customers cancel their own order while it is still "Received" (NEW).

const API = process.env.VITE_API_BASE_URL || "http://localhost:8081";

type Customer = { token: string; customer: { id: number; email: string; fullName: string } };

async function registerCustomer(request: APIRequestContext): Promise<Customer> {
  const email = `cancel-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await request.post(`${API}/api/auth/register`, {
    data: { fullName: "Cancel E2E", email, phoneNumber: "+37490000000", password: "secret123" },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function placeOrder(request: APIRequestContext, token: string): Promise<string> {
  const chefs = await (await request.get(`${API}/api/chef/active?page=0&size=12`)).json();
  const chef = chefs.exploreChefResponseDtoList[0];
  const detail = await (await request.get(`${API}/api/chef/${chef.id}`)).json();
  const dish = detail.dishes[0];
  const res = await request.post(`${API}/api/order`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      chefId: chef.id,
      receiverName: "Cancel E2E",
      receiverPhoneNumber: "+37490000000",
      receiverEmail: "cancel-e2e@example.com",
      paymentType: "CASH",
      deliveryMethod: "TAKEAWAY",
      note: "e2e cancel order",
      createOrderDishes: [{ dishId: dish.id, quantity: 1 }],
    },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).number;
}

async function acceptViaAdmin(request: APIRequestContext, number: string) {
  const login = await request.post(`${API}/admin/auth/login`, {
    data: { username: "admin", password: "admin123" },
  });
  const { token } = await login.json();
  const order = await (await request.get(`${API}/api/order/number/${number}`)).json();
  const res = await request.patch(`${API}/admin/order/${order.id}/status`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: "ACCEPTED" },
  });
  expect(res.ok()).toBeTruthy();
}

async function signIn(page: Page, auth: Customer) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("foodme.customer.auth", value);
  }, JSON.stringify(auth));
}

test.describe("Customer order cancellation", () => {
  test("cancel a received order from tracking", async ({ page, request }) => {
    const auth = await registerCustomer(request);
    const number = await placeOrder(request, auth.token);
    await signIn(page, auth);

    await page.goto(`/tracking/${number}`);
    await expect(page.getByText("Order received")).toBeVisible();
    await page.getByRole("button", { name: "Cancel order" }).click();

    const dialog = page.getByRole("dialog", { name: "Cancel this order?" });
    await expect(dialog).toBeVisible();
    const cancelResponse = page.waitForResponse(
      (r) => r.url().includes(`/api/customer/orders/${number}/cancel`) && r.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Yes, cancel order" }).click();
    expect((await cancelResponse).status()).toBe(200);

    await expect(page.getByText("Order cancelled")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);

    await page.goto("/orders");
    const row = page.getByRole("link").filter({ hasText: number });
    await expect(row.getByText("Cancelled", { exact: true })).toBeVisible();
  });

  test("keep order closes the dialog without cancelling", async ({ page, request }) => {
    const auth = await registerCustomer(request);
    const number = await placeOrder(request, auth.token);
    await signIn(page, auth);

    await page.goto(`/tracking/${number}`);
    await page.getByRole("button", { name: "Cancel order" }).click();
    await page.getByRole("button", { name: "Keep order" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Order received")).toBeVisible();
    const order = await (await request.get(`${API}/api/order/number/${number}`)).json();
    expect(order.status).toBe("NEW");
  });

  test("no cancel button once the kitchen accepted", async ({ page, request }) => {
    const auth = await registerCustomer(request);
    const number = await placeOrder(request, auth.token);
    await acceptViaAdmin(request, number);
    await signIn(page, auth);

    await page.goto(`/tracking/${number}`);
    await expect(page.getByText("Preparing your order")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
  });

  test("no cancel button when signed out", async ({ page, request }) => {
    const auth = await registerCustomer(request);
    const number = await placeOrder(request, auth.token);

    await page.goto(`/tracking/${number}`);
    await expect(page.getByText("Order received")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
  });

  test("refused when the kitchen accepts while the page is open", async ({ page, request }) => {
    const auth = await registerCustomer(request);
    const number = await placeOrder(request, auth.token);
    await signIn(page, auth);

    await page.goto(`/tracking/${number}`);
    await expect(page.getByRole("button", { name: "Cancel order" })).toBeVisible();
    await acceptViaAdmin(request, number);

    await page.getByRole("button", { name: "Cancel order" }).click();
    await page.getByRole("button", { name: "Yes, cancel order" }).click();

    await expect(page.getByRole("alert")).toContainText("already accepted");
    await expect(page.getByText("Preparing your order")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
  });
});
