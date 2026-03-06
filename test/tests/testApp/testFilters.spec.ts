import { expect, test } from "@fixtures/testApp.fixtures";

test("locator definitions with options should resolve playground interactions", async ({ testFilters }) => {
	await testFilters.page.goto(testFilters.fullUrl);

	const playgroundSection = testFilters.getNestedLocator("body.section@playground");

	const playgroundBtnRed = testFilters.getNestedLocator("body.section@playground.button@red");
	await playgroundBtnRed.click();

	await expect(playgroundSection).toHaveCSS("background-color", "rgb(255, 0, 0)");
});

test("getLocatorSchema propagates registered filters and indices to getLocator", async ({ testFilters }) => {
	await testFilters.page.goto(testFilters.fullUrl);

	const locator = testFilters
		.getLocatorSchema("body.section@playground.button@reset")
		.filter("body.section@playground.button@reset", { hasText: /Reset/i })
		.nth("body.section@playground.button@reset", "first")
		.getLocator();

	expect(`${locator}`).toEqual("getByRole('button', { name: 'Reset Color' }).filter({ hasText: /Reset/i }).first()");
});
