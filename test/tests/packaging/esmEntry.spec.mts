import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";
import * as pomwright from "pomwright";

// An .mts spec is loaded as ESM inside this CommonJS project, so `import` resolves the package's ESM entry while
// `createRequire` resolves its CommonJS build: what a consumer gets from either side of the `exports` map.
const require = createRequire(import.meta.url);

test.describe("the published package", () => {
	test("the ESM entry exports exactly what the CommonJS build exports", () => {
		const commonjs = require("pomwright") as Record<string, unknown>;
		expect(Object.keys(pomwright).sort()).toEqual(Object.keys(commonjs).sort());
	});

	test("import and require share one copy", () => {
		const commonjs = require("pomwright") as typeof pomwright;
		expect(commonjs.PageObject).toBe(pomwright.PageObject);
		expect(commonjs.SessionStorage).toBe(pomwright.SessionStorage);
		expect(commonjs.test).toBe(pomwright.test);
	});

	test("only the package root and package.json are importable", () => {
		expect(() => require.resolve("pomwright/dist/index.js")).toThrow(
			expect.objectContaining({ code: "ERR_PACKAGE_PATH_NOT_EXPORTED" }),
		);
		expect(() => require.resolve("pomwright/package.json")).not.toThrow();
	});

	test("the root entry maps import, require and, last, default, the CommonJS build, as @playwright/test does", () => {
		const manifest = require("pomwright/package.json") as { exports: Record<string, Record<string, unknown>> };
		const root = manifest.exports["."] ?? {};
		expect(Object.keys(root)).toEqual(["import", "require", "default"]);
		expect(root.default).toEqual({ types: "./dist/index.d.ts", default: "./dist/index.js" });
	});

	test("the manifest declares the Node floor and the SPDX licence", () => {
		const manifest = require("pomwright/package.json") as { engines?: { node?: string }; license?: string };
		expect(manifest.engines?.node).toBe(">=20");
		expect(manifest.license).toBe("Apache-2.0");
	});
});
