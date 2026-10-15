import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@fixtures/testApp.fixtures";
import { BrokenPage } from "./pageObject";
import { seedLater } from "./sessionStorage";

// An error raised after the consumer's line has run (the registry check right after construction, a pending seed)
// points at that line, whatever the consumer's file is called; here the files are pageObject.ts and sessionStorage.ts.
const firstFrame = (stack: string) => stack.split("\n").find((line) => line.trim().startsWith("at ")) ?? "";

test.describe("a page object's registry error", () => {
	test.describe.configure({ mode: "serial" });
	// the failing test's worker is replaced, so its stack is handed to the next test through a file
	const stackFile = () => path.join(test.info().project.outputDir, `call-site-${test.info().project.name}.txt`);

	test("fails the test from the check right after construction", async ({ page }) => {
		test.fail(true, "the registry mistake fails this test, as it fails a fixture");
		const broken = new BrokenPage(page);
		await new Promise((resolve) => setTimeout(resolve, 0));
		try {
			broken.getNestedLocator("list");
		} catch (error) {
			writeFileSync(stackFile(), (error as Error).stack ?? "");
		}
	});

	test("points at the super() call in the consumer's pageObject.ts", () => {
		const stack = readFileSync(stackFile(), "utf8");
		rmSync(stackFile());
		expect(stack).toMatch(/^Error: BrokenPage: Locator registry verification failed/);
		expect(firstFrame(stack)).toMatch(/[\\/]callSite[\\/]pageObject\.ts:\d+:\d+/);
	});
});

test("a pending seed's error points at the seed call in the consumer's sessionStorage.ts", async ({
	page,
	testStorage,
	testStorageSecond,
}) => {
	await testStorage.navigation.goto();
	await seedLater(testStorageSecond);

	// a navigation the seed's proxy cannot fetch is reported by the next call
	await expect(page.goto("http://localhost:9999/nothing-listens-here")).rejects.toThrow();
	let error: Error | undefined;
	try {
		await testStorage.sessionStorage.get();
	} catch (caught) {
		error = caught as Error;
	}
	expect(error?.message).toMatch(/^TestStorageSecond\.SessionStorage\.seed: could not fetch /);
	expect(firstFrame(error?.stack ?? "")).toMatch(/[\\/]callSite[\\/]sessionStorage\.ts:\d+:\d+/);

	// back on a real document, the seed still applies
	await expect(async () => {
		await testStorage.navigation.goto();
	}).toPass({ timeout: 5_000 });
	await testStorageSecond.navigation.goto();
});
