import { expect, test } from "@fixtures-v2/withOptions";
import { SessionStorage } from "pomwright";

test("navigation.gotoThisPage runs post-navigation actions", async ({ testPage }) => {
	expect(testPage.navigationActionCount.value).toBe(0);

	await testPage.navigation.gotoThisPage();

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

test("setOnNextNavigation waits for a main-frame navigation", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);
	await testPage.sessionStorage.clear();

	await testPage.sessionStorage.setOnNextNavigation({ token: "abc" });
	await expect(testPage.sessionStorage.get(["token"])).resolves.toEqual({});

	await testPage.page.goto(testPage.fullUrl);
	await expect(testPage.sessionStorage.get(["token"])).resolves.toEqual({ token: "abc" });
});

test("setOnNextNavigation merges multiple calls before navigation", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);
	await testPage.sessionStorage.clear();

	await testPage.sessionStorage.setOnNextNavigation({ token: "abc" });
	await testPage.sessionStorage.setOnNextNavigation({ theme: "dark" });
	await testPage.page.goto(testPage.fullUrl);

	await expect(testPage.sessionStorage.get(["token", "theme"])).resolves.toEqual({
		token: "abc",
		theme: "dark",
	});
});

test("clear can target specific keys", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);
	await testPage.sessionStorage.set({ token: "abc", theme: "dark" });

	await testPage.sessionStorage.clear("token");
	await expect(testPage.sessionStorage.get(["token", "theme"])).resolves.toEqual({ theme: "dark" });
});

test("sessionStorage set/get supports waitForContext", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	await testPage.sessionStorage.set({ token: "abc" }, { waitForContext: true });

	const { token } = await testPage.sessionStorage.get(["token"], { waitForContext: true });
	expect(token).toBe("abc");
});

test("sessionStorage clear supports keys and waitForContext", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	await testPage.sessionStorage.set({ token: "abc", theme: "dark" }, { waitForContext: true });
	await testPage.sessionStorage.clear("token", { waitForContext: true });

	const data = await testPage.sessionStorage.get(["token", "theme"], { waitForContext: true });
	expect(data.token).toBeUndefined();
	expect(data.theme).toBe("dark");
});

test("sessionStorage set/get should write immediately on a loaded page", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	await testPage.sessionStorage.set({ token: { value: "abc" } });

	const data = await testPage.sessionStorage.get(["token"]);
	expect(data.token).toEqual({ value: "abc" });
});

test("sessionStorage set with waitForContext should wait for navigation context", async ({ testPage }) => {
	const freshPage = await testPage.page.context().newPage();
	const sessionStorage = new SessionStorage(freshPage, { label: "SessionStorageTest" });

	const navigation = freshPage.goto(testPage.fullUrl);
	await sessionStorage.set({ token: { value: "waited" } }, { waitForContext: true });
	await navigation;

	const data = await sessionStorage.get(["token"]);
	expect(data.token).toEqual({ value: "waited" });
});

test("sessionStorage operations reject without waitForContext when no context", async ({ testPage }) => {
	const freshPage = await testPage.page.context().newPage();
	const sessionStorage = new SessionStorage(freshPage, { label: "SessionStorageTest" });

	await expect(sessionStorage.get(["token"])).rejects.toThrow("SessionStorage context is not available.");
});
