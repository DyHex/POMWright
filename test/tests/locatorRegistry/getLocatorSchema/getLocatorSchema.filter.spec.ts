import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import {
	type FilterDefinition,
	LocatorRegistryInternal,
	type LocatorStrategyDefinition,
} from "../../../../src/locators";

test("filter adds an additional filter per sub-path", async ({ testFilters }) => {
	const filtered = testFilters
		.getLocatorSchema("body.section")
		.filter("body", { hasText: "Playground" })
		.filter("body.section", { hasText: "Primary Colors Playground" })
		.getNestedLocator();

	expect(`${filtered}`).toEqual(
		"locator('body').filter({ hasText: 'Playground' }).locator('section').filter({ hasText: 'Primary Colors Playground' })",
	);
});

test("filter with has locator", async ({ testFilters }) => {
	const heading = testFilters.getLocator("body.section.heading");

	const filtered = testFilters
		.getLocatorSchema("fictional.filter@hasNotText")
		.filter("fictional.filter@hasNotText", { has: heading })
		.getNestedLocator();

	expect(`${filtered}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) })",
	);
});

test("filter chaining is non-destructive", async ({ testFilters }) => {
	const base = testFilters.getNestedLocator("body.section");

	const filtered = testFilters
		.getLocatorSchema("body.section")
		.filter("body.section", { hasText: /Playground/i })
		.getNestedLocator();

	expect(`${filtered}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");

	const unchanged = testFilters.getNestedLocator("body.section");
	expect(`${unchanged}`).toEqual(`${base}`);
});

test("filter preserves call order when multiple filters target the same sub-path", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section@playground.button@reset")
		.filter("body.section@playground.button@reset", { hasText: /Reset/i })
		.filter("body.section@playground.button@reset", { hasText: /Color/i })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' }).filter({ hasText: /Reset/i }).filter({ hasText: /Color/i })",
	);
});

test("filter can layer ancestor and descendant filters simultaneously", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section@playground.button@red")
		.filter("body.section@playground.button@red", { hasText: /Red/i })
		.filter("body", { hasText: /Playground/i })
		.filter("body.section@playground", { hasText: /Primary Colors/i })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').filter({ hasText: /Playground/i }).locator('section').filter({ hasText: /Playground/i }).filter({ hasText: /Primary Colors/i }).getByRole('button', { name: 'Red' }).filter({ hasText: /Red/i })",
	);
});

test("filter accepts registry path strings for has/hasNot", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section@playground.button@reset")
		.filter("body.section@playground.button@reset", { has: "body.section.heading" })
		.filter("body.section@playground.button@reset", {
			hasNot: "body.section@playground.button@red",
		})
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button', { name: 'Red' }) })",
	);
});

test("filter accepts Playwright locators for has/hasNot", async ({ testFilters }) => {
	const hasLocator = testFilters.getLocator("body.section.heading");
	const hasNotLocator = testFilters.getLocator("body.section@playground.button@red");

	const locator = testFilters
		.getLocatorSchema("body.section@playground")
		.filter("body.section@playground", { has: hasLocator })
		.filter("body.section@playground", { hasNot: hasNotLocator })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').filter({ hasText: /Playground/i }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button', { name: 'Red' }) })",
	);
});

test("filters accept frame owner locators for has/hasNot", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasNotText")
		.filter("fictional.filter@hasNotText", {
			has: testFilters.page.frameLocator("iframe").owner(),
		})
		.getNestedLocator();

	const manual = testFilters.page.getByRole("button").filter({
		hasNotText: "hasNotText",
		has: testFilters.page.frameLocator("iframe").owner(),
	});

	expect(`${locator}`).toEqual(`${manual}`);
});

