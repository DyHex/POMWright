import { expect, test } from "@fixtures-v2/withOptions";

test("shorthand getLocator returns the same none-nested locator as getLocatorSchema.getLocator", async ({
	testPage,
}) => {
	const builderLocator = testPage.getLocatorSchema("topMenu.notifications.dropdown.item").getLocator();
	const shorthand = testPage.getLocator("topMenu.notifications.dropdown.item");

	expect(`${shorthand}`).toEqual(`${builderLocator}`);
});

test("shorthand getNestedLocator returns the same nested locator as getLocatorSchema.getNestedLocator", async ({
	testPage,
}) => {
	const builderLocator = testPage.getLocatorSchema("topMenu.notifications.dropdown.item").getNestedLocator();
	const shorthand = testPage.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${shorthand}`).toEqual(`${builderLocator}`);
});

test("independent builders do not share state", async ({ testFilters }) => {
	const modified = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ name: "hello", level: 3, exact: true })
		.getNestedLocator();

	const untouched = testFilters.getLocatorSchema("body.section.heading").getNestedLocator();

	expect(`${modified}`).toEqual(
		"locator('body').locator('section').getByRole('heading', { name: 'hello', exact: true, level: 3 })",
	);
	expect(`${untouched}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");
});

test("demonstrate filter and index implementation in v2", async ({ page, testFilters }) => {
	const schemaTwo = testFilters.getLocatorSchema("one.two");

	const initialLocator = schemaTwo.getNestedLocator();
	expect(`${initialLocator}`).toEqual("locator('div.one').locator('div.two').filter({ hasText: 'two' }).first()");

	schemaTwo
		.update("one.two")
		.locator()
		.clearSteps("one.two")
		.filter("one.two", { hasText: "NewText" })
		.filter("one.two", { hasText: "AdditionalText" })
		.nth("one.two", "last");
	const newLocator = schemaTwo.getNestedLocator();
	expect(`${newLocator}`).toEqual(
		"locator('div.one').locator('div.two').filter({ hasText: 'NewText' }).filter({ hasText: 'AdditionalText' }).last()",
	);

	schemaTwo
		.clearSteps("one.two")
		.filter("one.two", { hasText: "NewText" })
		.filter("one.two", { hasText: "AdditionalText" })
		.filter("one.two", { hasText: "AddedText" })
		.filter("one.two", { hasText: "LastText" })
		.nth("one", 0)
		.nth("one.two", 1);
	const updatedLocator = schemaTwo.getNestedLocator();
	expect(`${updatedLocator}`).toEqual(
		"locator('div.one').first().locator('div.two').filter({ hasText: 'NewText' }).filter({ hasText: 'AdditionalText' }).filter({ hasText: 'AddedText' }).filter({ hasText: 'LastText' }).nth(1)",
	);

	// But in vanilla Playwright we can do:

	const manualLocator = page
		.locator("div.one")
		.locator("div.two")
		.first()
		.filter({ hasText: "NewText" })
		.last()
		.filter({ hasText: "AdditionalText" })
		.filter({ hasText: "AddedText" })
		.filter({ hasText: "LastText" })
		.nth(1);
	expect(`${manualLocator}`).toEqual(
		"locator('div.one').locator('div.two').first().filter({ hasText: 'NewText' }).last().filter({ hasText: 'AdditionalText' }).filter({ hasText: 'AddedText' }).filter({ hasText: 'LastText' }).nth(1)",
	);

	const autoChainedLocator = testFilters
		.getLocatorSchema("one.two")
		.clearSteps("one.two")
		.nth("one.two", 0)
		.filter("one.two", { hasText: "NewText" })
		.nth("one.two", -1)
		.filter("one.two", { hasText: "AdditionalText" })
		.filter("one.two", { hasText: "AddedText" })
		.filter("one.two", { hasText: "LastText" })
		.nth("one.two", 1)
		.getNestedLocator();

	expect(`${autoChainedLocator}`).toEqual(`${manualLocator}`);

	const autoChainedLocatorWrapper = testFilters
		.getLocatorSchema("one.two")
		.clearSteps("one.two")
		.nth("one.two", 0)
		.filter("one.two", { hasText: "NewText" })
		.nth("one.two", -1)
		.filter("one.two", { hasText: "AdditionalText" })
		.filter("one.two", { hasText: "AddedText" })
		.filter("one.two", { hasText: "LastText" })
		.nth("one.two", 1)
		.getNestedLocator();

	expect(`${autoChainedLocatorWrapper}`).toEqual(`${manualLocator}`);
});
