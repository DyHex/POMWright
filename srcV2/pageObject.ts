import { type Page, type Selectors, selectors, type TestInfo } from "@playwright/test";
import type { PlaywrightReportLogger } from "./helpers/playwrightReportLogger";
import { SessionStorage } from "./helpers/sessionStorage";
import {
	type AddAccessor,
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type LocatorRegistry,
} from "./locators";

export type PageObjectOptions = {
	urlOptions?: {
		baseUrlType?: string | RegExp;
		urlPathType?: string | RegExp;
	};
};

export type ExtractBaseUrlType<T extends PageObjectOptions> = T["urlOptions"] extends { baseUrlType: RegExp }
	? RegExp
	: string;
export type ExtractUrlPathType<T extends PageObjectOptions> = T["urlOptions"] extends { urlPathType: RegExp }
	? RegExp
	: string;
export type ExtractFullUrlType<T extends PageObjectOptions> = T["urlOptions"] extends
	| { baseUrlType: RegExp }
	| { urlPathType: RegExp }
	? RegExp
	: string;

export abstract class PageObject<
	LocatorSchemaPathType extends string,
	Options extends PageObjectOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
> {
	readonly page: Page;
	readonly testInfo: TestInfo;
	readonly selector: Selectors;
	readonly baseUrl: ExtractBaseUrlType<Options>;
	readonly urlPath: ExtractUrlPathType<Options>;
	readonly fullUrl: ExtractFullUrlType<Options>;
	readonly label: string;
	readonly sessionStorage: SessionStorage;
	protected readonly log: PlaywrightReportLogger;
	protected readonly locatorRegistry: LocatorRegistry<LocatorSchemaPathType>;
	public readonly add: AddAccessor<LocatorSchemaPathType>;
	public readonly getLocator: GetLocatorAccessor<LocatorSchemaPathType>;
	public readonly getLocatorSchema: GetLocatorSchemaAccessor<LocatorSchemaPathType>;
	public readonly getNestedLocator: GetNestedLocatorAccessor<LocatorSchemaPathType>;

	protected constructor(
		page: Page,
		testInfo: TestInfo,
		baseUrl: ExtractBaseUrlType<Options>,
		urlPath: ExtractUrlPathType<Options>,
		playwrightReportLogger: PlaywrightReportLogger,
		options?: { label?: string },
	) {
		this.page = page;
		this.testInfo = testInfo;
		this.selector = selectors;
		this.baseUrl = baseUrl;
		this.urlPath = urlPath;
		this.fullUrl = this.composeFullUrl(baseUrl, urlPath);
		const label = options?.label ?? this.constructor.name;
		this.label = label;
		this.log = playwrightReportLogger.getNewChildLogger(label);
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
