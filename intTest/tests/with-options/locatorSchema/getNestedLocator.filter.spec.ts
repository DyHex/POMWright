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

test("given the same locatorSchemaPath, getNestedLocator should return the equvalent of manually chaining with getLocator - V2", async ({
	testPage,
}) => {
	const topMenu = testPage.getLocatorV2("topMenu");

	const topMenuNotifications = topMenu.locator(testPage.getLocatorV2("topMenu.notifications"));

	const topMenuNotificationsDropdown = topMenuNotifications.locator(
		testPage.getLocatorV2("topMenu.notifications.dropdown"),
	);

	const topMenuNotificationsDropdownItem = topMenuNotificationsDropdown.locator(
		testPage.getLocatorV2("topMenu.notifications.dropdown.item"),
	);

	expect(topMenuNotificationsDropdownItem).not.toBeNull();
	expect(topMenuNotificationsDropdownItem).not.toBeUndefined();
	expect(`${topMenuNotificationsDropdownItem}`).toEqual(
		"locator('.w3-top').locator(locator('.w3-dropdown-hover')).locator(locator('.w3-dropdown-content')).locator(locator('.w3-bar-item'))",
	);

	const automaticallyChainedLocator = testPage.getNestedLocatorV2("topMenu.notifications.dropdown.item");
	expect(automaticallyChainedLocator).not.toBeNull();
	expect(automaticallyChainedLocator).not.toBeUndefined();
	expect(`${automaticallyChainedLocator}`).not.toEqual(`${topMenuNotificationsDropdownItem}`);
	expect(`${automaticallyChainedLocator}`).toEqual(
		"locator('.w3-top').locator('.w3-dropdown-hover').locator('.w3-dropdown-content').locator('.w3-bar-item')",
	);
});

