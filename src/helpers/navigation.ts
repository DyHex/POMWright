import { type Page, test } from "@playwright/test";
import { callerLocation, type StepLocation } from "./callSite";
import { createUrlMatcher, isAbsoluteUrl, resolveUrl, type UrlMatcher } from "./url";

type WaitUntil = NonNullable<Parameters<Page["goto"]>[1]>["waitUntil"];

/**
 * A boxed step, reported at the line that called the helper, as a `@step` row is, not inside POMWright: the location is
 * the caller's line, cut at the method the consumer called (`callerLocation` says why it is passed).
 */
const boxedAt = (location: StepLocation | undefined) => ({ box: true, location });

/** A URL with a scheme; the only `goto` target accepted when the page object's `baseUrl` is a RegExp. */
export type AbsoluteUrl = `${string}:${string}`;

/**
 * The options of every navigation method, and of a page object's `navOptions`. Each option comes from the call, then
 * from the page object's `navOptions`, then from Playwright; POMWright adds no default of its own.
 *
 * @see https://dyhex.github.io/POMWright/api/class-navigation/#navigationoptions
 */
export type NavigationOptions = {
	/**
	 * The load state to wait for, as Playwright's `page.goto()` and `page.waitForURL()` take it: `"load"`,
	 * `"domcontentloaded"`, `"networkidle"` or `"commit"`. Playwright's default is `"load"`.
	 */
	waitUntil?: WaitUntil;
	/** The limit of the navigation's one waiting call, in milliseconds. Defaults to the project's `navigationTimeout`. */
	timeout?: number;
};

/**
 * The options of the two this-page forms, `goto()` without a target and `expectThisPage()`: `NavigationOptions` and
 * `runPostNavigationActions`.
 *
 * @see https://dyhex.github.io/POMWright/api/class-navigation/#thispageoptions
 */
export type ThisPageOptions = NavigationOptions & {
	/**
	 * `false` skips the page object's `pageActionsToPerformAfterNavigation()` for this call. Defaults to `true`.
	 */
	runPostNavigationActions?: boolean;
};

type GotoTarget<BaseUrl> = BaseUrl extends string ? string : AbsoluteUrl;

/**
 * What every page object's navigation helper has, whatever its URL types; `Target` is what `goto(target)` takes. Typed
 * by the target, not by `BaseUrl` through `GotoTarget`, so TypeScript compares two helpers by their `goto` parameter:
 * a string base's helper, which takes any string, then fits where an absolute URL is all that is passed.
 */
type NavigationBase<Target extends string> = {
	/**
	 * Waits until the browser is on this page, with one `page.waitForURL`, then runs the actions of
	 * `pageActionsToPerformAfterNavigation()`.
	 *
	 * @param options `waitUntil` and `timeout`, each defaulting to the page object's `navOptions`, and
	 * `runPostNavigationActions`, which defaults to `true`.
	 * @throws When the URL does not match in time:
	 * `OrdersPage: expected URL "https://shop.example/orders"; found "https://shop.example/orders?tab=1" (…)`
	 *
	 * @example
	 * ```ts
	 * await ordersPage.navigation.expectThisPage();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-navigation/#expectthispage
	 */
	expectThisPage(options?: ThisPageOptions): Promise<void>;
	/**
	 * Waits until the browser has left this page, with one `page.waitForURL`, and fails if it came straight back.
	 *
	 * @param options `waitUntil` and `timeout`; each defaults to the page object's `navOptions`.
	 * @throws When the browser stays, or comes straight back:
	 * `OrdersPage: expected to have left "https://shop.example/orders"; found "https://shop.example/orders" (…)`,
	 * `OrdersPage: left "https://shop.example/orders" but returned to it; found "https://shop.example/orders"`
	 *
	 * @example
	 * ```ts
	 * await loginPage.navigation.expectAnotherPage();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-navigation/#expectanotherpage
	 */
	expectAnotherPage(options?: NavigationOptions): Promise<void>;
	// a property, not a method: TypeScript then compares it strictly, so a RegExp page's helper is not a string page's
	/**
	 * Navigates to a target with `page.goto`, resolved against the page object's `baseUrl` exactly as Playwright
	 * resolves a target against `baseURL` (`"/account"`, `"?tab=2"`, or an absolute URL). Never runs the page object's
	 * actions after navigation. Without a target, navigates to this page.
	 *
	 * @param target The URL or path. On a RegExp `baseUrl`, an absolute URL.
	 * @param options `waitUntil` and `timeout`, each defaulting to the page object's `navOptions` (without a target, also
	 * `runPostNavigationActions`, which defaults to `true`).
	 * @throws What `page.goto` throws; for a target that cannot be resolved against a string `baseUrl`:
	 * `LoginPage: goto("http://") cannot be resolved against baseUrl "https://shop.example"`; on a RegExp `baseUrl`, for
	 * a relative target (from JavaScript):
	 * `AccountPage: goto("/account") needs an absolute URL because baseUrl is a RegExp.`; for a first argument that is
	 * neither a string nor options, a `URL` object included (from JavaScript):
	 * `LoginPage: goto() takes a URL string or options; received a URL object; pass its href.`
	 *
	 * @example
	 * ```ts
	 * await loginPage.navigation.goto("/account");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-navigation/#goto
	 */
	goto: (target: Target, options?: NavigationOptions) => Promise<void>;
};

