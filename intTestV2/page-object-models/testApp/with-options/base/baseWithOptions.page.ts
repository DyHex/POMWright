import type { Page } from "@playwright/test";
import { type NavigationOptions, PageObject, type UrlPathTypeFromOptions, type UrlTypeOptions } from "pomwright";

type BaseOptions<Options extends UrlTypeOptions> = {
	baseUrlType: string;
	urlPathType: UrlPathTypeFromOptions<Options>;
};

export default abstract class BaseWithOptionsV2<
	LocatorSchemaPathType extends string,
	Options extends UrlTypeOptions = { baseUrlType: string; urlPathType: string },
> extends PageObject<LocatorSchemaPathType, BaseOptions<Options>> {
	protected constructor(
		page: Page,
		urlPath: UrlPathTypeFromOptions<BaseOptions<Options>>,
		options?: { label?: string; navOptions?: NavigationOptions },
	) {
		super(page, "http://localhost:8080", urlPath, options);
	}
}
