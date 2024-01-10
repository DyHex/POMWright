import { type Page, type TestInfo, selectors, type Selectors, type Locator } from "@playwright/test";
import { PlaywrightReportLogger } from "./helpers/playwrightReportLogger";
import { SessionStorage } from "./helpers/sessionStorage.actions";
import { createCypressIdEngine } from "./utils/selectorEngines";
import { GetLocatorBase } from "./helpers/getLocatorBase";

let selectorRegistered = false;

/** The BasePage class, extended by all Page Object Classes */
export abstract class BasePage<LocatorSchemaPathType extends string> {
  /** Provides Playwright page methods */
  page: Page;

  /** Playwright TestInfo contains information about currently running test, available to any test function */
  testInfo: TestInfo;

  /** Selectors can be used to install custom selector engines.*/
  selector: Selectors;

  /** The base URL of the Page Object Class */
  baseUrl: string;

  /** The URL path of the Page Object Class */
  urlPath: string;

  fullUrl: string;

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
    baseUrl: string,
    urlPath: string,
    pocName: string,
    pwrl: PlaywrightReportLogger
  ) {
    this.page = page;
    this.testInfo = testInfo;
    this.selector = selectors;

    this.baseUrl = baseUrl;
    this.urlPath = urlPath;
    this.fullUrl = `${this.baseUrl}${this.urlPath}`;
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

  /**
   * Asynchronously retrieves a nested locator based on the provided LocatorSchemaPath and optional indices per nested locator.
   * Useful for interacting with elements in a structured or hierarchical manner, reducing the number of possible elements we can resolve to.
   *
   * The update and updates methods cannot be used with this method. Use the getLocatorSchema method instead.
   *
   * @param LocatorSchemaPathType locatorSchemaPath - The unique path identifier for the locator schema.
   * @param indices - An optional object to specify the nth occurrence of each nested locator.
   * @returns Promise<Locator> - A promise that resolves to the nested locator.
   */
  public getNestedLocator = async (
    locatorSchemaPath: LocatorSchemaPathType,
    indices?: { [key: number]: number | null } | null
  ): Promise<Locator> => {
    return await this.getLocatorSchema(locatorSchemaPath).getNestedLocator(indices);
  };

  /**
   * Asynchronously retrieves the locator based on the current LocatorSchemaPath. This method does not perform nesting.
   * Useful for directly interacting with an element based on its LocatorSchema.
   *
   * The update and updates methods cannot be used with this method. Use the getLocatorSchema method instead.
   *
   * @param LocatorSchemaPathType locatorSchemaPath - The unique path identifier for the locator schema.
   * @returns Promise<Locator> - A promise that resolves to the nested locator.
   */
  public getLocator = async (locatorSchemaPath: LocatorSchemaPathType): Promise<Locator> => {
    return await this.getLocatorSchema(locatorSchemaPath).getLocator();
  };

  protected abstract pageActionsToPerformAfterNavigation(): (() => Promise<void>)[];

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
   * The "getLocatorSchema" method is used to retrieve a deep copy of a locator schema defined in the GetLocatorBase class.
   * It enriches the returned schema with additional methods to handle updates and retrieval of deep copy locators.
   *
   * @param LocatorSchemaPathType locatorSchemaPath - The unique path identifier for the locator schema.
   * @returns LocatorSchemaWithMethods - A deep copy of the locator schema with additional methods.
   *
   * Methods added to the returned LocatorSchemaWithMethods object:
   *
   * - update(updates: Partial<UpdatableLocatorSchemaProperties>):
   *      Allows updating properties of the locator schema.
   *      This method is used for modifying the current schema without affecting the original schema.
   *      @param updates - An object with properties to be updated in the locator schema, omits the locatorSchemaPath parameter.
   *      @returns LocatorSchemaWithMethods - The updated locator schema object.
   *
   * - updates(indexedUpdates: { [index: number]: Partial<UpdatableLocatorSchemaProperties> | null }):
   *      Similar to update, but allows for indexed updates of any locator to be nested within the path.
   *      This method is used for modifying the current schema without affecting the original schema
   *      @param indexedUpdates - An object where keys represent index levels, and values are the updates at each level.
   *      @returns LocatorSchemaWithMethods - The locator schema object with indexed updates.
   *
   * - getNestedLocator(indices?: { [key: number]: number | null }):
   *      Asynchronously retrieves a nested locator based on the current schema and optional indices per nested locator.
   *      Useful for interacting with elements in a structured or hierarchical manner.
   *      @param indices - An optional object to specify the nth occurrence of each nested locator.
   *      @returns Promise<Locator> - A promise that resolves to the nested locator.
   *
   * - getLocator():
   *      Asynchronously retrieves the locator based on the current schema. This method does not consider nesting.
   *      Useful for directly interacting with an element based on its schema.
   *      @returns Promise<Locator> - A promise that resolves to the locator.
   */
  public getLocatorSchema(locatorSchemaPath: LocatorSchemaPathType) {
    return this.locators.getLocatorSchema(locatorSchemaPath);
  }
}
// export { Page, expect, TestInfo, selectors, request } from "@playwright/test";