test("multiple nesting/chaining retains filters across the chain", async ({ testFilters }) => {
	const multiChain = testFilters
		.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
		.update("fictional.filter@hasNotText")
		.getByRole("button", { name: "roleOptions" })
		.update("fictional.filter@hasNotText.filter@hasText")
		.locator("locator", {
			hasText: "locatorOptionsHasText",
			hasNotText: "locatorOptionshasNotText",
		})
		.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
		.getByTestId("testId")
		.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
		.getByLabel("label", { exact: true })
		.getNestedLocator();

	expect(`${multiChain}`).toEqual(
		"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'locatorOptionsHasText' }).filter({ hasNotText: 'locatorOptionshasNotText' }).filter({ hasText: 'hasText' }).getByTestId('testId').filter({ hasNotText: 'hasNotText' }).getByLabel('label', { exact: true }).filter({ hasText: 'hasText' })",
	);
});

test("filter definitions that omit options stay stable", async ({ testFilters }) => {
	const nested = testFilters.getNestedLocator("fictional.filter@optionsUndefined");
	expect(`${nested}`).toEqual("getByRole('button')");
});

test("schema filters resolve path string references", async ({ testFilters, page }) => {
	const nested = testFilters.getNestedLocator("fictional.locatorAndOptionsWithfilter@allOptions");

	const manual = page.getByRole("button", { name: "roleOptions" }).filter({
		has: page.getByRole("heading", { level: 2 }),
		hasNot: page.getByRole("button"),
		hasText: "hasText",
		hasNotText: "hasNotText",
	});

	expect(`${nested}`).toEqual(`${manual}`);

	const has = page.getByRole("heading", { level: 2 });
	const hasNot = page.getByRole("button");

	const manual2 = page.getByRole("button", { name: "roleOptions" }).filter({
		has: has,
		hasNot: hasNot,
		hasText: "hasText",
		hasNotText: "hasNotText",
	});

	expect(`${nested}`).toEqual(`${manual2}`);

	expect(`${nested}`).toEqual(
		"getByRole('button', { name: 'roleOptions' }).filter({ hasText: 'hasText' }).filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button') })",
	);
});

test("frameLocator keeps the chain inside the frame and skips frame-level filters", async ({ testFilters, page }) => {
	const frameTerminalBuilder = testFilters
		.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
		.update("fictional.filter@hasNotText.filter@hasText")
		.frameLocator('iframe[title="name"]');

	const directFrameLocator = frameTerminalBuilder.getLocator();
	const manualFrame = page.frameLocator('iframe[title="name"]').owner();

	expect(`${directFrameLocator}`).toEqual(`${manualFrame}`);

	const nestedBuilder = testFilters
		.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
		.update("fictional.filter@hasNotText.filter@hasText")
		.frameLocator('iframe[title="name"]')
		.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
		.getByRole("button", { name: "inside frame" });

	const nested = nestedBuilder.getNestedLocator();
	const manualNested = page
		.getByRole("button")
		.filter({ hasNotText: "hasNotText" })
		.frameLocator('iframe[title="name"]')
		.getByRole("button", { name: "inside frame" })
		.filter({ hasNotText: "hasNotText" });

	expect(`${nested}`).toEqual(`${manualNested}`);
});

