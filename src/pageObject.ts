import type { Page } from "@playwright/test";
import { createNavigation, type NavigationFor, type NavigationOptions } from "./helpers/navigation";
import { SessionStorage } from "./helpers/sessionStorage";
import { assertBaseUrl, assertUrlPath, composeFullUrl, type UrlMatcher } from "./helpers/url";
import {
	type AddAccessor,
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type LocatorRegistry,
} from "./locators";

/**
 * UrlTypeOptions declare which of baseUrl and urlPath are RegExps; both default to string.
 * With two strings, fullUrl is the resolved URL string and every navigation method is available.
 * When either is a RegExp, fullUrl is a UrlMatcher (the base is matched against the URL's origin,
 * the path against the rest), `goto()` without a target is unavailable, and on a RegExp baseUrl
 * `goto(target)` accepts only absolute URLs.
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
	? UrlMatcher
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
	public readonly navigation: NavigationFor<BaseUrlTypeFromOptions<Options>, FullUrlTypeFromOptions<Options>>;
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
		const label = options?.label ?? this.constructor.name;
		this.label = label;
		if (typeof baseUrl === "string") {
			assertBaseUrl(baseUrl, label);
		}
		if (typeof urlPath === "string") {
			assertUrlPath(urlPath, label);
		}
		this.baseUrl = baseUrl;
		this.urlPath = urlPath;
		this.fullUrl = composeFullUrl(baseUrl, urlPath) as FullUrlTypeFromOptions<Options>;
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
}
