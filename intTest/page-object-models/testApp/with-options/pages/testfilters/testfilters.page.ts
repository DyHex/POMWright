import { test } from "@fixtures/withOptions";
import BaseWithOptions from "@page-object-models/testApp/with-options/base/baseWithOptions.page";
import { expect, type Page, type TestInfo } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import { defineLocators, initLocatorSchemas, type LocatorSchemaPath } from "./testfilters.locatorSchema";

// Note, if BasePageOptions aren't specified, default options are used
export default class TestFilters extends BaseWithOptions<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "/testfilters", TestFilters.name, pwrl);
	}

	protected initLocatorSchemas() {
		initLocatorSchemas(this.locators);
	}

	protected defineLocators() {
		defineLocators(this.locatorRegistry);
	}

	async expectThisPage() {
		await test.step(`Expect Page: ${this.urlPath}`, async () => {
			await this.page.waitForURL(this.fullUrl);
		});
	}

	// add your helper methods here...
}
