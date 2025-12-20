import { expect, test } from "@fixtures/withOptions";

test("locatorSchema filter property should function", async ({ testFilters }) => {
	await testFilters.page.goto(testFilters.fullUrl);

	const playgroundSection = await testFilters.getNestedLocator("body.section@playground");
	// await expect(playgroundSection).not.toHaveCSS("background-color", "red");

	const playgroundBtnRed = await testFilters.getNestedLocator("body.section@playground.button@red");
	await playgroundBtnRed.click();
	await expect(playgroundSection).toHaveCSS("background-color", "rgb(255, 0, 0)");
});

test("locatorSchema filter property should function V2", async ({ testFilters }) => {
	await testFilters.page.goto(testFilters.fullUrl);

	const playgroundSection = testFilters.getNestedLocatorV2("body.section@playground");
	// await expect(playgroundSection).not.toHaveCSS("background-color", "red");

	const playgroundBtnRed = testFilters.getNestedLocatorV2("body.section@playground.button@red");
	await playgroundBtnRed.click();
	await expect(playgroundSection).toHaveCSS("background-color", "rgb(255, 0, 0)");
});
