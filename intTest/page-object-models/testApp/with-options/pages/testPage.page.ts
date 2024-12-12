import {
	type LocatorSchemaPath,
	initLocatorSchemas,
} from "@page-object-models/testApp/without-options/pages/testPage.locatorSchema"; // same page, same locator schema
import type { Page, TestInfo } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import BaseWithOptions from "../base/baseWithOptions.page";

// Note, if BasePageOptions aren't specified, default options are used
export default class TestPage extends BaseWithOptions<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "/", TestPage.name, pwrl);
	}

	protected initLocatorSchemas() {
		initLocatorSchemas(this.locators);
	}

	// add your helper methods here...
}
