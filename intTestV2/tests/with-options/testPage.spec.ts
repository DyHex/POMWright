import { expect, test } from "@fixtures-v2/withOptions";

test("topMenu should expose notification badge count", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const notificationBadge = await testPage.nestedLocator("topMenu.notifications.button.countBadge");
	await expect(notificationBadge).toHaveText("3");
});
