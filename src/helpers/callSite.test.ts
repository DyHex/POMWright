import { describe, expect, it } from "vitest";
import { atCallSite, captureCallSite } from "./callSite";

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
