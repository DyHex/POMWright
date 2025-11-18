import { expect, test } from "@fixtures-v2/withOptions";

test("locator definitions with options should resolve playground interactions", async ({ testFilters }) => {
	await testFilters.page.goto(testFilters.fullUrl);

	const playgroundSection = await testFilters.getNestedLocator("body.section@playground");

	const playgroundBtnRed = await testFilters.getNestedLocator("body.section@playground.button@red");
	await playgroundBtnRed.click();

	await expect(playgroundSection).toHaveCSS("background-color", "rgb(255, 0, 0)");
});
