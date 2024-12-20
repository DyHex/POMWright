import type { Page, TestInfo } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import Base from "../base/base.page";
import { type LocatorSchemaPath, initLocatorSchemas } from "./testPage.locatorSchema";

export default class TestPage extends Base<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "/", TestPage.name, pwrl);
	}

	protected initLocatorSchemas() {
		initLocatorSchemas(this.locators);
	}

	// add your helper methods here...
}
