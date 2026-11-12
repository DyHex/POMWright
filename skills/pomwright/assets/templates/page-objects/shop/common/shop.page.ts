import type { Page } from "@playwright/test";
import {
	PageObject,
	type PageObjectOptions,
	type PageObjectTypeOptions,
	type StorageTypeFromOptions,
	step,
	type UrlPathTypeFromOptions,
} from "pomwright";
import { env } from "../../../env";
import { defineLocators as addCommon, type Paths as CommonPaths } from "./page-components/common.locators";

/** The shop's options: its origin is a string; a page's own path type and storage schema pass through. */
type ShopOptions<Options extends PageObjectTypeOptions> = {
	baseUrlType: string;
	urlPathType: UrlPathTypeFromOptions<Options>;
	storage: StorageTypeFromOptions<Options>;
};

/**
 * The base class of every page object of the shop: its origin, its navigation and registry defaults and its common
 * locators. It forwards every option with its type, so a page passes only what it needs (its path, a RegExp path's
 * `{ urlPathType: RegExp }`, a storage schema's `{ storage: typeof schema }`) and never casts.
 */
export abstract class ShopPage<
	Paths extends string,
	Options extends PageObjectTypeOptions = { urlPathType: string },
> extends PageObject<Paths | CommonPaths, ShopOptions<Options>> {
	protected constructor(
		page: Page,
		urlPath: UrlPathTypeFromOptions<ShopOptions<Options>>,
		options?: PageObjectOptions<ShopOptions<Options>>,
	) {
		super(page, env.shopUrl, urlPath, {
			...options,
			navOptions: { waitUntil: "domcontentloaded", ...options?.navOptions },
			locators: { strictChains: false, ...options?.locators },
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
