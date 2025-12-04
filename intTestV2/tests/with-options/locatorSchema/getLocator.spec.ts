import { expect, test } from "@fixtures-v2/withOptions";

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

test("getLocator fluent wrapper supports update and clearSteps", async ({ testFilters }) => {
	const updated = await testFilters.getLocator("body.section.heading").update().getByRole("heading", { level: 3 });

	expect(`${updated}`).toEqual("getByRole('heading', { level: 3 })");

	const cleared = await testFilters.getLocator("fictional.filter@hasText").clearSteps();

	expect(`${cleared}`).toEqual("getByRole('button')");
});

test("getLocator update accepts partial patch arguments", async ({ testFilters }) => {
	const baseline = await testFilters.getLocator("body.section.heading");

	expect(`${baseline}`).toEqual("getByRole('heading', { level: 2 })");

	const noArgs = await testFilters.getLocator("body.section.heading").update().getByRole();

	expect(`${noArgs}`).toEqual("getByRole('heading', { level: 2 })");

	const optionsOnly = await testFilters.getLocator("body.section.heading").update().getByRole({ level: 4 });

	expect(`${optionsOnly}`).toEqual("getByRole('heading', { level: 4 })");

	const roleOnly = await testFilters.getLocator("body.section.heading").update().getByRole("heading");

	expect(`${roleOnly}`).toEqual("getByRole('heading', { level: 2 })");

	const roleAndOptions = await testFilters
		.getLocator("body.section.heading")
		.update()
		.getByRole("heading", { level: 5 });

	expect(`${roleAndOptions}`).toEqual("getByRole('heading', { level: 5 })");
});
