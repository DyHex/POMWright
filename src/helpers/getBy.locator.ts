import { type Page, type Locator } from "@playwright/test";
import { type LocatorSchema } from "./locatorSchema.interface";
import { GetByMethod } from "./locatorSchema.interface";
import { PlaywrightReportLogger } from "./playwrightReportLogger";

type GetByMethodSubset = Exclude<
  GetByMethod,
  GetByMethod.frameLocator | GetByMethod.testId | GetByMethod.dataCy | GetByMethod.id
>;

type GetByMethodFunction = {
  (selector: string | RegExp | Locator | undefined): Locator;
  (selector: string | RegExp | Locator | undefined, options: any): Locator;
};

/**
 * The GetBy class provides methods for creating and evaluating {@link Locator}s derived from {@link LocatorSchema} objects.
 *
 * Toggle additional debug {@link log}ging by setting environment variable 'LOG_ENABLED=true' in './Playwright/.env'.
 *
 * @class
 * @property {Page} page - The Playwright page object.
 * @property {string} pocName - The name of the Page Object Class (POC).
 */
export class GetBy {
  private log: PlaywrightReportLogger;
  private methodMap: Record<GetByMethod, (locator: LocatorSchema) => Locator>;
  private subMethodMap: Record<GetByMethodSubset, (options?: any) => Locator>;

  constructor(
    private page: Page,
    pwrl: PlaywrightReportLogger
  ) {
    this.log = pwrl.getNewChildLogger(this.constructor.name);

    // Map enum values to corresponding methods.
    this.methodMap = {
      [GetByMethod.role]: this.role,
      [GetByMethod.text]: this.text,
      [GetByMethod.label]: this.label,
      [GetByMethod.placeholder]: this.placeholder,
      [GetByMethod.altText]: this.altText,
      [GetByMethod.title]: this.title,
      [GetByMethod.locator]: this.locator,
      [GetByMethod.frameLocator]: this.frameLocator,
      [GetByMethod.testId]: this.testId,
      [GetByMethod.dataCy]: this.dataCy,
      [GetByMethod.id]: this.id
    };

    // Map enum values to generated corresponding methods.
    this.subMethodMap = {
      [GetByMethod.role]: this.page.getByRole,
      [GetByMethod.text]: this.page.getByText,
      [GetByMethod.label]: this.page.getByLabel,
      [GetByMethod.placeholder]: this.page.getByPlaceholder,
      [GetByMethod.altText]: this.page.getByAltText,
      [GetByMethod.title]: this.page.getByTitle,
      [GetByMethod.locator]: this.page.locator
    };
  }

  /**
   * Retrieves a Playwright Locator based on the method specified in the LocatorSchema.
   *
   * @param locatorSchema The LocatorSchema object specifying the locator method and its parameters.
   * @returns A promise that resolves to the appropriate Playwright Locator.
   */
  public getLocator = (locatorSchema: LocatorSchema): Locator => {
    const methodName = locatorSchema.locatorMethod;

    const method = this.methodMap[methodName];

    if (method) {
      return method(locatorSchema);
    }

    throw new Error(`Unsupported locator method: ${methodName}`);
  };

  private getBy = (caller: GetByMethodSubset, locator: LocatorSchema): Locator => {
    const method: GetByMethodFunction = this.subMethodMap[caller];

    if (!method) {
      const errorText = "Error: unknown caller of method getBy(caller, locator) in getBy.locators.ts";
      this.log.error(errorText);
      throw new Error(errorText);
    }

    const initialPWLocator = locator[caller]
      ? method.call(this.page, locator[caller], locator?.[`${caller}Options`])
      : null;

    if (!initialPWLocator) {
      const errorText = `Locator "${locator.locatorSchemaPath}" .${caller} is undefined.`;
      this.log.warn(errorText);
      throw new Error(errorText);
    }

    return initialPWLocator;
  };

  /**
   * Creates a new method that returns a Playwright Locator using the specified method name.
   *
   * @param methodName The name of the method to use for getting the element.
   * @returns An async function that takes a locator and returns a Playwright Locator.
   */
  private createByMethod = (methodName: GetByMethodSubset) => {
    return (locator: LocatorSchema): Locator => {
      return this.getBy(methodName, locator);
    };
  };

