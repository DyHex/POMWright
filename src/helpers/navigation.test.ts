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
	void createNavigation(page, "https://app.example", "/x", "https://app.example/x", "Poc", null, staleDefaults);

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
			null,
		);
		const untyped = navigation as unknown as { goto(): Promise<void> };
		await expect(untyped.goto()).rejects.toThrow(
			"AccountPage: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an absolute URL instead.",
		);
	});

	it("rejects a non-absolute target on a RegExp baseUrl", async () => {
		const matcher = createUrlMatcher(/app\.example/, "/login");
		const navigation = createNavigation(fakePage, /app\.example/, "/login", matcher, "LoginPage", null);
		const untyped = navigation as unknown as { goto(target: string): Promise<void> };
		await expect(untyped.goto("/login")).rejects.toThrow(
			'LoginPage: goto("/login") needs an absolute URL because baseUrl is a RegExp.',
		);
	});
});
