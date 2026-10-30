import type { Page } from "@playwright/test";
import TestApp from "../../testApp.base";
import { defineLocators, type Paths } from "./testgetby.locatorSchema";

export default class TestGetBy extends TestApp<Paths> {
	constructor(page: Page) {
		super(page, "/testgetby");
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}
}