/**
 * A page object's navigation helper, `navigation`, narrowed by its URL types: `goto()` without a target exists only
 * when `fullUrl` is a string, and `goto(target)` takes any string on a string `baseUrl` but only an absolute URL on a
 * RegExp `baseUrl`. Each method is one Playwright call, shown as a step of the report at the line that called it. A
 * page object's helper is `NavigationFor<string, string>` for two string parts, `NavigationFor<string, UrlMatcher>` for
 * a RegExp path and `NavigationFor<RegExp, UrlMatcher>` for a RegExp base; a function that takes any page object's
 * helper types its parameter as the last.
 *
 * @example
 * ```ts
 * await loginPage.navigation.goto();
 * await loginPage.logIn("ada@shop.example", "correct horse");
 * await loginPage.navigation.expectAnotherPage();
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-navigation/#navigationfor
 */
export type NavigationFor<BaseUrl, FullUrl> = NavigationBase<GotoTarget<BaseUrl>> &
	(FullUrl extends string
		? {
				/**
				 * Navigates to this page, `fullUrl`, with `page.goto`, then runs the actions of
				 * `pageActionsToPerformAfterNavigation()`. Exists when `fullUrl` is a string.
				 *
				 * @param options `waitUntil` and `timeout`, each defaulting to the page object's `navOptions`, and
				 * `runPostNavigationActions`, which defaults to `true`.
				 * @throws What `page.goto` throws.
				 *
				 * @example
				 * ```ts
				 * await loginPage.navigation.goto();
				 * ```
				 *
				 * @see https://dyhex.github.io/POMWright/api/class-navigation/#goto
				 */
				goto: (options?: ThisPageOptions) => Promise<void>;
			}
		: object);

type GotoArguments = [options?: ThisPageOptions] | [target: string, options?: NavigationOptions];

/** Supplies the post-navigation actions; called each time they run, so it reads the page object's current state. */
type ActionsProvider = () => (() => Promise<void>)[] | null;

class Navigation {
	private readonly matcher: UrlMatcher;

	constructor(
		private readonly page: Page,
		private readonly baseUrl: string | RegExp,
		urlPath: string | RegExp,
		private readonly fullUrl: string | UrlMatcher,
		private readonly label: string,
		private readonly actions: ActionsProvider,
		private readonly defaultOptions?: NavigationOptions,
	) {
		this.matcher = typeof fullUrl === "string" ? createUrlMatcher(baseUrl, urlPath) : fullUrl;
	}

	private resolveWaitUntil(options?: NavigationOptions) {
		return options?.waitUntil ?? this.defaultOptions?.waitUntil;
	}

	private resolveTimeout(options?: NavigationOptions) {
		return options?.timeout ?? this.defaultOptions?.timeout;
	}

	private describeFullUrl() {
		return typeof this.fullUrl === "string" ? JSON.stringify(this.fullUrl) : String(this.fullUrl);
	}

	private async executeActions() {
		for (const action of this.actions() ?? []) {
			await action();
		}
	}

	/**
	 * One `page.waitForURL` call: Playwright waits for a navigation to a matching URL and the
	 * requested load state, or, when the URL already matches, for the load state of the current
	 * document. Its timeout error names only the load state, so it is rethrown with the page object,
	 * what was expected, and the URL found at failure time.
	 */
	private async waitForUrl(predicate: (url: URL) => boolean, what: string, options?: NavigationOptions) {
		try {
			await this.page.waitForURL(predicate, {
				waitUntil: this.resolveWaitUntil(options),
				timeout: this.resolveTimeout(options),
			});
		} catch (error) {
			const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
			throw new Error(`${this.label}: ${what}; found ${JSON.stringify(this.page.url())} (${detail})`, { cause: error });
		}
	}

