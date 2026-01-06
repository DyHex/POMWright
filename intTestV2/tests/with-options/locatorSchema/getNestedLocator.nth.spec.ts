import { expect, test } from "@fixtures-v2/withOptions";

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
		testFilters.getLocatorSchema(fullPath).nth("fictional", 1).getNestedLocator();
	}).toThrow(
		'"fictional" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
	);
});

test("getLocatorSchema.getNestedLocator rejects chained steps for partially matching paths", async ({
	testFilters,
}) => {
	expect(() => {
		testFilters.getLocatorSchema(fullPath).nth("fictional.filter@has", 1).getNestedLocator();
	}).toThrow(
		'"fictional.filter@has" is not a valid sub-path of "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
	);
});
