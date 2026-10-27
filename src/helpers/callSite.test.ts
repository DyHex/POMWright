import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { atCallSite, callerLocation, captureCallSite, frameLocation } from "./callSite";

// A consumer file may be named like a POMWright module; only the boundary decides what is left out.
function pageObject() {
	return captureCallSite(pageObject);
}

describe("captureCallSite", () => {
	it("leaves out the boundary and everything above it, and keeps the caller's frames", () => {
		const site = pageObject();
		const frames = (site.stack ?? "").split("\n").slice(1);
		expect(frames[0]).toContain("callSite.test.ts");
		expect(site.stack).not.toMatch(/at pageObject /);
		expect(site.stack).not.toMatch(/[\\/]callSite\.ts/);
	});

	it("rewrites an error's stack to the site and keeps name and message", () => {
		const site = Object.assign(new Error(), {
			stack:
				"Error\n    at Object.<anonymous> (/suite/pages/pageObject.ts:3:5)\n    at x (/n/node_modules/pomwright/dist/index.js:1:1)",
		});
		const error = atCallSite(new TypeError("boom"), site);
		expect(error.stack).toBe("TypeError: boom\n    at Object.<anonymous> (/suite/pages/pageObject.ts:3:5)");
	});
});

// a boxed step's location: the frame below the boundary that names a file
function helper() {
	return callerLocation(helper);
}

describe("frameLocation", () => {
	it("reads a named frame, a frame without a name and an async frame", () => {
		expect(frameLocation("    at Checkout.pay (/suite/pages/checkout.ts:12:7)")).toEqual({
			file: "/suite/pages/checkout.ts",
			line: 12,
			column: 7,
		});
		expect(frameLocation("    at /suite/tests/pay.spec.ts:4:3")).toEqual({
			file: "/suite/tests/pay.spec.ts",
			line: 4,
			column: 3,
		});
		expect(frameLocation("    at async /suite/tests/pay.spec.ts:5:3")).toEqual({
			file: "/suite/tests/pay.spec.ts",
			line: 5,
			column: 3,
		});
	});

	it("keeps a path with spaces and parentheses whole", () => {
		expect(frameLocation("    at pay (C:\\Program Files (x86)\\suite\\pay.spec.ts:4:3)")).toEqual({
			file: "C:\\Program Files (x86)\\suite\\pay.spec.ts",
			line: 4,
			column: 3,
		});
	});

	it("turns a file URL into a path", () => {
		const url = pathToFileURL("/suite/tests/my pay.spec.mts").href;
		expect(frameLocation(`    at ${url}:4:3`)).toEqual({ file: "/suite/tests/my pay.spec.mts", line: 4, column: 3 });
	});

	it("skips a frame without a file", () => {
		expect(frameLocation("    at Array.map (<anonymous>)")).toBeUndefined();
		expect(frameLocation("    at async Promise.all (index 0)")).toBeUndefined();
		expect(frameLocation("    at JSON.parse (native)")).toBeUndefined();
		expect(frameLocation("    at eval (eval at run (/suite/run.js:1:5), <anonymous>:1:1)")).toBeUndefined();
	});
});

describe("callerLocation", () => {
	it("is the line that called the boundary", () => {
		const location = helper();
		// the next line, read from a stack, minus two: the line that called helper()
		const line = Number(/callSite\.test\.ts:(\d+)/.exec(new Error().stack ?? "")?.[1]) - 2;
		expect(location).toMatchObject({ line });
		expect(location?.file).toMatch(/callSite\.test\.ts$/);
	});

	it("is undefined when the boundary is not on the stack", () => {
		function notCalled() {}
		expect(callerLocation(notCalled)).toBeUndefined();
	});
});
