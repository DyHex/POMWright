import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger } from "pomwright";
// import helper methods / classes etc, here... (To be used in the Base POC)

export default abstract class Base<LocatorSchemaPathType extends string> extends BasePage<LocatorSchemaPathType> {
	// add properties here (available to all POCs extending this abstract Base POC)

	constructor(page: Page, testInfo: TestInfo, urlPath: string, pocName: string, pwrl: PlaywrightReportLogger) {
		super(page, testInfo, "http://localhost:8080", urlPath, pocName, pwrl);

		// initialize properties here (available to all POCs extending this abstract Base POC)
	}

	// add helper methods here (available to all POCs extending this abstract Base POC)
}
