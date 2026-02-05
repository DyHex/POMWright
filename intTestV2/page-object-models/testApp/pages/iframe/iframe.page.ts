import type { Page } from "@playwright/test";
import TestApp from "../../testApp.base";
import { defineLocators, type Paths } from "./iframe.locatorSchema";

export default class IframePage extends TestApp<Paths> {
	constructor(page: Page) {
		super(page, "/iframe");
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}
}
