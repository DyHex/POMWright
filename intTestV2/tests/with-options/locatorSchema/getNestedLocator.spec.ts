import { expect, test } from "@fixtures-v2/withOptions";

test("getNestedLocator should resolve chained locators automatically", async ({ testPage, page }) => {
	const manuallyChained = page
		.locator(".w3-top")
		.locator(".w3-dropdown-hover")
		.locator(".w3-dropdown-content")
		.locator(".w3-bar-item");

	const automaticallyChained = testPage.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${automaticallyChained}`).toEqual(`${manuallyChained}`);
});

test("getNestedLocator should support index overrides", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const secondNotification = testPage
		.getLocatorSchema("topMenu.notifications.dropdown.item")
		.getNestedLocator({ "topMenu.notifications.dropdown.item": 1 });
	await expect(secondNotification).toHaveText("John Doe posted on your wall");

	const lastNotification = testPage
		.getLocatorSchema("topMenu.notifications.dropdown.item")
		.getNestedLocator({ "topMenu.notifications.dropdown.item": "last" });
	await expect(lastNotification).toHaveText("Jane likes your post");
});

test("getLocator returns the terminal locator while getNestedLocator builds the chain", async ({ testPage }) => {
	const direct = testPage.getLocator("topMenu.notifications.dropdown.item");
	const nested = testPage.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${direct}`).toEqual("locator('.w3-bar-item')");
	expect(`${nested}`).toEqual(
		"locator('.w3-top').locator('.w3-dropdown-hover').locator('.w3-dropdown-content').locator('.w3-bar-item')",
	);
});

test("getNestedLocator returns a fresh locator each time", async ({ testPage }) => {
	const first = testPage.getNestedLocator("topMenu.notifications.dropdown.item");
	const second = testPage.getNestedLocator("topMenu.notifications.dropdown.item");
	expect(first).not.toBe(second);
	expect(`${first}`).toEqual(`${second}`);
});

test("getNestedLocator fluent wrapper records filters and indices in call order", async ({ testFilters }) => {
	const chained = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: "extra" })
		.nth("fictional.filter@hasText", 1)
		.getNestedLocator();

	expect(`${chained}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1)",
	);
});

test("getNestedLocator fluent wrapper supports update and clearSteps", async ({ testFilters }) => {
	const updated = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 3 })
		.getNestedLocator();

	expect(`${updated}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");

	const cleared = testFilters
		.getLocatorSchema("fictional.filter@hasText")
		.clearSteps("fictional.filter@hasText")
		.getNestedLocator();

	expect(`${cleared}`).toEqual("getByRole('button')");
});

test("getNestedLocator fluent update can switch strategies without a terminator", async ({ testFilters }) => {
	const locator = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByText("Updated heading")
		.getNestedLocator();

	expect(`${locator}`).toEqual("locator('body').locator('section').getByText('Updated heading')");
});

test("getNestedLocator update accepts partial patch arguments", async ({ testFilters }) => {
	const baseline = testFilters.getNestedLocator("body.section.heading");

	expect(`${baseline}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const noArgs = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole()
		.getNestedLocator();

	expect(`${noArgs}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const optionsOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole({ level: 4 })
		.getNestedLocator();

	expect(`${optionsOnly}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 4 })");

	const roleOnly = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading")
		.getNestedLocator();

	expect(`${roleOnly}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const roleAndOptions = testFilters
		.getLocatorSchema("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 5 })
		.getNestedLocator();

	expect(`${roleAndOptions}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 5 })");
});
