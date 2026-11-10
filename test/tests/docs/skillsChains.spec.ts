import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { checkThatPagesShow, flatten, recordedOnPage } from "./chains";

// Every locator chain the agent skills in skills/ show, rebuilt through the packed package and compared, one test per
// skill file, named by its path from the repository root (`skills/pomwright/references/registering.md`), with the
// helpers and the page check of ./chains.ts, as docsChains.spec.ts does for the site. Two checks the site does not
// have: after each test, every rendering its file shows must be one the test compared; and the sweep below fails for a
// skill file that shows a rendering and has no test. A rendering is a locator call in single quotes, as Playwright
// prints one: the snippet check keeps a skill's code in double quotes, so a single-quoted call is always a rendering.

const root = path.join(__dirname, "../../..");
const skillsDir = path.join(root, "skills");

/** A locator call as Playwright renders it: global, for every one in a file, and once, for whether a file has one. */
const RENDERING = /\b(?:locator|getBy[A-Z]\w*|frameLocator)\('/g;
const HAS_RENDERING = new RegExp(RENDERING.source);

/** The skill files that have a test here. */
const tested = new Set<string>();

/** A test of one skill file: `file` is its path from the repository root. */
// biome-ignore lint/correctness/noUnusedVariables: the tests of the skill files are added with the skills that show chains
const skillTest = (file: string, body: (fixtures: { page: Page }) => Promise<void>) => {
	tested.add(file);
	test(file, async ({ page }) => body({ page }));
};

checkThatPagesShow((title) => (title.startsWith("skills/") ? path.join(root, title) : undefined));

// every rendering the file shows lies inside a value the test compared, the file read as the page check reads it
test.afterEach(() => {
	const title = test.info().title;
	if (!title.startsWith("skills/")) {
		return;
	}
	const flat = flatten(readFileSync(path.join(root, title), "utf8"));
	const covered: [number, number][] = [];
	for (const shown of recordedOnPage()) {
		for (let at = flat.indexOf(shown); at !== -1; at = flat.indexOf(shown, at + 1)) {
			covered.push([at, at + shown.length]);
		}
	}
	const uncompared = [...flat.matchAll(RENDERING)]
		.filter((match) => !covered.some(([from, to]) => match.index >= from && match.index < to))
		.map((match) => flat.slice(match.index, match.index + 60));
	expect.soft(uncompared, `${title}: renderings no comparison of this test covers`).toEqual([]);
});

/** Every Markdown file under skills/, as paths from the repository root. */
const skillFiles = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return skillFiles(full);
		return /\.mdx?$/.test(entry.name) ? [path.relative(root, full).split(path.sep).join("/")] : [];
	});

test("every skill file that shows a rendering has a test", () => {
	const untested = skillFiles(skillsDir).filter(
		(file) => !tested.has(file) && HAS_RENDERING.test(readFileSync(path.join(root, file), "utf8")),
	);
	expect(untested).toEqual([]);
});
