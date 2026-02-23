import { expect, type Page, test } from "@playwright/test";

type WaitUntil = NonNullable<Parameters<Page["goto"]>[1]>["waitUntil"];
type State = NonNullable<Parameters<Page["waitForLoadState"]>[0]>;

const DEFAULT_WAIT_UNTIL: WaitUntil = "load";
const DEFAULT_LOAD_STATE: State = "load";

export type NavigationOptions = {
	waitUntil?: WaitUntil;
	waitForLoadState?: State;
};

export interface NavigationString {
	goto(urlPathOrUrl: string, options?: NavigationOptions): Promise<void>;
	gotoThisPage(options?: NavigationOptions): Promise<void>;
	expectThisPage(options?: NavigationOptions): Promise<void>;
	expectAnotherPage(options?: NavigationOptions): Promise<void>;
}

export interface NavigationRegExp {
	expectThisPage(options?: NavigationOptions): Promise<void>;
	expectAnotherPage(options?: NavigationOptions): Promise<void>;
}

export type ExtractNavigationType<FullUrlType> = FullUrlType extends RegExp ? NavigationRegExp : NavigationString;

class Navigation {
	private pageActionsToPerform: (() => Promise<void>)[];
	private defaultOptions?: NavigationOptions;

	constructor(
		private page: Page,
		private baseUrl: string | RegExp,
		private urlPath: string | RegExp,
		private fullUrl: string | RegExp,
		private label: string,
		actions: (() => Promise<void>)[] | null = null,
		defaultOptions?: NavigationOptions,
	) {
		this.pageActionsToPerform = actions ?? [];
		this.defaultOptions = defaultOptions;
	}

	private resolveWaitUntil(options?: NavigationOptions) {
		return options?.waitUntil ?? this.defaultOptions?.waitUntil ?? DEFAULT_WAIT_UNTIL;
	}

	private resolveWaitForLoadState(options?: NavigationOptions) {
		return options?.waitForLoadState ?? this.defaultOptions?.waitForLoadState ?? DEFAULT_LOAD_STATE;
	}

	private async executeActions() {
		for (const action of this.pageActionsToPerform) {
			await action();
		}
	}

	/**
	 * Navigate to a provided URL or URL path. If the input starts with "/", the POC's baseUrl is used as a prefix.
	 * Available only when baseUrl and urlPath are strings.
	 */
	public async goto(urlPathOrUrl: string, options?: NavigationOptions) {
		const waitUntil = this.resolveWaitUntil(options);
		if (typeof this.baseUrl !== "string" || typeof this.urlPath !== "string") {
			throw new Error("goto() is not supported when baseUrl or urlPath is a RegExp.");
		}

		await test.step(`${this.label}: Navigate to the provided URL or URL Path`, async () => {
			const targetUrl = urlPathOrUrl.startsWith("/") ? `${this.baseUrl}${urlPathOrUrl}` : urlPathOrUrl;
			await this.page.goto(targetUrl, { waitUntil });
		});
	}

	/**
	 * Navigate to this page's fullUrl and run any post-navigation actions.
	 * Available only when fullUrl is a string.
	 */
	public async gotoThisPage(options?: NavigationOptions) {
		if (typeof this.fullUrl !== "string") {
			throw new Error("gotoThisPage() is not supported when fullUrl is a RegExp.");
		}
		const waitUntil = this.resolveWaitUntil(options);
		const fullUrl = this.fullUrl;

		await test.step(`${this.label}: Navigate to this Page`, async () => {
			await this.page.goto(fullUrl, { waitUntil });
			await this.executeActions();
		});
	}

	/**
	 * Expect to be on this page. Works with both string and RegExp fullUrl values.
	 * Uses waitUntil from navigation options when waiting for URL.
	 */
	public async expectThisPage(options?: NavigationOptions) {
		const waitUntil = this.resolveWaitUntil(options);
		await test.step(`${this.label}: Expect this Page`, async () => {
			await this.page.waitForURL(this.fullUrl, { waitUntil });

			await expect(async () => {
				if (this.fullUrl instanceof RegExp) {
					expect(this.page.url(), `expected '${this.fullUrl}', found '${this.page.url()}'`).toMatch(this.fullUrl);
				} else {
					expect(this.page.url(), `expected '${this.fullUrl}', found '${this.page.url()}'`).toBe(this.fullUrl);
				}
			}).toPass();

			await this.executeActions();
		});
	}

	/**
	 * Expect to be on any other page (i.e. not this page).
	 * Uses waitForLoadState from navigation options before validating URL.
	 */
	public async expectAnotherPage(options?: NavigationOptions) {
		const waitForLoadState = this.resolveWaitForLoadState(options);
		await test.step(`${this.label}: Expect any other Page`, async () => {
			await this.page.waitForLoadState(waitForLoadState);

			if (this.fullUrl instanceof RegExp) {
				await expect
					.poll(async () => this.page.url(), {
						message: `expected url to not match '${this.fullUrl}'`,
					})
					.not.toMatch(this.fullUrl);
			} else {
				await expect
					.poll(async () => this.page.url(), {
						message: `expected url to not be '${this.fullUrl}', found '${this.page.url()}'`,
					})
					.not.toBe(this.fullUrl);
			}
		});
	}
}

/**
 * Factory to create a navigation helper. The returned type is narrowed based on the fullUrl type.
 */
export function createNavigation<FullUrlType extends string | RegExp>(
	page: Page,
	baseUrl: string | RegExp,
	urlPath: string | RegExp,
	fullUrl: FullUrlType,
	label: string,
	actions: (() => Promise<void>)[] | null = null,
	defaultOptions?: NavigationOptions,
): ExtractNavigationType<FullUrlType> {
	const navigation = new Navigation(page, baseUrl, urlPath, fullUrl, label, actions, defaultOptions);
	return navigation as ExtractNavigationType<FullUrlType>;
}
