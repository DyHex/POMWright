import type { Page } from "@playwright/test";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { BaseUrlTypeFromOptions, FullUrlTypeFromOptions, UrlPathTypeFromOptions } from "../pageObject";
import { createNavigation, type NavigationFor, type NavigationOptions } from "./navigation";
import { createUrlMatcher, type UrlMatcher } from "./url";

// Type-level contract. The function is never called; tsc checks it through vitest's typecheck mode,
// where an unused `@ts-expect-error` is a failing test.
declare const stringPage: NavigationFor<string, string>;
declare const regExpPathPage: NavigationFor<string, UrlMatcher>;
declare const regExpBasePage: NavigationFor<RegExp, UrlMatcher>;
declare const someString: string;
declare const page: Page;

const typeContract = () => {
	// string base, string path: every form
	void stringPage.goto();
	void stringPage.goto({ runPostNavigationActions: false, waitUntil: "commit", timeout: 1 });
	void stringPage.goto("/x");
	void stringPage.goto("https://other.example/x", { waitUntil: "domcontentloaded" });
	void stringPage.goto(someString);
	void stringPage.expectThisPage({ runPostNavigationActions: false });
	void stringPage.expectAnotherPage({ timeout: 1 });
	// @ts-expect-error the actions option exists only on the no-target form
	void stringPage.goto("/x", { runPostNavigationActions: false });
	// @ts-expect-error the 2.x waitForLoadState option is gone; use waitUntil
	void stringPage.expectAnotherPage({ waitForLoadState: "load" });

	// string base, RegExp path: no goto() without a target
	void regExpPathPage.goto("/x");
	void regExpPathPage.expectThisPage();
	// @ts-expect-error goto() without a target needs a string fullUrl
	void regExpPathPage.goto();
	// @ts-expect-error an options object alone is the no-target form
	void regExpPathPage.goto({ timeout: 1 });

	// RegExp base: only absolute targets
	void regExpBasePage.goto("https://a.example/x");
	void regExpBasePage.goto("about:blank");
	// @ts-expect-error a RegExp baseUrl accepts only absolute URLs
	void regExpBasePage.goto("/x");
	// @ts-expect-error a plain string is not provably absolute
	void regExpBasePage.goto(someString);
	// @ts-expect-error no goto() without a target
	void regExpBasePage.goto();

	// the 2.x waitForLoadState option is rejected as a page-object default too
	// @ts-expect-error the 2.x waitForLoadState option is gone; use waitUntil
	const staleDefaults: NavigationOptions = { waitForLoadState: "load" };
	void createNavigation(page, "https://app.example", "/x", "https://app.example/x", "Poc", () => null, staleDefaults);

	// fullUrl of a RegExp page is a UrlMatcher, not a RegExp
	const regExpPoc = { fullUrl: undefined as unknown as FullUrlTypeFromOptions<{ urlPathType: RegExp }> };
	// @ts-expect-error UrlMatcher is not assignable to RegExp
	const asRegExp: RegExp = regExpPoc.fullUrl;
	void asRegExp;
};
void typeContract;

describe("URL type aliases", () => {
	it("derive the parameter and fullUrl types from Options", () => {
		expectTypeOf<BaseUrlTypeFromOptions<{ baseUrlType: string; urlPathType: string }>>().toEqualTypeOf<string>();
		expectTypeOf<BaseUrlTypeFromOptions<{ baseUrlType: RegExp }>>().toEqualTypeOf<RegExp>();
		expectTypeOf<UrlPathTypeFromOptions<{ baseUrlType: string; urlPathType: string }>>().toEqualTypeOf<string>();
		expectTypeOf<UrlPathTypeFromOptions<{ urlPathType: RegExp }>>().toEqualTypeOf<RegExp>();
		expectTypeOf<FullUrlTypeFromOptions<{ baseUrlType: string; urlPathType: string }>>().toEqualTypeOf<string>();
		expectTypeOf<FullUrlTypeFromOptions<{ urlPathType: RegExp }>>().toEqualTypeOf<UrlMatcher>();
		expectTypeOf<FullUrlTypeFromOptions<{ baseUrlType: RegExp }>>().toEqualTypeOf<UrlMatcher>();
		expectTypeOf<FullUrlTypeFromOptions<{ baseUrlType: RegExp; urlPathType: RegExp }>>().toEqualTypeOf<UrlMatcher>();
	});
});

