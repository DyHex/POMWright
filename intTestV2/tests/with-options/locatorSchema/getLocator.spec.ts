import { expect, test } from "@fixtures-v2/withOptions";

test.afterEach(async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);
});

test("getLocator should return the single locator the complete LocatorSchemaPath resolves to", async ({ testPage }) => {
	const locator = testPage.getLocator("topMenu.notifications.dropdown.item");
	expect(locator).not.toBeNull();
	expect(locator).not.toBeUndefined();
	expect(`${locator}`).toEqual("locator('.w3-bar-item')");
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
	expect(`${topMenuNotificationsDropdownItem}`).toEqual(
		"locator('.w3-top').locator(locator('.w3-dropdown-hover')).locator(locator('.w3-dropdown-content')).locator(locator('.w3-bar-item'))",
	);
});

test("getLocator fluent wrapper supports update and clearSteps", async ({ testFilters }) => {
	const updated = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 3 })
		.getLocator();

	expect(`${updated}`).toEqual("getByRole('heading', { level: 3 })");

	const cleared = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.clearSteps("fictional.filter@hasText")
		.getLocator();

	expect(`${cleared}`).toEqual("getByRole('button')");
});

test("getLocator update accepts partial patch arguments", async ({ testFilters }) => {
	const baseline = testFilters.getLocator("body.section.heading");

	expect(`${baseline}`).toEqual("getByRole('heading', { level: 2 })");

	const noArgs = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole()
		.getLocator();

	expect(`${noArgs}`).toEqual("getByRole('heading', { level: 2 })");

	const optionsOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ level: 4 })
		.getLocator();

	expect(`${optionsOnly}`).toEqual("getByRole('heading', { level: 4 })");

	const roleOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading")
		.getLocator();

	expect(`${roleOnly}`).toEqual("getByRole('heading', { level: 2 })");

	const roleAndOptions = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 5 })
		.getLocator();

	expect(`${roleAndOptions}`).toEqual("getByRole('heading', { level: 5 })");
});
