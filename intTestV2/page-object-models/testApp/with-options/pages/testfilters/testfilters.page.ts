import { type Page, test } from "@playwright/test";
import BaseWithOptionsV2 from "../../base/baseWithOptions.page";
import { initLocatorSchemas, type LocatorSchemaPath } from "./testfilters.locatorSchema";

export default class TestFiltersV2 extends BaseWithOptionsV2<LocatorSchemaPath> {
	constructor(page: Page) {
		super(page, "/testfilters");
	}

	protected defineLocators(): void {
		initLocatorSchemas(this.locatorRegistry);
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
