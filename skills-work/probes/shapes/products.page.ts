import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import { env } from "./env";
import { defineLocators, type Paths } from "./products.locators";

export class ProductsPage extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, env.shopUrl, "/products");
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	@step()
	async addToCart(options: { product: string }) {
		const heading = this.getLocatorSchema("main.list@products.cards.heading")
			.update()
			.getByRole({ name: options.product, exact: true })
			.getLocator();
		await this.getLocatorSchema("main.list@products.cards.button@addToCart")
			.filter("main.list@products.cards", { has: heading })
			.getNestedLocator()
			.click();
	}
}
