import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

// A page object verifies its registry right after defineLocators(), which runs right after construction
// (or at the first locator call if that comes earlier), so a mistyped has/hasNot path reference fails in the
// fixture, before the test body, with the page object and the path named.

type Paths = "list" | "list.item" | "list.heading";

class Correct extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/testfilters", { label: "Correct" });
	}
	protected defineLocators() {
		this.add("list").locator("ul");
		this.add("list.item").getByRole("listitem").filter({ has: "list.heading" });
		this.add("list.heading").getByRole("heading");
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class Typo extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/testfilters", { label: "Typo" });
	}
	protected defineLocators() {
		this.add("list").locator("ul");
		this.add("list.item")
			.getByRole("listitem")
			.filter({ has: "list.titel" as "list.heading" });
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

class StrictSparse extends PageObject<Paths> {
	constructor(page: Page, strictChains?: boolean) {
		super(page, "http://localhost:9000", "/testfilters", { label: "StrictSparse", locators: { strictChains } });
	}
	protected defineLocators() {
		this.add("list.item").getByRole("listitem");
	}
}

test("locators: { strictChains: true } makes the page object's verify reject an unregistered ancestor", async ({
	page,
}) => {
	// used synchronously after new, so the first use runs the definition and the scheduled check does nothing
	expect(() => new StrictSparse(page, true).getNestedLocator("list.item")).toThrowError(
		'StrictSparse: Locator registry verification failed for 1 of 1 paths:\n  "list.item": strictChains requires every ancestor to be registered; "list" is not.',
	);
	expect(() => new StrictSparse(page).getNestedLocator("list.item")).not.toThrow();
	expect(() => new StrictSparse(page, false).getNestedLocator("list.item")).not.toThrow();
});

test("a page object with a correct registry constructs", async ({ page }) => {
	expect(() => new Correct(page)).not.toThrow();
	const poc = new Correct(page);
	expect(`${poc.getNestedLocator("list.item").describe("")}`).toEqual(
		"locator('ul').getByRole('listitem').filter({ has: getByRole('heading') })",
	);
});

test("a page object with a mistyped has reference throws at its first use, naming the page object and the path", async ({
	page,
}) => {
	// `new` itself no longer throws; a first use before the check runs throws, and the check then does nothing
	expect(() => new Typo(page).getNestedLocator("list.item")).toThrowError(
		'Typo: Locator registry verification failed for 1 of 2 paths:\n  "list.item": No locator schema registered for path "list.titel".',
	);
});

test("the fixture page objects all verify", async ({
	iframePage,
	testPage,
	testPath,
	color,
	testFilters,
	testIds,
	testNav,
	testNavItem,
	testStorage,
	testStorageTwin,
	testStorageSecond,
}) => {
	// a first use rethrows a failed verification, so each of these fails by its own assertion
	const firstUses = [
		() => iframePage.getLocator("sectionA"),
		() => testPage.getLocator("topMenu"),
		() => testPath.getLocator("body"),
		() => color.getLocator("body"),
		() => testFilters.getLocator("one"),
		() => testIds.getLocator("body"),
		() => testNav.getLocator("body"),
		() => testNavItem.getLocator("body"),
		() => testStorage.getLocator("body"),
		() => testStorageTwin.getLocator("body"),
		() => testStorageSecond.getLocator("body"),
	];
	for (const firstUse of firstUses) {
		expect(firstUse).not.toThrow();
	}
});
