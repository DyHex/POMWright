import { expect, test } from "@fixtures-v2/withOptions";

test("getNestedLocator fluent wrapper records filters and indices in call order", async ({ testFilters }) => {
	const chained = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: "extra" })
		.nth("fictional.filter@hasText", 1)
		.getNestedLocator();

	expect(`${chained}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1)",
	);
});

test("getNestedLocator fluent wrapper supports update and clearSteps", async ({ testFilters }) => {
	const updated = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 3 })
		.getNestedLocator();

	expect(`${updated}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");

	const cleared = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.clearSteps("fictional.filter@hasText")
		.getNestedLocator();

	expect(`${cleared}`).toEqual("getByRole('button')");
});

test("getNestedLocator fluent update can switch strategies without a terminator", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByText("Updated heading")
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section').getByText('Updated heading')");
});

test("getNestedLocator update accepts partial patch arguments", async ({ testFilters }) => {
	const baseline = testFilters.getNestedLocator("body.section.heading");

	expect(`${baseline}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const noArgs = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole()
		.getNestedLocator();

	expect(`${noArgs}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const optionsOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ level: 4 })
		.getNestedLocator();

	expect(`${optionsOnly}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 4 })");

	const roleOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading")
		.getNestedLocator();

	expect(`${roleOnly}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const roleAndOptions = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 5 })
		.getNestedLocator();

	expect(`${roleAndOptions}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 5 })");
});

test("getNestedLocator resolves has/hasNot locatorPath references", async ({ testFilters }) => {
	const nested = testFilters
		.getLocatorSchema("fictional.filter@hasNotText")
		.filter("fictional.filter@hasNotText", { has: { locatorPath: "body.section.heading" } })
		.filter("fictional.filter@hasNotText", { hasNot: { locatorPath: "body.section@playground.button@red" } })
		.getNestedLocator();

	expect(`${nested}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button', { name: 'Red' }) })",
	);
});

test("getNestedLocator resolves inline locator definitions for has/hasNot", async ({ testFilters }) => {
	const nested = testFilters
		.getLocatorSchema("fictional.filter@hasNotText")
		.filter("fictional.filter@hasNotText", { has: { locator: { type: "locator", selector: "section" } } })
		.filter("fictional.filter@hasNotText", {
			hasNot: { locator: { type: "locator", selector: "[data-cy=missing]" } },
		})
		.getNestedLocator();

	expect(`${nested}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
	);
});

const fullPath = "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText" as const;
const expectedChain =
	"getByRole('button').filter({ hasNotText: 'hasNotText' }).nth(2).getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })";

test("getNestedLocator applies chained indices", async ({ testFilters }) => {
	const locator = testFilters.getLocatorSchema(fullPath).nth("fictional.filter@hasNotText", 2).getNestedLocator();

	expect(`${locator}`).toContain(".nth(2)");
	expect(`${locator}`).toEqual(expectedChain);
});

test("getLocatorSchema.getNestedLocator applies chained indices", async ({ testFilters }) => {
	const locator = testFilters.getLocatorSchema(fullPath).nth("fictional.filter@hasNotText", 2).getNestedLocator();

	expect(`${locator}`).toContain(".nth(2)");
	expect(`${locator}`).toEqual(expectedChain);
});

test("getNestedLocator honors chained filters and indices", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: "extra" })
		.nth("fictional.filter@hasText", 1)
		.filter("fictional.filter@hasText", { hasNotText: "tail" })
		.getNestedLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1).filter({ hasNotText: 'tail' })",
	);
});

test("getNestedLocator supports explicit last() selection", async ({ testFilters }) => {
	const locator = testFilters.getLocatorSchema(fullPath).nth("fictional.filter@hasNotText", "last").getNestedLocator();

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).last().getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })",
	);
});

test('getNestedLocator accepts "first" and "last" selections', async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema(fullPath)
		.nth("fictional.filter@hasNotText", "first")
		.nth("fictional.filter@hasNotText.filter@hasText.filter@hasNotText", "last")
		.getNestedLocator();

	expect(`${locator}`).toContain("first()");
	expect(`${locator}`).toContain("last()");
});

test("getNestedLocator rejects chained steps for unknown sub-paths", async ({ testFilters }) => {
	expect(() => {
		// @ts-expect-error Testing invalid argument
		testFilters.getLocatorSchema(fullPath).nth("fictional", 1).getNestedLocator();
	}).toThrow(
		'"fictional" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
	);
});

test("getLocatorSchema.getNestedLocator rejects chained steps for partially matching paths", async ({
	testFilters,
}) => {
	expect(() => {
		// @ts-expect-error Testing invalid argument
		testFilters.getLocatorSchema(fullPath).nth("fictional.filter@has", 1).getNestedLocator();
	}).toThrow(
		'"fictional.filter@has" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
	);
});
