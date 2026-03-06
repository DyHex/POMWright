import { expect, test } from "@fixtures/testApp.fixtures";

const terminalPath = "body.section.button" as const;

test("clearSteps clears existing filters for a sub-path", async ({ testFilters }) => {
	const schema = testFilters.getLocatorSchema("fictional.filter@hasText");

	const original = schema.getNestedLocator();
	expect(`${original}`).toEqual("getByRole('button').filter({ hasText: 'hasText' })");

	const noFilters = schema.clearSteps("fictional.filter@hasText").getNestedLocator();
	expect(`${noFilters}`).toEqual("getByRole('button')");
});

test("clearSteps allows re-adding filters after clearing filters added through filter", async ({ testFilters }) => {
	const original = testFilters.getNestedLocator("fictional.filter@hasText");
	expect(`${original}`).toEqual("getByRole('button').filter({ hasText: 'hasText' })");

	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: "this filter will be removed" })
		.clearSteps("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: /Re-added/i })
		.getNestedLocator();

	expect(`${locator}`).toEqual("getByRole('button').filter({ hasText: /Re-added/i })");
});

test("clearSteps does not remove filters defined via locator options", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section@playground")
		.clearSteps("body.section@playground")
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");
});

test("filter resolves path string and locator references after clearing steps", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasNotText")
		.clearSteps("fictional.filter@hasNotText")
		.filter("fictional.filter@hasNotText", { has: "body.section.heading" })
		.filter("fictional.filter@hasNotText", { hasNot: testFilters.page.locator(".missing") })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: locator('.missing') })",
	);
});

test("nth defaults to the terminal path when subPath is omitted", async ({ testFilters }) => {
	const explicit = testFilters.getLocatorSchema(terminalPath).nth(terminalPath, 0).getNestedLocator();
	const implicit = testFilters.getLocatorSchema(terminalPath).nth(0).getNestedLocator();

	expect(`${explicit}`).toEqual("locator('body').locator('section').getByRole('button').first()");
	expect(`${implicit}`).toEqual(`${explicit}`);
});

test("filter defaults to the terminal path when subPath is omitted", async ({ testFilters }) => {
	const explicit = testFilters
		.getLocatorSchema(terminalPath)
		.filter(terminalPath, { hasText: /click/i })
		.getNestedLocator();
	const implicit = testFilters.getLocatorSchema(terminalPath).filter({ hasText: /click/i }).getNestedLocator();

	expect(`${explicit}`).toEqual("locator('body').locator('section').getByRole('button').filter({ hasText: /click/i })");
	expect(`${implicit}`).toEqual(`${explicit}`);
});

test("clearSteps defaults to the terminal path when subPath is omitted", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema(terminalPath)
		.filter({ hasText: /click/i })
		.nth(1)
		.clearSteps()
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section').getByRole('button')");
});

test("update defaults to the terminal path when subPath is omitted", async ({ testFilters }) => {
	const updated = testFilters.getLocatorSchema(terminalPath).update().getByRole({ name: "Reset Color" }).getLocator();

	expect(`${updated}`).toEqual("getByRole('button', { name: 'Reset Color' })");
});

test("replace defaults to the terminal path when subPath is omitted", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema(terminalPath)
		.replace()
		.locator("button.replace", { hasText: /Replace/ })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').locator('button.replace').filter({ hasText: /Replace/ })",
	);
});

test("remove defaults to the terminal path when subPath is omitted", async ({ testFilters }) => {
	const builder = testFilters.getLocatorSchema(terminalPath).remove();

	await expect(async () => builder.getNestedLocator()).rejects.toThrow(
		'No locator schema registered for path "body.section.button".',
	);
});
