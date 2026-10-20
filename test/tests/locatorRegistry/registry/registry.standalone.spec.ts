import { expect, test } from "@fixtures/testApp.fixtures";
import type { Locator, Page } from "@playwright/test";
import {
	type AddAccessor,
	createRegistryWithAccessors,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type LocatorRegistry,
} from "pomwright";

/**
 * A registry used on its own, without a page object: `createRegistryWithAccessors` and everything it returns, against
 * the /testfilters page (four sections, each with an h2 and the buttons Red, Blue, Green and Reset Color; a color
 * button colors its section). Every scenario runs twice: through the standalone functions the factory returns, and
 * through the same methods called on `registry`.
 */
type Api<Paths extends string> = {
	registry: LocatorRegistry<Paths>;
	add: AddAccessor<Paths>;
	getLocator: GetLocatorAccessor<Paths>;
	getNestedLocator: GetNestedLocatorAccessor<Paths>;
	getLocatorSchema: GetLocatorSchemaAccessor<Paths>;
};

/** Calls `registry[name]` as a method of the registry, with whatever arguments the scenario passes. */
const method =
	<Paths extends string, Name extends "add" | "getLocator" | "getNestedLocator" | "getLocatorSchema">(
		registry: LocatorRegistry<Paths>,
		name: Name,
	) =>
	(...args: unknown[]) =>
		(registry[name] as (...rest: unknown[]) => unknown).apply(registry, args);

const forms: [string, <Paths extends string>(page: Page) => Api<Paths>][] = [
	[
		"the standalone functions",
		<Paths extends string>(page: Page): Api<Paths> => {
			const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
				createRegistryWithAccessors<Paths>(page);
			return { registry, add, getLocator, getNestedLocator, getLocatorSchema };
		},
	],
	[
		"the registry's methods",
		<Paths extends string>(page: Page): Api<Paths> => {
			const { registry } = createRegistryWithAccessors<Paths>(page);
			return {
				registry,
				add: method(registry, "add") as AddAccessor<Paths>,
				getLocator: method(registry, "getLocator") as GetLocatorAccessor<Paths>,
				getNestedLocator: method(registry, "getNestedLocator") as GetNestedLocatorAccessor<Paths>,
				getLocatorSchema: method(registry, "getLocatorSchema") as GetLocatorSchemaAccessor<Paths>,
			};
		},
	],
];

/** The id of the section an element is in: which of the four a locator found. */
const sectionOf = (locator: Locator) => locator.evaluate((element) => element.closest("section")?.id);

const RED = "rgb(255, 0, 0)";

