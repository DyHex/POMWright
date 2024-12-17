import { type Locator, type Page, type Selectors, type TestInfo, selectors } from "@playwright/test";
import { GetLocatorBase } from "./helpers/getLocatorBase";
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

	public async getNestedLocator(
		locatorSchemaPath: LocatorSchemaPathType,
		subPathIndices?: { [K in LocatorSchemaPathType as string]: number | null },
	): Promise<Locator>;

	/**
	 * @deprecated Use { LocatorSchemaPath: index } instead of {4:2}, i.e. subPath-based keys instead of indices.
	 *
	 * getNestedLocator:
	 * Delegates to getLocatorSchema(...).getNestedLocator(indices).
	 * - Asynchronously retrieves a nested locator based on the LocatorSchemaPath provided by getLocatorSchema("...")
	 * - Can be chained after the update and updates methods, getNestedLocator will end the chain.
	 * - The optional parameter of the method takes an object with 0-based indices "{0: 0, 3: 1}" for one or more locators
	 * to be nested given by sub-paths (indices correspond to last "word" of a sub-path).
	 * - Returns a promise that resolves to the nested locator.
	 */
	public async getNestedLocator(
		locatorSchemaPath: LocatorSchemaPathType,
		indices?: { [key: number]: number | null } | null,
	): Promise<Locator>;

	public async getNestedLocator(
		locatorSchemaPath: LocatorSchemaPathType,
		arg?: { [K in LocatorSchemaPathType]?: number | null } | { [key: number]: number | null },
	): Promise<Locator> {
		// If no arg or empty
		if (!arg || Object.keys(arg).length === 0) {
			return await this.getLocatorSchema(locatorSchemaPath).getNestedLocator({});
		}

		const keys = Object.keys(arg);
		const isNumberKey = keys.every((k) => /^\d+$/.test(k));
		if (isNumberKey) {
			// Deprecated old usage with numeric keys
			const numericIndices = arg as { [key: number]: number | null };
			return await this.getLocatorSchema(locatorSchemaPath).getNestedLocator(numericIndices);
		}
		// New usage: keys are subPaths
		const subPathIndices = arg as { [subPath: string]: number | null };
		return await this.getLocatorSchema(locatorSchemaPath).getNestedLocator(subPathIndices);
	}

	/**
	 * getLocator:
	 * Delegates to getLocatorSchema(...).getLocator().
	 * - Asynchronously retrieves a locator based on the current LocatorSchema. This method does not perform nesting,
	 * and will return the locator for which the full LocatorSchemaPath resolves to, provided by getLocatorSchema("...")
	 * - Can be chained after the update and updates methods, getLocator will end the chain.
	 * - Returns a promise that resolves to the locator.
	 */
	public getLocator = async (locatorSchemaPath: LocatorSchemaPathType): Promise<Locator> => {
		return await this.getLocatorSchema(locatorSchemaPath).getLocator();
	};

	/**
	 * getLocatorSchema:
	 * Delegates to this.locators.getLocatorSchema.
	 * Returns a chainable schema object for the given path.
	 * Once called with a specific path P, addFilter is restricted to sub-paths of P.
	 *
	 * The "getLocatorSchema" method is used to retrieve an updatable deep copy of a LocatorSchema defined in the
	 * GetLocatorBase class. It enriches the returned schema with additional methods to handle updates and retrieval of
	 * deep copy locators.
	 *
	 * getLocatorSchema adds the following chainable methods to the returned LocatorSchemaWithMethods object:
	 *
	 * update(updates: Partial< UpdatableLocatorSchemaProperties >)
	 * - Allows updating the properties of the LocatorSchema which the full LocatorSchemaPath resolves to.
	 * - This method is used for modifying the current schema without affecting the original schema.
	 * - Takes a "LocatorSchema" object which omits the locatorSchemaPath parameter as input, the parameters provided
	 * will overwrite the corresponding property in the current schema.
	 * - Returns the updated deep copy of the "LocatorSchema" with methods.
	 * - Can be chained with the update and updates methods, and the getLocator or getNestedLocator method.
	 *
	 * updates(indexedUpdates: { [index: number]: Partial< UpdatableLocatorSchemaProperties > | null }):
	 * - Similar to update, but allows updating any locator in the nested chain (all sub-paths of the LocatorSchemaPath).
	 * - This method can modify the current deep copy of each LocatorSchema that each sub-path resolves to without
	 * affecting the original schemas
	 * - Takes an object where keys represent the index of the last "word" of a sub-path, where the value per key is a
	 * "LocatorSchema" object which omits the locatorSchemaPath parameter as input, the parameters provided will overwrite
	 * the corresponding property in the given schema.
	 * - Returns the updated deep copy of the LocatorSchema object with methods and its own updated deep copies for all
	 * LocatorSchema each sub-path resolved to.
	 * - Can be chained with the update and updates methods, and the getLocator or getNestedLocator method.
	 *
	 * addFilter(subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>, filterData: FilterEntry)
	 * The equivalent of the Playwright locator.filter() method
	 * - This method is used for filtering the specified locator based on the provided filterData.
	 *
	 * getNestedLocator(indices?: { [key: number]: number | null } | null)
	 * - Asynchronously retrieves a nested locator based on the LocatorSchemaPath provided by getLocatorSchema("...")
	 * - Can be chained after the update and updates methods, getNestedLocator will end the chain.
	 * - The optional parameter of the method takes an object with 0-based indices "{0: 0, 3: 1}" for one or more locators
	 * to be nested given by sub-paths (indices correspond to last "word" of a sub-path).
	 * - Returns a promise that resolves to the nested locator.
	 *
	 * getLocator()
	 * - Asynchronously retrieves a locator based on the current LocatorSchema. This method does not perform nesting,
	 * and will return the locator for which the full LocatorSchemaPath resolves to, provided by getLocatorSchema("...")
	 * - Can be chained after the update and updates methods, getLocator will end the chain.
	 * - Returns a promise that resolves to the locator.
	 *
	 * Note: Calling getLocator() and getNestedLocator() on the same LocatorSchemaPath will return a Locator for the same
	 * element, but the Locator returned by getNestedLocator() will be a locator resolving to said same element through
	 * a chain of locators. While the Locator returned by getLocator() will be a single locator which resolves directly
	 * to said element. Thus getLocator() is rarely used, while getNestedLocator() is used extensively.
	 *
	 * That said, for certain use cases, getLocator() can be useful, and you could use it to manually chain locators
	 * yourself if some edge case required it. Though, it would be likely be more prudent to expand your LocatorSchemaPath
	 * type and initLocatorSchemas() method to include the additional locators you need for the given POC, and then use
	 * getNestedLocator() instead.
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
