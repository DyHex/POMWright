import { expect, test } from "@fixtures/testApp.fixtures";

test("navigation.goto() runs post-navigation actions", async ({ testPage }) => {
	expect(testPage.navigationActionCount.value).toBe(0);

	await testPage.navigation.goto();

	expect(testPage.navigationActionCount.value).toBe(1);
});

test("topMenu should expose notification badge count", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const notificationBadge = testPage.getNestedLocator("topMenu.notifications.button.countBadge");
	await expect(notificationBadge).toHaveText("3");
});

test("stepWithAdvancedReturnType should return the expected payload", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const result = await testPage.stepWithAdvancedReturnType();

	expect(result.status).toBe("ready");
	expect(result.payload[0]?.values[0]?.key).toBe("alpha");
	expect(result.metadata.flags.has("beta")).toBe(true);
	expect(result.metadata.versions.get("v2")?.hash).toBe("def456");
	expect(result.startedAt.getTime()).toBe(0);
});

test.describe("getLocator helpers on web app", () => {
	test.afterEach(async ({ testPage }) => {
		await testPage.page.goto(testPage.fullUrl);
	});

	test("getLocator should return the single locator the complete LocatorSchemaPath resolves to", async ({
		testPage,
	}) => {
		const locator = testPage.getLocator("topMenu.notifications.dropdown.item");
		expect(locator).not.toBeNull();
		expect(locator).not.toBeUndefined();
		expect(`${locator.describe("")}`).toEqual("locator('.w3-bar-item')");
	});

	test("should be able to manually chain locators returned by getLocator", async ({ testPage }) => {
		const topMenu = testPage.getLocator("topMenu");

		const topMenuNotifications = topMenu.locator(testPage.getLocator("topMenu.notifications"));

		const topMenuNotificationsDropdown = topMenuNotifications.locator(
			testPage.getLocator("topMenu.notifications.dropdown"),
		);

		const topMenuNotificationsDropdownItem = topMenuNotificationsDropdown.locator(
			testPage.getLocator("topMenu.notifications.dropdown.item"),
		);

		expect(topMenuNotificationsDropdownItem).not.toBeNull();
		expect(topMenuNotificationsDropdownItem).not.toBeUndefined();
		expect(`${topMenuNotificationsDropdownItem.describe("")}`).toEqual(
			"locator('.w3-top').locator(locator('.w3-dropdown-hover')).locator(locator('.w3-dropdown-content')).locator(locator('.w3-bar-item'))",
		);
	});
});

test("getNestedLocator should support index overrides", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const secondNotification = testPage
		.getLocatorSchema("topMenu.notifications.dropdown.item")
		.nth("topMenu.notifications.dropdown.item", 1)
		.getNestedLocator();
	await expect(secondNotification).toHaveText("John Doe posted on your wall");

	const lastNotification = testPage
		.getLocatorSchema("topMenu.notifications.dropdown.item")
		.nth("topMenu.notifications.dropdown.item", "last")
		.getNestedLocator();
	await expect(lastNotification).toHaveText("Jane likes your post");
});
