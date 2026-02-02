import { expect, test } from "@fixtures-v2/withOptions";

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