	private resolveTarget(input: string): string {
		if (typeof this.baseUrl === "string") {
			try {
				return resolveUrl(input, this.baseUrl);
			} catch (error) {
				// labelled as every other navigation message; the URL parser's own error is the cause
				const cause = error instanceof Error && error.cause !== undefined ? error.cause : error;
				throw new Error(
					`${this.label}: goto(${JSON.stringify(input)}) cannot be resolved against baseUrl ${JSON.stringify(this.baseUrl)}`,
					{ cause },
				);
			}
		}
		if (isAbsoluteUrl(input)) {
			return input;
		}
		throw new Error(`${this.label}: goto(${JSON.stringify(input)}) needs an absolute URL because baseUrl is a RegExp.`);
	}

	/**
	 * Without a target: navigate to this page object's `fullUrl` and run the post-navigation actions
	 * (string `fullUrl` only). With a target: navigate there, resolving a relative target against the
	 * page object's `baseUrl` exactly as Playwright resolves against `use.baseURL`; never runs the
	 * actions.
	 */
	public async goto(...args: GotoArguments): Promise<void> {
		const location = callerLocation(Navigation.prototype.goto);
		const [first, second] = args;
		// as page.goto, which takes a URL string only: from JavaScript, a URL object is not this page's options. Any other
		// object is taken as the options, as page.goto takes any object as its options: a class instance works today
		const given: unknown = first;
		if (
			given !== undefined &&
			typeof given !== "string" &&
			(typeof given !== "object" || given === null || given instanceof URL)
		) {
			const received =
				given instanceof URL ? "a URL object; pass its href" : given === null ? "null" : `a ${typeof given}`;
			throw new Error(`${this.label}: goto() takes a URL string or options; received ${received}.`);
		}

		if (typeof first !== "string") {
			if (typeof this.fullUrl !== "string") {
				throw new Error(
					`${this.label}: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an absolute URL instead.`,
				);
			}
			const fullUrl = this.fullUrl;
			const options = first;
			await test.step(
				`${this.label}: Navigate to this Page`,
				async () => {
					await this.page.goto(fullUrl, {
						waitUntil: this.resolveWaitUntil(options),
						timeout: this.resolveTimeout(options),
					});
					if (options?.runPostNavigationActions !== false) {
						await this.executeActions();
					}
				},
				boxedAt(location),
			);
			return;
		}

		const target = this.resolveTarget(first);
		await test.step(
			`${this.label}: Navigate to ${target}`,
			async () => {
				await this.page.goto(target, {
					waitUntil: this.resolveWaitUntil(second),
					timeout: this.resolveTimeout(second),
				});
			},
			boxedAt(location),
		);
	}

	/** Wait until the browser is on this page (URL and load state), then run the post-navigation actions. */
	public async expectThisPage(options?: ThisPageOptions): Promise<void> {
		const location = callerLocation(Navigation.prototype.expectThisPage);
		await test.step(
			`${this.label}: Expect this Page`,
			async () => {
				await this.waitForUrl(this.matcher, `expected URL ${this.describeFullUrl()}`, options);
				if (options?.runPostNavigationActions !== false) {
					await this.executeActions();
				}
			},
			boxedAt(location),
		);
	}

	/**
	 * Wait until the browser has left this page (URL and load state of the page it moved to), then
	 * fail at once if the URL is back on this page, which catches a redirect that bounced back.
	 */
	public async expectAnotherPage(options?: NavigationOptions): Promise<void> {
		const location = callerLocation(Navigation.prototype.expectAnotherPage);
		await test.step(
			`${this.label}: Expect any other Page`,
			async () => {
				await this.waitForUrl((url) => !this.matcher(url), `expected to have left ${this.describeFullUrl()}`, options);
				if (this.matcher(new URL(this.page.url()))) {
					throw new Error(
						`${this.label}: left ${this.describeFullUrl()} but returned to it; found ${JSON.stringify(this.page.url())}`,
					);
				}
			},
			boxedAt(location),
		);
	}
}

/**
 * Factory for the navigation helper. The returned type is narrowed by the `baseUrl` and `fullUrl`
 * types, see {@link NavigationFor}.
 */
export function createNavigation<BaseUrl extends string | RegExp, FullUrl extends string | UrlMatcher>(
	page: Page,
	baseUrl: BaseUrl,
	urlPath: string | RegExp,
	fullUrl: FullUrl,
	label: string,
	actions: ActionsProvider = () => null,
	defaultOptions?: NavigationOptions,
): NavigationFor<BaseUrl, FullUrl> {
	const navigation = new Navigation(page, baseUrl, urlPath, fullUrl, label, actions, defaultOptions);
	return navigation as unknown as NavigationFor<BaseUrl, FullUrl>;
}
