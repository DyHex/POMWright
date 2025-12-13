import { expect, test } from "@fixtures-v2/withOptions";

test("nth applies numeric index to targeted sub-path", async ({ testFilters }) => {
	const locator = testFilters.getLocatorSchema("body.section.button").nth("body.section.button", 1).getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section').getByRole('button').nth(1)");
});

test('nth supports "first" and "last" selectors', async ({ testFilters }) => {
	const first = testFilters
		.getLocatorSchema("body.section.button")
		.nth("body.section.button", "first")
		.getNestedLocator();

	expect(`${first}`).toEqual("locator('body').locator('section').getByRole('button').first()");

	const last = testFilters
		.getLocatorSchema("body.section.button")
		.nth("body.section.button", "last")
		.getNestedLocator();

	expect(`${last}`).toEqual("locator('body').locator('section').getByRole('button').last()");
});

test("nth can target intermediate sub-paths", async ({ testFilters }) => {
	const locator = testFilters
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
	const first = builder.nth("body.section.button", "first").getNestedLocator();
	const second = testFilters.getLocatorSchema("body.section.button").getNestedLocator();

	expect(`${first}`).toEqual("locator('body').locator('section').getByRole('button').first()");
	expect(`${second}`).toEqual("locator('body').locator('section').getByRole('button')");
});

test("filter and nth ordering apply per sub-path when chained on getLocatorSchema", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("one.two")
		.clearSteps("one.two")
		.filter("one", { hasText: "outer" })
		.nth("one", "first")
		.filter("one.two", { hasText: "inner" })
		.nth("one.two", "last")
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('div.one').filter({ hasText: 'outer' }).first().locator('div.two').filter({ hasText: 'inner' }).last()",
	);
});
