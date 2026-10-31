import { readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// The installed package is the packed tarball, extracted: exactly the files package.json's "files" and npm always add,
// so a file an earlier build left in dist/, or one the build stopped writing, fails every harness run. Its own
// node_modules is the installer's (pnpm links the peer dependency's bin there) and is never packed, so it is left out.
const filesBelow = (dir: string, root = dir): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (!entry.isDirectory()) {
			return [full];
		}
		return dir === root && entry.name === "node_modules" ? [] : filesBelow(full, root);
	});

test("the published package holds exactly its build, manifest, readme, license and changelog", () => {
	const root = path.dirname(require.resolve("pomwright/package.json"));
	const files = filesBelow(root)
		.map((file) => path.relative(root, file).split(path.sep).join("/"))
		.sort();
	expect(files).toEqual([
		"CHANGELOG.md",
		"LICENSE",
		"README.md",
		"dist/index.d.mts",
		"dist/index.d.ts",
		"dist/index.js",
		"dist/index.mjs",
		"package.json",
	]);
});
