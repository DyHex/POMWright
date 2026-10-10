import { type Page, test } from "@playwright/test";
import { createUrlMatcher, isAbsoluteUrl, resolveUrl, type UrlMatcher } from "./url";

type WaitUntil = NonNullable<Parameters<Page["goto"]>[1]>["waitUntil"];

/** A URL with a scheme; the only `goto` target accepted when the page object's `baseUrl` is a RegExp. */
export type AbsoluteUrl = `${string}:${string}`;

/**
 * Options for every navigation method. Each resolves per call, then from the page object's
 * `navOptions`, then to Playwright's own default: `waitUntil` to `"load"`, `timeout` to the
 * project's `use.navigationTimeout`. POMWright adds no default of its own.
 */
export type NavigationOptions = {
	waitUntil?: WaitUntil;
	timeout?: number;
};

/** Options for the two this-page forms, `goto()` without a target and `expectThisPage()`. */
export type ThisPageOptions = NavigationOptions & {
	/** Run `pageActionsToPerformAfterNavigation()` afterwards. Defaults to `true`. */
	runPostNavigationActions?: boolean;
};

type GotoTarget<BaseUrl> = BaseUrl extends string ? string : AbsoluteUrl;

/**
 * The navigation API of a page object, narrowed by its URL types: `goto()` without a target exists
 * only when `fullUrl` is a string, and `goto(target)` takes any string on a string `baseUrl` but only
 * an absolute URL on a RegExp `baseUrl`. `expectThisPage` and `expectAnotherPage` always exist.
 */
export type NavigationFor<BaseUrl, FullUrl> = {
	expectThisPage(options?: ThisPageOptions): Promise<void>;
	expectAnotherPage(options?: NavigationOptions): Promise<void>;
	goto(target: GotoTarget<BaseUrl>, options?: NavigationOptions): Promise<void>;
} & (FullUrl extends string ? { goto(options?: ThisPageOptions): Promise<void> } : object);

type GotoArguments = [options?: ThisPageOptions] | [target: string, options?: NavigationOptions];

class Navigation {
	private readonly matcher: UrlMatcher;
	private readonly actions: (() => Promise<void>)[];

	constructor(
		private readonly page: Page,
		private readonly baseUrl: string | RegExp,
		urlPath: string | RegExp,
		private readonly fullUrl: string | UrlMatcher,
		private readonly label: string,
		actions: (() => Promise<void>)[] | null,
		private readonly defaultOptions?: NavigationOptions,
	) {
		this.matcher = typeof fullUrl === "string" ? createUrlMatcher(baseUrl, urlPath) : fullUrl;
		this.actions = actions ?? [];
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
		for (const action of this.actions) {
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
			return resolveUrl(input, this.baseUrl);
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
		const [first, second] = args;

		if (typeof first !== "string") {
			if (typeof this.fullUrl !== "string") {
				throw new Error(
					`${this.label}: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an absolute URL instead.`,
				);
			}
			const fullUrl = this.fullUrl;
			const options = first;
			await test.step(`${this.label}: Navigate to this Page`, async () => {
				await this.page.goto(fullUrl, {
					waitUntil: this.resolveWaitUntil(options),
					timeout: this.resolveTimeout(options),
				});
				if (options?.runPostNavigationActions !== false) {
					await this.executeActions();
				}
			});
			return;
		}

		const target = this.resolveTarget(first);
		await test.step(`${this.label}: Navigate to ${target}`, async () => {
			await this.page.goto(target, {
				waitUntil: this.resolveWaitUntil(second),
				timeout: this.resolveTimeout(second),
			});
		});
	}

	/** Wait until the browser is on this page (URL and load state), then run the post-navigation actions. */
	public async expectThisPage(options?: ThisPageOptions): Promise<void> {
		await test.step(`${this.label}: Expect this Page`, async () => {
			await this.waitForUrl(this.matcher, `expected URL ${this.describeFullUrl()}`, options);
			if (options?.runPostNavigationActions !== false) {
				await this.executeActions();
			}
		});
	}

	/**
	 * Wait until the browser has left this page (URL and load state of the page it moved to), then
	 * fail at once if the URL is back on this page, which catches a redirect that bounced back.
	 */
	public async expectAnotherPage(options?: NavigationOptions): Promise<void> {
		await test.step(`${this.label}: Expect any other Page`, async () => {
			await this.waitForUrl((url) => !this.matcher(url), `expected to have left ${this.describeFullUrl()}`, options);
			if (this.matcher(new URL(this.page.url()))) {
				throw new Error(
					`${this.label}: left ${this.describeFullUrl()} but returned to it; found ${JSON.stringify(this.page.url())}`,
				);
			}
		});
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
	actions: (() => Promise<void>)[] | null = null,
	defaultOptions?: NavigationOptions,
): NavigationFor<BaseUrl, FullUrl> {
	const navigation = new Navigation(page, baseUrl, urlPath, fullUrl, label, actions, defaultOptions);
	return navigation as unknown as NavigationFor<BaseUrl, FullUrl>;
}
