import { expect, test as playwrightTest } from "@playwright/test";
import { test as fixtureTest } from "./fixtures";
import { ProductsPage as OwnClass } from "./products.class";
import { productsPage } from "./products.functions";
import { ProductsPage } from "./shop.page";

const cartOf = (page: import("@playwright/test").Page) =>
	page.evaluate(() => JSON.parse(sessionStorage.getItem("cart") ?? '{"items":[]}'));

playwrightTest.describe("baseURL beside a page object, from the same env value", () => {
	playwrightTest("page.goto with a relative path lands on the page object's URL", async ({ page }) => {
		const products = new ProductsPage(page);
		await page.goto("/products");
		await products.navigation.expectThisPage();
		expect(page.url()).toBe(products.fullUrl);
	});

	playwrightTest("toHaveURL with a relative path after navigation.goto()", async ({ page }) => {
		const products = new ProductsPage(page);
		await products.navigation.goto();
		await expect(page).toHaveURL("/products");
	});

	playwrightTest("the request fixture resolves against baseURL", async ({ page, request }) => {
		const products = new ProductsPage(page);
		const response = await request.get("/products");
		expect(response.ok()).toBe(true);
		expect(response.url()).toBe(products.fullUrl);
	});
});

playwrightTest("own class with createRegistryWithAccessors and @step", async ({ page }) => {
	const products = new OwnClass(page);
	await products.goto();
	await products.addToCart({ product: "Lamp" });
	await products.expectAdded({ product: "Lamp" });
	expect(await cartOf(page)).toEqual({ items: [{ name: "Lamp", quantity: 1 }] });
});

playwrightTest("functions over a registry with test.step", async ({ page }) => {
	const products = productsPage(page);
	await products.goto();
	await products.addToCart({ product: "Lamp" });
	await products.expectAdded({ product: "Lamp" });
	expect(await cartOf(page)).toEqual({ items: [{ name: "Lamp", quantity: 1 }] });
});

fixtureTest("a fixture that hands tests the accessors", async ({ page, products }) => {
	await page.goto("/products");
	await products.getNestedLocator("dialog@cookies.button@accept").click();
	const heading = products
		.getLocatorSchema("main.list@products.card.heading")
		.update()
		.getByRole({ name: "Lamp", exact: true })
		.getLocator();
	await products
		.getLocatorSchema("main.list@products.card.button@addToCart")
		.filter("main.list@products.card", { has: heading })
		.getNestedLocator()
		.click();
	await expect(products.getNestedLocator("main.status")).toHaveText("Added Lamp");
	expect(await cartOf(page)).toEqual({ items: [{ name: "Lamp", quantity: 1 }] });
});
