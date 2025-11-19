import { expect, test } from "@fixtures-v2/withOptions";
import type { LocatorStrategyDefinition } from "pomwright";

test("given the same locators, nestedLocator should return the equivalent of manually chaining with playwright page.locator", async ({
	testPage,
	page,
}) => {
	const topMenuNotificationsDropdownItem = page
		.locator(".w3-top") // topMenu
		.locator(".w3-dropdown-hover") // topMenu.notifications
		.locator(".w3-dropdown-content") // topMenu.notifications.dropdown
		.locator(".w3-bar-item"); // topMenu.notifications.dropdown.item

	expect(`${topMenuNotificationsDropdownItem}`).toEqual(
		"locator('.w3-top').locator('.w3-dropdown-hover').locator('.w3-dropdown-content').locator('.w3-bar-item')",
	);

	const automaticallyChainedLocator = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");
	expect(automaticallyChainedLocator).not.toBeNull();
	expect(automaticallyChainedLocator).not.toBeUndefined();
	expect(`${automaticallyChainedLocator}`).toEqual(`${topMenuNotificationsDropdownItem}`);
});

test.describe("getNestedLocator for locatorSchema with filter property", () => {
	type TestCase = {
		definition: LocatorStrategyDefinition;
		expected: string;
		label: string;
	};

	const testCases: TestCase[] = [
		{
			label: "role",
			definition: { type: "role", role: "button" },
			expected: "getByRole('button')",
		},
		{
			label: "text",
			definition: { type: "text", text: "text" },
			expected: "getByText('text')",
		},
		{
			label: "label",
			definition: { type: "label", text: "label" },
			expected: "getByLabel('label')",
		},
		{
			label: "placeholder",
			definition: { type: "placeholder", text: "placeholder" },
			expected: "getByPlaceholder('placeholder')",
		},
		{
			label: "altText",
			definition: { type: "altText", text: "altText" },
			expected: "getByAltText('altText')",
		},
		{
			label: "title",
			definition: { type: "title", text: "title" },
			expected: "getByTitle('title')",
		},
		{
			label: "locator",
			definition: { type: "locator", selector: "locator" },
			expected: "locator('locator')",
		},
		{
			label: "dataCy",
			definition: { type: "dataCy", value: "dataCy" },
			expected: "locator('data-cy=dataCy')",
		},
		{
			label: "testId",
			definition: { type: "testId", testId: "testId" },
			expected: "getByTestId('testId')",
		},
		{
			label: "id",
			definition: { type: "id", id: "id" },
			expected: "locator('#id')",
		},
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

		console.log("nested frameLocator:", `${nested}`);
		console.log("nested frameLocator:", `${JSON.stringify(nested)}`);

		const nested2 = nested.getByRole("button");

		expect(`${nested2}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).locator('iframe[title=\"name\"]').contentFrame().getByRole('button')",
		);

		console.log("nested2 frameLocator:", `${nested2}`);

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).locator('iframe[title=\"name\"]').contentFrame()",
		);
	});

	test("multiple nesting/chaining", async ({ testFilters }) => {
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

	test("filter with has: locator", async ({ testFilters }) => {
		const heading = await testFilters.getLocator("body.section.heading");

		const nested = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText")
			.addFilter("fictional.filter@hasNotText", { has: heading })
			.getNestedLocator();

		expect(`${nested}`).toEqual(
			"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) })",
		);
	});

	test("filter with hasText", async ({ testFilters }) => {
		await testFilters.page.goto(testFilters.fullUrl);

		const playgroundRed = await testFilters.getNestedLocator("body.section@playground.button@red");
		await playgroundRed.click();

		const reset0 = await testFilters.getNestedLocator("body.section@playground.button@reset");

		expect(`${reset0}`).toEqual(
			"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' })",
		);

		const reset1 = await testFilters
			.getLocatorSchema("body.section@playground.button@reset")
			.addFilter("body.section@playground", { hasText: /Primary Colors/i })
			.nth("body.section@playground", 0)
			.addFilter("body.section@playground.button@reset", { hasText: /Reset/i })
			.addFilter("body.section@playground.button@reset", { hasText: /Color/i })
			.nth("body.section@playground.button@reset", "first")
			.getNestedLocator();

		expect(`${reset1}`).toEqual(
			"locator('body').locator('section').filter({ hasText: /Playground/i }).filter({ hasText: /Primary Colors/i }).first().getByRole('button', { name: 'Reset Color' }).filter({ hasText: /Reset/i }).filter({ hasText: /Color/i }).first()",
		);

		const reset2 = await testFilters.getNestedLocator("body.section@playground.button@reset");

		expect(`${reset2}`).toEqual(
			"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' })",
		);

		await reset1.click();
		await playgroundRed.click();
		await reset2.click();
	});
});
