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
 * The second type argument of `PageObject`, types only: whether `baseUrl` and `urlPath` are RegExps, and the session
 * storage schema. With two string parts, `fullUrl` is a string and every navigation method exists. With a RegExp in
 * either part, `fullUrl` is a `UrlMatcher`, `goto()` without a target does not exist, and on a RegExp `baseUrl`
 * `goto(target)` takes an absolute URL only.
 *
 * @example
 * ```ts
 * const orderStorage = { cart: json<{ items: string[] }>() };
 * class OrderPage extends PageObject<Paths, { urlPathType: RegExp; storage: typeof orderStorage }> {}
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/types/#pageobjecttypeoptions
 */
export type PageObjectTypeOptions = {
	/** `RegExp` when the page object's `baseUrl` is a RegExp tested against the origin. Defaults to `string`. */
	baseUrlType?: string | RegExp;
	/** `RegExp` when the page object's `urlPath` is a RegExp tested against the rest of the URL. Defaults to `string`. */
	urlPathType?: string | RegExp;
	/**
	 * The type of the session storage schema, `typeof schema`, so `sessionStorage.set`, `get` and `seed` are typed per
	 * key; the schema itself goes in the constructor's `sessionStorage` option.
	 */
	storage?: SessionStorageSchema;
};

/**
 * The type of `baseUrl` for a `PageObjectTypeOptions`: `RegExp` when `baseUrlType` is `RegExp`, otherwise `string`.
 *
 * @see https://dyhex.github.io/POMWright/api/types/#baseurltypefromoptions
 */
export type BaseUrlTypeFromOptions<T extends PageObjectTypeOptions> = T extends { baseUrlType: RegExp }
	? RegExp
	: string;
/**
 * The type of `urlPath` for a `PageObjectTypeOptions`: `RegExp` when `urlPathType` is `RegExp`, otherwise `string`.
 *
 * @see https://dyhex.github.io/POMWright/api/types/#urlpathtypefromoptions
 */
export type UrlPathTypeFromOptions<T extends PageObjectTypeOptions> = T extends { urlPathType: RegExp }
	? RegExp
	: string;
/**
 * The type of `fullUrl` for a `PageObjectTypeOptions`: `UrlMatcher` when either part is a RegExp, otherwise `string`.
 * A type of your own that looks at `fullUrl` tests it against `UrlMatcher`, not `RegExp`.
 *
 * @see https://dyhex.github.io/POMWright/api/types/#fullurltypefromoptions
 */
export type FullUrlTypeFromOptions<T extends PageObjectTypeOptions> = T extends
	| { baseUrlType: RegExp }
	| { urlPathType: RegExp }
	? UrlMatcher
	: string;
/**
 * The session storage schema type for a `PageObjectTypeOptions`: its `storage`, or no declared keys.
 *
 * @see https://dyhex.github.io/POMWright/api/types/#storagetypefromoptions
 */
export type StorageTypeFromOptions<T extends PageObjectTypeOptions> = T extends {
	storage: infer S extends SessionStorageSchema;
}
	? S
	: Record<never, never>;

/**
 * The options of the `PageObject` constructor, for a base class of your own that forwards them. `Options` is the page
 * object's `PageObjectTypeOptions`, which types the session storage schema.
 *
 * @example
 * ```ts
 * abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
 *   protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
 *     super(page, "https://shop.example", urlPath, { ...options, locators: { strictChains: true } });
 *   }
 * }
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/types/#pageobjectoptions
 */
export type PageObjectOptions<Options extends PageObjectTypeOptions = { baseUrlType: string; urlPathType: string }> = {
	/** The name in the page object's step titles and error messages. Defaults to the class name. */
	label?: string;
	/** Defaults for every navigation method of `navigation` (`waitUntil`, `timeout`); a call's own options win. */
	navOptions?: NavigationOptions;
	/** `{ schema }`: the codecs of the session storage keys that hold structured values, typed by `Options["storage"]`. */
	sessionStorage?: { schema?: StorageTypeFromOptions<Options> };
	/**
	 * The registry's options: `strictChains: true` makes the check after `defineLocators()` require every ancestor of
	 * every registered path to be registered as well; set it once in a base class of your own.
	 */
	locators?: LocatorRegistryOptions;
};

