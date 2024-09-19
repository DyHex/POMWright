import { type Locator, type Page, type Selectors, type TestInfo, selectors } from "@playwright/test";
import { GetLocatorBase } from "./helpers/getLocatorBase";
import { PlaywrightReportLogger } from "./helpers/playwrightReportLogger";
import { SessionStorage } from "./helpers/sessionStorage.actions";
import { createCypressIdEngine } from "./utils/selectorEngines";

export type BasePageOptions = {
	urlOptions?: {
		baseUrlType?: string | RegExp; // Optional, defaults to string
		urlPathType?: string | RegExp; // Optional, defaults to string
	};
	// Other future options can go here
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

/** The BasePage class, extended by all Page Object Classes */
export abstract class BasePage<
	LocatorSchemaPathType extends string,
	Options extends BasePageOptions = { urlOptions: { baseUrlType: string; urlPathType: string } },
> {
	/** Provides Playwright page methods */
	page: Page;

	/** Playwright TestInfo contains information about currently running test, available to any test function */
	testInfo: TestInfo;

	/** Selectors can be used to install custom selector engines.*/
	selector: Selectors;

	/** The base URL of the Page Object Class */
	// baseUrl: string;
	baseUrl: ExtractBaseUrlType<Options>;

	/** The URL path of the Page Object Class */
	// urlPath: string;
	urlPath: ExtractUrlPathType<Options>;

	// fullUrl: string;
	fullUrl: ExtractFullUrlType<Options>;

	/** The name of the Page Object Class */
	pocName: string;

	/** The Page Object Class' PlaywrightReportLogger instance, prefixed with its name. Log levels: debug, info, warn, and error.  */
	protected log: PlaywrightReportLogger;

	/** The SessionStorage class provides methods for setting and getting session storage data in Playwright.*/
	sessionStorage: SessionStorage;

	protected locators: GetLocatorBase<LocatorSchemaPathType>;

	constructor(
		page: Page,
		testInfo: TestInfo,
		baseUrl: ExtractBaseUrlType<Options>,
		urlPath: ExtractUrlPathType<Options>,
		pocName: string,
		pwrl: PlaywrightReportLogger,
	) {
		this.page = page;
		this.testInfo = testInfo;
		this.selector = selectors;

		this.baseUrl = baseUrl;
		this.urlPath = urlPath;
		this.fullUrl = this.constructFullUrl(baseUrl, urlPath); //`${this.baseUrl}${this.urlPath}`;
		this.pocName = pocName;

		this.log = pwrl.getNewChildLogger(pocName);
		this.locators = new GetLocatorBase<LocatorSchemaPathType>(this, this.log.getNewChildLogger("GetLocator"));
		this.initLocatorSchemas();

		this.sessionStorage = new SessionStorage(this.page, this.pocName);

		/** Register custom Playwright Selector Engines here. A custom Selector Engine must only be registered once! */
		if (!selectorRegistered) {
			selectors.register("data-cy", createCypressIdEngine);
			selectorRegistered = true;
		}
	}

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
	 * getNestedLocator(indices?: { [key: number]: number | null } | null)
	 * - Asynchronously retrieves a nested locator based on the LocatorSchemaPath provided by getLocatorSchema("...")
	 * - Can be chained after the update and updates methods, getNestedLocator will end the chain.
	 * - The optional parameter of the method takes an object with 0-based indices "{0: 0, 3: 1}" for one or more locators
	 * to be nested given by sub-paths (indices correspond to last "word" of a sub-path).
	 * - Returns a promise that resolves to the nested locator.
	 */
	public getNestedLocator = async (
		locatorSchemaPath: LocatorSchemaPathType,
		indices?: { [key: number]: number | null } | null,
	): Promise<Locator> => {
		return await this.getLocatorSchema(locatorSchemaPath).getNestedLocator(indices);
	};

	/**
	 * getLocator()
	 * - Asynchronously retrieves a locator based on the current LocatorSchema. This method does not perform nesting,
	 * and will return the locator for which the full LocatorSchemaPath resolves to, provided by getLocatorSchema("...")
	 * - Can be chained after the update and updates methods, getLocator will end the chain.
	 * - Returns a promise that resolves to the locator.
	 */
	public getLocator = async (locatorSchemaPath: LocatorSchemaPathType): Promise<Locator> => {
		return await this.getLocatorSchema(locatorSchemaPath).getLocator();
	};

	/**
	 * Abstract method to initialize locator schemas.
	 *
	 * Each Page Object Class (POC) extending BasePage should define its own
	 * LocatorSchemaPathType, which is a string type using dot (".") notation.
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

	/**
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
	public getLocatorSchema(locatorSchemaPath: LocatorSchemaPathType) {
		return this.locators.getLocatorSchema(locatorSchemaPath);
	}
}
