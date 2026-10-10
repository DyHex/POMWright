import type { Page } from "@playwright/test";
import TestApp from "../../testApp.base";
import { defineLocators, type Paths } from "./testnav-item.locatorSchema";

/**
 * RegExp page: the path has a dynamic segment, so urlPath is a RegExp, fullUrl is a UrlMatcher,
 * and goto() without a target is unavailable. The path is anchored on both ends, the shape 2.x
 * could never match.
 */
export default class TestNavItem extends TestApp<Paths, { urlPathType: RegExp }> {
	constructor(page: Page) {
		super(page, /^\/testnav\/item\/\d+$/);
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}
}