/**
 * The base class of a page object: binds a Playwright `Page` to a locator registry, a navigation helper built from the
 * page object's URL, and a session storage helper for its origin. A subclass names its paths in `Paths`, calls the
 * constructor with its URL, and registers its locators in `defineLocators()`.
 *
 * `defineLocators()` runs once, followed by a check of every registered path, right after the code that called `new`
 * has finished, or at the first locator call if that comes earlier. A mistake fails there, labelled with the page
 * object's name.
 *
 * @typeParam LocatorSchemaPathType - `Paths`: the union of the page object's locator paths.
 * @typeParam Options - `PageObjectTypeOptions`: whether `baseUrl` and `urlPath` are RegExps, and the session storage
 * schema. Types only.
 *
 * @example
 * ```ts
 * type Paths = "main" | "main.button@login";
 *
 * export class LoginPage extends PageObject<Paths> {
 *   constructor(page: Page) {
 *     super(page, "https://shop.example", "/login");
 *   }
 *
 *   protected defineLocators(): void {
 *     this.add("main").locator("main");
 *     this.add("main.button@login").getByRole("button", { name: "Log in" });
 *   }
 * }
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-pageobject/
 */
export abstract class PageObject<
	LocatorSchemaPathType extends string,
	Options extends PageObjectTypeOptions = { baseUrlType: string; urlPathType: string },
