import { expect, test } from "@fixtures-v2/withOptions";

test("update replaces intermediate definitions without mutating registry", async ({ testFilters }) => {
	const original = await testFilters.getNestedLocator("body.section.heading");
	expect(`${original}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const replaced = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section")
		.getByRole("heading", { level: 1 })
		.getNestedLocator();

	expect(`${replaced}`).toEqual(
		"locator('body').getByRole('heading', { level: 1 }).getByRole('heading', { level: 2 })",
	);

	const after = await testFilters.getNestedLocator("body.section.heading");
	expect(`${after}`).toEqual(`${original}`);
});

test("update operations can be chained across sub-paths", async ({ testFilters }) => {
	const chained = await testFilters
		.getLocatorSchema("body.section")
		.update("body")
		.locator("SOMEBODY")
		.update("body.section")
		.getByRole("button", { name: "Click me!" })
		.getNestedLocator();

	expect(`${chained}`).toEqual("locator('SOMEBODY').getByRole('button', { name: 'Click me!' })");
});

test("update merges options without requiring full definitions", async ({ testFilters }) => {
	const merged = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ name: "HEADING TEXT" })
		.getNestedLocator();

	expect(`${merged}`).toEqual(
		"locator('body').locator('section').getByRole('heading', { name: 'HEADING TEXT', level: 2 })",
	);
});

test("update handles full and partial definitions from fresh builders", async ({ testFilters }) => {
	const full = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 3 })
		.getNestedLocator();

	const partial = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ level: 3 })
		.getNestedLocator();

	expect(`${full}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
	expect(`${partial}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
	expect(full).not.toBe(partial);
});

test("update preserves registered filters on untouched segments", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
		.update("fictional.filter@hasNotText")
		.getByRole("button", { name: "roleOptions" })
		.update("fictional.filter@hasNotText.filter@hasText")
		.locator("locator")
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'hasText' })",
	);
});

test("update rejects unknown sub-paths", ({ testFilters }) => {
	expect(() =>
		testFilters.getLocatorSchema("body.section.heading").update("body.section.missing").locator("noop"),
	).toThrow('"body.section.missing" is not a valid sub-path of "body.section.heading"');
});

test("update can mix ancestor and descendant changes without mutating registry", async ({ testFilters }) => {
	const original = await testFilters.getNestedLocator("body.section.heading");

	const chained = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body")
		.locator("SOMEBODY")
		.update("body.section.heading")
		.getByRole({ name: "HEADING TEXT" })
		.getNestedLocator();

	expect(`${chained}`).toEqual(
		"locator('SOMEBODY').locator('section').getByRole('heading', { name: 'HEADING TEXT', level: 2 })",
	);

	const after = await testFilters.getNestedLocator("body.section.heading");
	expect(`${after}`).toEqual(`${original}`);
});

test("update preserves filters on the target sub-path", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.update("fictional.filter@hasText")
		.locator("updated")
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('updated').filter({ hasText: 'hasText' })");
});

test("update patches definitions without altering chained filters or indices", async ({ testFilters }) => {
	const updated = await testFilters
		.getLocatorSchema("body.section.button")
		.filter("body.section.button", { hasText: /Click me!/ })
		.nth("body.section", "first")
		.update("body.section.button")
		.getByRole("button", { name: "Click me!" })
		.getNestedLocator();

	expect(`${updated}`).toEqual(
		"locator('body').locator('section').first().getByRole('button', { name: 'Click me!' }).filter({ hasText: /Click me!/ })",
	);

	const untouched = await testFilters.getLocatorSchema("body.section.button").getNestedLocator();
	expect(`${untouched}`).toEqual("locator('body').locator('section').getByRole('button')");
});

test("update can remove locator options filters", async ({ testFilters }) => {
	const original = await testFilters.getNestedLocator("body.section@playground");
	expect(`${original}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");

	const locator = await testFilters
		.getLocatorSchema("body.section@playground")
		.update("body.section@playground")
		.locator(undefined, undefined)
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section')");
});
