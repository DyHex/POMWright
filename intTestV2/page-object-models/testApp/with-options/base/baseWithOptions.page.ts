import type { Page, TestInfo } from "@playwright/test";
import { type BasePageOptions, BasePageV2, type ExtractUrlPathType, type PlaywrightReportLogger } from "pomwright";

export default abstract class BaseWithOptionsV2<
	LocatorSchemaPathType extends string,
	Options extends BasePageOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
> extends BasePageV2<
	LocatorSchemaPathType,
	{ urlOptions: { baseUrlType: string; urlPathType: ExtractUrlPathType<Options> } }
> {
	protected constructor(
		page: Page,
		testInfo: TestInfo,
		urlPath: ExtractUrlPathType<{ urlOptions: { urlPathType: ExtractUrlPathType<Options> } }>,
		pocName: string,
		pwrl: PlaywrightReportLogger,
	) {
		super(page, testInfo, "http://localhost:8080", urlPath, pocName, pwrl);
	}
}