describe("createNavigation runtime guards", () => {
	// Only the guards that throw before any Playwright call are testable here; the navigation
	// behaviour itself is covered by the integration specs under test/.
	const fakePage = {} as Page;

	it("rejects goto() without a target on a RegExp fullUrl", async () => {
		const matcher = createUrlMatcher("https://app.example", /^\/account\/\d+$/);
		const navigation = createNavigation(
			fakePage,
			"https://app.example",
			/^\/account\/\d+$/,
			matcher,
			"AccountPage",
			() => null,
		);
		const untyped = navigation as unknown as { goto(): Promise<void> };
		await expect(untyped.goto()).rejects.toThrow(
			"AccountPage: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an absolute URL instead.",
		);
	});

	it("rejects, from JavaScript, a first argument that is neither a URL string nor options, as page.goto does", async () => {
		const navigation = createNavigation(
			fakePage,
			"https://app.example",
			"/login",
			"https://app.example/login",
			"LoginPage",
			() => null,
		);
		const untyped = navigation as unknown as { goto(first: unknown): Promise<void> };
		await expect(untyped.goto(new URL("https://help.example/faq"))).rejects.toThrow(
			"LoginPage: goto() takes a URL string or options; received a URL object; pass its href.",
		);
		await expect(untyped.goto(42)).rejects.toThrow(
			"LoginPage: goto() takes a URL string or options; received a number.",
		);
		await expect(untyped.goto(null)).rejects.toThrow("LoginPage: goto() takes a URL string or options; received null.");
	});

	it("names the page object when a target cannot be resolved against a string baseUrl, with the parser's error as cause", async () => {
		const navigation = createNavigation(
			fakePage,
			"https://shop.example",
			"/login",
			"https://shop.example/login",
			"LoginPage",
			() => null,
		);
		const error = await navigation.goto("http://").catch((thrown: unknown) => thrown);
		expect((error as Error).message).toBe(
			'LoginPage: goto("http://") cannot be resolved against baseUrl "https://shop.example"',
		);
		expect((error as Error).cause).toBeInstanceOf(TypeError);
	});

	it("rejects a non-absolute target on a RegExp baseUrl", async () => {
		const matcher = createUrlMatcher(/app\.example/, "/login");
		const navigation = createNavigation(fakePage, /app\.example/, "/login", matcher, "LoginPage", () => null);
		const untyped = navigation as unknown as { goto(target: string): Promise<void> };
		await expect(untyped.goto("/login")).rejects.toThrow(
			'LoginPage: goto("/login") needs an absolute URL because baseUrl is a RegExp.',
		);
	});
});

describe("a wait that times out", () => {
	// a stub page whose waitForURL rejects as Playwright's does; the harness waits on real pages ("expectThisPage and
	// expectAnotherPage name a late load state of the right URL", testNav.spec.ts)
	type Wait = {
		waitForUrl(
			predicate: (url: URL) => boolean,
			what: string,
			reached: (found: string) => string,
			options?: NavigationOptions,
		): Promise<void>;
	};
	const timeout = () =>
		Object.assign(new Error("page.waitForURL: Timeout 1000ms exceeded.\nCall log: …"), { name: "TimeoutError" });
	const waitOn = (url: string, failure: Error, options?: NavigationOptions) => {
		const stub = {
			waitForURL: async () => {
				throw failure;
			},
			url: () => url,
		} as unknown as Page;
		const matcher = createUrlMatcher("https://app.example", "/x");
		const navigation = createNavigation(stub, "https://app.example", "/x", matcher, "XPage", () => null, options);
		return (navigation as unknown as Wait)
			.waitForUrl(matcher, 'expected URL "https://app.example/x"', (found) => `reached ${JSON.stringify(found)}`)
			.then(
				() => undefined,
				(error: Error) => error,
			);
	};

	it("on the URL waited for, says the URL was reached and names the load state that did not come", async () => {
		const failure = timeout();
		const error = await waitOn("https://app.example/x", failure);
		expect(error?.message).toBe(
			'XPage: reached "https://app.example/x", but its "load" state did not come in time (page.waitForURL: Timeout 1000ms exceeded.)',
		);
		expect(error?.cause).toBe(failure);
		const late = await waitOn("https://app.example/x", timeout(), { waitUntil: "networkidle" });
		expect(late?.message).toContain('but its "networkidle" state did not come in time');
	});

	it("on another URL, or on another error, keeps the message that names what was expected", async () => {
		expect((await waitOn("https://app.example/y", timeout()))?.message).toBe(
			'XPage: expected URL "https://app.example/x"; found "https://app.example/y" (page.waitForURL: Timeout 1000ms exceeded.)',
		);
		const closed = new Error("page.waitForURL: Target page, context or browser has been closed");
		expect((await waitOn("https://app.example/x", closed))?.message).toBe(
			'XPage: expected URL "https://app.example/x"; found "https://app.example/x" (page.waitForURL: Target page, context or browser has been closed)',
		);
		expect((await waitOn("not a url", timeout()))?.message).toBe(
			'XPage: expected URL "https://app.example/x"; found "not a url" (page.waitForURL: Timeout 1000ms exceeded.)',
		);
	});
});
