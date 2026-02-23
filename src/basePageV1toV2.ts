import { type Page, type Selectors, selectors, type TestInfo } from "@playwright/test";
import {
	type AddAccessor,
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type LocatorRegistry,
} from "../srcV2/locators";
import type { BasePage } from "./basePage";
import { warnDeprecationOncePerTest } from "./helpers/deprecationWarnings";
import { GetLocatorBase } from "./helpers/getLocatorBase";
import type { PlaywrightReportLogger } from "./helpers/playwrightReportLogger";
import { SessionStorage } from "./helpers/sessionStorage.actions";

/**
 * BasePageOptions can define optional patterns for baseUrl and urlPath.
 * Defaults assume they are strings if not specified.
 */
export type BasePageOptions = {
	urlOptions?: {
		baseUrlType?: string | RegExp; // Optional, defaults to string
		urlPathType?: string | RegExp; // Optional, defaults to string
	};
};

export type ExtractBaseUrlType<T extends BasePageOptions> = T["urlOptions"] extends { baseUrlType: RegExp }
	? RegExp
	: string;
export type ExtractUrlPathType<T extends BasePageOptions> = T["urlOptions"] extends { urlPathType: RegExp }
	? RegExp
	: string;
export type ExtractFullUrlType<T extends BasePageOptions> = T["urlOptions"] extends
	| { baseUrlType: RegExp }
	| { urlPathType: RegExp }
	? RegExp
	: string;

/**
 * @deprecated Transitional bridge for migrating from v1 to v2. This class will be removed in v2.
 * Switch to PageObject and the v2 registry DSL, see docs/v1-to-v2-migration
 *
 * BasePageV1toV2:
 * Migration-friendly BasePage that maintains v1 schema ingestion while exposing v2 registries.
 *
 * Generics:
 * - LocatorSchemaPathType: A union of valid locator paths.
 * - Options: Configuration type for URLs.
 * - LocatorSubstring: The chosen substring locator.
 */
export abstract class BasePageV1toV2<
	LocatorSchemaPathType extends string,
	Options extends BasePageOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
	LocatorSubstring extends LocatorSchemaPathType | undefined = undefined,
