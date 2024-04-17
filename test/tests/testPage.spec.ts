import { expect, test } from "../fixtures/fixtures";

test("topMenu should have a notification badge with count", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const notificationBadge = await testPage.getNestedLocator("topMenu.notifications.button.countBadge");
	await expect(notificationBadge).toHaveText("3");
});
