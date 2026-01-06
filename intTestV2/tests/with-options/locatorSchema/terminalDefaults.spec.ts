import { expect, test } from "@fixtures-v2/withOptions";

const terminalPath = "body.section.button" as const;

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
