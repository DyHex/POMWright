import { type Page, type TestInfo } from "@playwright/test";
import { BasePage, PlaywrightReportLogger } from "pomwright";
import { type LocatorSchemaPath, initLocatorSchemas } from "./testPage.locatorSchema";

export default class TestPage extends BasePage<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "http://localhost:8080", "/", TestPage.name, pwrl);
	}

	protected initLocatorSchemas() {
		initLocatorSchemas(this.locators);
	}

	// add your helper methods here...
}
