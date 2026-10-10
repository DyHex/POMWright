import type { Page } from "@playwright/test";
import {
	type NavigationOptions,
	PageObject,
	type StorageTypeFromOptions,
	type UrlPathTypeFromOptions,
	type UrlTypeOptions,
} from "pomwright";

type BaseOptions<Options extends UrlTypeOptions> = {
	baseUrlType: string;
	urlPathType: UrlPathTypeFromOptions<Options>;
	storage: StorageTypeFromOptions<Options>;
};

export default abstract class TestApp<
	Paths extends string,
	Options extends UrlTypeOptions = { baseUrlType: string; urlPathType: string },
> extends PageObject<Paths, BaseOptions<Options>> {
	protected constructor(
		page: Page,
		urlPath: UrlPathTypeFromOptions<BaseOptions<Options>>,
		options?: {
			label?: string;
			navOptions?: NavigationOptions;
			sessionStorage?: { schema?: StorageTypeFromOptions<Options> };
		},
	) {
		super(page, "http://localhost:9000", urlPath, options);
	}
}
