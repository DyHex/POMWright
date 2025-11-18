import type { Page, TestInfo } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import BaseWithOptionsV2 from "../base/baseWithOptions.page";
import { initLocatorSchemas, type LocatorSchemaPath } from "./testPage.locatorSchema";

export default class TestPageV2 extends BaseWithOptionsV2<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "/", TestPageV2.name, pwrl);
	}

	protected defineLocators(): void {
		initLocatorSchemas(this.locatorRegistry);
	}
}