for (const [form, create] of forms) {
	test.describe(`a standalone registry, through ${form}`, () => {
		test.beforeEach(async ({ page, testFilters }) => {
			await page.goto(testFilters.fullUrl);
		});

		test("add with a strategy, filter, nth and describe; getNestedLocator and getLocator", async ({ page }) => {
			type Paths = "section" | "section.heading" | "section.button@red";
			const { registry, add, getLocator, getNestedLocator } = create<Paths>(page);
			add("section").locator("section").filter({ hasText: "Explorer" });
			add("section.heading").getByRole("heading", { level: 2 });
			add("section.button@red").getByRole("button", { name: "Red" }).nth(0).describe("Red button");
			registry.verify();

			const red = getNestedLocator("section.button@red");
			expect(red.description()).toBe("Red button");
			await red.click();
			await expect(page.locator("#section2")).toHaveCSS("background-color", RED);

			await expect(getNestedLocator("section.heading")).toHaveText("Primary Colors Explorer");
			await expect(getLocator("section.heading")).toHaveCount(4);
			expect(getLocator("section.heading").description()).toBe("section.heading");
		});

		test("add with reuse of a registered path, narrowed by nth and describe", async ({ page }) => {
			type Paths = "button@reset" | "button@lastReset";
			const { registry, add, getNestedLocator } = create<Paths>(page);
			add("button@reset").getByRole("button", { name: "Reset Color" });
			add("button@lastReset", { reuse: "button@reset" }).nth("last").describe("Last reset");
			registry.verify();

			const lastReset = getNestedLocator("button@lastReset");
			expect(lastReset.description()).toBe("Last reset");
			expect(await sectionOf(lastReset)).toBe("section4");
			await expect(getNestedLocator("button@reset")).toHaveCount(4);
		});

		test("createReusable seeds: reuse, an override, filter, nth and describe, and the seed unchanged", async ({
			page,
		}) => {
			type Paths = "button@blue" | "button@lastRed" | "heading@test";
			const { registry, add, getNestedLocator } = create<Paths>(page);
			const colorButton = registry.createReusable.getByRole("button", { name: "Red", exact: true });
			const headings = registry.createReusable.getByRole("heading", { level: 2 });

			add("button@blue", { reuse: colorButton }).getByRole({ name: "Blue" }).nth(1);
			add("button@lastRed", { reuse: colorButton.nth("last") });
			add("heading@test", { reuse: headings.filter({ hasText: "Test" }).describe("Test heading") });
			registry.verify();

			const blue = getNestedLocator("button@blue");
			await expect(blue).toHaveText("Blue");
			expect(await sectionOf(blue)).toBe("section2");
			expect(await sectionOf(getNestedLocator("button@lastRed"))).toBe("section4");
			const testHeading = getNestedLocator("heading@test");
			await expect(testHeading).toHaveText("Primary Colors Test");
			expect(testHeading.description()).toBe("Test heading");
			expect(colorButton.steps).toEqual([]);
			expect(colorButton.description).toBeUndefined();
		});

		test("a has filter with a registered path, registered after it, and verify", async ({ page }) => {
			type Paths = "section@test" | "heading@test";
			const { registry, add, getNestedLocator } = create<Paths>(page);
			add("section@test").locator("section").filter({ has: "heading@test" });
			add("heading@test").getByRole("heading", { name: "Primary Colors Test" });
			registry.verify();
			expect(await sectionOf(getNestedLocator("section@test"))).toBe("section3");

			type Broken = "list" | "list.item" | "list.badge";
			const broken = create<Broken>(page);
			broken.add("list").locator("ul");
			broken.add("list.item").getByRole("listitem").filter({ has: "list.badge" });
			expect(() => broken.registry.verify()).toThrowError(
				'Locator registry verification failed for 1 of 2 paths:\n  "list.item": No locator schema registered for path "list.badge".',
			);
		});

		test("getLocatorSchema: filter, nth, clearSteps, describe, getLocator and getNestedLocator", async ({ page }) => {
			type Paths = "section" | "section.button";
			const { add, getLocatorSchema } = create<Paths>(page);
			add("section").locator("section").nth(0);
			add("section.button").getByRole("button").nth(0);

			// the registered nth(0) of each segment stays unless cleared: a query's steps come after it
			const playgroundReset = getLocatorSchema("section.button")
				.clearSteps("section")
				.filter("section", { hasText: "Playground" })
				.clearSteps()
				.nth("last")
				.describe("Playground reset")
				.getNestedLocator();
			await expect(playgroundReset).toHaveText("Reset Color");
			expect(await sectionOf(playgroundReset)).toBe("section4");
			expect(playgroundReset.description()).toBe("Playground reset");

			await expect(getLocatorSchema("section.button").clearSteps().getLocator()).toHaveCount(16);
			await expect(getLocatorSchema("section.button").getLocator()).toHaveText("Red");
		});

		test("getLocatorSchema: update and replace, and the registry unchanged", async ({ page }) => {
			type Paths = "section" | "section.button@red";
			const { add, getLocatorSchema, getNestedLocator } = create<Paths>(page);
			add("section").locator("section").filter({ hasText: "Explorer" });
			add("section.button@red").getByRole("button", { name: "Red" });

			const green = getLocatorSchema("section.button@red").update().getByRole({ name: "Green" }).getNestedLocator();
			await expect(green).toHaveText("Green");
			expect(await sectionOf(green)).toBe("section2");

			const blue = getLocatorSchema("section.button@red").replace().getByText("Blue").getNestedLocator();
			await expect(blue).toHaveText("Blue");

			// replace keeps the segment's steps: its filter for "Explorer" would match nothing in #section3
			const redInTest = getLocatorSchema("section.button@red")
				.clearSteps("section")
				.replace("section")
				.locator("#section3")
				.getNestedLocator();
			expect(await sectionOf(redInTest)).toBe("section3");

			const registered = getNestedLocator("section.button@red");
			await expect(registered).toHaveText("Red");
			expect(await sectionOf(registered)).toBe("section2");
		});

		test("getLocatorSchema: skip and unskip", async ({ page }) => {
			type Paths = "section" | "section.button@red";
			const { add, getLocatorSchema } = create<Paths>(page);
			add("section").locator("#section1");
			add("section.button@red").getByRole("button", { name: "Red" });

			const query = getLocatorSchema("section.button@red").skip("section");
			await expect(query.getNestedLocator()).toHaveCount(4);
			await expect(query.unskip("section").getNestedLocator()).toHaveCount(1);
		});
	});
}

test("the standalone functions and the registry's methods share one registry; two registries stay apart", async ({
	page,
	testFilters,
}) => {
	await page.goto(testFilters.fullUrl);
	type Paths = "section" | "section.button";

	const first = createRegistryWithAccessors<Paths>(page);
	first.add("section").locator("#section1");
	first.registry.add("section.button").getByRole("button", { name: "Red" });

	const second = createRegistryWithAccessors<Paths>(page);
	second.registry.add("section").locator("#section3");
	second.add("section.button").getByRole("button", { name: "Blue" });

	first.registry.verify();
	second.registry.verify();
	expect(await sectionOf(first.getNestedLocator("section.button"))).toBe("section1");
	expect(await sectionOf(first.registry.getNestedLocator("section.button"))).toBe("section1");
	await expect(first.getNestedLocator("section.button")).toHaveText("Red");
	expect(await sectionOf(second.getNestedLocator("section.button"))).toBe("section3");
	await expect(second.registry.getLocatorSchema("section.button").getNestedLocator()).toHaveText("Blue");
});
