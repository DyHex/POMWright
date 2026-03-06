import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { type FilterDefinition, LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("add records chained filters and indices in order for nested paths", async ({ page }) => {
	type LocatorSchemaPaths = "list" | "list.item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("list").locator("ul.list").filter({ hasText: "List" }).nth(1).filter({ hasText: "Hello" });
	registry
		.add("list.item")
		.getByRole("listitem", { name: /Row/ })
		.filter({ hasText: "Row" })
		.nth("last")
		.filter({ hasText: "Goodbye" });

	const nested = registry.getNestedLocator("list.item");

	expect(`${nested}`).toEqual(
		"locator('ul.list').filter({ hasText: 'List' }).nth(1).filter({ hasText: 'Hello' }).getByRole('listitem', { name: /Row/ }).filter({ hasText: 'Row' }).last().filter({ hasText: 'Goodbye' })",
	);
});

test("add.filter supports Playwright Locator instances for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry
		.add("item")
		.getByRole("button")
		.filter({ has: page.getByRole("heading", { level: 2 }) })
		.filter({ hasNot: page.getByRole("heading", { level: 3 }) });

	const locator = registry.getLocator("item");

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('heading', { level: 3 }) })",
	);
});

test("add.filter supports registry path strings for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item" | "heading.primary" | "heading.secondary";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("heading.primary").getByRole("heading", { level: 2 });
	registry.add("heading.secondary").getByRole("heading", { level: 3 });
	registry.add("item").getByRole("button").filter({ has: "heading.primary" }).filter({ hasNot: "heading.secondary" });

	const locator = registry.getLocator("item");

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('heading', { level: 3 }) })",
	);
});

test("add.filter rejects inline locator strategy definitions for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item.inline.invalid" | "item.inline.invalid2" | "item.inline.runtime";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry
		.add("item.inline.invalid")
		.getByRole("button")
		// @ts-expect-error inline locator definitions are no longer supported
		.filter({ has: { type: "locator", selector: "section" } });

	registry
		.add("item.inline.invalid2")
		.getByRole("button")
		// @ts-expect-error inline locator definitions are no longer supported
		.filter({ hasNot: { type: "locator", selector: "[data-cy=missing]" } });

	const unsafeFilter = {
		has: { type: "locator", selector: "section" },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	registry.add("item.inline.runtime").getByRole("button").filter(unsafeFilter);

	expect(() => registry.getLocator("item.inline.runtime")).toThrow(/Unsupported filter reference/);
});

test("add.filter rejects locator wrappers for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item.wrapper.invalid" | "item.wrapper.invalid2" | "item.wrapper.runtime";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry
		.add("item.wrapper.invalid")
		.getByRole("button")
		// @ts-expect-error locator wrapper is no longer supported
		.filter({ has: { locator: { type: "locator", selector: "section" } } });

	registry
		.add("item.wrapper.invalid2")
		.getByRole("button")
		// @ts-expect-error locator wrapper is no longer supported
		.filter({ hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } } });

	const unsafeFilter = {
		has: { locator: { type: "locator", selector: "section" } },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	registry.add("item.wrapper.runtime").getByRole("button").filter(unsafeFilter);

	expect(() => registry.getLocator("item.wrapper.runtime")).toThrow(/Unsupported filter reference/);
});

test("add.filter rejects locatorPath wrappers for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item.locatorPath.invalid" | "item.locatorPath.runtime";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry
		.add("item.locatorPath.invalid")
		.getByRole("button")
		// @ts-expect-error locatorPath wrapper is no longer supported
		.filter({ has: { locatorPath: "item.locatorPath.invalid" } });

	const unsafeFilter = {
		has: { locatorPath: "item" },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	registry.add("item.locatorPath.runtime").getByRole("button").filter(unsafeFilter);

	expect(() => registry.getLocator("item.locatorPath.runtime")).toThrow(/Unsupported filter reference/);
});

test("add.filter supports visible true/false", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("item").getByRole("button").filter({ visible: true }).filter({ visible: false });

	const locator = registry.getLocator("item");

	expect(`${locator}`).toEqual("getByRole('button').filter({ visible: true }).filter({ visible: false })");
});
