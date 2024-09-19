import { type Page, type TestInfo } from "@playwright/test";
import { BasePage, type BasePageOptions, type ExtractUrlPathType, PlaywrightReportLogger } from "pomwright";

// BaseWithOptions extends BasePage and enforces baseUrlType as string
export default abstract class BaseWithOptions<
	LocatorSchemaPathType extends string,
	Options extends BasePageOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
> extends BasePage<
	LocatorSchemaPathType,
	{ urlOptions: { baseUrlType: string; urlPathType: ExtractUrlPathType<Options> } }
> {
	constructor(
		page: Page,
		testInfo: TestInfo,
		urlPath: ExtractUrlPathType<{ urlOptions: { urlPathType: ExtractUrlPathType<Options> } }>, // Ensure the correct type for urlPath
		pocName: string,
		pwrl: PlaywrightReportLogger,
	) {
		// Pass baseUrl as a string and let urlPath be flexible
		super(page, testInfo, "http://localhost:8080", urlPath, pocName, pwrl);

		// Initialize additional properties if needed
	}

	// Add any helper methods here, if needed
}
