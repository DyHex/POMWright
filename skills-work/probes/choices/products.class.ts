import { expect, type Page } from "@playwright/test";
import { createRegistryWithAccessors, type LocatorRegistry, step } from "pomwright";
import { defineLocators, type Paths } from "./products.locators";

// an own page object class with a registry, no PageObject
export class ProductsPage {
	private readonly registry: LocatorRegistry<Paths>;

	constructor(readonly page: Page) {
		const { registry } = createRegistryWithAccessors<Paths>(page);
		defineLocators(registry);
		registry.verify();
		this.registry = registry;
	}

	@step()
	async goto() {
		await this.page.goto("/products");
		await this.registry.getNestedLocator("dialog@cookies.button@accept").click();
	}

	@step()
	async addToCart(options: { product: string }) {
		const heading = this.registry
			.getLocatorSchema("main.list@products.card.heading")
			.update()
			.getByRole({ name: options.product, exact: true })
			.getLocator();
		await this.registry
			.getLocatorSchema("main.list@products.card.button@addToCart")
			.filter("main.list@products.card", { has: heading })
			.getNestedLocator()
			.click();
	}

	@step()
	async expectAdded(options: { product: string }) {
		await expect(this.registry.getNestedLocator("main.status")).toHaveText(`Added ${options.product}`);
	}
}
