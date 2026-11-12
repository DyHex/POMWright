// Probe: test data through one fixture holds values, JSON imported by the test-data module, a generator and a builder.
// The practice shop, the packed build 3.0.2, Playwright 1.64.0, a CommonJS project (no "type") with tsconfig nodenext and
// resolveJsonModule, three browsers, parallel workers.
import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => sessionStorage.setItem("consent", "given"));
});

test("a generator gives each call a new value", async ({ page, testData }) => {
	const first = testData.shop.home.newSubscriber();
	const second = testData.shop.home.newSubscriber();
	expect(first.email).not.toBe(second.email);
	expect(first.email).toMatch(/^subscriber-[0-9a-f-]{36}@shop\.example$/);
	await page.goto("http://localhost:4177/");
	const form = page.getByRole("form", { name: "Newsletter" });
	await form.getByLabel("Email").fill(first.email);
	await form.getByRole("button", { name: "Subscribe" }).click();
	await expect(form.getByText("Thanks for subscribing")).toBeVisible();
});

test("values from a JSON file reach the test", async ({ page, testData }) => {
	const lamp = testData.shop.products.lamp;
	expect(lamp).toEqual({ name: "Lamp", price: "249 kr" });
	await page.goto("http://localhost:4177/products");
	await page
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { name: lamp.name, exact: true }) })
		.getByRole("button", { name: "Add to cart" })
		.click();
	await expect(page.getByRole("status")).toHaveText(`Added ${lamp.name}`);
});

test("a builder gives the default with a case's changes", async ({ page, testData }) => {
	const form = testData.shop.login.form({ email: "grace@shop.example" });
	expect(form).toEqual({ email: "grace@shop.example", password: "correct horse" });
	expect(testData.shop.login.form()).toEqual({ email: "ada@shop.example", password: "correct horse" });
	await page.goto("http://localhost:4177/login");
	const login = page.getByRole("form", { name: "Log in" });
	await login.getByLabel("Email").fill(form.email);
	await login.getByLabel("Password").fill(form.password);
	await login.getByRole("button", { name: "Log in" }).click();
	await expect(page).toHaveURL("http://localhost:4177/account/42");
});
