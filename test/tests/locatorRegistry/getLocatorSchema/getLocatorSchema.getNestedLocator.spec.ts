import { expect, test } from "@fixtures/testApp.fixtures";

test("getNestedLocator fluent wrapper records filters and indices in call order", async ({ testFilters }) => {
	const chained = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: "extra" })
		.nth("fictional.filter@hasText", 1)
		.getNestedLocator();

	expect(`${chained.describe("")}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1)",
	);
});

test("getNestedLocator fluent wrapper supports update and clearSteps", async ({ testFilters }) => {
	const updated = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 3 })
		.getNestedLocator();

	expect(`${updated.describe("")}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");

	const cleared = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.clearSteps("fictional.filter@hasText")
		.getNestedLocator();

	expect(`${cleared.describe("")}`).toEqual("getByRole('button')");
});

test("getNestedLocator fluent update can switch strategies without a terminator", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByText("Updated heading")
		.getNestedLocator();

	expect(`${locator.describe("")}`).toEqual("locator('body').locator('section').getByText('Updated heading')");
});

test("getNestedLocator update accepts partial patch arguments", async ({ testFilters }) => {
	const baseline = testFilters.getNestedLocator("body.section.heading");

	expect(`${baseline.describe("")}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const noArgs = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole()
		.getNestedLocator();

	expect(`${noArgs.describe("")}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const optionsOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ level: 4 })
		.getNestedLocator();

	expect(`${optionsOnly.describe("")}`).toEqual(
		"locator('body').locator('section').getByRole('heading', { level: 4 })",
	);

	const roleOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading")
		.getNestedLocator();

	expect(`${roleOnly.describe("")}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const roleAndOptions = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 5 })
		.getNestedLocator();

	expect(`${roleAndOptions.describe("")}`).toEqual(
		"locator('body').locator('section').getByRole('heading', { level: 5 })",
	);
});

test("getNestedLocator resolves has/hasNot path string references", async ({ testFilters }) => {
	const nested = testFilters
		.getLocatorSchema("fictional.filter@hasNotText")
		.filter("fictional.filter@hasNotText", { has: "body.section.heading" })
		.filter("fictional.filter@hasNotText", { hasNot: "body.section@playground.button@red" })
		.getNestedLocator();

	expect(`${nested.describe("")}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: getByRole('heading', { level: 2 }) }).filter({ hasNot: getByRole('button', { name: 'Red' }) })",
	);
});

test("getNestedLocator resolves Playwright locators for has/hasNot", async ({ testFilters }) => {
	const sectionLocator = testFilters.page.locator("section");
	const missingLocator = testFilters.page.locator("[data-cy=missing]");

	const nested = testFilters
		.getLocatorSchema("fictional.filter@hasNotText")
		.filter("fictional.filter@hasNotText", { has: sectionLocator })
		.filter("fictional.filter@hasNotText", { hasNot: missingLocator })
		.getNestedLocator();

	expect(`${nested.describe("")}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).filter({ has: locator('section') }).filter({ hasNot: locator('[data-cy=missing]') })",
	);
});

const fullPath = "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText" as const;
const expectedChain =
	"getByRole('button').filter({ hasNotText: 'hasNotText' }).nth(2).getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })";

test("getNestedLocator applies chained indices", async ({ testFilters }) => {
	const locator = testFilters.getLocatorSchema(fullPath).nth("fictional.filter@hasNotText", 2).getNestedLocator();

	expect(`${locator.describe("")}`).toContain(".nth(2)");
	expect(`${locator.describe("")}`).toEqual(expectedChain);
});

test("getLocatorSchema.getNestedLocator applies chained indices", async ({ testFilters }) => {
	const locator = testFilters.getLocatorSchema(fullPath).nth("fictional.filter@hasNotText", 2).getNestedLocator();

	expect(`${locator.describe("")}`).toContain(".nth(2)");
	expect(`${locator.describe("")}`).toEqual(expectedChain);
});

test("getNestedLocator honors chained filters and indices", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: "extra" })
		.nth("fictional.filter@hasText", 1)
		.filter("fictional.filter@hasText", { hasNotText: "tail" })
		.getNestedLocator();

	expect(`${locator.describe("")}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1).filter({ hasNotText: 'tail' })",
	);
});

test("getNestedLocator supports explicit last() selection", async ({ testFilters }) => {
	const locator = testFilters.getLocatorSchema(fullPath).nth("fictional.filter@hasNotText", "last").getNestedLocator();

	expect(`${locator.describe("")}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).last().getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })",
	);
});

test('getNestedLocator accepts "first" and "last" selections', async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema(fullPath)
		.nth("fictional.filter@hasNotText", "first")
		.nth("fictional.filter@hasNotText.filter@hasText.filter@hasNotText", "last")
		.getNestedLocator();

	expect(`${locator.describe("")}`).toContain("first()");
	expect(`${locator.describe("")}`).toContain("last()");
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
