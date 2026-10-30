// Checks that POMWright pauses before retrying a question of its own to the page as Playwright pauses before retrying
// its own actions. Playwright's pauses are a constant inside a method of its server (`retryWithProgressAndBackoff`),
// which no export, public type or option reaches, so the script reads them from the installed playwright-core, the one
// test/ resolves (CI's harness runs it at the Playwright pin and at the latest 1.x), and compares them with
// `RETRY_PAUSES` in src/helpers/sessionStorageSeed.ts. When it cannot find the method it fails too, so a Playwright
// release that moves or rewrites it is never passed over: read Playwright's source again and update the check.
//
//   node scripts/check-playwright-retries.mjs   # part of pnpm typecheck

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const ours = path.join(root, "src", "helpers", "sessionStorageSeed.ts");

const requireFromTest = createRequire(path.join(root, "test", "package.json"));
const corePackage = requireFromTest.resolve("playwright-core/package.json", {
	paths: [requireFromTest.resolve("@playwright/test")],
});
const coreDir = path.dirname(corePackage);
const { version } = JSON.parse(fs.readFileSync(corePackage, "utf8"));

const numbers = (list) =>
	list
		.split(",")
		.map((item) => item.trim())
		.filter((item) => item !== "")
		.map(Number);

/** Every `.js` file under `dir`. */
const scripts = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return scripts(full);
		return entry.name.endsWith(".js") ? [full] : [];
	});

// the method's definition and the first array literal of its body: `const backoffScale = [20, 50, 100, 100, 500];` in
// 1.64.0, its names as the bundler left them
const definition = /\bretryWithProgressAndBackoff\s*\([^)]*\)\s*\{\s*(?:const|let|var)\s+\w+\s*=\s*\[([^\]]*)\]/g;
const found = new Map(); // a file of playwright-core -> the pauses defined there
for (const file of scripts(path.join(coreDir, "lib"))) {
	const text = fs.readFileSync(file, "utf8");
	if (!text.includes("retryWithProgressAndBackoff")) continue;
	for (const match of text.matchAll(definition)) {
		found.set(`${path.relative(coreDir, file)}:${match.index}`, numbers(match[1]));
	}
}

const pauses = /\bconst RETRY_PAUSES\s*=\s*\[([^\]]*)\]/.exec(fs.readFileSync(ours, "utf8"));
const problems = [];
if (pauses === null) {
	problems.push(`${path.relative(root, ours)} no longer defines RETRY_PAUSES as an array literal; update this check`);
}
if (found.size === 0) {
	problems.push(
		`playwright-core ${version} has no retryWithProgressAndBackoff whose body starts with the array of its pauses; ` +
			"find where Playwright now pauses before retrying an action, then update RETRY_PAUSES (its unit tests, the " +
			"8,270 ms its comment and Internal → Seed registry give) or this check",
	);
}
const theirs = [...found.values()];
if (theirs.some((list) => list.join() !== theirs[0]?.join())) {
	problems.push(`playwright-core ${version} defines retryWithProgressAndBackoff more than once, with different pauses`);
}
const ourPauses = pauses === null ? [] : numbers(pauses[1]);
if (pauses !== null && theirs.length > 0 && theirs[0].join() !== ourPauses.join()) {
	problems.push(
		`Playwright ${version} pauses ${theirs[0].join(", ")} ms before its actions' retries, and RETRY_PAUSES is ` +
			`${ourPauses.join(", ")}: update RETRY_PAUSES, its unit tests, the total its comment gives (MAX_RETRIES) and ` +
			"Internal → Seed registry",
	);
}

if (problems.length > 0) {
	for (const problem of problems) console.error(`playwright retries: ${problem}`);
	process.exitCode = 1;
} else {
	console.log(
		`playwright retries: Playwright ${version} pauses ${ourPauses.join(", ")} ms before its actions' retries, as POMWright does`,
	);
}
