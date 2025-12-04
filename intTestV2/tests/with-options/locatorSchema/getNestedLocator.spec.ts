import { expect, test } from "@fixtures-v2/withOptions";

test("getNestedLocator should resolve chained locators automatically", async ({ testPage, page }) => {
	const manuallyChained = page
		.locator(".w3-top")
		.locator(".w3-dropdown-hover")
		.locator(".w3-dropdown-content")
		.locator(".w3-bar-item");

	const automaticallyChained = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${automaticallyChained}`).toEqual(`${manuallyChained}`);
});

test("getNestedLocator should support index overrides", async ({ testPage }) => {
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

test("getLocator returns the terminal locator while getNestedLocator builds the chain", async ({ testPage }) => {
	const direct = await testPage.getLocator("topMenu.notifications.dropdown.item");
	const nested = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");

	expect(`${direct}`).toEqual("locator('.w3-bar-item')");
	expect(`${nested}`).toEqual(
		"locator('.w3-top').locator('.w3-dropdown-hover').locator('.w3-dropdown-content').locator('.w3-bar-item')",
	);
});

test("getNestedLocator returns a fresh locator each time", async ({ testPage }) => {
	const first = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");
	const second = await testPage.getNestedLocator("topMenu.notifications.dropdown.item");
	expect(first).not.toBe(second);
	expect(`${first}`).toEqual(`${second}`);
});

test("getNestedLocator fluent wrapper records filters and indices in call order", async ({ testFilters }) => {
	const chained = await testFilters
		.getNestedLocator("fictional.filter@hasText")
		.filter("fictional.filter@hasText", { hasText: "extra" })
		.nth("fictional.filter@hasText", 1);

	expect(`${chained}`).toEqual(
		"getByRole('button').filter({ hasText: 'hasText' }).filter({ hasText: 'extra' }).nth(1)",
	);
});

test("getNestedLocator fluent wrapper supports update and clearSteps", async ({ testFilters }) => {
	const updated = await testFilters
		.getNestedLocator("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 3 });

	expect(`${updated}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 3 })");

	const cleared = await testFilters.getNestedLocator("fictional.filter@hasText").clearSteps("fictional.filter@hasText");

	expect(`${cleared}`).toEqual("getByRole('button')");
});

test("getNestedLocator fluent update can switch strategies without a terminator", async ({ testFilters }) => {
	const locator = await testFilters
		.getNestedLocator("body.section.heading")
		.update("body.section.heading")
		.getByText("Updated heading");

	expect(`${locator}`).toEqual("locator('body').locator('section').getByText('Updated heading')");
});

test("getNestedLocator update accepts partial patch arguments", async ({ testFilters }) => {
	const baseline = await testFilters.getNestedLocator("body.section.heading");

	expect(`${baseline}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const noArgs = await testFilters.getNestedLocator("body.section.heading").update("body.section.heading").getByRole();

	expect(`${noArgs}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const optionsOnly = await testFilters
		.getNestedLocator("body.section.heading")
		.update("body.section.heading")
		.getByRole({ level: 4 });

	expect(`${optionsOnly}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 4 })");

	const roleOnly = await testFilters
		.getNestedLocator("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading");

	expect(`${roleOnly}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 2 })");

	const roleAndOptions = await testFilters
		.getNestedLocator("body.section.heading")
		.update("body.section.heading")
		.getByRole("heading", { level: 5 });

	expect(`${roleAndOptions}`).toEqual("locator('body').locator('section').getByRole('heading', { level: 5 })");
});
