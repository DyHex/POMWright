import { expect, test } from "@fixtures-v2/withOptions";

test("nestedLocator should resolve chained locators automatically", async ({ testPage, page }) => {
	const manuallyChained = page
		.locator(".w3-top")
		.locator(".w3-dropdown-hover")
		.locator(".w3-dropdown-content")
		.locator(".w3-bar-item");

	const automaticallyChained = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${automaticallyChained}`).toEqual(`${manuallyChained}`);
});

test("nestedLocator should support index overrides", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const secondNotification = await testPage.getNestedLocator("topMenu.notifications.dropdown.item", {
		"topMenu.notifications.dropdown.item": 1,
	});
	await expect(secondNotification).toHaveText("John Doe posted on your wall");

	const lastNotification = await testPage.getNestedLocator("topMenu.notifications.dropdown.item", {
		"topMenu.notifications.dropdown.item": "last",
	});
	await expect(lastNotification).toHaveText("Jane likes your post");
});
