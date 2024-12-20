import { type Locator, type Page, type Selectors, type TestInfo, selectors } from "@playwright/test";
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
 * BasePage:
 * The foundational class for all Page Object Classes.
 *
 * Generics:
 * - LocatorSchemaPathType: A union of valid locator paths.
 * - Options: Configuration type for URLs.
 * - LocatorSubstring: The chosen substring locator.
 *
 * We instantiate GetLocatorBase with these generics. When calling getLocatorSchema,
 * the chosen path P sets LocatorSubstring = P, ensuring methods like addFilter only suggests valid sub-paths.
 *
 * BasePage provides:
 * - Common properties: page, testInfo, selectors, URLs, logging, sessionStorage.
 * - getNestedLocator & getLocator methods that delegate to getLocatorSchema.
 * - Abstract initLocatorSchemas method to be implemented by concrete POCs.
 */
export abstract class BasePage<
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

		// Instantiate GetLocatorBase following the minimal POC pattern.
		this.locators = new GetLocatorBase<LocatorSchemaPathType, LocatorSubstring>(
			this,
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
		const escapeStringForRegExp = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

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
	 * @deprecated Use { SubPaths: index } instead of {4:2}, i.e. subPath-based keys instead of indices, see example.
	 *
	 * Deprecated short-hand wrapper method for calling .getLocatorSchema(LocatorSchemaPath).getNestedLocator(subPathIndices?)
	 *
	 * @example
	 * // New Usage:
	 * const something = await poc.getNestedLocator("main.form.item.something", {
	 *     "main.form": 0, // locator.first() / locator.nth(0)
	 *     "main.form.item": 1, // locator.nth(1)
	 *   });
	 * await something.click();
	 */
	public async getNestedLocator(
		locatorSchemaPath: LocatorSchemaPathType,
		indices?: { [key: number]: number | null } | null,
	): Promise<Locator>;

	/**
	 * Implementation of getNestedLocator.
	 */
	public async getNestedLocator(
		locatorSchemaPath: LocatorSchemaPathType,
		subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, typeof locatorSchemaPath>]?: number | null },
	): Promise<Locator> {
		const withValidation = new WithSubPathValidation<LocatorSchemaPathType, typeof locatorSchemaPath>(
			this as BasePage<LocatorSchemaPathType, BasePageOptions, typeof locatorSchemaPath>,
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
	 *
	 * The "getLocatorSchema" method is used to retrieve an updatable deep copy of a LocatorSchema defined in the
	 * GetLocatorBase class. It enriches the returned schema with additional methods to handle updates and retrieval of
	 * deep copy locators.
	 *
	 * getLocatorSchema adds the following chainable methods to the returned LocatorSchemaWithMethods object:
	 *
	 * update
	 * - Allows updating any schema in the chain by specifying the subPath directly.
	 * - Gives compile-time suggestions for valid sub-paths of the LocatorSchemaPath provided to .getLocatorSchema().
	 * - If you want to update multiple schemas, chain multiple .update() calls.
	 *
	 * addFilter(subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>, filterData: FilterEntry)
	 * - The equivalent of the Playwright locator.filter() method
	 * - This method is used for filtering the specified locator based on the provided filterData.
	 * - Can be chained multiple times to add multiple filters to the same or different LocatorSchema.
	 *
	 * getNestedLocator
	 * - Asynchronously builds a nested locator based on the LocatorSchemaPath provided by getLocatorSchema("...")
	 * - Can be chained once after the update and addFilter methods or directly on the .getLocatorSchema method.
	 * - getNestedLocator will end the method chain and return a nested Playwright Locator.
	 * - Optionally parameter takes a list of key(subPath)-value(index) pairs, the locator constructed from the LocatorSchema
	 * with the specified subPath will resolve to the .nth(n) occurrence of the element, within the chain.
	 *
	 * getLocator()
	 * - Asynchronously retrieves a locator based on the current LocatorSchemaPath.
	 * - This method does not perform nesting and will return the locator for which the full LocatorSchemaPath resolves to, provided by getLocatorSchema("...")
	 * - Can be chained once after the update and addFilter methods or directly on the .getLocatorSchema method.
	 * - getLocator will end the method chain and return a Playwright Locator.
	 *
	 * Note: Calling getLocator() and getNestedLocator() on the same LocatorSchemaPath will return a Locator for the same
	 * element, but the Locator returned by getNestedLocator() will be a locator resolving to said same element through
	 * a chain of locators. While the Locator returned by getLocator() will be a single locator which resolves directly
	 * to said element. Thus getLocator() is rarely used, while getNestedLocator() is used extensively.
	 *
	 * That said, for certain use cases, getLocator() can be useful, and you could use it to manually chain locators
	 * yourself if some edge case required it. Though, it would be likely be more prudent to expand your LocatorSchemaPath
	 * type and initLocatorSchemas() method to include the additional locators you need for the given POC, and then use
	 * getNestedLocator() instead, or by implementing a helper method on your Page Object Class.
	 */
	public getLocatorSchema<P extends LocatorSchemaPathType>(path: P) {
		return this.locators.getLocatorSchema(path);
	}

	/**
	 * initLocatorSchemas:
	 * Abstract method to be implemented by each POC.
	 * POCs define their own type LocatorSchemaPath and add their schemas using locators.addSchema(...).
	 *
	 * Each Page Object Class (POC) extending BasePage should define its own
	 * LocatorSchemaPath type, which is a string type using dot (".") notation.
	 * The format should start and end with a word, and words should be separated by dots.
	 * For example: "section.subsection.element".
	 *
	 * Implement this method in derived classes to populate the locator map.
	 * You can define locator schemas directly within this method or import them
	 * from a separate file (recommended for larger sets of schemas).
	 *
	 * @example
	 * // Example of defining LocatorSchemaPathType in a POC:
	 *
	 * export type LocatorSchemaPath =
	 *   | "main.heading"
	 *   | "main.button.addItem";
	 *
	 * // Example implementation using direct definitions:
	 *
	 * initLocatorSchemas() {
	 *   this.addSchema("main.heading", {
	 *     role: "heading",
	 *     roleOptions: {
	 *       name: "Main Heading"
	 *     },
	 *     locatorMethod: GetBy.role
	 *   });
	 *
	 *   this.addSchema("main.button.addItem", {
	 *     role: "button",
	 *     roleOptions: {
	 *       name: "Add item"
	 *     },
	 *     testId: "add-item-button",
	 *     locatorMethod: GetBy.role
	 *   });
	 *
	 *   // Add more schemas as needed
	 * }
	 *
	 * // Example implementation using a separate file:
	 * // Create a file named 'pocName.locatorSchema.ts' and define a function
	 * // that populates the locator schemas, for example:
	 *
	 * // In pocName.locatorSchema.ts
	 * export type LocatorSchemaPath =
	 *   | "main.heading"
	 *   | "main.button.addItem";
	 *
	 * export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
	 *   locators.addSchema("main.heading", {
	 *     role: "heading",
	 *     roleOptions: {
	 *       name: "Main Heading"
	 *     },
	 *     locatorMethod: GetBy.role
	 *   });
	 *
	 *   locators.addSchema("main.button.addItem", {
	 *     role: "button",
	 *     roleOptions: {
	 *       name: "Add item"
	 *     },
	 *     testId: "add-item-button",
	 *     locatorMethod: GetBy.role
	 *   });
	 *
	 *   // Add more schemas as needed
	 * }
	 *
	 * // In the derived POC class
	 * import { initLocatorSchemas, LocatorSchemaPath } from "./pocName.locatorSchema";
	 *
	 * initLocatorSchemas() {
	 *     initPocNameLocatorSchemas(this.locators);
	 * }
	 */
	protected abstract initLocatorSchemas(): void;
}

class WithSubPathValidation<
	LocatorSchemaPathType extends string,
	ValidatedPath extends LocatorSchemaPathType,
> extends GetLocatorBase<LocatorSchemaPathType, ValidatedPath> {
	constructor(
		pageObjectClass: BasePage<LocatorSchemaPathType, BasePageOptions, ValidatedPath>,
		log: PlaywrightReportLogger,
		private locatorSchemaPath: ValidatedPath,
	) {
		super(pageObjectClass, log, locatorSchemaPath);
	}

	/**
	 * getNestedLocator:
	 * Ensures `subPathIndices` keys are valid sub-paths of the provided `locatorSchemaPath`.
	 */
	public async getNestedLocator(
		subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, ValidatedPath>]?: number | null },
	): Promise<Locator>;

	/**
	 * Legacy overload (deprecated).
	 */
	public async getNestedLocator(indices?: { [key: number]: number | null }): Promise<Locator>;

	public async getNestedLocator(
		arg?: { [K in SubPaths<LocatorSchemaPathType, ValidatedPath>]?: number | null } | { [key: number]: number | null },
	): Promise<Locator> {
		return await this.pageObjectClass.getLocatorSchema(this.locatorSchemaPath).getNestedLocator(arg);
	}
}
