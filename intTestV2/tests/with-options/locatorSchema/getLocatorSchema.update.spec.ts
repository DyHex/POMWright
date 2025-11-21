import { expect, test } from "@fixtures-v2/withOptions";

test("update replaces intermediate definitions without mutating registry", async ({ testFilters }) => {
	const original = await testFilters.getNestedLocator("body.section.heading");
	expect(`${original}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const replaced = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section", { type: "role", role: "heading", options: { level: 1 } })
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
		.update("body", { type: "locator", selector: "SOMEBODY" })
		.update("body.section", { type: "role", role: "button", options: { name: "Click me!" } })
		.getNestedLocator();

	expect(`${chained}`).toEqual("locator('SOMEBODY').getByRole('button', { name: 'Click me!' })");
});

test("update merges options without requiring full definitions", async ({ testFilters }) => {
	const merged = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading", { options: { name: "HEADING TEXT" } })
		.getNestedLocator();

	expect(`${merged}`).toEqual(
		"locator('body').locator('section').getByRole('heading', { name: 'HEADING TEXT', level: 2 })",
	);
});

test("update handles full and partial definitions from fresh builders", async ({ testFilters }) => {
	const full = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading", { type: "role", role: "heading", options: { level: 3 } })
		.getNestedLocator();

	const partial = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading", { options: { level: 3 } })
		.getNestedLocator();

	expect(`${full}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
	expect(`${partial}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");
	expect(full).not.toBe(partial);
});

test("update preserves registered filters on untouched segments", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("fictional.filter@hasNotText.filter@hasText")
		.update("fictional.filter@hasNotText", {
			type: "role",
			role: "button",
			options: { name: "roleOptions" },
		})
		.update("fictional.filter@hasNotText.filter@hasText", {
			type: "locator",
			selector: "locator",
		})
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button', { name: 'roleOptions' }).filter({ hasNotText: 'hasNotText' }).locator('locator').filter({ hasText: 'hasText' })",
	);
});

test("update rejects unknown sub-paths", ({ testFilters }) => {
	expect(() =>
		testFilters
			.getLocatorSchema("body.section.heading")
			.update("body.section.missing", { type: "locator", selector: "noop" }),
	).toThrow('"body.section.missing" is not a valid sub-path of "body.section.heading"');
});

test("update can mix ancestor and descendant changes without mutating registry", async ({ testFilters }) => {
	const original = await testFilters.getNestedLocator("body.section.heading");

	const chained = await testFilters
		.getLocatorSchema("body.section.heading")
		.update("body", { selector: "SOMEBODY" })
		.update("body.section.heading", { options: { name: "HEADING TEXT" } })
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
		.update("fictional.filter@hasText", { type: "locator", selector: "updated" })
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('updated').filter({ hasText: 'hasText' })");
});

test("update can remove locator options filters", async ({ testFilters }) => {
	const original = await testFilters.getNestedLocator("body.section@playground");
	expect(`${original}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");

	const locator = await testFilters
		.getLocatorSchema("body.section@playground")
		.update("body.section@playground", { options: undefined })
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section')");
});
