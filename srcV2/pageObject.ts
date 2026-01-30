import type { Page } from "@playwright/test";
import { createNavigation, type ExtractNavigationType, type NavigationOptions } from "./helpers/navigation";
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
	baseUrlType?: string | RegExp;
	urlPathType?: string | RegExp;
};

export type BaseUrlTypeFromOptions<T extends UrlTypeOptions> = T extends { baseUrlType: RegExp } ? RegExp : string;
export type UrlPathTypeFromOptions<T extends UrlTypeOptions> = T extends { urlPathType: RegExp } ? RegExp : string;
export type FullUrlTypeFromOptions<T extends UrlTypeOptions> = T extends
	| { baseUrlType: RegExp }
	| { urlPathType: RegExp }
	? RegExp
	: string;

export abstract class PageObject<
	LocatorSchemaPathType extends string,
	Options extends UrlTypeOptions = { baseUrlType: string; urlPathType: string },
> {
	readonly page: Page;
	readonly baseUrl: BaseUrlTypeFromOptions<Options>;
	readonly urlPath: UrlPathTypeFromOptions<Options>;
	readonly fullUrl: FullUrlTypeFromOptions<Options>;
	readonly label: string;
	readonly sessionStorage: SessionStorage;
	public readonly navigation: ExtractNavigationType<FullUrlTypeFromOptions<Options>>;
	protected readonly locatorRegistry: LocatorRegistry<LocatorSchemaPathType>;
	public readonly add: AddAccessor<LocatorSchemaPathType>;
	public readonly getLocator: GetLocatorAccessor<LocatorSchemaPathType>;
	public readonly getLocatorSchema: GetLocatorSchemaAccessor<LocatorSchemaPathType>;
	public readonly getNestedLocator: GetNestedLocatorAccessor<LocatorSchemaPathType>;

	protected constructor(
		page: Page,
		baseUrl: BaseUrlTypeFromOptions<Options>,
		urlPath: UrlPathTypeFromOptions<Options>,
		options?: { label?: string; navOptions?: NavigationOptions },
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
		this.navigation = createNavigation(
			this.page,
			this.baseUrl,
			this.urlPath,
			this.fullUrl,
			this.label,
			this.pageActionsToPerformAfterNavigation(),
			options?.navOptions,
		);
	}

	protected abstract defineLocators(): void;
	protected abstract pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null;

	private composeFullUrl(
		baseUrl: BaseUrlTypeFromOptions<Options>,
		urlPath: UrlPathTypeFromOptions<Options>,
	): FullUrlTypeFromOptions<Options> {
		const escapeRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

		if (typeof baseUrl === "string" && typeof urlPath === "string") {
			return `${baseUrl}${urlPath}` as FullUrlTypeFromOptions<Options>;
		}
		if (typeof baseUrl === "string" && urlPath instanceof RegExp) {
			return new RegExp(`^${escapeRegex(baseUrl)}${urlPath.source}`) as FullUrlTypeFromOptions<Options>;
		}
		if (baseUrl instanceof RegExp && typeof urlPath === "string") {
			return new RegExp(`${baseUrl.source}${escapeRegex(urlPath)}$`) as FullUrlTypeFromOptions<Options>;
		}
		if (baseUrl instanceof RegExp && urlPath instanceof RegExp) {
			return new RegExp(`${baseUrl.source}${urlPath.source}`) as FullUrlTypeFromOptions<Options>;
		}
		throw new Error("Invalid baseUrl or urlPath types. Expected string or RegExp.");
	}
}