test.describe("getNestedLocator for locatorSchema with filter property", () => {
	type TestCase = {
		definition: LocatorStrategyDefinition;
		expected: string;
		label: string;
	};

	const testCases: TestCase[] = [
		{ label: "role", definition: { type: "role", role: "button" }, expected: "getByRole('button')" },
		{ label: "text", definition: { type: "text", text: "text" }, expected: "getByText('text')" },
		{ label: "label", definition: { type: "label", text: "label" }, expected: "getByLabel('label')" },
		{
			label: "placeholder",
			definition: { type: "placeholder", text: "placeholder" },
			expected: "getByPlaceholder('placeholder')",
		},
		{ label: "altText", definition: { type: "altText", text: "altText" }, expected: "getByAltText('altText')" },
		{ label: "title", definition: { type: "title", text: "title" }, expected: "getByTitle('title')" },
		{ label: "locator", definition: { type: "locator", selector: "locator" }, expected: "locator('locator')" },
		{ label: "testId", definition: { type: "testId", testId: "testId" }, expected: "getByTestId('testId')" },
		{ label: "id", definition: { type: "id", id: "id" }, expected: "locator('#id')" },
	];

	for (const { definition, expected, label } of testCases) {
		test(`definition ${label}: should apply filter`, async ({ testFilters }) => {
			const builder = testFilters.getLocatorSchema("fictional.filter@undefined").update("fictional.filter@undefined");

			const query = (() => {
				switch (definition.type) {
					case "role":
						return builder.getByRole(definition.role, definition.options);
					case "text":
						return builder.getByText(definition.text, definition.options);
					case "label":
						return builder.getByLabel(definition.text, definition.options);
					case "placeholder":
						return builder.getByPlaceholder(definition.text, definition.options);
					case "altText":
						return builder.getByAltText(definition.text, definition.options);
					case "title":
						return builder.getByTitle(definition.text, definition.options);
					case "locator":
						return builder.locator(definition.selector, definition.options);
					case "testId":
						return builder.getByTestId(definition.testId);
					case "id":
						return builder.getById(definition.id);
					case "frameLocator":
						return builder.frameLocator(definition.selector);
					default:
						throw new Error(`Unhandled definition type ${(definition as { type: string }).type}`);
				}
			})();

			const nested = query.getNestedLocator();

			expect(`${nested}`).toEqual(expected);
		});
	}
});

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("getLocatorSchema.filter supports Playwright Locator instances for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("item").getByRole("button");

	const locator = registry
		.getLocatorSchema("item")
		.filter({ has: page.getByRole("heading", { level: 2 }) })
		.filter({ hasNot: page.getByRole("heading", { level: 3 }) })
		.getLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('heading', { level: 3 }) })",
	);
});

test("getLocatorSchema.filter supports registry path strings for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item" | "heading.primary" | "heading.secondary";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("heading.primary").getByRole("heading", { level: 2 });
	registry.add("heading.secondary").getByRole("heading", { level: 3 });
	registry.add("item").getByRole("button");

	const locator = registry
		.getLocatorSchema("item")
		.filter({ has: "heading.primary" })
		.filter({ hasNot: "heading.secondary" })
		.getLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('heading', { level: 3 }) })",
	);
});

test("getLocatorSchema.filter rejects inline locator strategy definitions for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("item").getByRole("button");
	registry.getLocatorSchema("item");
	// @ts-expect-error inline locator definitions are no longer supported
	registry.getLocatorSchema("item").filter({ has: { type: "locator", selector: "section" } });

	const unsafeFilter = {
		has: { type: "locator", selector: "section" },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	expect(() => registry.getLocatorSchema("item").filter(unsafeFilter).getLocator()).toThrow(
		/Unsupported filter reference/,
	);
});

test("getLocatorSchema.filter rejects locator wrappers for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("item").getByRole("button");
	// @ts-expect-error locator wrapper is no longer supported
	registry.getLocatorSchema("item").filter({ has: { locator: { type: "locator", selector: "section" } } });

	const unsafeFilter = {
		has: { locator: { type: "locator", selector: "section" } },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	expect(() => registry.getLocatorSchema("item").filter(unsafeFilter).getLocator()).toThrow(
		/Unsupported filter reference/,
	);
});

test("getLocatorSchema.filter rejects locatorPath wrappers for has/hasNot", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("item").getByRole("button");
	// @ts-expect-error locatorPath wrapper is no longer supported
	registry.getLocatorSchema("item").filter({ has: { locatorPath: "item" } });

	const unsafeFilter = {
		has: { locatorPath: "item" },
	} as unknown as FilterDefinition<LocatorSchemaPaths, LocatorSchemaPaths>;

	expect(() => registry.getLocatorSchema("item").filter(unsafeFilter).getLocator()).toThrow(
		/Unsupported filter reference/,
	);
});

test("getLocatorSchema.filter supports visible true/false", async ({ page }) => {
	type LocatorSchemaPaths = "item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("item").getByRole("button");

	const locator = registry.getLocatorSchema("item").filter({ visible: true }).filter({ visible: false }).getLocator();

	expect(`${locator}`).toEqual("getByRole('button').filter({ visible: true }).filter({ visible: false })");
});
