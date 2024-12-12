import { test } from "@fixtures/withOptions";
import BaseWithOptions from "@page-object-models/testApp/with-options/base/baseWithOptions.page";
import { type Page, type TestInfo, expect } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import { type LocatorSchemaPath, initLocatorSchemas } from "./color.locatorSchema";

// By providing the urlOptions, the urlPath property now has RegExp type instead of string type (default) for this POC
export default class Color extends BaseWithOptions<LocatorSchemaPath, { urlOptions: { urlPathType: RegExp } }> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		/**
		 * Matches "/testpath/randomcolor/" followed by a valid 3 or 6-character hex color code.
		 */
		const urlPathRegex = /\/testpath\/([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

		super(page, testInfo, urlPathRegex, Color.name, pwrl);
	}

	protected initLocatorSchemas() {
		initLocatorSchemas(this.locators);
	}

	async expectThisPage() {
		await test.step("Expect color page", async () => {
			await this.page.waitForURL(this.fullUrl);

			const heading = await this.getNestedLocator("body.heading");
			await heading.waitFor({ state: "visible" });
		});
	}

	async validateColorPage() {
		await test.step("Verify hex code", async () => {
			const currentUrl = this.page.url();
			const hexCode = currentUrl.split("/").pop();

			await test.step("Verify hex code in table equals hex code in urlPath", async () => {
				const hexCodeTableCell = await this.getNestedLocator("body.table@hexCode.row.cell");
				await expect(hexCodeTableCell).toContainText(`#${hexCode}`, { useInnerText: true, ignoreCase: true });
			});

			await test.step("Verify hex code in urlPath is the page background color", async () => {
				const body = await this.getNestedLocator("body");
				// await expect(body).toHaveAttribute("style", `background-color: #${hexCode};`);
				// or
				const bgColor = await body.getAttribute("style");
				expect(bgColor).toContain(`background-color: #${hexCode}`);
			});
		});
	}

	// add your helper methods here...
}
