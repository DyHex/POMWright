import { expect, test } from "@fixtures/testApp.fixtures";
import type { Locator, Page } from "@playwright/test";
import { createRegistryWithAccessors, type FilterDefinition, type ReusableLocator } from "pomwright";

const createTestRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page).registry;
/** A locator as Playwright renders it without a description, which a resolved locator otherwise prints instead. */
const render = (locator: Locator) => `${locator.describe("")}`;

test("add can reuse a reusable locator definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.first";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const h2 = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });

	registry.add("heading", { reuse: h2 });
	registry.add("heading.first", { reuse: h2 }).nth(0);

	expect(render(registry.getLocator("heading"))).toEqual(
		render(page.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ })),
	);

	expect(render(registry.getLocator("heading.first"))).toEqual(
		render(
			page
				.getByRole("heading", { level: 2 })
				.filter({ hasText: /Summary/ })
				.nth(0),
		),
	);
});

test("reusable builder yields the same locator chain as a direct definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.reused";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const reusable = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: "Intro" }).nth(1);

	registry.add("heading").getByRole("heading", { level: 2 }).filter({ hasText: "Intro" }).nth(1);
	registry.add("heading.reused", { reuse: reusable });

	const direct = registry.getLocator("heading");
	const reused = registry.getLocator("heading.reused");

	expect(`${reused.describe("")}`).toEqual(`${direct.describe("")}`);
});

test("add reuse by reusable locator patches options while preserving selector", async ({ page }) => {
	type LocatorSchemaPaths = "errorMessage" | "error.invalidPassword";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const errorMessage = registry.createReusable.locator("error-message");
	registry.add("errorMessage", { reuse: errorMessage });
	registry.add("error.invalidPassword", { reuse: errorMessage }).locator({ hasText: /invalid password/ });

	expect(render(registry.getLocator("errorMessage"))).toEqual(render(page.locator("error-message")));

	expect(render(registry.getLocator("error.invalidPassword"))).toEqual(
		render(page.locator("error-message", { hasText: /invalid password/ })),
	);
});

test("add reuse by reusable locator inherits selector and discriminant", async ({ page }) => {
	type LocatorSchemaPaths = "errorMessage" | "error.invalidPassword";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const errorMessage = registry.createReusable.locator("error-message", { hasText: /invalid password/ });
	registry.add("errorMessage", { reuse: errorMessage });
	registry.add("error.invalidPassword", { reuse: errorMessage }).locator({ hasText: /invalid email/ });

	expect(render(registry.getLocator("errorMessage"))).toEqual(
		render(page.locator("error-message", { hasText: /invalid password/ })),
	);

	expect(render(registry.getLocator("error.invalidPassword"))).toEqual(
		render(page.locator("error-message", { hasText: /invalid email/ })),
	);
});

test("add reuse with a reusable locator does not mutate the reusable definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.first";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const reusable = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });

	registry.add("heading", { reuse: reusable });
	registry.add("heading.first", { reuse: reusable }).nth(0);

	expect(reusable.steps).toEqual([{ filter: { hasText: /Summary/ }, kind: "filter" }]);
	expect(render(registry.getLocator("heading"))).toEqual(
		render(page.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ })),
	);

	expect(render(registry.getLocator("heading.first"))).toEqual(
		render(
			page
				.getByRole("heading", { level: 2 })
				.filter({ hasText: /Summary/ })
				.nth(0),
		),
	);
});

test("add reuse enforces matching locator type overrides", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "button.reuseLocator";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const button = registry.createReusable.getByRole("button", { name: "Submit" });

	// @ts-expect-error mismatched locator strategies are not allowed when reusing a locator (getByText attempt on role locator)
	expect(() => registry.add("button", { reuse: button }).getByText("text")).toThrowError(
		'must use the "role" strategy',
	);

	// a throwing DSL call changes nothing: the path keeps the seed it was registered with
	expect(render(registry.getLocator("button"))).toEqual(render(page.getByRole("button", { name: "Submit" })));

	const builder = registry.add("button.reuseLocator", { reuse: button });
	// @ts-expect-error mismatched locator strategies are not allowed when reusing a locator (getById attempt on role locator)
	expect(() => builder.getById("Submit")).toThrowError('must use the "role" strategy');
	// any public read here would end the registration; the override below succeeding shows the failed call took nothing

	// the failed call consumed nothing: the one matching override is still available on the same builder
	builder.getByRole({ name: "Submit" });

	expect(render(registry.getLocator("button.reuseLocator"))).toEqual(
		render(page.getByRole("button", { name: "Submit" })),
	);
});

