import { test } from "@fixtures-v2/withOptions";
import type { Page, TestInfo } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import BaseWithOptionsV2 from "../../base/baseWithOptions.page";
import { initLocatorSchemas, type LocatorSchemaPath } from "./testPath.locatorSchema";

export default class TestPathV2 extends BaseWithOptionsV2<LocatorSchemaPath> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "/testpath", pwrl);
	}

	protected defineLocators(): void {
		initLocatorSchemas(this.locatorRegistry);
	}

	async expectThisPage() {
		await test.step(`Expect Page: ${this.urlPath}`, async () => {
			await this.page.waitForURL(this.fullUrl);
		});
	}
}
