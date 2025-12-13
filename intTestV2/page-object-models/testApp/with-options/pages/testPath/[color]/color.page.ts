import { test } from "@fixtures-v2/withOptions";
import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import type { PlaywrightReportLogger } from "pomwright";
import BaseWithOptionsV2 from "../../../base/baseWithOptions.page";
import { type ColorLocatorSchemaPath, initLocatorSchemas } from "./color.locatorSchema";

export default class ColorV2 extends BaseWithOptionsV2<
	ColorLocatorSchemaPath,
	{ urlOptions: { urlPathType: RegExp } }
> {
	constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
		const urlPathRegex = /\/testpath\/([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
		super(page, testInfo, urlPathRegex, ColorV2.name, pwrl);
	}

	protected defineLocators(): void {
		initLocatorSchemas(this.locatorRegistry);
	}

	async expectThisPage() {
		await test.step("Expect color page", async () => {
			await this.page.waitForURL(this.fullUrl);

			const heading = this.getNestedLocator("body.heading");
			await heading.waitFor({ state: "visible" });
		});
	}

	async validateColorPage() {
		await test.step("Verify hex code", async () => {
			const currentUrl = this.page.url();
			const hexCode = currentUrl.split("/").pop();

			await test.step("Verify hex code in table equals hex code in urlPath", async () => {
				const hexCodeCell = this.getNestedLocator("body.table@hexCode.row.cell");
				await expect(hexCodeCell).toContainText(`#${hexCode}`, {
					useInnerText: true,
					ignoreCase: true,
				});
			});

			await test.step("Verify hex code in urlPath is the page background color", async () => {
				const body = this.getNestedLocator("body");
				const bgColor = await body.getAttribute("style");
				expect(bgColor).toContain(`background-color: #${hexCode}`);
			});
		});
	}
}
