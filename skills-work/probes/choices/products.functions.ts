import { expect, type Page, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";
import { defineLocators, type Paths } from "./products.locators";

// functions over a registry, no class
export function productsPage(page: Page) {
	const { registry, getNestedLocator, getLocatorSchema } = createRegistryWithAccessors<Paths>(page);
	defineLocators(registry);
	registry.verify();

	return {
		goto: () =>
			test.step("products.goto", async () => {
				await page.goto("/products");
				await getNestedLocator("dialog@cookies.button@accept").click();
			}),
		addToCart: (options: { product: string }) =>
			test.step(`products.addToCart ${options.product}`, async () => {
				const heading = getLocatorSchema("main.list@products.card.heading")
					.update()
					.getByRole({ name: options.product, exact: true })
					.getLocator();
				await getLocatorSchema("main.list@products.card.button@addToCart")
					.filter("main.list@products.card", { has: heading })
					.getNestedLocator()
					.click();
			}),
		expectAdded: (options: { product: string }) =>
			test.step("products.expectAdded", async () => {
				await expect(getNestedLocator("main.status")).toHaveText(`Added ${options.product}`);
			}),
	};
}