test("add reuse patches role options while preserving role value", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const h2 = registry.createReusable.getByRole("heading", { level: 2 });

	registry.add("heading", { reuse: h2 }).getByRole({ name: "Summary" });

	expect(render(registry.getLocator("heading"))).toEqual(
		render(page.getByRole("heading", { level: 2, name: "Summary" })),
	);
});

test("add reuse typing narrows override methods to the matching strategy", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const button = registry.createReusable.getByRole("button", { name: "Submit" });
	const builder = registry.add("button", { reuse: button });

	// @ts-expect-error mismatched locator strategies are not exposed when reusing a locator
	const _invalidOverrideMethod = builder.getByText;

	builder.getByRole({ name: "Submit" });
});

test("add reuse allows only one matching locator override", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const h2 = registry.createReusable.getByRole("heading", { level: 2 });

	const builder = registry.add("heading", { reuse: h2 });

	builder.getByRole("heading", { name: "Summary" });

	expect(() => builder.getByRole("heading", { name: "Other" })).toThrowError("only one matching override is allowed");
	expect(render(registry.getLocator("heading"))).toEqual(
		render(page.getByRole("heading", { level: 2, name: "Summary" })),
	);
});

test("createReusable.filter supports Playwright Locator instances for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const seed = registry.createReusable
		.getByRole("button")
		.filter({ has: page.getByRole("heading", { level: 2 }) })
		.filter({ hasNot: page.getByRole("heading", { level: 3 }) });

	registry.add("item", { reuse: seed });

	const locator = registry.getLocator("item");

	expect(`${locator.describe("")}`).toEqual(
		"getByRole('button').filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('heading', { level: 3 }) })",
	);
});

test("createReusable.filter supports registry path strings for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item" | "heading.primary" | "heading.secondary";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("heading.primary").getByRole("heading", { level: 2 });
	registry.add("heading.secondary").getByRole("heading", { level: 3 });

	const seed = registry.createReusable
		.getByRole("button")
		.filter({ has: "heading.primary" })
		.filter({ hasNot: "heading.secondary" });

	registry.add("item", { reuse: seed });

	const locator = registry.getLocator("item");

	expect(`${locator.describe("")}`).toEqual(
		"getByRole('button').filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('heading', { level: 3 }) })",
	);
});

test("createReusable.filter rejects inline locator strategy definitions for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.createReusable
		.getByRole("button")
		// @ts-expect-error inline locator definitions are no longer supported
		.filter({ has: { type: "locator", selector: "section" } });

	const unsafeFilter = {
		has: { type: "locator", selector: "section" },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	const unsafeSeed = registry.createReusable.getByRole("button").filter(unsafeFilter);

	registry.add("item", { reuse: unsafeSeed });

	expect(() => registry.getLocator("item")).toThrow(/Unsupported filter reference/);
});

test("createReusable.filter rejects locator wrappers for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.createReusable
		.getByRole("button")
		// @ts-expect-error locator wrapper is no longer supported
		.filter({ has: { locator: { type: "locator", selector: "section" } } });

	const unsafeFilter = {
		has: { locator: { type: "locator", selector: "section" } },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	const unsafeSeed = registry.createReusable.getByRole("button").filter(unsafeFilter);

	registry.add("item", { reuse: unsafeSeed });

	expect(() => registry.getLocator("item")).toThrow(/Unsupported filter reference/);
});

test("createReusable.filter rejects locatorPath wrappers for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.createReusable
		.getByRole("button")
		// @ts-expect-error locatorPath wrapper is no longer supported
		.filter({ has: { locatorPath: "item" } });

	const unsafeFilter = {
		has: { locatorPath: "item" },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	const unsafeSeed = registry.createReusable.getByRole("button").filter(unsafeFilter);

	registry.add("item", { reuse: unsafeSeed });

	expect(() => registry.getLocator("item")).toThrow(/Unsupported filter reference/);
});

