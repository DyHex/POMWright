import { expect, test } from "@fixtures-v2/withOptions";

test("navigation.gotoThisPage runs post-navigation actions", async ({ testPage }) => {
	expect(testPage.navigationActionCount.value).toBe(0);

	await testPage.navigation.gotoThisPage();

	expect(testPage.navigationActionCount.value).toBe(1);
});

test("navigation.goto prefixes baseUrl for URL paths", async ({ testPath }) => {
	await testPath.navigation.goto("/testpath");
	await testPath.navigation.expectThisPage();

	expect(testPath.page.url()).toBe(testPath.fullUrl);
});

test("navigation.expectThisPage supports RegExp fullUrl", async ({ testPath, color }) => {
	await testPath.navigation.gotoThisPage();

	const linkToColorPage = testPath.getNestedLocator("body.link@color");
	await linkToColorPage.waitFor({ state: "visible" });
	await linkToColorPage.click();

	await color.navigation.expectThisPage();
});
