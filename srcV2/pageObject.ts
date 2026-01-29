import type { Page } from "@playwright/test";
import { SessionStorage } from "./helpers/sessionStorage";
import {
	type AddAccessor,
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type LocatorRegistry,
} from "./locators";

/**
 * UrlTypeOptions define types for baseUrl and urlPath.
 * string is the default type; The types can be overridden to RegExp, using the Extract...Type utility types. If either
 * baseUrlType or urlPathType is set to RegExp, then fullUrlType will also be RegExp and can't be used for navigation,
 * only validation through URL matching.
 */
export type UrlTypeOptions = {
	urlOptions?: {
		baseUrlType?: string | RegExp;
		urlPathType?: string | RegExp;
	};
};

export type ExtractBaseUrlType<T extends UrlTypeOptions> = T["urlOptions"] extends { baseUrlType: RegExp }
	? RegExp
	: string;
export type ExtractUrlPathType<T extends UrlTypeOptions> = T["urlOptions"] extends { urlPathType: RegExp }
	? RegExp
	: string;
export type ExtractFullUrlType<T extends UrlTypeOptions> = T["urlOptions"] extends
	| { baseUrlType: RegExp }
	| { urlPathType: RegExp }
	? RegExp
	: string;

export abstract class PageObject<
	LocatorSchemaPathType extends string,
	Options extends UrlTypeOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
> {
	readonly page: Page;
	readonly baseUrl: ExtractBaseUrlType<Options>;
	readonly urlPath: ExtractUrlPathType<Options>;
	readonly fullUrl: ExtractFullUrlType<Options>;
	readonly label: string;
	readonly sessionStorage: SessionStorage;
	protected readonly locatorRegistry: LocatorRegistry<LocatorSchemaPathType>;
	public readonly add: AddAccessor<LocatorSchemaPathType>;
	public readonly getLocator: GetLocatorAccessor<LocatorSchemaPathType>;
	public readonly getLocatorSchema: GetLocatorSchemaAccessor<LocatorSchemaPathType>;
	public readonly getNestedLocator: GetNestedLocatorAccessor<LocatorSchemaPathType>;

	protected constructor(
		page: Page,
		baseUrl: ExtractBaseUrlType<Options>,
		urlPath: ExtractUrlPathType<Options>,
		options?: { label?: string },
	) {
		this.page = page;
		this.baseUrl = baseUrl;
		this.urlPath = urlPath;
		this.fullUrl = this.composeFullUrl(baseUrl, urlPath);
		const label = options?.label ?? this.constructor.name;
		this.label = label;
		const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
			createRegistryWithAccessors<LocatorSchemaPathType>(page);
		this.locatorRegistry = registry;
		this.add = add;
		this.getLocator = getLocator;
		this.getLocatorSchema = getLocatorSchema;
		this.getNestedLocator = getNestedLocator;
		this.sessionStorage = new SessionStorage(page, { label });

		this.defineLocators();
	}

	protected abstract defineLocators(): void;

	private composeFullUrl(
		baseUrl: ExtractBaseUrlType<Options>,
		urlPath: ExtractUrlPathType<Options>,
	): ExtractFullUrlType<Options> {
		const escapeRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

		if (typeof baseUrl === "string" && typeof urlPath === "string") {
			return `${baseUrl}${urlPath}` as ExtractFullUrlType<Options>;
		}
		if (typeof baseUrl === "string" && urlPath instanceof RegExp) {
			return new RegExp(`^${escapeRegex(baseUrl)}${urlPath.source}`) as ExtractFullUrlType<Options>;
		}
		if (baseUrl instanceof RegExp && typeof urlPath === "string") {
			return new RegExp(`${baseUrl.source}${escapeRegex(urlPath)}$`) as ExtractFullUrlType<Options>;
		}
		if (baseUrl instanceof RegExp && urlPath instanceof RegExp) {
			return new RegExp(`${baseUrl.source}${urlPath.source}`) as ExtractFullUrlType<Options>;
		}
		throw new Error("Invalid baseUrl or urlPath types. Expected string or RegExp.");
	}
}
