import { expect, test } from "@fixtures-v2/withOptions";

test("topMenu should expose notification badge count", async ({ testPage }) => {
	await testPage.page.goto(testPage.fullUrl);

	const notificationBadge = testPage.getNestedLocator("topMenu.notifications.button.countBadge");
	await expect(notificationBadge).toHaveText("3");
});

test("stepNoArgs should return the expected message", async ({ testPage }) => {
	await expect(testPage.stepNoArgs()).resolves.toBe("Hello, World!");
});

test("stepWithTitle should return the expected message", async ({ testPage }) => {
	await expect(testPage.stepWithTitle()).resolves.toBe("Hello, World!");
});

test("stepWithOptionBox should return the expected message", async ({ testPage }) => {
	await expect(testPage.stepWithOptionBox()).resolves.toBe("Hello, World!");
});

test("stepWithOptionTimeout should return the expected message", async ({ testPage }) => {
	await expect(testPage.stepWithOptionTimeout()).resolves.toBe("Hello, World!");
});

test("stepWithOptionLocation should return the expected message", async ({ testPage }) => {
	await expect(testPage.stepWithOptionLocation()).resolves.toBe("Hello, World!");
});

test("stepWithTitleAndAllOptions should return the expected message", async ({ testPage }) => {
	await expect(testPage.stepWithTitleAndAllOptions()).resolves.toBe("Hello, World!");
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
