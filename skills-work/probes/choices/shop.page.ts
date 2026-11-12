import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";
import { env } from "./env";
import { defineLocators, type Paths } from "./products.locators";

// PageObject, with its origin from the same env value the config's baseURL uses
export class ProductsPage extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, env.shopUrl, "/products");
	}
	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}
}
