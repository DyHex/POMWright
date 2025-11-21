import { expect, test } from "@fixtures-v2/withOptions";
import type { LocatorStrategyDefinition } from "pomwright";

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
		{ label: "dataCy", definition: { type: "dataCy", value: "dataCy" }, expected: "locator('data-cy=dataCy')" },
		{ label: "testId", definition: { type: "testId", testId: "testId" }, expected: "getByTestId('testId')" },
		{ label: "id", definition: { type: "id", id: "id" }, expected: "locator('#id')" },
	];

	for (const { definition, expected, label } of testCases) {
		test(`definition ${label}: should apply filter`, async ({ testFilters }) => {
			const nested = await testFilters
				.getLocatorSchema("fictional.filter@undefined")
				.update("fictional.filter@undefined", definition)
				.getNestedLocator();

			expect(`${nested}`).toEqual(expected);
		});
	}

	test("frameLocator should NOT apply filter", async ({ testFilters }) => {
		const nested = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
			.update("fictional.filter@hasNotText.filter@hasText", {
				type: "frameLocator",
				selector: 'iframe[title="name"]',
			})
			.getNestedLocator();

		const nested2 = nested.getByRole("button");

		expect(`${nested2}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).locator('iframe[title=\"name\"]').contentFrame().getByRole('button')",
		);

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).locator('iframe[title=\"name\"]').contentFrame()",
		);
	});

	test("multiple nesting/chaining retains filters across the chain", async ({ testFilters }) => {
		const multiChain = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.update("fictional.filter@hasNotText", {
				type: "role",
				role: "button",
				options: { name: "roleOptions" },
			})
			.update("fictional.filter@hasNotText.filter@hasText", {
				type: "locator",
				selector: "locator",
				options: {
					hasText: "locatorOptionsHasText",
					hasNotText: "locatorOptionshasNotText",
				},
			})
			.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText", {
				type: "testId",
				testId: "testId",
			})
			.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText", {
				type: "label",
				text: "label",
				options: { exact: true },
			})
			.getNestedLocator();

		expect(`${multiChain}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'locatorOptionsHasText' }).filter({ hasNotText: 'locatorOptionshasNotText' }).filter({ hasText: 'hasText' }).getByTestId('testId').filter({ hasNotText: 'hasNotText' }).getByLabel('label', { exact: true }).filter({ hasText: 'hasText' })",
		);
	});

	test("filter definitions that omit options stay stable", async ({ testFilters }) => {
		const nested = await testFilters.getNestedLocator("fictional.filter@optionsUndefined");
		expect(`${nested}`).toEqual("getByRole('button')");
	});

	test("schema filters resolve locatorPath references", async ({ testFilters, page }) => {
		const nested = await testFilters.getNestedLocator("fictional.locatorAndOptionsWithfilter@allOptions");

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
		const nested = await testFilters.getNestedLocator("fictional.locatorWithfilter@allOptions");

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasNotText: 'hasNotText' }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
		);
	});

	test("frame locator definitions are rejected inside filters", async ({ testFilters }) => {
		await expect(
			testFilters
				.getLocatorSchema("fictional.filter@hasNotText")
				.addFilter("fictional.filter@hasNotText", {
					has: { locator: { type: "frameLocator", selector: "iframe" } },
				})
				.getNestedLocator(),
		).rejects.toThrow(/Frame locators cannot be used as filter locators/);
	});

	test("getNestedLocator resolves has/hasNot locatorPath references", async ({ testFilters }) => {
		const nested = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText")
			.addFilter("fictional.filter@hasNotText", { has: { locatorPath: "body.section.heading" } })
			.addFilter("fictional.filter@hasNotText", { hasNot: { locatorPath: "body.section@playground.button@red" } })
			.getNestedLocator();

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button', { name: 'Red' }) })",
		);
	});

	test("getNestedLocator resolves inline locator definitions for has/hasNot", async ({ testFilters }) => {
		const nested = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText")
			.addFilter("fictional.filter@hasNotText", { has: { locator: { type: "locator", selector: "section" } } })
			.addFilter("fictional.filter@hasNotText", {
				hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } },
			})
			.getNestedLocator();

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
		);
	});
});
