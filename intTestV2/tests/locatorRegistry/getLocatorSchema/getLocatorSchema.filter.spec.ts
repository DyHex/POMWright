import { expect, test } from "@fixtures-v2/withOptions";
import type { LocatorStrategyDefinition } from "../../../../srcV2/locators";

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

test("filter accepts locatorPath references for has/hasNot", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section@playground.button@reset")
		.filter("body.section@playground.button@reset", { has: { locatorPath: "body.section.heading" } })
		.filter("body.section@playground.button@reset", {
			hasNot: { locatorPath: "body.section@playground.button@red" },
		})
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button', { name: 'Red' }) })",
	);
});

test("filter accepts inline locator definitions for has/hasNot", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section@playground")
		.filter("body.section@playground", { has: { locator: { type: "locator", selector: "section" } } })
		.filter("body.section@playground", {
			hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } },
		})
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').filter({ hasText: /Playground/i }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
	);
});

test("framelocator definitions are rejected inside filters", async ({ testFilters }) => {
	expect(() =>
		testFilters
			.getLocatorSchema("fictional.filter@hasNotText")
			.filter("fictional.filter@hasNotText", {
				has: { locator: { type: "frameLocator", selector: "iframe" } },
			})
			.getNestedLocator(),
	).toThrow(/Frame locators cannot be used as filter locators/);
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

test("schema filters resolve locatorPath references", async ({ testFilters, page }) => {
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

test("schema filters can inline locator definitions", async ({ testFilters }) => {
	const nested = testFilters.getNestedLocator("fictional.locatorWithfilter@allOptions");

	expect(`${nested}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasNotText: 'hasNotText' }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
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
