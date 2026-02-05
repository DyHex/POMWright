import { expect, type Page, test } from "@playwright/test";
import TestApp from "../../../testApp.base";
import { defineLocators, type Paths } from "./color.locatorSchema";

export default class ColorV2 extends TestApp<Paths, { urlPathType: RegExp }> {
	constructor(page: Page) {
		const urlPathRegex = /\/testpath\/([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
		super(page, urlPathRegex);
	}

	protected defineLocators(): void {
		defineLocators(this.locatorRegistry);
	}

	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
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
