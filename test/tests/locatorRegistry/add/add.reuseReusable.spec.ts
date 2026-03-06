import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { type FilterDefinition, LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("add can reuse a reusable locator definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.first";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const h2 = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });

	registry.add("heading", { reuse: h2 });
	registry.add("heading.first", { reuse: h2 }).nth(0);

	expect(registry.get("heading")).toEqual({
		definition: { role: "heading", options: { level: 2 }, type: "role" },
		locatorSchemaPath: "heading",
		steps: [{ filter: { hasText: /Summary/ }, kind: "filter" }],
	});

	expect(registry.get("heading.first")).toEqual({
		definition: { role: "heading", options: { level: 2 }, type: "role" },
		locatorSchemaPath: "heading.first",
		steps: [
			{ filter: { hasText: /Summary/ }, kind: "filter" },
			{ index: 0, kind: "index" },
		],
	});
});

test("reusable builder yields the same locator chain as a direct definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.reused";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const reusable = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: "Intro" }).nth(1);

	registry.add("heading").getByRole("heading", { level: 2 }).filter({ hasText: "Intro" }).nth(1);
	registry.add("heading.reused", { reuse: reusable });

	const direct = registry.getLocator("heading");
	const reused = registry.getLocator("heading.reused");

	expect(`${reused}`).toEqual(`${direct}`);
});

test("add reuse by reusable locator patches options while preserving selector", async ({ page }) => {
	type LocatorSchemaPaths = "errorMessage" | "error.invalidPassword";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const errorMessage = registry.createReusable.locator("error-message");
	registry.add("errorMessage", { reuse: errorMessage });
	registry.add("error.invalidPassword", { reuse: errorMessage }).locator({ hasText: /invalid password/ });

	expect(registry.get("errorMessage")).toEqual({
		definition: { selector: "error-message", type: "locator" },
		locatorSchemaPath: "errorMessage",
		steps: [],
	});

	expect(registry.get("error.invalidPassword")).toEqual({
		definition: { options: { hasText: /invalid password/ }, selector: "error-message", type: "locator" },
		locatorSchemaPath: "error.invalidPassword",
		steps: [],
	});
});

test("add reuse by reusable locator inherits selector and discriminant", async ({ page }) => {
	type LocatorSchemaPaths = "errorMessage" | "error.invalidPassword";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const errorMessage = registry.createReusable.locator("error-message", { hasText: /invalid password/ });
	registry.add("errorMessage", { reuse: errorMessage });
	registry.add("error.invalidPassword", { reuse: errorMessage }).locator({ hasText: /invalid email/ });

	expect(registry.get("errorMessage")).toEqual({
		definition: { options: { hasText: /invalid password/ }, selector: "error-message", type: "locator" },
		locatorSchemaPath: "errorMessage",
		steps: [],
	});

	expect(registry.get("error.invalidPassword")).toEqual({
		definition: { options: { hasText: /invalid email/ }, selector: "error-message", type: "locator" },
		locatorSchemaPath: "error.invalidPassword",
		steps: [],
	});
});

test("add reuse with a reusable locator does not mutate the reusable definition", async ({ page }) => {
	type LocatorSchemaPaths = "heading" | "heading.first";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const reusable = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });

	registry.add("heading", { reuse: reusable });
	registry.add("heading.first", { reuse: reusable }).nth(0);

	expect(reusable.steps).toEqual([{ filter: { hasText: /Summary/ }, kind: "filter" }]);
	expect(registry.get("heading")).toEqual({
		definition: { role: "heading", options: { level: 2 }, type: "role" },
		locatorSchemaPath: "heading",
		steps: [{ filter: { hasText: /Summary/ }, kind: "filter" }],
	});

	expect(registry.get("heading.first")).toEqual({
		definition: { role: "heading", options: { level: 2 }, type: "role" },
		locatorSchemaPath: "heading.first",
		steps: [
			{ filter: { hasText: /Summary/ }, kind: "filter" },
			{ index: 0, kind: "index" },
		],
	});
});

test("add reuse enforces matching locator type overrides", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "button.reuseLocator";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const button = registry.createReusable.getByRole("button", { name: "Submit" });

	// @ts-expect-error mismatched locator strategies are not allowed when reusing a locator (getByText attempt on role locator)
	expect(() => registry.add("button", { reuse: button }).getByText("text")).toThrowError(
		'must use the "role" strategy',
	);

	registry.add("button", { reuse: button });

	expect(registry.get("button")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "button",
		steps: [],
	});

	// @ts-expect-error mismatched locator strategies are not allowed when reusing a locator (getById attempt on role locator)
	expect(() => registry.add("button.reuseLocator", { reuse: button }).getById("Submit")).toThrowError(
		'must use the "role" strategy',
	);

	registry.add("button.reuseLocator", { reuse: button }).getByRole({ name: "Submit" });

	expect(registry.get("button.reuseLocator")).toEqual({
		definition: { role: "button", options: { name: "Submit" }, type: "role" },
		locatorSchemaPath: "button.reuseLocator",
		steps: [],
	});
});

test("add reuse patches role options while preserving role value", async ({ page }) => {
	type LocatorSchemaPaths = "heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const h2 = registry.createReusable.getByRole("heading", { level: 2 });

	registry.add("heading", { reuse: h2 }).getByRole({ name: "Summary" });

	expect(registry.get("heading")).toEqual({
		definition: { role: "heading", options: { level: 2, name: "Summary" }, type: "role" },
		locatorSchemaPath: "heading",
		steps: [],
	});
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

	expect(`${locator}`).toEqual(
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

	expect(`${locator}`).toEqual(
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

	expect(`${locator}`).toEqual("getByRole('button').filter({ visible: true }).filter({ visible: false })");
});
