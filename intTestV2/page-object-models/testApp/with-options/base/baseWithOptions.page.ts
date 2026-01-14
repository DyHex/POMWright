import type { Page, TestInfo } from "@playwright/test";
import { type ExtractUrlPathType, PageObject, type PageObjectOptions, type PlaywrightReportLogger } from "pomwright";

export default abstract class BaseWithOptionsV2<
	LocatorSchemaPathType extends string,
	Options extends PageObjectOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
> extends PageObject<
	LocatorSchemaPathType,
	{ urlOptions: { baseUrlType: string; urlPathType: ExtractUrlPathType<Options> } }
> {
	protected constructor(
		page: Page,
		testInfo: TestInfo,
		urlPath: ExtractUrlPathType<{ urlOptions: { urlPathType: ExtractUrlPathType<Options> } }>,
		pwrl: PlaywrightReportLogger,
		options?: { label?: string },
	) {
		super(page, testInfo, "http://localhost:8080", urlPath, pwrl, options);
	}
}
