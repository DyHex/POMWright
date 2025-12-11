import { expect, test } from "@fixtures-v2/withOptions";

test("demonstrate filter and index implementation in v2", async ({ page, testFilters }) => {
	const schemaTwo = testFilters.getLocatorSchema("one.two");

	const loc = await testFilters.getNestedLocator("one.two", { one: 0, "one.two": 0 });

	const initialLocator = await schemaTwo.getNestedLocator();
	expect(`${initialLocator}`).toEqual("locator('div.one').locator('div.two').filter({ hasText: 'two' }).first()");

	schemaTwo
		.update("one.two")
		.locator()
		.clearSteps("one.two")
		.filter("one.two", { hasText: "NewText" })
		.filter("one.two", { hasText: "AdditionalText" })
		.nth("one.two", "last");
	const newLocator = await schemaTwo.getNestedLocator();
	expect(`${newLocator}`).toEqual(
		"locator('div.one').locator('div.two').filter({ hasText: 'NewText' }).filter({ hasText: 'AdditionalText' }).last()",
	);

	schemaTwo.filter("one.two", { hasText: "AddedText" }).filter("one.two", { hasText: "LastText" });
	const updatedLocator = await schemaTwo.getNestedLocator({ one: 0, "one.two": 1 });
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

	const autoChainedLocator = await testFilters
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

	const autoChainedLocatorWrapper = await testFilters
		.getNestedLocator("one.two")
		.clearSteps("one.two")
		.nth("one.two", 0)
		.filter("one.two", { hasText: "NewText" })
		.nth("one.two", -1)
		.filter("one.two", { hasText: "AdditionalText" })
		.filter("one.two", { hasText: "AddedText" })
		.filter("one.two", { hasText: "LastText" })
		.nth("one.two", 1);

	expect(`${autoChainedLocatorWrapper}`).toEqual(`${manualLocator}`);
});
