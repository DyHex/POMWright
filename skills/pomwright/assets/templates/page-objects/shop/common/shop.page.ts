import type { Page } from "@playwright/test";
import { PageObject, type PageObjectOptions, step } from "pomwright";
import { env } from "../../../env";
import { defineLocators as addCommon, type Paths as CommonPaths } from "./page-components/common.locators";

/** The base class of every page object of the shop: its origin, its navigation defaults and its common locators. */
export abstract class ShopPage<Paths extends string> extends PageObject<Paths | CommonPaths> {
	protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
		super(page, env.shopUrl, urlPath, {
			navOptions: { waitUntil: "domcontentloaded" },
			...options,
		});
	}

	protected defineLocators(): void {
		addCommon(this.locatorRegistry);
		this.definePageLocators();
	}

	/** Registers the page's own locators, the "main.heading" slot included; the common ones are registered already. */
	protected abstract definePageLocators(): void;

	@step()
	async openCart() {
		await this.getNestedLocator("header.link@cart").click();
	}
}
