import { expect, test } from "@fixtures-v2/testApp.fixtures";

// These tests need to be verified manually by checking the test report

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

test("stepWithArgs should support required/default parameters", async ({ testPage }) => {
	await expect(testPage.stepWithArgs("Starter"))
		.resolves.toBe("Starter:1");
	await expect(testPage.stepWithArgs("Starter", 3)).resolves.toBe("Starter:3");
});

test("stepWithArgsAndObjectReturn should preserve typed argument/return flows", async ({ testPage }) => {
	await expect(testPage.stepWithArgsAndObjectReturn({ id: "abc" })).resolves.toEqual({
		ok: true,
		id: "abc",
		mode: "basic",
		retry: 0,
	});

	await expect(testPage.stepWithArgsAndObjectReturn({ id: "xyz", mode: "advanced" }, 2)).resolves.toEqual({
		ok: true,
		id: "xyz",
		mode: "advanced",
		retry: 2,
	});
});
