import type { Page } from "@playwright/test";
import type { NavigationOptions } from "pomwright";
import TestApp from "../../testApp.base";
import { defineLocators, type Paths } from "./testnav.locatorSchema";

/** String page: baseUrl and urlPath are strings, so every navigation method is available. */
export default class TestNav extends TestApp<Paths> {
	readonly navigationActionCount = { value: 0 };

	constructor(page: Page, navOptions?: NavigationOptions) {
		super(page, "/testnav", { navOptions });
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [
			async () => {
				this.navigationActionCount.value += 1;
			},
		];
	}
}
