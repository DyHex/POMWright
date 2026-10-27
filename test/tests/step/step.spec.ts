import { expect, test } from "@fixtures/testApp.fixtures";
import TestPage from "@page-object-models/testApp/pages/testPage.page";
import { step } from "pomwright";

// Where the report places these steps is checked by test/step-locations, run by pack-test.sh after the harness.

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
	await expect(testPage.stepWithArgs("Starter")).resolves.toBe("Starter:1");
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

test("a static @step method returns its value", async () => {
	await expect(TestPage.stepStatic("x")).resolves.toBe("static:x");
});

// what JavaScript code can decorate: TypeScript refuses it, so the decorations carry @ts-expect-error
class FromJavaScript {
	// @ts-expect-error @step decorates methods that return a Promise: make the method async
	@step()
	total(): number {
		return 42;
	}

	// @ts-expect-error @step decorates methods that return a Promise: make the method async
	@step({ box: true })
	boxedTotal(): number {
		return 42;
	}
}

test("a decorated method that returns a plain value rejects with the compile error's text, boxed or not", async () => {
	for (const call of [() => new FromJavaScript().total(), () => new FromJavaScript().boxedTotal()]) {
		const error = await (call() as unknown as Promise<number>).catch((thrown: unknown) => thrown);
		expect(error).toBeInstanceOf(TypeError);
		expect((error as TypeError).message).toBe("@step decorates methods that return a Promise: make the method async");
	}
});
