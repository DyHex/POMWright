import type { Page } from "@playwright/test";
import TestApp from "../../testApp.base";
import { defineLocators, type Paths } from "./testids.locatorSchema";

export default class TestIds extends TestApp<Paths> {
	constructor(page: Page) {
		super(page, "/testids");
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}
}