  /**
   *  Returns a {@link Locator} using the selectors 'role' (required) and 'roleOptions' (optional), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private role = this.createByMethod(GetByMethod.role);

  /**
   * Returns a {@link Locator} using the selectors 'text' (required) and 'textOptions' (optional), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private text = this.createByMethod(GetByMethod.text);

  /**
   * Returns a {@link Locator} using the selectors 'label' (required) and 'labelOptions' (optional), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private label = this.createByMethod(GetByMethod.label);

  /**
   *  Returns a {@link Locator} using the selectors 'placeholder' (required) and 'placeholderOptions' (optional), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private placeholder = this.createByMethod(GetByMethod.placeholder);

  /**
   *  Returns a {@link Locator} using the selectors 'altText' (required) and 'altTextOptions' (optional), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private altText = this.createByMethod(GetByMethod.altText);

  /**
   *  Returns a {@link Locator} using the selectors 'title' (required) and 'titleOptions' (optional), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private title = this.createByMethod(GetByMethod.title);

  /**
   *  Returns a {@link Locator} using the selectors 'locator' (required), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private locator = this.createByMethod(GetByMethod.locator);

  /**
   *  Returns a {@link FrameLocator} using the selector string 'frameLocator' (required), from a {@link LocatorSchema} Object.
   *
   * @param locatorSchema - Which contains the frameLocator selector.
   * @returns A promise that resolves to the {@link FrameLocator}.
   */
  private frameLocator = (locatorSchema: LocatorSchema): Locator => {
    const initialFrameLocator = locatorSchema.frameLocator
      ? (this.page.frameLocator(locatorSchema.frameLocator) as Locator)
      : null;

    if (!initialFrameLocator) {
      const errorText = `Locator "${locatorSchema.locatorSchemaPath}" .frameLocator is not defined.`;
      this.log.warn(errorText);
      throw new Error(errorText);
    }

    return initialFrameLocator;
  };

  /**
   *  Returns a {@link Locator} using the selectors 'testId' (required), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private testId = (locator: LocatorSchema): Locator => {
    const initialPWLocator = locator.testId ? this.page.getByTestId(locator.testId) : null;

    if (!initialPWLocator) {
      const errorText = `Locator "${locator.locatorSchemaPath}" .testId is not defined.`;
      this.log.warn(`Locator "${locator.locatorSchemaPath}" .testId is not defined.`);
      throw new Error(errorText);
    }

    return initialPWLocator;
  };

  /**
   *  Returns a {@link Locator} using the selectors 'dataCy' (required), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private dataCy = (locator: LocatorSchema): Locator => {
    let initialPWLocator: Locator | null = null;

    if (locator.dataCy) {
      initialPWLocator = locator.dataCy.startsWith("data-cy=")
        ? this.page.locator(locator.dataCy)
        : this.page.locator(`data-cy=${locator.dataCy}`);
    } else {
      const errorText = `Locator "${locator.locatorSchemaPath}" .dataCy is undefined.`;
      this.log.warn(errorText);
      throw new Error(errorText);
    }

    return initialPWLocator;
  };

  /**
   *  Returns a {@link Locator} using the selectors 'id' (required), from a {@link LocatorSchema} Object.
   *
   * @param locator - The locator.
   * @returns - A promise that resolves to the {@link Locator}.
   */
  private id = (locator: LocatorSchema): Locator => {
    let initialPWLocator: Locator | null = null;
    let selector: string;
    let regexPattern: string;

    if (!locator.id) {
      const errorText = `Locator "${locator.locatorSchemaPath}" .id is not defined.`;
      this.log.warn(errorText);
      throw new Error(errorText);
    }

    if (typeof locator.id === "string") {
      if (locator.id.startsWith("#")) {
        selector = locator.id;
      } else if (locator.id.startsWith("id=")) {
        selector = `#${locator.id.slice("id=".length)}`;
      } else {
        selector = `#${locator.id}`;
      }
    } else if (locator.id instanceof RegExp) {
      regexPattern = locator.id.source;
      selector = `*[id^="${regexPattern}"]`;
    } else {
      const errorText = `Unsupported id type: ${typeof locator.id}`;
      this.log.error(errorText);
      throw new Error(errorText);
    }

    initialPWLocator = this.page.locator(selector);

    return initialPWLocator;
  };
}