> {
	/** The Playwright page the page object was constructed with. */
	readonly page: Page;
	/** The `baseUrl` the page object was constructed with: an origin string, or a RegExp tested against the origin. */
	readonly baseUrl: BaseUrlTypeFromOptions<Options>;
	/** The `urlPath` the page object was constructed with: `""`, a path string, or a RegExp tested against the rest. */
	readonly urlPath: UrlPathTypeFromOptions<Options>;
	/**
	 * The page object's URL. For a string `baseUrl` and `urlPath` it is `new URL(urlPath, baseUrl).href`, the form the
	 * browser reports (`https://shop.example/` for an empty path). When either part is a RegExp it is a `UrlMatcher`,
	 * which Playwright's `waitForURL`, `toHaveURL` and `route` take as a URL predicate.
	 *
	 * @example
	 * ```ts
	 * await expect(page).toHaveURL(loginPage.fullUrl);
	 * ```
	 */
	readonly fullUrl: FullUrlTypeFromOptions<Options>;
	/** The name in the page object's step titles and error messages: the `label` option, or the class name. */
	readonly label: string;
	/**
	 * The session storage helper, labelled with `label` and typed by the `sessionStorage.schema` option. With a string
	 * `baseUrl` it touches only that origin's storage, and `seed()` needs no origin.
	 */
	readonly sessionStorage: SessionStorage<StorageTypeFromOptions<Options>>;
	/**
	 * The navigation helper: `goto()` to this page, `goto(target)` to a URL resolved against `baseUrl`,
	 * `expectThisPage()` and `expectAnotherPage()`. `goto()` without a target exists only when `fullUrl` is a string.
	 */
	public readonly navigation: NavigationFor<BaseUrlTypeFromOptions<Options>, FullUrlTypeFromOptions<Options>>;
	/**
	 * The page object's registry, for code that takes one, such as a locator module:
	 * `defineLocators(this.locatorRegistry)`. Every method except `createReusable` runs `defineLocators()` first if it
	 * has not run yet.
	 */
	protected readonly locatorRegistry: LocatorRegistry<LocatorSchemaPathType>;
	/**
	 * Registers a locator for a path: `this.add(path)` followed by one of the ten locator methods, inside
	 * `defineLocators()`.
	 *
	 * @example
	 * ```ts
	 * this.add("main.button@login").getByRole("button", { name: "Log in" });
	 * ```
	 */
	public readonly add: AddAccessor<LocatorSchemaPathType>;
	/**
	 * Resolves the locator registered for a path alone, with its own steps and without its ancestors: for chains you
	 * build yourself, for filters and for every match on the page at once. Act on one element with `getNestedLocator`.
	 */
	public readonly getLocator: GetLocatorAccessor<LocatorSchemaPathType>;
	/**
	 * Starts a query of a path: a private copy of its chain to change for one use (`filter`, `nth`, `update`, `replace`,
	 * `skip`, …) and then resolve. The registry never changes.
	 */
	public readonly getLocatorSchema: GetLocatorSchemaAccessor<LocatorSchemaPathType>;
	/**
	 * Resolves a path to the chain of its registered segments, each with its steps, described by the path: the locator
	 * to act on and assert against.
	 *
	 * @example
	 * ```ts
	 * await this.getNestedLocator("main.button@login").click();
	 * ```
	 */
	public readonly getNestedLocator: GetNestedLocatorAccessor<LocatorSchemaPathType>;
	// ECMAScript-private, so that no name is reserved in subclasses
	#locators: "pending" | "defining" | "defined" | { failure: Error } = "pending";

	/**
	 * Called from the subclass constructor as `super(...)`. Checks the URL parts, creates the registry and the helpers,
	 * and schedules `defineLocators()`; it does not call `defineLocators()` itself.
	 *
	 * @param page The page the page object works on.
	 * @param baseUrl The origin: a string `scheme://host[:port]` with nothing after it (a trailing slash is allowed), or
	 * a RegExp tested against the URL's origin (declare `baseUrlType: RegExp` in `Options`).
	 * @param urlPath The page's path: `""` for the origin itself, a string that starts with exactly one `/`, or a RegExp
	 * tested against the rest of the URL, path, query and hash (declare `urlPathType: RegExp` in `Options`).
	 * @param options Optional settings.
	 * @param options.label The name in step titles and error messages. Defaults to the class name.
	 * @param options.navOptions Defaults for every navigation method (`waitUntil`, `timeout`); a call's own options win.
	 * @param options.sessionStorage `{ schema }`: the codecs of the session storage keys that hold structured values.
	 * @param options.locators `{ strictChains }`: `true` makes the registry check require every ancestor of every path
	 * to be registered.
	 * @throws When a URL part is not what it must be, for example
	 * `LoginPage: urlPath must be "" or start with exactly one "/"; received "login".`
	 */
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
	 * Registers the page object's locators with `this.add(path)`. Every page object implements it.
	 *
	 * Runs once: right after the code that called `new` has finished, or at the first locator call if that comes
	 * earlier, so it can use the subclass's constructor arguments, fields and constructor assignments. Every registered
	 * path is checked right after it. An error in either is thrown again by every later locator call, labelled
	 * (`LoginPage: defineLocators() failed: …`, `LoginPage: Locator registry verification failed for 1 of 2 paths: …`)
	 * with the original as `cause` and the line that constructed the page object in its stack.
	 *
	 * @example
	 * ```ts
	 * protected defineLocators(): void {
	 *   this.add("main").locator("main");
	 *   this.add("main.button@login").getByRole("button", { name: "Log in" });
	 * }
	 * ```
	 */
	protected abstract defineLocators(): void;

	/**
	 * Returns the actions to run, in order, after `navigation.goto()` without a target and after
	 * `navigation.expectThisPage()`, such as waiting for a spinner to go away. Called each time they run, so it can read
	 * the page object's current state. Optional: the default returns `[]`, and `null` also means no actions.
	 * `{ runPostNavigationActions: false }` skips them for one call.
	 *
	 * @returns The actions, each a function that returns a Promise; `[]` or `null` for none.
	 *
	 * @example
	 * ```ts
	 * protected pageActionsToPerformAfterNavigation() {
	 *   return [
	 *     async () => {
	 *       await expect(this.getNestedLocator("main.spinner")).toBeHidden();
	 *     },
	 *   ];
	 * }
	 * ```
	 */
	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}
}
