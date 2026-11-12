import { expect, test } from "@playwright/test";
import { ProductsPage } from "./shop.page";

// runs in the "no-baseurl" project, whose use has no baseURL
test("control: without baseURL a relative page.goto throws, and the page object needs none", async ({
	page,
	baseURL,
}) => {
	expect(baseURL).toBeUndefined();
	const error = await page.goto("/products").catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	console.log(`CONTROL ${(error as Error).message.split("\n")[0]}`);
	const products = new ProductsPage(page);
	await products.navigation.goto();
	await expect(page).toHaveURL(products.fullUrl);
});
