import type { Page } from "@playwright/test";
import { type ExtractUrlPathType, PageObject, type UrlTypeOptions } from "pomwright";

export default abstract class BaseWithOptionsV2<
	LocatorSchemaPathType extends string,
	Options extends UrlTypeOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
> extends PageObject<
	LocatorSchemaPathType,
	{ urlOptions: { baseUrlType: string; urlPathType: ExtractUrlPathType<Options> } }
> {
	protected constructor(
		page: Page,
		urlPath: ExtractUrlPathType<{ urlOptions: { urlPathType: ExtractUrlPathType<Options> } }>,
		options?: { label?: string },
	) {
		super(page, "http://localhost:8080", urlPath, options);
	}
}
