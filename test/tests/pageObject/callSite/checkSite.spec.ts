import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";
import { BasedPage, ComposedPage, DirectPage, MalformedPage, MisspelledPage, ModulePage } from "./checkSite.pages";

// Where a registry mistake points, against the packed package, whose bundle frames are what count. A page object's
// check runs in a microtask right after construction; it is captured around `new` and run at once, so its error is
// caught synchronously after `new`. Each line looked for is marked with `// SITE <id>`.

const BUNDLE_FRAME = /[\\/]pomwright[\\/]dist[\\/]index\.(js|mjs|cjs)/;

const frames = (error: unknown) =>
	((error as Error).stack ?? "").split("\n").filter((line) => line.trim().startsWith("at "));
const consumerFrames = (error: unknown) => frames(error).filter((line) => !BUNDLE_FRAME.test(line));
const causeOf = (error: unknown) => (error as Error).cause;

/** `file:line` of the line marked `// SITE <id>` in `file`, as a stack frame names it. */
const site = (file: string, id: string) => {
	const lines = readFileSync(path.join(__dirname, file), "utf8").split("\n");
	const index = lines.findIndex((line) => line.trimEnd().endsWith(`// SITE ${id}`));
	expect(index, `no line is marked // SITE ${id} in ${file}`).toBeGreaterThanOrEqual(0);
	return `${file}:${index + 1}:`;
};

/** Constructs with the page object's scheduled check captured, then runs it: its error, synchronously after `new`. */
const checkOf = (make: () => unknown): Error => {
	const scheduled: (() => void)[] = [];
	const queue = globalThis.queueMicrotask;
	globalThis.queueMicrotask = (callback) => {
		scheduled.push(callback);
	};
	try {
		make();
	} finally {
		globalThis.queueMicrotask = queue;
	}
	try {
		for (const check of scheduled) {
			check();
		}
	} catch (error) {
		return error as Error;
	}
	throw new Error("the page object's check passed");
};

test.describe("a page object's check points at the line that created it", () => {
	test("an add mistake in defineLocators(): the new line, and the add line in the cause", ({ page }) => {
		const error = checkOf(() => new DirectPage(page)); // SITE new-direct
		expect(error.message).toMatch(/^DirectPage: defineLocators\(\) failed: A locator schema with the path "main"/);
		expect(frames(error)[0]).toContain(site("checkSite.spec.ts", "new-direct"));
		expect(consumerFrames(causeOf(error))[0]).toContain(site("checkSite.pages.ts", "direct-add"));
	});

	test("with a base class of the project's own: the new line, not the base class's super()", ({ page }) => {
		const error = checkOf(() => new BasedPage(page)); // SITE new-based
		expect(frames(error)[0]).toContain(site("checkSite.spec.ts", "new-based"));
		expect(error.stack).not.toContain(site("checkSite.pages.ts", "base-super"));
	});

	test("add lines in a locator module: the module's add line and the page object's call in the cause", ({ page }) => {
		const error = checkOf(() => new ModulePage(page)); // SITE new-module
		expect(frames(error)[0]).toContain(site("checkSite.spec.ts", "new-module"));
		const cause = consumerFrames(causeOf(error));
		expect(cause[0]).toContain(site("checkSite.locators.ts", "module-add"));
		expect(cause[1]).toContain(site("checkSite.pages.ts", "module-call"));
	});

	test("composed modules, two levels: the add line, the composing call and the page object's call", ({ page }) => {
		const error = checkOf(() => new ComposedPage(page)); // SITE new-composed
		expect(frames(error)[0]).toContain(site("checkSite.spec.ts", "new-composed"));
		const cause = consumerFrames(causeOf(error));
		expect(cause[0]).toContain(site("checkSite.locators.ts", "module-add"));
		expect(cause[1]).toContain(site("checkSite.locators.ts", "composing-call"));
		expect(cause[2]).toContain(site("checkSite.pages.ts", "composed-call"));
	});

	test("a path-rule mistake in a module, thrown at add: that add line in the cause", ({ page }) => {
		const error = checkOf(() => new MalformedPage(page)); // SITE new-malformed
		expect(error.message).toContain("LocatorSchemaPath string cannot contain consecutive dots: main..list");
		expect(frames(error)[0]).toContain(site("checkSite.spec.ts", "new-malformed"));
		expect(consumerFrames(causeOf(error))[0]).toContain(site("checkSite.locators.ts", "path-rule-add"));
	});

	test("a mistake only verify() finds: the new line, and the message names both paths", ({ page }) => {
		const error = checkOf(() => new MisspelledPage(page)); // SITE new-misspelled
		expect(frames(error)[0]).toContain(site("checkSite.spec.ts", "new-misspelled"));
		expect(error.message).toMatch(/^MisspelledPage: Locator registry verification failed/);
		expect(error.message).toContain('"main.list"');
		expect(error.message).toContain('"mian"');
	});
});

test.describe("a standalone registry points at the consumer's call", () => {
	test("an add mistake: the add line", ({ page }) => {
		const { registry } = createRegistryWithAccessors<"main">(page);
		registry.add("main").locator("main");
		let error: unknown;
		try {
			registry.add("main").locator("body"); // SITE standalone-add
		} catch (thrown) {
			error = thrown;
		}
		expect(consumerFrames(error)[0]).toContain(site("checkSite.spec.ts", "standalone-add"));
	});

	test("a mistake only verify() finds: the verify() line", ({ page }) => {
		const { registry } = createRegistryWithAccessors<"main" | "main.list">(page);
		registry.add("main").locator("main");
		registry
			.add("main.list")
			.locator("ul")
			.filter({ has: "mian" as "main" });
		let error: unknown;
		try {
			registry.verify(); // SITE standalone-verify
		} catch (thrown) {
			error = thrown;
		}
		expect(consumerFrames(error)[0]).toContain(site("checkSite.spec.ts", "standalone-verify"));
	});
});
