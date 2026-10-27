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
 * storage schema. A RegExp in either part makes `fullUrl` a `UrlMatcher`
 * (https://dyhex.github.io/POMWright/docs/urls-and-navigation/#pages-whose-url-varies).
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

/** A value `await` would wait for: an object or a function with a `then` method. */
const isThenable = (value: unknown): value is PromiseLike<unknown> =>
	(typeof value === "object" || typeof value === "function") &&
	value !== null &&
	typeof (value as { then?: unknown }).then === "function";

/**
 * The base class of a page object: binds a Playwright `Page` to a locator registry, a navigation helper built from the
 * page object's URL, and a session storage helper for its origin. A subclass names its paths in `Paths`, calls the
 * constructor with its URL, and registers its locators in `defineLocators()`.
 *
 * `defineLocators()` runs once, followed by a check of every registered path, right after the code that called `new`
 * has finished, or at the first locator call if that comes earlier. A mistake fails there, labelled with the page
 * object's name.
 *
 * @typeParam LocatorSchemaPathType - `Paths`: the union of the page object's locator paths, checked against the path
 * rules at compile time and at runtime (https://dyhex.github.io/POMWright/docs/locator-paths/#the-rules-of-a-path).
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
	/**
	 * The Playwright page the page object was constructed with.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#page
	 */
	readonly page: Page;
	/**
	 * The `baseUrl` the page object was constructed with: an origin string, or a RegExp tested against the origin.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#baseurl
	 */
	readonly baseUrl: BaseUrlTypeFromOptions<Options>;
	/**
	 * The `urlPath` the page object was constructed with: `""`, a path string, or a RegExp tested against the rest.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#urlpath
	 */
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
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#fullurl
	 */
	readonly fullUrl: FullUrlTypeFromOptions<Options>;
	/**
	 * The name in the page object's step titles and error messages: the `label` option, or the class name.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#label
	 */
	readonly label: string;
	/**
	 * The session storage helper, labelled with `label` and typed by the `sessionStorage.schema` option. With a string
	 * `baseUrl` it touches only that origin's storage, and `seed()` needs no origin.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#sessionstorage
	 */
	readonly sessionStorage: SessionStorage<StorageTypeFromOptions<Options>>;
	/**
	 * The navigation helper: `goto()` to this page, `goto(target)` to a URL resolved against `baseUrl`,
	 * `expectThisPage()` and `expectAnotherPage()`. `goto()` without a target exists only when `fullUrl` is a string.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#navigation
	 */
	public readonly navigation: NavigationFor<BaseUrlTypeFromOptions<Options>, FullUrlTypeFromOptions<Options>>;
	/**
	 * The page object's registry, for code that takes one, such as a locator module:
	 * `defineLocators(this.locatorRegistry)`. Every method except `createReusable` runs `defineLocators()` first if it
	 * has not run yet.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#locatorregistry
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
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#add
	 */
	public readonly add: AddAccessor<LocatorSchemaPathType>;
	/**
	 * Resolves the locator registered for a path alone, with its own steps and without its ancestors: for chains you
	 * build yourself, for filters and for every match on the page at once. Act on one element with `getNestedLocator`.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#getlocator
	 */
	public readonly getLocator: GetLocatorAccessor<LocatorSchemaPathType>;
	/**
	 * Starts a query of a path: a private copy of its chain to change for one use (`filter`, `nth`, `update`, `replace`,
	 * `skip`, …) and then resolve. The registry never changes.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#getlocatorschema
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
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#getnestedlocator
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
	 * @param urlPath The page's path: `""` for the origin itself, a string that starts with exactly one `/` and stays on
	 * the base's origin, or a RegExp tested against the rest of the URL, path, query and hash (declare
	 * `urlPathType: RegExp` in `Options`).
	 * @param options Optional settings.
	 * @param options.label The name in step titles and error messages. Defaults to the class name.
	 * @param options.navOptions Defaults for every navigation method (`waitUntil`, `timeout`); a call's own options win.
	 * @param options.sessionStorage `{ schema }`: the codecs of the session storage keys that hold structured values.
	 * @param options.locators `{ strictChains }`: `true` makes the registry check require every ancestor of every path
	 * to be registered.
	 * @throws When a URL part is not what it must be, for example
	 * `LoginPage: urlPath must be "" or start with exactly one "/"; received "login".`
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#new-pageobject
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
			assertUrlPath(urlPath, baseUrl, label);
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

		// last, after everything above that can throw: define and verify once the code that called `new` is done. The site
		// is cut at the class the code constructed, so it starts at the `new` line, not at a base class's `super(…)`
		const site = captureCallSite(new.target);
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
		let returned: unknown;
		try {
			returned = this.defineLocators();
			if (!isThenable(returned)) {
				step = "verify";
				registry.verify();
				this.#locators = "defined";
				return true;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const failure = new Error(
				step === "define" ? `${this.label}: defineLocators() failed: ${message}` : `${this.label}: ${message}`,
				{ cause: error },
			);
			this.#locators = { failure };
			throw failure;
		}
		// an async definition would be verified before the rest of it ran, and an error after its first await would escape
		// unlabelled; its own rejection is handled here, since the failure below already reports it
		returned.then(undefined, () => {});
		const failure = new Error(
			`${this.label}: defineLocators() must register its locators synchronously; it returned a Promise. Read what it needs in the constructor or a fixture, and pass it in.`,
		);
		this.#locators = { failure };
		throw failure;
	}

	/**
	 * Registers the page object's locators with `this.add(path)`. Every page object implements it. Runs once, right after
	 * the constructor, so it can use the subclass's constructor arguments and fields; the registry is verified after it,
	 * and an error in either is labelled with the page object (`LoginPage: defineLocators() failed: …`) and thrown again
	 * by every later locator call. It registers synchronously: read what it needs in the constructor or a fixture.
	 *
	 * @throws When it returns a Promise, as an `async` method does: `LoginPage: defineLocators() must register its locators
	 * synchronously; it returned a Promise. Read what it needs in the constructor or a fixture, and pass it in.`
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#definelocators
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
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-pageobject/#pageactionstoperformafternavigation
	 */
	protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
		return [];
	}
}
