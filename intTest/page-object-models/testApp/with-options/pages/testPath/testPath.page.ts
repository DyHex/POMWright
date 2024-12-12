import { test } from "@fixtures/withOptions";
import BaseWithOptions from "@page-object-models/testApp/with-options/base/baseWithOptions.page";
import { type Page, type TestInfo, expect } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import { type LocatorSchemaPath, initLocatorSchemas } from "./testPath.locatorSchema";

// Note, if BasePageOptions aren't specified, default options are used
export default class TestPath extends BaseWithOptions<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "/testpath", TestPath.name, pwrl);
	}

	protected initLocatorSchemas() {
		initLocatorSchemas(this.locators);
	}

	async expectThisPage() {
		await test.step(`Expect Page: ${this.urlPath}`, async () => {
			await this.page.waitForURL(this.fullUrl);
		});
	}

	// add your helper methods here...
}
