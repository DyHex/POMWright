import { expect, test } from "@playwright/test";
import { ProductsPage as OwnClass } from "./products.class";
import { productsPage } from "./products.functions";
import { ProductsPage } from "./products.page";

// The guide's own code, exercised as a test would; this config sets no baseURL.
const cartOf = (page: import("@playwright/test").Page) =>
	page.evaluate(() => JSON.parse(sessionStorage.getItem("cart") ?? '{"items":[]}'));

test("no baseURL here", async ({ baseURL }) => {
	expect(baseURL).toBeUndefined();
});

test("PageObject", async ({ page }) => {
	const products = new ProductsPage(page);
	await products.navigation.goto();
	await products.addToCart({ product: "Lamp" });
	await expect(products.getNestedLocator("main.status")).toHaveText("Added Lamp");
	expect(await cartOf(page)).toEqual({ items: [{ name: "Lamp", quantity: 1 }] });
});

test("own class", async ({ page }) => {
	const products = new OwnClass(page);
	await products.goto();
	await products.addToCart({ product: "Lamp" });
	expect(await cartOf(page)).toEqual({ items: [{ name: "Lamp", quantity: 1 }] });
});

test("functions", async ({ page }) => {
	const products = productsPage(page);
	await products.goto();
	await products.addToCart({ product: "Lamp" });
	expect(await cartOf(page)).toEqual({ items: [{ name: "Lamp", quantity: 1 }] });
});
