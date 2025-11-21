import { expect, test } from "@fixtures-v2/withOptions";

const fullPath = "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText" as const;
const expectedChain =
	"getByRole('button').filter({ hasNotText: 'hasNotText' }).nth(2).getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })";

test("getNestedLocator applies index overrides", async ({ testFilters }) => {
	const locator = await testFilters.getNestedLocator(fullPath, {
		"fictional.filter@hasNotText": 2,
	});

	expect(`${locator}`).toContain(".nth(2)");
	expect(`${locator}`).toEqual(expectedChain);
});

test("getLocatorSchema.getNestedLocator applies overrides", async ({ testFilters }) => {
	const locator = await testFilters.getLocatorSchema(fullPath).getNestedLocator({ "fictional.filter@hasNotText": 2 });

	expect(`${locator}`).toContain(".nth(2)");
	expect(`${locator}`).toEqual(expectedChain);
});

test("getNestedLocator maps negative indexes to last()", async ({ testFilters }) => {
	const locator = await testFilters.getNestedLocator(fullPath, {
		"fictional.filter@hasNotText": -1,
	});

	expect(`${locator}`).toEqual(
		"getByRole('button').filter({ hasNotText: 'hasNotText' }).last().getByRole('button').filter({ hasText: 'hasText' }).getByRole('button').filter({ hasNotText: 'hasNotText' }).getByRole('button').filter({ hasText: 'hasText' })",
	);
});

test('getNestedLocator accepts "first" and "last" overrides', async ({ testFilters }) => {
	const locator = await testFilters.getNestedLocator(fullPath, {
		"fictional.filter@hasNotText": "first",
		"fictional.filter@hasNotText.filter@hasText.filter@hasNotText": "last",
	});

	expect(`${locator}`).toContain("first()");
	expect(`${locator}`).toContain("last()");
});

test("getNestedLocator rejects overrides for unknown sub-paths", async ({ testFilters }) => {
	await expect(async () => {
		await testFilters.getNestedLocator(fullPath, { fictional: 1 });
	}).rejects.toThrow(
		'Missing locator definition for "fictional" while resolving "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
	);
});

test("getLocatorSchema.getNestedLocator rejects overrides for unknown sub-paths", async ({ testFilters }) => {
	await expect(async () => {
		await testFilters.getLocatorSchema(fullPath).getNestedLocator({ fictional: 1 });
	}).rejects.toThrow(
		'Missing locator definition for "fictional" while resolving "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
	);
});

test("getLocatorSchema.getNestedLocator rejects overrides for partially matching paths", async ({ testFilters }) => {
	await expect(async () => {
		await testFilters.getLocatorSchema(fullPath).getNestedLocator({ "fictional.filter@has": 1 });
	}).rejects.toThrow(
		'Missing locator definition for "fictional.filter@has" while resolving "fictional.filter@hasNotText.filter@hasText.filter@hasNotText.filter@hasText".',
	);
});
