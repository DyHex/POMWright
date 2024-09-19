import { expect, test } from "@fixtures/withOptions";

test("Should be able to validate navigation to url with urlPath and fullUrl as RegExp instead of string", async ({
	testPath,
	color,
}) => {
	await testPath.page.goto(testPath.fullUrl);

	await testPath.expectThisPage();

	const linkToColorPage = await testPath.getNestedLocator("body.link@color");
	await linkToColorPage.waitFor({ state: "visible" });

	await linkToColorPage.click();

	await color.expectThisPage();

	await color.validateColorPage();
});
