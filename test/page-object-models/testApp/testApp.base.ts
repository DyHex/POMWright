import type { Page } from "@playwright/test";
import {
	PageObject,
	type PageObjectOptions,
	type PageObjectTypeOptions,
	type StorageTypeFromOptions,
	type UrlPathTypeFromOptions,
} from "pomwright";

type BaseOptions<Options extends PageObjectTypeOptions> = {
	baseUrlType: string;
	urlPathType: UrlPathTypeFromOptions<Options>;
	storage: StorageTypeFromOptions<Options>;
};

export default abstract class TestApp<
	Paths extends string,
	Options extends PageObjectTypeOptions = { baseUrlType: string; urlPathType: string },
> extends PageObject<Paths, BaseOptions<Options>> {
	protected constructor(
		page: Page,
		urlPath: UrlPathTypeFromOptions<BaseOptions<Options>>,
		options?: PageObjectOptions<BaseOptions<Options>>,
	) {
		super(page, "http://localhost:9000", urlPath, options);
	}
}
