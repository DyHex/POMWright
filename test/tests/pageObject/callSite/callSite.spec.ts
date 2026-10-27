import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@fixtures/testApp.fixtures";
import { openBrokenPage } from "./pageObject";
import { seedTooMuch } from "./sessionStorage";

// An error raised after the consumer's line has run (the registry check right after construction, a seed's refused write)
// points at that line, whatever the consumer's file is called; here the files are pageObject.ts and sessionStorage.ts.
const firstFrame = (stack: string) => stack.split("\n").find((line) => line.trim().startsWith("at ")) ?? "";

test.describe("a page object's registry error", () => {
	test.describe.configure({ mode: "serial" });
	// the failing test's worker is replaced, so its stack is handed to the next test through a file
	const stackFile = () =>
		path.join(
			test.info().project.outputDir,
			`call-site-${test.info().project.name}-${test.info().repeatEachIndex}.txt`,
		);

	test("fails the test from the check right after construction", async ({ page }) => {
		test.fail(true, "the registry mistake fails this test, as it fails a fixture");
		const broken = openBrokenPage(page);
		await new Promise((resolve) => setTimeout(resolve, 0));
		try {
			broken.getNestedLocator("list");
		} catch (error) {
			writeFileSync(stackFile(), (error as Error).stack ?? "");
		}
	});

	test("points at the new in the consumer's pageObject.ts", () => {
		const stack = readFileSync(stackFile(), "utf8");
		rmSync(stackFile());
		expect(stack).toMatch(/^Error: BrokenPage: Locator registry verification failed/);
		expect(firstFrame(stack)).toMatch(/[\\/]callSite[\\/]pageObject\.ts:\d+:\d+/);
	});
});

test.describe("a seed's refused write", () => {
	test.describe.configure({ mode: "serial" });
	// thrown from a page listener, so the test cannot catch it: a hook hands it to the next test through a file
	const stackFile = () =>
		path.join(
			test.info().project.outputDir,
			`seed-call-site-${test.info().project.name}-${test.info().repeatEachIndex}.txt`,
		);

	test.afterEach(() => {
		const [error] = test.info().errors;
		if (error?.stack !== undefined) {
			writeFileSync(stackFile(), error.stack);
		}
	});

	test("fails the test once the app's document has committed", async ({ testStorage, testStorageSecond }) => {
		test.fail(true, "the refused write fails this test");
		await testStorage.navigation.goto();
		await seedTooMuch(testStorageSecond);
		await testStorageSecond.navigation.goto();
	});

	test("points at the seed call in the consumer's sessionStorage.ts", () => {
		const stack = readFileSync(stackFile(), "utf8");
		rmSync(stackFile());
		expect(stack.split("\n")[0]).toMatch(
			/^Error: TestStorageSecond\.SessionStorage\.seed: could not write sessionStorage for http:\/\/127\.0\.0\.1:9000 \(keys: big\): .+; the app loaded without the entries$/,
		);
		expect(firstFrame(stack)).toMatch(/[\\/]callSite[\\/]sessionStorage\.ts:\d+:\d+/);
	});
});
