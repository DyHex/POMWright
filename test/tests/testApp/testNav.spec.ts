import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { type NavigationOptions, PageObject } from "pomwright";

const BASE = "http://localhost:9000";

// Minimal page objects for the URL shapes the shared fixtures do not cover.

class TrailingSlashNav extends PageObject<"body"> {
	constructor(page: Page, navOptions?: NavigationOptions) {
		super(page, `${BASE}/`, "/testnav", { label: "TrailingSlashNav", navOptions });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class SubstringBaseNav extends PageObject<"body", { baseUrlType: RegExp }> {
	constructor(page: Page) {
		super(page, /localhost/, "/testnav", { label: "SubstringBaseNav" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class AnchoredBaseNav extends PageObject<"body", { baseUrlType: RegExp }> {
	constructor(page: Page) {
		super(page, /^http:\/\/localhost:9000$/, "/testnav", { label: "AnchoredBaseNav" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class BothRegExpNav extends PageObject<"body", { baseUrlType: RegExp; urlPathType: RegExp }> {
	constructor(page: Page) {
		super(page, /^http:\/\/localhost:9000$/, /^\/testnav\/item\/\d+$/, { label: "BothRegExpNav" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class FlaggedItemNav extends PageObject<"body", { urlPathType: RegExp }> {
	constructor(page: Page) {
		super(page, BASE, /\/TESTNAV\/ITEM\/\d+$/i, { label: "FlaggedItemNav" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class VariableNav extends PageObject<"body"> {
	constructor(page: Page, baseUrl: string, urlPath: string) {
		super(page, baseUrl, urlPath, { label: "VariableNav" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

test.describe("goto", () => {
	test("goto() lands on fullUrl and runs the actions; goto(target) and the option do not", async ({ testNav }) => {
		await testNav.navigation.goto();
		expect(testNav.page.url()).toBe(testNav.fullUrl);
		expect(testNav.navigationActionCount.value).toBe(1);

		await testNav.navigation.goto({ runPostNavigationActions: false });
		expect(testNav.navigationActionCount.value).toBe(1);

		await testNav.navigation.goto("/testnav");
		expect(testNav.page.url()).toBe(testNav.fullUrl);
		expect(testNav.navigationActionCount.value).toBe(1);

		await testNav.navigation.expectThisPage();
		expect(testNav.navigationActionCount.value).toBe(2);

		await testNav.navigation.expectThisPage({ runPostNavigationActions: false });
		expect(testNav.navigationActionCount.value).toBe(2);
	});

	test("goto(target) resolves relative input against the page object's origin, like use.baseURL", async ({
		testNav,
	}) => {
		await testNav.navigation.goto("testnav");
		expect(testNav.page.url()).toBe(`${BASE}/testnav`);

		await testNav.navigation.goto("?tab=1");
		expect(testNav.page.url()).toBe(`${BASE}/?tab=1`);

		await testNav.navigation.goto("/testnav/item/42");
		expect(testNav.page.url()).toBe(`${BASE}/testnav/item/42`);

		await testNav.navigation.goto(`${BASE}/testids`);
		expect(testNav.page.url()).toBe(`${BASE}/testids`);
	});

	test("a trailing slash on baseUrl composes to a single slash", async ({ page }) => {
		const nav = new TrailingSlashNav(page);
		expect(nav.fullUrl).toBe(`${BASE}/testnav`);

		await nav.navigation.goto();
		expect(page.url()).toBe(`${BASE}/testnav`);

		await page.goto(`${BASE}/testids`);
		await nav.navigation.goto("/testnav");
		expect(page.url()).toBe(`${BASE}/testnav`);
	});

	test("waitUntil resolves per call, then from navOptions", async ({ page }) => {
		const commitNav = new TrailingSlashNav(page, { waitUntil: "commit" });
		await commitNav.navigation.goto();
		await commitNav.navigation.expectThisPage();
		await expect(page.getByRole("heading", { name: "Navigation playground" })).toBeVisible();

		await commitNav.navigation.goto({ waitUntil: "load" });
		await commitNav.navigation.expectThisPage({ waitUntil: "domcontentloaded" });
	});
});

test.describe("expectThisPage", () => {
	test("resolves at once when already on the page, including after a commit-only navigation", async ({ testNav }) => {
		await testNav.navigation.goto();
		await testNav.navigation.expectThisPage();

		await testNav.navigation.goto({ waitUntil: "commit", runPostNavigationActions: false });
		await testNav.navigation.expectThisPage({ runPostNavigationActions: false });
		await expect(testNav.getNestedLocator("body.heading")).toBeVisible();
	});

	test("rejects on a query, a hash, or a trailing slash, naming expected and found", async ({ testNav }) => {
		const cases = [
			["body.link@selfQuery", `${BASE}/testnav?tab=1`],
			["body.link@selfHash", `${BASE}/testnav#section`],
			["body.link@trailing", `${BASE}/testnav/`],
		] as const;
		for (const [path, found] of cases) {
			await testNav.navigation.goto({ runPostNavigationActions: false });
			await testNav.getNestedLocator(path).click();
			await expect(testNav.page).toHaveURL(found);
			await expect(testNav.navigation.expectThisPage({ timeout: 500 }), path).rejects.toThrow(
				`TestNav: expected URL "${BASE}/testnav"; found "${found}" (page.waitForURL: Timeout 500ms exceeded.)`,
			);
		}
	});

	test("awaits a delayed navigation under the navigation timeout; a short timeout rejects with the matcher", async ({
		testNav,
		testNavItem,
	}) => {
		await testNav.navigation.goto();
		await testNav.getNestedLocator("body.button@delayedItem").click();
		await testNavItem.navigation.expectThisPage();
		await expect(testNavItem.getNestedLocator("body.heading")).toHaveText("Item 7");

		await testNav.navigation.goto();
		await testNav.getNestedLocator("body.button@delayedItem").click();
		await expect(testNavItem.navigation.expectThisPage({ timeout: 200 })).rejects.toThrow(
			`TestNavItem: expected URL origin "${BASE}" + path /^\\/testnav\\/item\\/\\d+$/; found "${BASE}/testnav" (page.waitForURL: Timeout 200ms exceeded.)`,
		);
	});
});

test.describe("expectAnotherPage", () => {
	test("waits for the URL to leave, bounded by a single timeout", async ({ testNav }) => {
		await testNav.navigation.goto();

		const started = Date.now();
		await expect(testNav.navigation.expectAnotherPage({ timeout: 500 })).rejects.toThrow(
			`TestNav: expected to have left "${BASE}/testnav"; found "${BASE}/testnav" (page.waitForURL: Timeout 500ms exceeded.)`,
		);
		const elapsed = Date.now() - started;
		expect(elapsed).toBeGreaterThanOrEqual(450);
		expect(elapsed).toBeLessThan(1000);

		await testNav.getNestedLocator("body.button@delayedOther").click();
		await testNav.navigation.expectAnotherPage();
		expect(testNav.page.url()).toBe(`${BASE}/testids`);
		await expect(testNav.page.locator('[id="settings.panel"]')).toBeVisible();
	});

	test("fails at once when the page bounces back", async ({ testNav }) => {
		await testNav.navigation.goto();
		await testNav.getNestedLocator("body.button@bounce").click();
		await expect(testNav.navigation.expectAnotherPage()).rejects.toThrow(
			`TestNav: left "${BASE}/testnav" but returned to it; found "${BASE}/testnav"`,
		);
	});

	test("is the exact negation of expectThisPage: a new query counts as another page", async ({ testNav }) => {
		await testNav.navigation.goto();
		await testNav.getNestedLocator("body.link@selfQuery").click();
		await testNav.navigation.expectAnotherPage();
		expect(testNav.page.url()).toBe(`${BASE}/testnav?tab=1`);
	});
});

test.describe("RegExp bases and paths", () => {
	test("a substring base regex matches the origin with no tail", async ({ page }) => {
		const nav = new SubstringBaseNav(page);
		await page.goto(`${BASE}/testnav`);
		await nav.navigation.expectThisPage();

		await page.goto(`${BASE}/testnav/item/1`);
		await expect(nav.navigation.expectThisPage({ timeout: 300 })).rejects.toThrow(
			`SubstringBaseNav: expected URL origin /localhost/ + path "/testnav"; found "${BASE}/testnav/item/1"`,
		);
	});

	test("an anchored base, two regexes, and a flagged path all match structurally", async ({ page }) => {
		await page.goto(`${BASE}/testnav`);
		await new AnchoredBaseNav(page).navigation.expectThisPage();

		await page.goto(`${BASE}/testnav/item/3`);
		await new BothRegExpNav(page).navigation.expectThisPage();
		await new FlaggedItemNav(page).navigation.expectThisPage();
	});

	test("goto(target) on a RegExp base accepts only absolute URLs", async ({ page }) => {
		const nav = new SubstringBaseNav(page);
		await nav.navigation.goto(`${BASE}/testnav`);
		expect(page.url()).toBe(`${BASE}/testnav`);

		const untyped = nav.navigation as unknown as { goto(target: string): Promise<void> };
		await expect(untyped.goto("/testnav")).rejects.toThrow(
			'SubstringBaseNav: goto("/testnav") needs an absolute URL because baseUrl is a RegExp.',
		);
	});

	test("goto() without a target is unavailable on a RegExp page", async ({ testNavItem }) => {
		const untyped = testNavItem.navigation as unknown as { goto(): Promise<void> };
		await expect(untyped.goto()).rejects.toThrow("TestNavItem: goto() without a URL needs a string fullUrl");
	});

	test("fullUrl of a RegExp page is a matcher", async ({ testNav, testNavItem }) => {
		expect(typeof testNavItem.fullUrl).toBe("function");
		await testNav.navigation.goto();
		expect(testNavItem.fullUrl.test(testNav.page.url())).toBe(false);

		await testNav.getNestedLocator("body.link@item").click();
		await testNavItem.navigation.expectThisPage();
		expect(testNavItem.fullUrl.test(testNav.page.url())).toBe(true);
		expect(String(testNavItem.fullUrl)).toBe(`origin "${BASE}" + path /^\\/testnav\\/item\\/\\d+$/`);
	});
});

test("baseUrl and urlPath can come from variables", async ({ page }) => {
	const baseUrl: string = process.env.POMWRIGHT_NAV_BASE ?? BASE;
	const urlPath: string = "/testnav";
	const nav = new VariableNav(page, baseUrl, urlPath);
	expect(nav.fullUrl).toBe(`${BASE}/testnav`);

	await nav.navigation.goto();
	await nav.navigation.expectThisPage();
});
