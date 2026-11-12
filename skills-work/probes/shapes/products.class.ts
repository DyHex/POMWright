import type { Page } from "@playwright/test";
import { createRegistryWithAccessors, type LocatorRegistry, step } from "pomwright";
import { env } from "./env";
import { defineLocators, type Paths } from "./products.locators";

export class ProductsPage {
	readonly url = new URL("/products", env.shopUrl).href;
	private readonly registry: LocatorRegistry<Paths>;

	constructor(readonly page: Page) {
		const { registry } = createRegistryWithAccessors<Paths>(page);
		defineLocators(registry);
		registry.verify();
		this.registry = registry;
	}

	@step()
	async goto() {
		await this.page.goto(this.url);
	}

	@step()
	async addToCart(options: { product: string }) {
		const heading = this.registry
			.getLocatorSchema("main.list@products.cards.heading")
			.update()
			.getByRole({ name: options.product, exact: true })
			.getLocator();
		await this.registry
			.getLocatorSchema("main.list@products.cards.button@addToCart")
			.filter("main.list@products.cards", { has: heading })
			.getNestedLocator()
			.click();
	}
}
