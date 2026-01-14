import type { Page, TestInfo } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import BaseWithOptionsV2 from "../../base/baseWithOptions.page";
import { initLocatorSchemas, type LocatorSchemaPath } from "./iframe.locatorSchema";

export default class IframePage extends BaseWithOptionsV2<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "/iframe", pwrl);
	}

	protected defineLocators(): void {
		initLocatorSchemas(this.locatorRegistry);
	}
}
