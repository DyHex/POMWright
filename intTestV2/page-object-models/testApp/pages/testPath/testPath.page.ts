import { type Page, test } from "@playwright/test";
import TestApp from "../../testApp.base";
import { defineLocators, type Paths } from "./testPath.locatorSchema";

export default class TestPathV2 extends TestApp<Paths> {
	constructor(page: Page) {
		super(page, "/testpath");
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}

	async expectThisPage() {
		await test.step(`Expect Page: ${this.urlPath}`, async () => {
			await this.page.waitForURL(this.fullUrl);
		});
	}
}
