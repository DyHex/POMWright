import { type Page, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";
import { env } from "./env";
import { defineLocators, type Paths } from "./products.locators";

export function productsPage(page: Page) {
	const url = new URL("/products", env.shopUrl).href;
	const { registry, getLocatorSchema } = createRegistryWithAccessors<Paths>(page);
	defineLocators(registry);
	registry.verify();

	return {
		goto: () => test.step("products.goto", () => page.goto(url)),
		addToCart: (options: { product: string }) =>
			test.step(`products.addToCart ${options.product}`, async () => {
				const heading = getLocatorSchema("main.list@products.cards.heading")
					.update()
					.getByRole({ name: options.product, exact: true })
					.getLocator();
				await getLocatorSchema("main.list@products.cards.button@addToCart")
					.filter("main.list@products.cards", { has: heading })
					.getNestedLocator()
					.click();
			}),
	};
}