test.describe("getNestedLocator for locatorSchema with filter property", () => {
	type testCase = {
		getByMethod: GetByMethod;
		expected: string;
	};

	const testCases: testCase[] = [
		{ getByMethod: GetByMethod.role, expected: "getByRole('button').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.text, expected: "getByText('text').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.label, expected: "getByLabel('label').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.placeholder, expected: "getByPlaceholder('placeholder').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.altText, expected: "getByAltText('altText').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.title, expected: "getByTitle('title').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.locator, expected: "locator('locator').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.dataCy, expected: "locator('data-cy=dataCy').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.testId, expected: "getByTestId('testId').filter({ hasText: 'hello' })" },
		{ getByMethod: GetByMethod.id, expected: "locator('#id').filter({ hasText: 'hello' })" },
	];

	for (const { getByMethod, expected } of testCases) {
		test(`GetByMethod.${getByMethod}: should apply filter `, async ({ testFilters }) => {
			const undefinedFilter = await testFilters
				.getLocatorSchema("fictional.filter@undefined")
				.addFilter("fictional.filter@undefined", { hasText: "hello" })
				.update("fictional.filter@undefined", { locatorMethod: GetByMethod[getByMethod] })
				.getNestedLocator();

			expect(`${undefinedFilter}`).toEqual(expected);
		});
	}

	test("GetByMethod.frameLocator: should NOT apply filter", async ({ testFilters }) => {
		const chainWithFilter = testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
			.update("fictional.filter@hasNotText.filter@hasText", { locatorMethod: GetByMethod.frameLocator });

		expect.soft(chainWithFilter.filter.hasText).toEqual("hasText");

		const chainedFrameLocator = await chainWithFilter.getNestedLocator();

		expect(`${chainedFrameLocator}`).toEqual(
			'internal:role=button[name="roleOptions"i] >> internal:has-not-text="hasNotText"i >> internal:chain=undefined',
		);
	});

	test("GetByMethod.frameLocator: should NOT apply filter - V2", async ({ testFilters }) => {
		const chainWithFilter = testFilters.getLocatorSchemaV2("fictional.filter@hasNotText.filter@hasText");

		expect(`${chainWithFilter.getNestedLocator()}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).getByRole('button', { name: 'roleOptions' }).filter({ hasText: 'hasText' })",
		);

		const frameLocator = chainWithFilter
			.update("fictional.filter@hasNotText.filter@hasText")
			.frameLocator("someFrame")
			.getNestedLocator();

		expect(`${frameLocator}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('someFrame')",
		);

		const insideFrameLocator = testFilters
			.getLocatorSchemaV2("fictional.filter@hasNotText.filter@hasText")
			.update("fictional.filter@hasNotText")
			.frameLocator("someFrame")
			.getNestedLocator();

		expect(`${insideFrameLocator}`).toEqual(
			"locator('someFrame').contentFrame().getByRole('button', { name: 'roleOptions' }).filter({ hasText: 'hasText' })",
		);
	});

	test("multiple nesting/chaining", async ({ testFilters }) => {
		const multiChainWithFilter = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.update("fictional.filter@hasNotText", { locatorMethod: GetByMethod.role })
			.update("fictional.filter@hasNotText.filter@hasText", { locatorMethod: GetByMethod.locator })
			.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText", { locatorMethod: GetByMethod.testId })
			.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText", {
				locatorMethod: GetByMethod.label,
			})
			.getNestedLocator();

		expect(`${multiChainWithFilter}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator(locator('locator').filter({ hasText: 'locatorOptionsHasText' }).filter({ hasNotText: 'locatorOptionshasNotText' })).filter({ hasText: 'hasText' }).locator(getByTestId('testId')).filter({ hasNotText: 'hasNotText' }).locator(getByLabel('label', { exact: true })).filter({ hasText: 'hasText' })",
		);
	});

	test("multiple nesting/chaining - V2", async ({ testFilters }) => {
		const multiChainWithFilter = testFilters
			.getLocatorSchemaV2("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.update("fictional.filter@hasNotText")
			.getByRole()
			.update("fictional.filter@hasNotText.filter@hasText")
			.locator("locator")
			.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText")
			.getByTestId("testId")
			.update("fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText")
			.getByLabel("label", { exact: true })
			.getNestedLocator();

		expect(`${multiChainWithFilter}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'hasText' }).getByTestId('testId').filter({ hasNotText: 'hasNotText' }).getByLabel('label', { exact: true }).filter({ hasText: 'hasText' })",
		);
	});

	test("filter with has: locator", async ({ testFilters }) => {
		const heading = await testFilters.getLocator("body.section.heading");

		const multiChainWithFilter = await testFilters
			.getLocatorSchema("fictional.filter@hasNotText")
			.update("fictional.filter@hasNotText", { locatorMethod: GetByMethod.role, filter: { has: heading } })
			.getNestedLocator();

		expect(`${multiChainWithFilter}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) })",
		);
	});

	test("filter with has: locator - V2", async ({ testFilters }) => {
		const heading = testFilters.getLocatorV2("body.section.heading");

		const multiChainWithFilter = testFilters
			.getLocatorSchemaV2("fictional.filter@hasNotText")
			.update("fictional.filter@hasNotText")
			.getByRole()
			.filter("fictional.filter@hasNotText", { has: heading })
			.getNestedLocator();

		expect(`${multiChainWithFilter}`).toEqual(
			"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) })",
		);
	});

	test("filter with hasText", async ({ testFilters }) => {
		await testFilters.page.goto(testFilters.fullUrl);

		const playgroundRed = await testFilters.getNestedLocator("body.section@playground.button@red");
		await playgroundRed.click();

		const reset0 = await testFilters.getNestedLocator("body.section@playground.button@reset");

		expect(`${reset0}`).toEqual(
			"locator('body').locator(locator('section')).filter({ hasText: /Playground/i }).locator(getByRole('button', { name: 'Reset Color' }))",
		);

		const reset1 = await testFilters
			.getLocatorSchema("body.section@playground.button@reset")
			.addFilter("body.section@playground", { hasText: /Primary Colors/i })
			.addFilter("body.section@playground.button@reset", { hasText: /Reset/i })
			.addFilter("body.section@playground.button@reset", { hasText: /Color/i })
			.getNestedLocator();

		expect(`${reset1}`).toEqual(
			"locator('body').locator(locator('section')).filter({ hasText: /Playground/i }).filter({ hasText: /Primary Colors/i }).locator(getByRole('button', { name: 'Reset Color' })).filter({ hasText: /Reset/i }).filter({ hasText: /Color/i })",
		);

		const reset2 = await testFilters.getNestedLocator("body.section@playground.button@reset");

		expect(`${reset2}`).toEqual(
			"locator('body').locator(locator('section')).filter({ hasText: /Playground/i }).locator(getByRole('button', { name: 'Reset Color' }))",
		);

		await reset1.click();
		await playgroundRed.click();
		await reset2.click();
	});

	test("filter with hasText - V2", async ({ testFilters }) => {
		await testFilters.page.goto(testFilters.fullUrl);

		const playgroundRed = testFilters.getNestedLocatorV2("body.section@playground.button@red");
		await playgroundRed.click();

		const reset0 = testFilters.getNestedLocatorV2("body.section@playground.button@reset");

		expect(`${reset0}`).toEqual(
			"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' })",
		);

		const reset1 = testFilters
			.getLocatorSchemaV2("body.section@playground.button@reset")
			.filter("body.section@playground", { hasText: /Primary Colors/i })
			.filter("body.section@playground.button@reset", { hasText: /Reset/i })
			.filter("body.section@playground.button@reset", { hasText: /Color/i })
			.getNestedLocator();

		expect(`${reset1}`).toEqual(
			"locator('body').locator('section').filter({ hasText: /Playground/i }).filter({ hasText: /Primary Colors/i }).getByRole('button', { name: 'Reset Color' }).filter({ hasText: /Reset/i }).filter({ hasText: /Color/i })",
		);

		const reset2 = testFilters.getNestedLocatorV2("body.section@playground.button@reset");

		expect(`${reset2}`).toEqual(
			"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' })",
		);

		await reset1.click();
		await playgroundRed.click();
		await reset2.click();
	});
});
