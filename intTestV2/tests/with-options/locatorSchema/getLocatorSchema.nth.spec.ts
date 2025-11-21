import { expect, test } from "@fixtures-v2/withOptions";

test("nth applies numeric index to targeted sub-path", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("body.section.button")
		.nth("body.section.button", 1)
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section').getByRole('button').nth(1)");
});

test('nth supports "first" and "last" selectors', async ({ testFilters }) => {
	const first = await testFilters
		.getLocatorSchema("body.section.button")
		.nth("body.section.button", "first")
		.getNestedLocator();

	expect(`${first}`).toEqual("locator('body').locator('section').getByRole('button').first()");

	const last = await testFilters
		.getLocatorSchema("body.section.button")
		.nth("body.section.button", "last")
		.getNestedLocator();

	expect(`${last}`).toEqual("locator('body').locator('section').getByRole('button').last()");
});

test("nth can target intermediate sub-paths", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("body.section.heading")
		.nth("body", 0)
		.nth("body.section", 1)
		.nth("body.section.heading", -1)
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').first().locator('section').nth(1).getByRole('heading', { level: 2 }).last()",
	);
});

test("nth overrides are scoped to each builder instance", async ({ testFilters }) => {
	const builder = testFilters.getLocatorSchema("body.section.button");
	const first = await builder.nth("body.section.button", "first").getNestedLocator();
	const second = await testFilters.getLocatorSchema("body.section.button").getNestedLocator();

	expect(`${first}`).toEqual("locator('body').locator('section').getByRole('button').first()");
	expect(`${second}`).toEqual("locator('body').locator('section').getByRole('button')");
});
