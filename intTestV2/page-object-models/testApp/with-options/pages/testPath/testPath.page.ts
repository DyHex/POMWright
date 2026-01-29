import { type Page, test } from "@playwright/test";
import BaseWithOptionsV2 from "../../base/baseWithOptions.page";
import { initLocatorSchemas, type LocatorSchemaPath } from "./testPath.locatorSchema";

export default class TestPathV2 extends BaseWithOptionsV2<LocatorSchemaPath> {
	constructor(page: Page) {
		super(page, "/testpath");
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
