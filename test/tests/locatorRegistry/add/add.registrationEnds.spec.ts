import { expect, test } from "@fixtures/testApp.fixtures";
import type { Locator, Page } from "@playwright/test";
import { createRegistryWithAccessors, PageObject } from "pomwright";

/**
 * A registration ends at the next call on its registry: a registration kept in a variable takes its steps before then,
 * and a later call of it throws and changes nothing. Against the packed package and the /testfilters page (four
 * sections, each with an h2 and the buttons Red, Blue, Green and Reset Color).
 */
const ended = (method: string, path: string, by: string) =>
	`${method}() cannot apply to "${path}": its registration was ended by ${by}; give a registration all its steps in its add(…) chain, or query the path for one use.`;

const sectionOf = (locator: Locator) => locator.evaluate((element) => element.closest("section")?.id);

test.beforeEach(async ({ page, testFilters }) => {
	await page.goto(testFilters.fullUrl);
});

test("a kept registration given a step after another add throws, and its path finds what it found", async ({
	page,
}) => {
	type Paths = "section@explorer" | "section@explorer.button@red";
	const { add, getNestedLocator } = createRegistryWithAccessors<Paths>(page);
	const section = add("section@explorer").locator("section").filter({ hasText: "Explorer" });
	add("section@explorer.button@red").getByRole("button", { name: "Red" });

	expect(() => section.nth(1)).toThrowError(ended("nth", "section@explorer", 'add("section@explorer.button@red")'));
	await expect(getNestedLocator("section@explorer")).toHaveCount(1);
	expect(await sectionOf(getNestedLocator("section@explorer.button@red"))).toBe("section2");
});

test("a kept registration given a step after its path was used throws, and the path acts as before", async ({
	page,
}) => {
	type Paths = "button@red";
	const { add, getNestedLocator } = createRegistryWithAccessors<Paths>(page);
	const red = add("button@red").getByRole("button", { name: "Red" }).nth(0);

	await getNestedLocator("button@red").click();
	await expect(page.locator("#section1")).toHaveCSS("background-color", "rgb(255, 0, 0)");
	expect(() => red.nth(1)).toThrowError(ended("nth", "button@red", 'getNestedLocator("button@red")'));
	expect(() => red.filter({ hasText: "Blue" })).toThrowError(
		ended("filter", "button@red", 'getNestedLocator("button@red")'),
	);
	expect(await sectionOf(getNestedLocator("button@red"))).toBe("section1");
});

test("steps right after add, and a kept seeded override before the next call, still apply", async ({ page }) => {
	type Paths = "button@lastReset" | "button@blue";
	const { registry, add, getNestedLocator } = createRegistryWithAccessors<Paths>(page);
	const reset = add("button@lastReset").getByRole("button", { name: "Reset Color" });
	for (const index of ["last"] as const) {
		reset.nth(index);
	}
	const colorButton = registry.createReusable.getByRole("button", { name: "Red" });
	const held = add("button@blue", { reuse: colorButton });
	held.nth(1);
	held.getByRole({ name: "Blue" });
	registry.verify();

	expect(await sectionOf(getNestedLocator("button@lastReset"))).toBe("section4");
	await expect(getNestedLocator("button@blue")).toHaveText("Blue");
	expect(await sectionOf(getNestedLocator("button@blue"))).toBe("section2");
});

type KeepingPaths = "section@test" | "section@test.button@red";

/** A page object that keeps a registration in a field and offers a method that would narrow it later. */
class KeepingPage extends PageObject<KeepingPaths> {
	private kept: { filter: (filter: { hasText: string }) => unknown } | undefined;
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/testfilters", { label: "KeepingPage" });
	}
	protected defineLocators(): void {
		this.add("section@test").locator("#section3");
		this.kept = this.add("section@test.button@red").getByRole("button");
	}
	narrowToRed() {
		this.kept?.filter({ hasText: "Red" });
	}
}

const withKeepingPage = test.extend<{ keepingPage: KeepingPage }>({
	keepingPage: async ({ page }, use) => {
		await use(new KeepingPage(page));
	},
});

withKeepingPage(
	"a page object's kept registration ended with defineLocators(): narrowing it from a method throws",
	async ({ keepingPage }) => {
		expect(() => keepingPage.narrowToRed()).toThrowError(ended("filter", "section@test.button@red", "verify()"));
		await expect(keepingPage.getNestedLocator("section@test.button@red")).toHaveCount(4);
	},
);

test("a getLocator in an add chain's filter ends that registration; a path, or a locator resolved first, filter the same", async ({
	page,
}) => {
	type Paths = "heading@explorer" | "section@inline" | "section@byPath" | "section@byLocator";
	const { add, getLocator, getNestedLocator } = createRegistryWithAccessors<Paths>(page);
	add("heading@explorer").getByRole("heading", { name: "Primary Colors Explorer" });

	expect(() =>
		add("section@inline")
			.locator("section")
			.filter({ has: getLocator("heading@explorer") }),
	).toThrowError(
		`filter() cannot apply to "section@inline": its registration was ended by getLocator("heading@explorer"). If that call is in this filter's arguments, which run first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has: "heading@explorer" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.`,
	);

	add("section@byPath").locator("section").filter({ has: "heading@explorer" });
	const heading = getLocator("heading@explorer");
	add("section@byLocator").locator("section").filter({ has: heading });
	for (const path of ["section@byPath", "section@byLocator"] as const) {
		await expect(getNestedLocator(path)).toHaveCount(1);
		expect(await sectionOf(getNestedLocator(path))).toBe("section2");
	}
});

test("a getLocator in locator()'s options ends that registration; a path in a step filters the same", async ({
	page,
}) => {
	type Paths = "heading@explorer" | "section@inline" | "section@byPath";
	const { add, getLocator, getNestedLocator } = createRegistryWithAccessors<Paths>(page);
	add("heading@explorer").getByRole("heading", { name: "Primary Colors Explorer" });

	expect(() => add("section@inline").locator("section", { has: getLocator("heading@explorer") })).toThrowError(
		`locator() cannot apply to "section@inline": its registration was ended by getLocator("heading@explorer"). If that call is in this locator's options, which run first, resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading@explorer" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.`,
	);

	add("section@byPath").locator("section").filter({ has: "heading@explorer" });
	await expect(getNestedLocator("section@byPath")).toHaveCount(1);
	expect(await sectionOf(getNestedLocator("section@byPath"))).toBe("section2");
});

test("a query in filter()'s arguments ends that registration, and the message leaves out the path alternative", async ({
	page,
}) => {
	type Paths = "heading@explorer" | "section@inline";
	const { add, getLocatorSchema } = createRegistryWithAccessors<Paths>(page);
	add("heading@explorer").getByRole("heading", { name: "Primary Colors Explorer" });

	expect(() =>
		add("section@inline")
			.locator("section")
			.filter({ has: getLocatorSchema("heading@explorer").nth(0).getLocator() }),
	).toThrowError(
		`filter() cannot apply to "section@inline": its registration was ended by getLocatorSchema("heading@explorer"). If that query is in this filter's arguments, which run first, resolve it before add(…). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.`,
	);
});
