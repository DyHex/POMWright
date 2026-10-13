import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

// A page object verifies its registry right after defineLocators(), so a mistyped has/hasNot path
// reference fails at construction, in the fixture, with the path named.

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
		this.add("list.item").getByRole("listitem").filter({ has: "list.titel" as "list.heading" });
	}
	protected pageActionsToPerformAfterNavigation() {
		return null;
	}
}

test("a page object with a correct registry constructs", async ({ page }) => {
	expect(() => new Correct(page)).not.toThrow();
	const poc = new Correct(page);
	expect(`${poc.getNestedLocator("list.item").describe("")}`).toEqual(
		"locator('ul').getByRole('listitem').filter({ has: getByRole('heading') })",
	);
});

test("a page object with a mistyped has reference throws at construction naming the path", async ({ page }) => {
	expect(() => new Typo(page)).toThrowError(
		'Locator registry verification failed for 1 of 2 paths:\n  "list.item": No locator schema registered for path "list.titel".',
	);
});

test("the fixture page objects all verify", async ({ iframePage, testFilters, testIds, testNav, testStorage, testPage }) => {
	for (const poc of [iframePage, testFilters, testIds, testNav, testStorage, testPage]) {
		expect(poc.label).toBeTruthy();
	}
});
