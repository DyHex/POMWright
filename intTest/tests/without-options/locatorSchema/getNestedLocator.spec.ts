import { expect, test } from "@fixtures/withoutOptions";

test("given the same locatorSchemaPath, getNestedLocator should return the equvalent of manually chaining with getLocator", async ({
	testPage,
}) => {
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

	const automaticallyChainedLocator = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");
	expect(automaticallyChainedLocator).not.toBeNull();
	expect(automaticallyChainedLocator).not.toBeUndefined();
	expect(`${automaticallyChainedLocator}`).toEqual(`${topMenuNotificationsDropdownItem}`);
});

test("given the same locatorSchemaPath, getNestedLocator should return the equvalent of manually chaining with getLocator - V2", async ({
	testPage,
}) => {
	const topMenu = testPage.getLocatorV2("topMenu");

	const topMenuNotifications = topMenu.locator(testPage.getLocatorV2("topMenu.notifications"));

	const topMenuNotificationsDropdown = topMenuNotifications.locator(
		testPage.getLocatorV2("topMenu.notifications.dropdown"),
	);

	const topMenuNotificationsDropdownItem = topMenuNotificationsDropdown.locator(
		testPage.getLocatorV2("topMenu.notifications.dropdown.item"),
	);

	expect(topMenuNotificationsDropdownItem).not.toBeNull();
	expect(topMenuNotificationsDropdownItem).not.toBeUndefined();
	expect(`${topMenuNotificationsDropdownItem}`).toEqual(
		"locator('.w3-top').locator(locator('.w3-dropdown-hover')).locator(locator('.w3-dropdown-content')).locator(locator('.w3-bar-item'))",
	);

	const automaticallyChainedLocator = testPage.getNestedLocatorV2("topMenu.notifications.dropdown.item");
	expect(automaticallyChainedLocator).not.toBeNull();
	expect(automaticallyChainedLocator).not.toBeUndefined();
	expect(`${automaticallyChainedLocator}`).not.toEqual(`${topMenuNotificationsDropdownItem}`); // V2 does not wrap locators in locator() calls
	expect(`${automaticallyChainedLocator}`).toEqual(
		"locator('.w3-top').locator('.w3-dropdown-hover').locator('.w3-dropdown-content').locator('.w3-bar-item')",
	);
});
