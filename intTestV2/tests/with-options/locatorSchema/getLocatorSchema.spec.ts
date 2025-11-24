import { expect, test } from "@fixtures-v2/withOptions";

test("shorthand getLocator returns the same none-nested locator as getLocatorSchema.getLocator", async ({
	testPage,
}) => {
	const builderLocator = await testPage.getLocatorSchema("topMenu.notifications.dropdown.item").getLocator();
	const shorthand = await testPage.getLocator("topMenu.notifications.dropdown.item");

	expect(`${shorthand}`).toEqual(`${builderLocator}`);
});

test("shorthand getNestedLocator returns the same nested locator as getLocatorSchema.getNestedLocator", async ({
	testPage,
}) => {
	const builderLocator = await testPage.getLocatorSchema("topMenu.notifications.dropdown.item").getNestedLocator();
	const shorthand = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${shorthand}`).toEqual(`${builderLocator}`);
});

test("independent builders do not share state", async ({ testFilters }) => {
	const modified = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading", { type: "role", options: { name: "hello", level: 3, exact: true } })
		.getNestedLocator();

	const untouched = await testFilters.getLocatorSchema("body.section.heading").getNestedLocator();

	expect(`${modified}`).toEqual(
		"locator('body').locator('section').getByRole('heading', { name: 'hello', exact: true, level: 3 })",
	);
	expect(`${untouched}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");
});

test("getLocatorSchema propagates registered filters and indices to getLocator", async ({ testFilters }) => {
	await testFilters.page.goto(testFilters.fullUrl);

	const locator = await testFilters
		.getLocatorSchema("body.section@playground.button@reset")
		.addFilter("body.section@playground.button@reset", { hasText: /Reset/i })
		.nth("body.section@playground.button@reset", "first")
		.getLocator();

	expect(`${locator}`).toEqual("getByRole('button', { name: 'Reset Color' }).filter({ hasText: /Reset/i }).first()");
});
