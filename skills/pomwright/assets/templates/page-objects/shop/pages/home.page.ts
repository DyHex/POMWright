import { expect, type Page } from "@playwright/test";
import { step } from "pomwright";
import { ShopPage } from "../common/shop.page";
import { defineLocators, type Paths } from "./home.locators";

export class HomePage extends ShopPage<Paths> {
	constructor(page: Page) {
		super(page, "");
	}

	protected definePageLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	/** What "this page has loaded" means; navigation.goto() and navigation.expectThisPage() wait for it. */
	protected override pageActionsToPerformAfterNavigation() {
		return [
			async () => {
				await expect(this.getNestedLocator("main.heading")).toBeVisible();
			},
		];
	}

	@step()
	async subscribe(email: string) {
		await this.getNestedLocator("main.form@newsletter.input@email").fill(email);
		await this.getNestedLocator("main.form@newsletter.button@subscribe").click();
	}

	@step()
	async expectSubscribed() {
		await expect(this.getNestedLocator("main.form@newsletter.text@confirmation")).toBeVisible();
	}
}
