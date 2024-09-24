import type { Locator, Page } from "@playwright/test";
import { GetByMethod, type LocatorSchema } from "./locatorSchema.interface";
import type { PlaywrightReportLogger } from "./playwrightReportLogger";

// Type definition for a subset of GetByMethod enum values, excluding specific values for manually implemented methods.
type GetByMethodSubset = Exclude<
	GetByMethod,
	GetByMethod.frameLocator | GetByMethod.testId | GetByMethod.dataCy | GetByMethod.id
>;

// Type definition for a function that retrieves a Locator based on a selector and optional options.
type GetByMethodFunction = {
	(selector: string | RegExp | Locator | undefined): Locator;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	(selector: string | RegExp | Locator | undefined, options: any): Locator;
};

/**
 * The GetBy class encapsulates methods for generating and obtaining Playwright Locators using LocatorSchema.
 * It maps locator methods to corresponding Playwright page functions and provides a convenient interface to interact
 * with these locators. It holds a reference to a Playwright Page object and a PlaywrightReportLogger for logging.
 * The constructor initializes the logger and sets up method mappings for locator creation.
 */
export class GetBy {
	private log: PlaywrightReportLogger;
	private methodMap: Record<GetByMethod, (locator: LocatorSchema) => Locator>;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private subMethodMap: Record<GetByMethodSubset, (options?: any) => Locator>;

	constructor(
		private page: Page,
		pwrl: PlaywrightReportLogger,
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
			[GetByMethod.id]: this.id,
		};

		// Map enum values to generated corresponding methods.
		this.subMethodMap = {
			[GetByMethod.role]: this.page.getByRole,
			[GetByMethod.text]: this.page.getByText,
			[GetByMethod.label]: this.page.getByLabel,
			[GetByMethod.placeholder]: this.page.getByPlaceholder,
			[GetByMethod.altText]: this.page.getByAltText,
			[GetByMethod.title]: this.page.getByTitle,
			[GetByMethod.locator]: this.page.locator,
		};
	}

	/**
	 * Retrieves a Locator based on the details provided in a LocatorSchema.
	 * The method identifies the appropriate locator creation function from methodMap and invokes it.
	 * Throws an error if the locator method is unsupported.
	 */
	public getLocator = (locatorSchema: LocatorSchema): Locator => {
		const methodName = locatorSchema.locatorMethod;

		const method = this.methodMap[methodName];

		if (method) {
			return method(locatorSchema);
		}

		throw new Error(`Unsupported locator method: ${methodName}`);
	};

	/**
	 * Internal method to retrieve a Locator using a specified GetByMethodSubset and LocatorSchema.
	 * It identifies the appropriate locator creation function from subMethodMap and invokes it.
	 * Throws an error if the caller is unknown or if the initial locator is not found.
	 */
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
	 * Creates a method for generating a Locator using a specific GetByMethodSubset.
	 * Returns a function that takes a LocatorSchema and returns a Locator.
	 * The returned function is a locator creation function corresponding to the specified methodName.
	 */
	private createByMethod = (methodName: GetByMethodSubset) => {
		return (locator: LocatorSchema): Locator => {
			return this.getBy(methodName, locator);
		};
	};

	// Methods for creating locators using different locator methods.
	// These methods are generated using createByMethod and provide a unified way to create locators based on LocatorSchema.
	// Each method is responsible for creating a Locator based on a specific attribute (role, text, label, etc.) provided in LocatorSchema.
	// These methods return a Locator and throw an error if the necessary attribute is not defined in the LocatorSchema.
	private role = this.createByMethod(GetByMethod.role);
	private text = this.createByMethod(GetByMethod.text);
	private label = this.createByMethod(GetByMethod.label);
	private placeholder = this.createByMethod(GetByMethod.placeholder);
	private altText = this.createByMethod(GetByMethod.altText);
	private title = this.createByMethod(GetByMethod.title);
	private locator = this.createByMethod(GetByMethod.locator);

	/**
	 * Returns a FrameLocator using the 'frameLocator' selector from a LocatorSchema.
	 * Throws an error if the frameLocator is not defined.
	 */
	private frameLocator = (locatorSchema: LocatorSchema): Locator => {
		const initialFrameLocator = locatorSchema.frameLocator
			? (this.page.frameLocator(locatorSchema.frameLocator) as unknown as Locator) // intentional, might need a rework...
			: null;

		if (!initialFrameLocator) {
			const errorText = `Locator "${locatorSchema.locatorSchemaPath}" .frameLocator is not defined.`;
			this.log.warn(errorText);
			throw new Error(errorText);
		}

		return initialFrameLocator;
	};

	/**
	 * Returns a Locator using the 'testId' selector from a LocatorSchema.
	 * Throws an error if the testId is not defined.
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
	 * Returns a Locator using the 'dataCy' selector from a LocatorSchema.
	 * Throws an error if the dataCy is undefined.
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
	 * Returns a Locator using the 'id' selector from a LocatorSchema.
	 * Throws an error if the id is not defined or the id type is unsupported.
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
