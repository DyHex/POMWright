import type { Page } from "@playwright/test";
import { atCallSite, captureCallSite } from "./helpers/callSite";
import { createNavigation, type NavigationFor, type NavigationOptions } from "./helpers/navigation";
import { SessionStorage, type SessionStorageSchema } from "./helpers/sessionStorage";
import { assertBaseUrl, assertUrlPart, assertUrlPath, composeFullUrl, type UrlMatcher } from "./helpers/url";
import {
	type AddAccessor,
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type LocatorRegistry,
	type LocatorRegistryOptions,
} from "./locators";

/**
 * PageObjectTypeOptions, the second type argument of PageObject. `baseUrlType` and `urlPathType`
 * declare which of baseUrl and urlPath are RegExps; both default to string.
 * With two strings, fullUrl is the resolved URL string and every navigation method is available.
 * When either is a RegExp, fullUrl is a UrlMatcher (the base is matched against the URL's origin,
 * the path against the rest), `goto()` without a target is unavailable, and on a RegExp baseUrl
 * `goto(target)` accepts only absolute URLs.
 *
 * `storage` names the session storage schema (codecs by key) the page object passes to its
 * `sessionStorage` helper, so `set`, `get` and `seed` are typed per key. It travels in this options
 * bag rather than in a generic of its own because generics cannot be skipped: a subclass with a
 * schema would otherwise have to spell out the URL defaults.
 */
export type PageObjectTypeOptions = {
	baseUrlType?: string | RegExp;
	urlPathType?: string | RegExp;
	storage?: SessionStorageSchema;
};

export type BaseUrlTypeFromOptions<T extends PageObjectTypeOptions> = T extends { baseUrlType: RegExp }
	? RegExp
	: string;
export type UrlPathTypeFromOptions<T extends PageObjectTypeOptions> = T extends { urlPathType: RegExp }
	? RegExp
	: string;
export type FullUrlTypeFromOptions<T extends PageObjectTypeOptions> = T extends
	| { baseUrlType: RegExp }
	| { urlPathType: RegExp }
	? UrlMatcher
	: string;
export type StorageTypeFromOptions<T extends PageObjectTypeOptions> = T extends {
	storage: infer S extends SessionStorageSchema;
}
	? S
	: Record<never, never>;

/**
 * The options of the `PageObject` constructor, for a domain base class that forwards them. `Options` is the
 * page object's `PageObjectTypeOptions`, which types the session storage schema.
 */
export type PageObjectOptions<Options extends PageObjectTypeOptions = { baseUrlType: string; urlPathType: string }> = {
	label?: string;
	navOptions?: NavigationOptions;
	sessionStorage?: { schema?: StorageTypeFromOptions<Options> };
	/**
	 * Registry options. `strictChains: true` makes the automatic `verify()` require every ancestor of
	 * every registered path to be registered as well; set it once in a domain base class.
	 */
	locators?: LocatorRegistryOptions;
};

/**
 * Base class for page objects. `defineLocators()` does not run inside this constructor, where the
 * subclass has not stored anything yet: it runs, followed by `verify()`, right after the code that
 * called `new` has finished (a check scheduled as the constructor's last statement), or at the first
 * locator call if that comes earlier, once per instance. A registry mistake is reported with the
 * page object's label and the original error as `cause`; reported by the scheduled check, its stack
 * points at the construction site.
 */
export abstract class PageObject<
	LocatorSchemaPathType extends string,
	Options extends PageObjectTypeOptions = { baseUrlType: string; urlPathType: string },
