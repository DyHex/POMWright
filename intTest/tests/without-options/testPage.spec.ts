import { expect, test } from "@fixtures/withoutOptions";

test("topMenu should have a notification badge with count", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const notificationBadge = await testPage.getNestedLocator("topMenu.notifications.button.countBadge");
	await expect(notificationBadge).toHaveText("3");
});

test("topMenu should have a notification badge with count V2", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const notificationBadge = testPage.getNestedLocatorV2("topMenu.notifications.button.countBadge");
	await expect(notificationBadge).toHaveText("3");
});
