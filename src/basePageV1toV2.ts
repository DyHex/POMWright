import { type Locator, type Page, type Selectors, selectors, type TestInfo } from "@playwright/test";
import {
	type AddAccessor,
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type LocatorRegistry,
} from "../srcV2/locators";
import type { BasePage } from "./basePage";
import { GetLocatorBase, type SubPaths } from "./helpers/getLocatorBase";
import type { PlaywrightReportLogger } from "./helpers/playwrightReportLogger";
import { SessionStorage } from "./helpers/sessionStorage.actions";
import { createCypressIdEngine } from "./utils/selectorEngines";

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

let selectorRegistered = false;

/**
 * BasePageV1toV2:
 * Migration-friendly BasePage that maintains v1 behavior while exposing v2 registries.
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
	public readonly getLocatorV2: GetLocatorAccessor<LocatorSchemaPathType>;
	public readonly getLocatorSchemaV2: GetLocatorSchemaAccessor<LocatorSchemaPathType>;
	public readonly getNestedLocatorV2: GetNestedLocatorAccessor<LocatorSchemaPathType>;

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

		const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
			createRegistryWithAccessors<LocatorSchemaPathType>(page);
		this.locatorRegistry = registry;
		this.add = add;
		this.getLocatorV2 = getLocator;
		this.getLocatorSchemaV2 = getLocatorSchema;
		this.getNestedLocatorV2 = getNestedLocator;

		this.defineLocators();

		// Instantiate GetLocatorBase following the minimal POC pattern.
		this.locators = new GetLocatorBase<LocatorSchemaPathType, LocatorSubstring>(
			this as unknown as BasePage<LocatorSchemaPathType, BasePageOptions, LocatorSubstring>,
			this.log.getNewChildLogger("GetLocator"),
			locatorSubstring,
		);
		this.initLocatorSchemas();

		this.sessionStorage = new SessionStorage(this.page, this.pocName);

		// Register a custom selector engine once globally.
		if (!selectorRegistered) {
			selectors.register("data-cy", createCypressIdEngine);
			selectorRegistered = true;
		}
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
	 * Short-hand wrapper method for calling .getLocatorSchema(LocatorSchemaPath).getNestedLocator(subPathIndices?)
	 *
	 * Asynchronously builds a nested locator from all LocatorSchema that make up the full LocatorSchemaPath. Optionally,
	 * you can provide a list of subPaths and indices to have one or more LocatorSchema that make up the full
	 * LocatorSchemaPath each resolved to a specific .nth(n) occurrence of the element(s).
	 *
	 * Note: This short-hand wrapper method is useful for quickly building nested locators without having to call
	 * getLocatorSchema("...") first. On the other hand, it can't be used to update or add filters to the LocatorSchema.
	 *
	 * Test retry: POMWright will set the log level to debug during retries of tests. This will trigger getNestedLocator
	 * to resolve the locator in DOM per nesting step and attach the log results to the HTML report for debugging purposes.
	 * This enables us to easily see which locator in the chain failed to resolve, making it easier to identify an issue
	 * or which LocatorSchema needs to be updated.
	 *
	 * Debug: Using POMWright's "log" fixture, you can set the log level to "debug" to see the nested locator evaluation
	 * results when a test isn't running retry.
	 *
	 * @example
	 * // Usage:
	 * const submitButton = await poc.getNestedLocator("main.form.button@submit");
	 * await submitButton.click();
	 *
	 * // With indexing:
	 * const something = await poc.getNestedLocator("main.form.item.something", {
	 *     "main.form": 0, // locator.first() / locator.nth(0)
	 *     "main.form.item": 1, // locator.nth(1)
	 *   });
	 * await something.click();
	 */
	public async getNestedLocator<P extends LocatorSchemaPathType>(
		locatorSchemaPath: P,
		subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, P>]?: number | null },
	): Promise<Locator>;

	/**
	 * Implementation of getNestedLocator.
	 */
	public async getNestedLocator(
		locatorSchemaPath: LocatorSchemaPathType,
		subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, typeof locatorSchemaPath>]?: number | null },
	): Promise<Locator> {
		const withValidation = new WithSubPathValidation<LocatorSchemaPathType, typeof locatorSchemaPath>(
			this as BasePageV1toV2<LocatorSchemaPathType, BasePageOptions, typeof locatorSchemaPath>,
			this.log.getNewChildLogger("SubPathValidation"),
			locatorSchemaPath,
		);
		return await withValidation.getNestedLocator(subPathIndices);
	}

	/**
	 * Short-hand wrapper method for calling .getLocatorSchema(LocatorSchemaPath).getLocator()
	 *
	 * This method does not perform nesting,and will return the locator for which the full LocatorSchemaPath resolves to,
	 * provided by getLocatorSchema("...")
	 *
	 * Note: This short-hand wrapper method is useful for quickly getting a locator without having to call
	 * getLocatorSchema("...") first. On the other hand, it can't be used to update or add filters to the LocatorSchema.
	 *
	 * @example
	 * // Usage:
	 * const submitButton = await poc.getLocator("main.form.button@submit");
	 * await expect(submitButton, "should only exist one submit button").toHaveCount(1);
	 */
	public getLocator = async (locatorSchemaPath: LocatorSchemaPathType): Promise<Locator> => {
		return await this.getLocatorSchema(locatorSchemaPath).getLocator();
	};

	/**
	 * getLocatorSchema:
	 * Delegates to this.locators.getLocatorSchema.
	 * Returns a chainable schema object for the given path.
	 * Once called with a specific path P, the update and addFilter methods are restricted to sub-paths of P.
	 */
	public getLocatorSchema<P extends LocatorSchemaPathType>(path: P) {
		return this.locators.getLocatorSchema(path);
	}

	/**
	 * defineLocators:
	 * Abstract method to be implemented by each POC for v2 registry definitions.
	 */
	protected abstract defineLocators(): void;

	/**
	 * initLocatorSchemas:
	 * Abstract method to be implemented by each POC for v1 locator schema definitions.
	 */
	protected abstract initLocatorSchemas(): void;
}

class WithSubPathValidation<
	LocatorSchemaPathType extends string,
	ValidatedPath extends LocatorSchemaPathType,
> extends GetLocatorBase<LocatorSchemaPathType, ValidatedPath> {
	constructor(
		pageObjectClass: BasePageV1toV2<LocatorSchemaPathType, BasePageOptions, ValidatedPath>,
		log: PlaywrightReportLogger,
		private locatorSchemaPath: ValidatedPath,
	) {
		super(
			pageObjectClass as unknown as BasePage<LocatorSchemaPathType, BasePageOptions, ValidatedPath>,
			log,
			locatorSchemaPath,
		);
	}

	/**
	 * getNestedLocator:
	 * Ensures `subPathIndices` keys are valid sub-paths of the provided `locatorSchemaPath`.
	 */
	public async getNestedLocator(
		subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, ValidatedPath>]?: number | null },
	): Promise<Locator>;

	public async getNestedLocator(
		arg?: { [K in SubPaths<LocatorSchemaPathType, ValidatedPath>]?: number | null },
	): Promise<Locator> {
		return await this.pageObjectClass.getLocatorSchema(this.locatorSchemaPath).getNestedLocator(arg);
	}
}
