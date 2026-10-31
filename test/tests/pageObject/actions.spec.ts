import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

// pageActionsToPerformAfterNavigation() is optional (no actions by default) and is called each time the
// actions run, after goto() without a target and after expectThisPage(), never at construction.

const BASE = "http://localhost:9000";

class NoHookNav extends PageObject<"body"> {
	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "NoHookNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
	}
}

class CountingNav extends PageObject<"body"> {
	hookCalls = 0;
	actionRuns = 0;

	constructor(
		page: Page,
		private readonly withAction: boolean,
	) {
		super(page, BASE, "/testnav", { label: "CountingNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
	}

	protected pageActionsToPerformAfterNavigation() {
		this.hookCalls += 1;
		return this.withAction
			? [
					async () => {
						this.actionRuns += 1;
					},
				]
			: [];
	}
}

class ModeNav extends PageObject<"body"> {
	mode: "none" | "count" = "none";
	actionRuns = 0;

	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "ModeNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
	}

	protected pageActionsToPerformAfterNavigation() {
		return this.mode === "count"
			? [
					async () => {
						this.actionRuns += 1;
					},
				]
			: [];
	}
}

class NullNav extends PageObject<"body"> {
	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "NullNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
	}

	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class EmptyNav extends PageObject<"body"> {
	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "EmptyNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
	}

	protected pageActionsToPerformAfterNavigation() {
		return [];
	}
}

class RejectingNav extends PageObject<"body"> {
	actionRuns: string[] = [];

	constructor(page: Page) {
		super(page, BASE, "/testnav", { label: "RejectingNav" });
	}

	protected defineLocators() {
		this.add("body").locator("body");
	}

	protected pageActionsToPerformAfterNavigation() {
		return [
			async () => {
				this.actionRuns.push("first");
				throw new Error("the spinner never went away");
			},
			async () => {
				this.actionRuns.push("second");
			},
		];
	}
}

test("a page object without the hook navigates with goto() and expectThisPage()", async ({ page }) => {
	const nav = new NoHookNav(page);
	await nav.navigation.goto();
	await nav.navigation.expectThisPage();
	expect(page.url()).toBe(`${BASE}/testnav`);
});

test("a hook that reads a parameter property runs its action when constructed with true, not with false", async ({
	page,
}) => {
	const withAction = new CountingNav(page, true);
	const withoutAction = new CountingNav(page, false);
	await withAction.navigation.goto();
	await withoutAction.navigation.goto();
	expect(withAction.actionRuns).toBe(1);
	expect(withoutAction.actionRuns).toBe(0);
});

test("the hook is called once per goto() and expectThisPage(), and not at construction or for the other forms", async ({
	page,
}) => {
	const nav = new CountingNav(page, true);
	expect(nav.hookCalls).toBe(0);

	await nav.navigation.goto();
	expect([nav.hookCalls, nav.actionRuns]).toEqual([1, 1]);
	await nav.navigation.expectThisPage();
	expect([nav.hookCalls, nav.actionRuns]).toEqual([2, 2]);

	await nav.navigation.goto({ runPostNavigationActions: false });
	await nav.navigation.expectThisPage({ runPostNavigationActions: false });
	await nav.navigation.goto("/testnav");
	expect([nav.hookCalls, nav.actionRuns]).toEqual([2, 2]);

	await nav.navigation.goto("/testids");
	await nav.navigation.expectAnotherPage();
	expect([nav.hookCalls, nav.actionRuns]).toEqual([2, 2]);
});

test("a hook whose result depends on state changed between two goto() calls returns the new list", async ({ page }) => {
	const nav = new ModeNav(page);
	await nav.navigation.goto();
	expect(nav.actionRuns).toBe(0);
	nav.mode = "count";
	await nav.navigation.goto();
	expect(nav.actionRuns).toBe(1);
});

test("return null and return [] behave identically", async ({ page }) => {
	for (const nav of [new NullNav(page), new EmptyNav(page)]) {
		await nav.navigation.goto();
		await nav.navigation.expectThisPage();
		expect(page.url(), nav.label).toBe(`${BASE}/testnav`);
	}
});

test("an action that rejects rejects goto() and expectThisPage() with its error, and the actions after it do not run", async ({
	page,
}) => {
	const nav = new RejectingNav(page);
	await expect(nav.navigation.goto()).rejects.toThrow(new Error("the spinner never went away"));
	expect(page.url()).toBe(`${BASE}/testnav`);
	expect(nav.actionRuns).toEqual(["first"]);
	await expect(nav.navigation.expectThisPage()).rejects.toThrow(new Error("the spinner never went away"));
	expect(nav.actionRuns).toEqual(["first", "first"]);
});
