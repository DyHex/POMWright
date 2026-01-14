import { expect, test } from "@fixtures-v2/withOptions";
import { SessionStorage } from "pomwright";

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

	await expect(sessionStorage.get(["token"]))
		.rejects
		.toThrow("SessionStorage context is not available.");
});
