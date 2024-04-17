import { expect, test } from "../../fixtures/fixtures";

test.afterEach(async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);
});

test("getLocator should return the single locator the complete LocatorSchemaPath resolves to", async ({ testPage }) => {
	const locator = await testPage.getLocator("topMenu.notifications.dropdown.item");
	expect(locator).not.toBeNull();
	expect(locator).not.toBeUndefined();
	expect(`${locator}`).toEqual("locator('.w3-bar-item')");
});

test("should be able to manually chain locators returned by getLocator", async ({ testPage }) => {
	const topMenu = await testPage.getLocator("topMenu");

	const topMenuNotifications = topMenu.locator(await testPage.getLocator("topMenu.notifications"));

	const topMenuNotificationsDropdown = topMenuNotifications.locator(
		await testPage.getLocator("topMenu.notifications.dropdown"),
	);

	const topMenuNotificationsDropdownItem = topMenuNotificationsDropdown.locator(
		await testPage.getLocator("topMenu.notifications.dropdown.item"),
	);

	expect(topMenuNotificationsDropdownItem).not.toBeNull();
	expect(topMenuNotificationsDropdownItem).not.toBeUndefined();
	expect(`${topMenuNotificationsDropdownItem}`).toEqual(
		"locator('.w3-top').locator(locator('.w3-dropdown-hover')).locator(locator('.w3-dropdown-content')).locator(locator('.w3-bar-item'))",
	);
});
