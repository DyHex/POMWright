import { expect, test } from "@fixtures-v2/withOptions";

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