test("createReusable.filter supports visible true/false", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const seed = registry.createReusable.getByRole("button").filter({ visible: true }).filter({ visible: false });

	registry.add("item", { reuse: seed });

	const locator = registry.getLocator("item");

	expect(`${locator.describe("")}`).toEqual("getByRole('button').visible().filter({ visible: false })");
});

test("reusable getById seeds store the id verbatim, inherit on omission, and reject an empty id", async ({ page }) => {
	type LocatorSchemaPaths = "panel" | "panel.inherit" | "panel.override";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const seed = registry.createReusable.getById("settings.panel");

	registry.add("panel", { reuse: seed });
	registry.add("panel.inherit", { reuse: seed }).getById(undefined);
	registry.add("panel.override", { reuse: seed }).getById("#literal-hash");

	expect(render(registry.getLocator("panel"))).toEqual(render(page.locator('[id="settings.panel"]')));
	expect(render(registry.getLocator("panel.inherit"))).toEqual(render(page.locator('[id="settings.panel"]')));
	expect(render(registry.getLocator("panel.override"))).toEqual(render(page.locator('[id="#literal-hash"]')));

	expect(() => registry.createReusable.getById("")).toThrowError("createReusable.getById requires a non-empty id.");
});

test('a seed\'s describe("") removes the description; anything but a string throws', async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const seed = registry.createReusable.getByRole("heading", { level: 2 }).describe("");
	registry.add("heading", { reuse: seed });
	expect(registry.getLocator("heading").description()).toBeNull();
	// @ts-expect-error describe takes a string
	expect(() => registry.createReusable.getByRole("heading").describe(null)).toThrowError(
		'createReusable.describe requires a string; pass "" to remove the description.',
	);
});

test.describe("seeds are values, against the DOM", () => {
	type SeedPaths = "sections" | "sections@first" | "sections@last" | "explorer" | "playground";

	test.beforeEach(async ({ testFilters }) => {
		await testFilters.page.goto(testFilters.fullUrl);
	});

	test("variants derived from one base seed are the base plus their own step", async ({ page }) => {
		const registry = createTestRegistry<SeedPaths>(page);
		const section = registry.createReusable.locator("section");
		registry.add("sections", { reuse: section });
		registry.add("sections@first", { reuse: section.nth(0) });
		registry.add("sections@last", { reuse: section.nth("last") });

		await expect(registry.getNestedLocator("sections")).toHaveCount(4);
		await expect(registry.getNestedLocator("sections@first")).toHaveAttribute("id", "section1");
		await expect(registry.getNestedLocator("sections@last")).toHaveAttribute("id", "section4");
		expect(section.steps).toEqual([]);
	});

	test("a description or a filter given to one variant does not reach the next", async ({ page }) => {
		const registry = createTestRegistry<SeedPaths>(page);
		const heading = registry.createReusable.getByRole("heading", { level: 2 });
		registry.add("explorer", { reuse: heading.describe("Explorer heading").filter({ hasText: "Explorer" }) });
		registry.add("playground", { reuse: heading.filter({ hasText: "Playground" }) });

		const playground = registry.getNestedLocator("playground");
		await expect(playground).toHaveText("Primary Colors Playground");
		expect(playground.description()).toBe("playground");
		await expect(registry.getNestedLocator("explorer")).toHaveText("Primary Colors Explorer");
		expect(heading.description).toBeUndefined();
	});
});

test("seed.filter returns a seed with the filter and leaves the seed's steps alone", async ({ page }) => {
	const registry = createTestRegistry<"x">(page);
	const seed = registry.createReusable.locator("section");
	const filtered = seed.filter({ hasText: "Explorer" });
	expect(seed.steps).toEqual([]);
	expect(filtered.steps).toEqual([{ kind: "filter", filter: { hasText: "Explorer" } }]);
	expect(filtered).not.toBe(seed);
});