> {
	/** Provides Playwright page methods */
	page: Page;

	/** Playwright TestInfo contains information about currently running test, available to any test function */
	testInfo: TestInfo;

	/** Selectors can be used to install custom selector engines.*/
	selector: Selectors;

	/** The base URL of the Page Object Class */
	baseUrl: ExtractBaseUrlType<Options>;

	/** The URL path of the Page Object Class */
	urlPath: ExtractUrlPathType<Options>;

	/** The full URL of the Page Object Class */
	fullUrl: ExtractFullUrlType<Options>;

	/** The name of the Page Object Class */
	pocName: string;

	/** The Page Object Class' PlaywrightReportLogger instance, prefixed with its name. Log levels: debug, info, warn, and error.  */
	protected log: PlaywrightReportLogger;

	/** The SessionStorage class provides methods for setting and getting session storage data in Playwright.*/
	sessionStorage: SessionStorage;

	/**
	 * locators:
	 * An instance of GetLocatorBase that handles schema management and provides getLocatorSchema calls.
	 * Initially, LocatorSubstring is undefined. Once getLocatorSchema(path) is called,
	 * we get a chainable object typed with LocatorSubstring = P.
	 */
	protected locators: GetLocatorBase<LocatorSchemaPathType, LocatorSubstring>;

	/**
	 * v2 locator registry and accessors, used for migration to the fluent registry DSL.
	 */
	protected readonly locatorRegistry: LocatorRegistry<LocatorSchemaPathType>;
	public readonly add: AddAccessor<LocatorSchemaPathType>;
	public readonly getLocator: GetLocatorAccessor<LocatorSchemaPathType>;
	public readonly getLocatorSchema: GetLocatorSchemaAccessor<LocatorSchemaPathType>;
	public readonly getNestedLocator: GetNestedLocatorAccessor<LocatorSchemaPathType>;

	constructor(
		page: Page,
		testInfo: TestInfo,
		baseUrl: ExtractBaseUrlType<Options>,
		urlPath: ExtractUrlPathType<Options>,
		pocName: string,
		pwrl: PlaywrightReportLogger,
		locatorSubstring?: LocatorSubstring,
	) {
		this.page = page;
		this.testInfo = testInfo;
		this.selector = selectors;

		this.baseUrl = baseUrl;
		this.urlPath = urlPath;
		this.fullUrl = this.constructFullUrl(baseUrl, urlPath); // `${this.baseUrl}${this.urlPath}`
		this.pocName = pocName;

		this.log = pwrl.getNewChildLogger(pocName);

		const classDeprecationMessage =
			"[POMWright] BasePageV1toV2 is a transitional bridge and will be removed in 2.0.0. " +
			"Prefer PageObject for new work and migrate existing classes to PageObject.";
		warnDeprecationOncePerTest(`${this.constructor.name}-class-deprecation`, classDeprecationMessage, this.log);

		const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
			createRegistryWithAccessors<LocatorSchemaPathType>(page);
		this.locatorRegistry = registry;
		this.add = add;
		this.getLocator = getLocator;
		this.getLocatorSchema = getLocatorSchema;
		this.getNestedLocator = getNestedLocator;

		this.defineLocators();

		// Instantiate GetLocatorBase following the minimal POC pattern.
		this.locators = new GetLocatorBase<LocatorSchemaPathType, LocatorSubstring>(
			this as unknown as BasePage<LocatorSchemaPathType, BasePageOptions, LocatorSubstring>,
			this.log.getNewChildLogger("GetLocator"),
			locatorSubstring,
		);

		const initLocatorSchemasDeprecationMessage =
			"[POMWright] initLocatorSchemas is deprecated and will be removed in 2.0.0. " +
			"Define locators with the v2 registry DSL in defineLocators instead.";
		warnDeprecationOncePerTest(
			`${this.constructor.name}-initLocatorSchemas-deprecation`,
			initLocatorSchemasDeprecationMessage,
			this.log,
		);
		this.initLocatorSchemas();

		this.sessionStorage = new SessionStorage(this.page, this.pocName);
	}

	/**
	 * constructFullUrl:
	 * Combines baseUrl and urlPath, handling both strings and RegExps.
	 * Ensures a flexible approach to URL matching (string or regex-based).
	 */
	private constructFullUrl(
		baseUrl: ExtractBaseUrlType<Options>,
		urlPath: ExtractUrlPathType<Options>,
	): ExtractFullUrlType<Options> {
		/**
		 * Escapes special regex characters in a string by adding a backslash (\) before them.
		 * This ensures the string can be safely used in a regular expression.
		 * Characters escaped: - / \ ^ $ * + ? . ( ) | [ ] { }
		 *
		 * @param str - The input string containing potential regex characters.
		 * @returns The escaped string, safe for regex use.
		 */
		const escapeStringForRegExp = (str: string) => str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

		if (typeof baseUrl === "string" && typeof urlPath === "string") {
			return `${baseUrl}${urlPath}` as ExtractFullUrlType<Options>;
		}
		if (typeof baseUrl === "string" && urlPath instanceof RegExp) {
			return new RegExp(`^${escapeStringForRegExp(baseUrl)}${urlPath.source}`) as ExtractFullUrlType<Options>;
		}
		if (baseUrl instanceof RegExp && typeof urlPath === "string") {
			return new RegExp(`${baseUrl.source}${escapeStringForRegExp(urlPath)}$`) as ExtractFullUrlType<Options>;
		}
		if (baseUrl instanceof RegExp && urlPath instanceof RegExp) {
			return new RegExp(`${baseUrl.source}${urlPath.source}`) as ExtractFullUrlType<Options>;
		}
		throw new Error("Invalid baseUrl or urlPath types. Expected string or RegExp.");
	}

	/**
	 * defineLocators:
	 * Abstract method to be implemented by each POC for v2 registry definitions.
	 */
	protected abstract defineLocators(): void;

	/**
	 * @deprecated V1 schema ingestion will be removed in 2.0.0. Migrate definitions to defineLocators.
	 * initLocatorSchemas:
	 * Abstract method to be implemented by each POC for v1 locator schema definitions.
	 */
	protected abstract initLocatorSchemas(): void;
}