> {
	readonly page: Page;
	readonly baseUrl: BaseUrlTypeFromOptions<Options>;
	readonly urlPath: UrlPathTypeFromOptions<Options>;
	readonly fullUrl: FullUrlTypeFromOptions<Options>;
	readonly label: string;
	readonly sessionStorage: SessionStorage<StorageTypeFromOptions<Options>>;
	public readonly navigation: NavigationFor<BaseUrlTypeFromOptions<Options>, FullUrlTypeFromOptions<Options>>;
	protected readonly locatorRegistry: LocatorRegistry<LocatorSchemaPathType>;
	public readonly add: AddAccessor<LocatorSchemaPathType>;
	public readonly getLocator: GetLocatorAccessor<LocatorSchemaPathType>;
	public readonly getLocatorSchema: GetLocatorSchemaAccessor<LocatorSchemaPathType>;
	public readonly getNestedLocator: GetNestedLocatorAccessor<LocatorSchemaPathType>;
	// ECMAScript-private, so that no name is reserved in subclasses
	#locators: "pending" | "defining" | "defined" | { failure: Error } = "pending";

	protected constructor(
		page: Page,
		baseUrl: BaseUrlTypeFromOptions<Options>,
		urlPath: UrlPathTypeFromOptions<Options>,
		options?: PageObjectOptions<Options>,
	) {
		this.page = page;
		const label = options?.label ?? this.constructor.name;
		this.label = label;
		// a value from an unset variable is neither: it would build a page object that never matches
		assertUrlPart("baseUrl", baseUrl, label);
		assertUrlPart("urlPath", urlPath, label);
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
			createRegistryWithAccessors<LocatorSchemaPathType>(page, { strictChains: options?.locators?.strictChains });
		const define = () => this.#defineLocatorsOnce(registry);
		const first = <F extends (...args: never[]) => unknown>(fn: F): F =>
			((...args: Parameters<F>) => {
				define();
				return fn(...args);
			}) as F;
		// the registry as subclasses see it: every method defines the locators first, so direct use is covered too
		this.locatorRegistry = {
			add: first(add),
			createReusable: registry.createReusable,
			getLocator: first(getLocator),
			getLocatorSchema: first(getLocatorSchema),
			getNestedLocator: first(getNestedLocator),
			verify: () => {
				// a first call defines and verifies once, not twice
				if (!define()) {
					registry.verify();
				}
			},
		};
		this.add = this.locatorRegistry.add;
		this.getLocator = this.locatorRegistry.getLocator;
		this.getLocatorSchema = this.locatorRegistry.getLocatorSchema;
		this.getNestedLocator = this.locatorRegistry.getNestedLocator;
		this.sessionStorage = new SessionStorage<StorageTypeFromOptions<Options>>(page, {
			label,
			origin: typeof baseUrl === "string" ? new URL(baseUrl).origin : undefined,
			schema: options?.sessionStorage?.schema,
		});
		this.navigation = createNavigation(
			this.page,
			this.baseUrl,
			this.urlPath,
			this.fullUrl,
			this.label,
			() => this.pageActionsToPerformAfterNavigation(),
			options?.navOptions,
		);

		// last, after everything above that can throw: define and verify once the code that called `new` is done
		const site = captureCallSite(PageObject);
		queueMicrotask(() => {
			if (this.#locators !== "pending") {
				return;
			}
			try {
				define();
			} catch (error) {
				throw atCallSite(error as Error, site);
			}
		});
	}

	/** Runs `defineLocators()` and `verify()` unless they ran or are running; returns whether they ran now. */
	#defineLocatorsOnce(registry: LocatorRegistry<LocatorSchemaPathType>): boolean {
		if (this.#locators === "defined" || this.#locators === "defining") {
			return false;
		}
		if (typeof this.#locators === "object") {
			throw this.#locators.failure;
		}
		this.#locators = "defining";
		let step: "define" | "verify" = "define";
		try {
			this.defineLocators();
			step = "verify";
			registry.verify();
			this.#locators = "defined";
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const failure = new Error(
				step === "define" ? `${this.label}: defineLocators() failed: ${message}` : `${this.label}: ${message}`,
				{ cause: error },
			);
			this.#locators = { failure };
			throw failure;
		}
	}

	/**
	 * Registers the page object's locators. Runs once, after the page object is constructed, so it
	 * may read constructor arguments, fields and constructor-body assignments.
	 */
	protected abstract defineLocators(): void;

	/**
	 * Actions run after `goto()` without a target and after `expectThisPage()`. Called each time they
	 * run, so it may read the page object's current state; none by default. `null` means none, as `[]`.
	 */
	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}
}
