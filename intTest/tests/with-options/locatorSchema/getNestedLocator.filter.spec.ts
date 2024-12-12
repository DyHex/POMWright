import { expect, test } from "@fixtures/withOptions";
import { GetByMethod } from "pomwright";

test("given the same locatorSchemaPath, getNestedLocator should return the equvalent of manually chaining with getLocator", async ({
	testPage,
}) => {
	const topMenu = await testPage.getLocator("topMenu");

	const topMenuNotifications = topMenu.locator(await testPage.getLocator("topMenu.notifications"));

	const topMenuNotificationsDropdown = topMenuNotifications.locator(
		await testPage.getLocator("topMenu.notifications.dropdown"),
	);

	const topMenuNotificationsDropdownItem = topMenuNotificationsDropdown.locator(
		await testPage.getLocator("topMenu.notifications.dropdown.item"),
	);

	expect(topMenuNotificationsDropdownItem).not.toBeNull();
	expect(topMenuNotificationsDropdownItem).not.toBeUndefined();
	expect(`${topMenuNotificationsDropdownItem}`).toEqual(
		"locator('.w3-top').locator(locator('.w3-dropdown-hover')).locator(locator('.w3-dropdown-content')).locator(locator('.w3-bar-item'))",
	);

	const automaticallyChainedLocator = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");
	expect(automaticallyChainedLocator).not.toBeNull();
	expect(automaticallyChainedLocator).not.toBeUndefined();
	expect(`${automaticallyChainedLocator}`).toEqual(`${topMenuNotificationsDropdownItem}`);
});

test.describe("getNestedLocator for locatorSchema with filter property", () => {
	type testCase = {
		getByMethod: GetByMethod;
		expected: string;
	};

	const testCases: testCase[] = [
		{ getByMethod: GetByMethod.role, expected: "getByRole('button')" },
		{ getByMethod: GetByMethod.text, expected: "getByText('text')" },
		{ getByMethod: GetByMethod.label, expected: "getByLabel('label')" },
		{ getByMethod: GetByMethod.placeholder, expected: "getByPlaceholder('placeholder')" },
		{ getByMethod: GetByMethod.altText, expected: "getByAltText('altText')" },
		{ getByMethod: GetByMethod.title, expected: "getByTitle('title')" },
		{ getByMethod: GetByMethod.locator, expected: "locator('locator')" },
		{ getByMethod: GetByMethod.dataCy, expected: "locator('data-cy=dataCy')" },
		{ getByMethod: GetByMethod.testId, expected: "getByTestId('testId')" },
		{ getByMethod: GetByMethod.id, expected: "locator('#id')" },
	];

	for (const { getByMethod, expected } of testCases) {
		test(`GetByMethod.${getByMethod}: should apply filter `, async ({ testFilters }) => {
			const undefinedFilter = await testFilters
				.getLocatorSchema("fictional.filter@undefined")
				.update({ locatorMethod: GetByMethod[getByMethod] })
				.getNestedLocator();

			expect(`${undefinedFilter}`).toEqual(expected);
		});
	}

	test("GetByMethod.frameLocator: should NOT apply filter", async ({ testFilters }) => {
		const chainWithFilter = testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
			.update({ locatorMethod: GetByMethod.frameLocator });

		expect(chainWithFilter.filter.hasText).toEqual("hasText");

		const chainedFrameLocator = await chainWithFilter.getNestedLocator();

		expect(`${chainedFrameLocator}`).toEqual(
			'internal:role=button[name="roleOptions"i] >> internal:has-not-text="hasNotText"i >> internal:chain=undefined',
		);
	});

	test("multiple nesting/chaining", async ({ testFilters }) => {
		const multiChainWithFilter = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.updates({
				1: { locatorMethod: GetByMethod.role },
				2: { locatorMethod: GetByMethod.locator },
				3: { locatorMethod: GetByMethod.testId },
				4: { locatorMethod: GetByMethod.label },
			})
			.getNestedLocator();

		expect(`${multiChainWithFilter}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator(locator('locator').filter({ hasText: 'locatorOptionsHasText' }).filter({ hasNotText: 'locatorOptionshasNotText' })).filter({ hasText: 'hasText' }).locator(getByTestId('testId')).filter({ hasNotText: 'hasNotText' }).locator(getByLabel('label', { exact: true })).filter({ hasText: 'hasText' })",
		);
	});

	test("filter with has: locator", async ({ testFilters }) => {
		const heading = await testFilters.getLocator("body.section.heading");

		const multiChainWithFilter = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText")
			.update({ locatorMethod: GetByMethod.role, filter: { has: heading } })
			.getNestedLocator();

		expect(`${multiChainWithFilter}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) })",
		);
	});

	test("filter with has: locatoasdasdr", async ({ testFilters }) => {
		const reset = testFilters.getLocatorSchema("body.section@playground.button@reset");

		console.log(reset);
	});
});