test("changing a seed's definition after creation changes nothing", async ({ page }) => {
	const registry = createTestRegistry<"x">(page);
	const seed = registry.createReusable.getByRole("button", { name: "Save" });
	(seed.definition.options as { name: string }).name = "Changed";
	registry.add("x", { reuse: seed });
	expect(render(registry.getLocator("x"))).toEqual(render(page.getByRole("button", { name: "Save" })));
});

test.describe("a seeded override's options follow update's Merge Patch, against the DOM", () => {
	type OptionPaths = "section" | "section.exact" | "section.loose" | "section.all" | "section.heading" | "section.x";

	test.beforeEach(async ({ testFilters }) => {
		await testFilters.page.goto(testFilters.fullUrl);
	});

	test("a null key deletes it, a lone null clears the options, a primary with null keeps none", async ({ page }) => {
		const registry = createTestRegistry<OptionPaths>(page);
		const reset = registry.createReusable.getByRole("button", { name: "Reset", exact: true });
		registry.add("section").locator("#section1");
		registry.add("section.exact", { reuse: reset });
		registry.add("section.loose", { reuse: reset }).getByRole({ exact: null });
		registry.add("section.all", { reuse: reset }).getByRole(null);
		registry.add("section.heading", { reuse: reset }).getByRole("heading", null);

		await expect(registry.getNestedLocator("section.exact")).toHaveCount(0);
		await expect(registry.getNestedLocator("section.loose")).toHaveText(["Reset Color"]);
		await expect(registry.getNestedLocator("section.all")).toHaveText(["Red", "Blue", "Green", "Reset Color"]);
		await expect(registry.getNestedLocator("section.heading")).toHaveText("Primary Colors Section");
		expect(render(registry.getLocator("section.loose"))).toEqual(render(page.getByRole("button", { name: "Reset" })));
	});

	test("null as the first of two arguments throws: a primary is always a value", async ({ page }) => {
		const registry = createTestRegistry<OptionPaths>(page);
		const reset = registry.createReusable.getByRole("button", { name: "Reset" });
		const view = registry.add("section.x", { reuse: reset }) as unknown as {
			getByRole: (...args: unknown[]) => unknown;
		};
		expect(() => view.getByRole(null, null)).toThrowError('getByRole requires a role value for "section.x".');
	});
});

test.describe("an any-frame seed", () => {
	type FramePaths = "frames" | "frames.toggleC" | "stepped" | "framed" | "framed.toggle";
	const anyFrameSeed = (steps: { kind: "index"; index: number }[]) =>
		({
			type: "frameLocator",
			definition: { type: "frameLocator" },
			steps,
			description: undefined,
			filter() {
				return this;
			},
			nth() {
				return this;
			},
			describe() {
				return this;
			},
		}) as unknown as ReusableLocator<FramePaths, "frameLocator">;

	test.beforeEach(async ({ iframePage }) => {
		await iframePage.page.goto(iframePage.fullUrl);
	});

	test("without steps registers and resolves a path inside it", async ({ page }) => {
		const registry = createTestRegistry<FramePaths>(page);
		registry.add("frames", { reuse: anyFrameSeed([]) });
		registry.add("frames.toggleC").getByTestId("toggle-c");
		await expect(registry.getNestedLocator("frames.toggleC")).toHaveText("Toggle C: Off");
	});

	test("with a step throws at add and registers nothing", async ({ page }) => {
		const registry = createTestRegistry<FramePaths>(page);
		expect(() => registry.add("stepped", { reuse: anyFrameSeed([{ kind: "index", index: 0 }]) })).toThrowError(
			'reuse cannot apply to "stepped": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.',
		);
		expect(() => registry.getLocator("stepped")).toThrowError('No locator schema registered for path "stepped".');
	});

	test("an override that gives it a selector makes it a frame segment that takes steps", async ({ page }) => {
		const registry = createTestRegistry<FramePaths>(page);
		registry
			.add("framed", { reuse: anyFrameSeed([]) })
			.frameLocator("iframe")
			.nth(0);
		registry.add("framed.toggle").getByRole("button");
		await expect(registry.getNestedLocator("framed.toggle")).toHaveText("Toggle A: Off");
	});
});
