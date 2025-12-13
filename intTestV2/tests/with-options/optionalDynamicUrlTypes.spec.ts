import { expect, test } from "@fixtures-v2/withOptions";

test("Should validate navigation using RegExp-based urlPath and fullUrl", async ({ testPath, color }) => {
	await testPath.page.goto(testPath.fullUrl);

	await testPath.expectThisPage();

	const linkToColorPage = testPath.getNestedLocator("body.link@color");
	await linkToColorPage.waitFor({ state: "visible" });

	await linkToColorPage.click();

	await color.expectThisPage();
	await color.validateColorPage();
});
