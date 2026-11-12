import { expect } from "@playwright/test";
import { env } from "./env";
import { test } from "./fixtures";

test("a customer adds the lamp to the cart", async ({ page, products, testData }) => {
	const product = testData.shop.products.lamp;
	await page.goto(new URL("/products", env.shopUrl).href);
	const heading = products
		.getLocatorSchema("main.list@products.cards.heading")
		.update()
		.getByRole({ name: product, exact: true })
		.getLocator();
	await products
		.getLocatorSchema("main.list@products.cards.button@addToCart")
		.filter("main.list@products.cards", { has: heading })
		.getNestedLocator()
		.click();
	await expect(products.getNestedLocator("main.status")).toHaveText(`Added ${product}`);
});
