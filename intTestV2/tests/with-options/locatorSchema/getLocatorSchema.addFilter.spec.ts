import { expect, test } from "@fixtures-v2/withOptions";

test("addFilter adds additional filters per sub-path", async ({ testFilters }) => {
	const filtered = await testFilters
		.getLocatorSchema("body.section")
		.filter("body", { hasText: "Playground" })
		.filter("body.section", { hasText: "Primary Colors Playground" })
		.getNestedLocator();

	expect(`${filtered}`).toEqual(
		"locator('body').filter({ hasText: 'Playground' }).locator('section').filter({ hasText: 'Primary Colors Playground' })",
	);
});

test("addFilter with has locator", async ({ testFilters }) => {
	const heading = await testFilters.getLocator("body.section.heading");

	const filtered = await testFilters
		.getLocatorSchema("fictional.filter@hasNotText")
		.filter("fictional.filter@hasNotText", { has: heading })
		.getNestedLocator();

	expect(`${filtered}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) })",
	);
});

test("addFilter chaining is non-destructive", async ({ testFilters }) => {
	const base = await testFilters.getNestedLocator("body.section");

	const filtered = await testFilters
		.getLocatorSchema("body.section")
		.filter("body.section", { hasText: /Playground/i })
		.getNestedLocator();

	expect(`${filtered}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");

	const unchanged = await testFilters.getNestedLocator("body.section");
	expect(`${unchanged}`).toEqual(`${base}`);
});

test("addFilter preserves order when multiple filters target the same sub-path", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("body.section@playground.button@reset")
		.filter("body.section@playground.button@reset", { hasText: /Reset/i })
		.filter("body.section@playground.button@reset", { hasText: /Color/i })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' }).filter({ hasText: /Reset/i }).filter({ hasText: /Color/i })",
	);
});

test("addFilter can layer ancestor and descendant filters simultaneously", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("body.section@playground.button@red")
		.filter("body", { hasText: /Playground/i })
		.filter("body.section@playground", { hasText: /Primary Colors/i })
		.filter("body.section@playground.button@red", { hasText: /Red/i })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').filter({ hasText: /Playground/i }).locator('section').filter({ hasText: /Playground/i }).filter({ hasText: /Primary Colors/i }).getByRole('button', { name: 'Red' }).filter({ hasText: /Red/i })",
	);
});

test("addFilter accepts locatorPath references for has/hasNot", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("body.section@playground.button@reset")
		.filter("body.section@playground.button@reset", { has: { locatorPath: "body.section.heading" } })
		.filter("body.section@playground.button@reset", {
			hasNot: { locatorPath: "body.section@playground.button@red" },
		})
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button', { name: 'Reset Color' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button', { name: 'Red' }) })",
	);
});

test("addFilter accepts inline locator definitions for has/hasNot", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("body.section@playground")
		.filter("body.section@playground", { has: { locator: { type: "locator", selector: "section" } } })
		.filter("body.section@playground", {
			hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } },
		})
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"locator('body').locator('section').filter({ hasText: /Playground/i }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
	);
});

test("clearSteps clears existing filters for a sub-path added through filters property", async ({ testFilters }) => {
	const schema = testFilters.getLocatorSchema("fictional.filter@hasText");

	const original = await schema.getNestedLocator();
	expect(`${original}`).toEqual("getByRole('button').filter({ hasText: 'hasText' })");

	const noFilters = await schema.clearSteps("fictional.filter@hasText").getNestedLocator();
	expect(`${noFilters}`).toEqual("getByRole('button')");
});

test("clearSteps allows re-adding filters after clearing filters added through filters property and addFilter method", async ({
	testFilters,
}) => {
	const original = await testFilters.getNestedLocator("fictional.filter@hasText");
	expect(`${original}`).toEqual("getByRole('button').filter({ hasText: 'hasText' })");

	const locator = await testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: "this filter will be removed" })
		.clearSteps("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: /Re-added/i })
		.getNestedLocator();

	expect(`${locator}`).toEqual("getByRole('button').filter({ hasText: /Re-added/i })");
});

test("clearSteps does not remove filters defined via locator options", async ({ testFilters }) => {
	const locator = await testFilters
		.getLocatorSchema("body.section@playground")
		.clearSteps("body.section@playground")
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section').filter({ hasText: /Playground/i })");
});
