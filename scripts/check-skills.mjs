// Checks the agent skills in skills/: what the Agent Skills format and this repository's skills require, so that every
// skill loads in every agent it is meant for and stays small enough to be read whole.
//
//   node scripts/check-skills.mjs   # pnpm lint:skills; CI's lint job
//
// - Every folder of skills/ is a skill with a SKILL.md that opens with frontmatter.
// - The frontmatter (the YAML subset the skills use: `key: value`, a quoted value, a folded `>-` or `>` and a literal `|`
//   block, and one level of `key:` with `subkey: value` lines; anything else fails the check): `name` of 1 to 64
//   characters of a-z, 0-9 and hyphens, no hyphen at either end or two in a row, the folder's name; `description` of 1
//   to 1,024 characters, without `<` or `>`; `compatibility`, when given, at most 500 characters; `metadata` string
//   values. Only the keys every agent accepts (`name`, `description`, `license`, `compatibility`, `metadata`), except
//   on a user-invoked skill, which also takes `argument-hint` and must have `disable-model-invocation: true` and an
//   `agents/openai.yaml` with `allow_implicit_invocation: false` (Codex's way to say the same).
// - Sizes: a SKILL.md of at most SKILL_LINES lines (more for a skill listed there), any other Markdown file at most
//   FILE_LINES; a file other than SKILL.md over CONTENTS_FROM lines links every one of its `##` headings before the
//   first, or under a first `## Contents`: a contents list an agent reads first.
// - One level deep: every other Markdown file of a skill is linked from its SKILL.md, and links to no Markdown file of the
//   skill but SKILL.md, so an agent never follows a chain of references.
// - A relative link stays inside its skill's folder, since a skill is installed alone; check-guide-links.mjs checks that
//   each relative link and anchor resolves.
// - Every link to the documentation site (https://dyhex.github.io/POMWright/…) names a page and, after `#`, one of its
//   headings.
// - The pomwright skill's upgrade guide lists every item the site's *Upgrading from 2.x* marks **compiles**, in the
//   page's order, each with exactly the searches the page gives it (its `sh` blocks and inline `grep` commands): those
//   changes compile, so a search is the only way to find them, and an agent that reads a summary of the page misses them.
//
// A skill listed in EXEMPT is held to the frontmatter and link rules only, with the reason given there.

import fs from "node:fs";
import path from "node:path";
import { contentDir, siteUrlProblem, siteUrlsIn, slugOf } from "./site-pages.mjs";

const root = path.resolve(import.meta.dirname, "..");
const skillsDir = path.join(root, "skills");

/** Skills that run only when the user asks for them: they create files or cost much, so no keyword may start them. */
const USER_INVOKED = new Set(["pomwright-teach", "defect-review"]);
const PORTABLE_KEYS = new Set(["name", "description", "license", "compatibility", "metadata"]);
const USER_INVOKED_KEYS = new Set([...PORTABLE_KEYS, "disable-model-invocation", "argument-hint"]);
const SKILL_LINES = new Map([
	["defect-review", 300],
	["pomwright", 330],
]);
const DEFAULT_SKILL_LINES = 250;
const FILE_LINES = 300;
const CONTENTS_FROM = 100;
/** Skills held to the frontmatter and link rules only, each with its reason. */
const EXEMPT = new Map();

const problems = [];
const report = (file, message) => problems.push(`${path.relative(root, file)}: ${message}`);

/** The frontmatter of a SKILL.md, as a map; a line outside the supported subset is reported and skipped. */
function frontmatter(file) {
	const lines = fs.readFileSync(file, "utf8").split("\n");
	if (lines[0] !== "---") {
		report(file, "does not open with frontmatter (a first line of ---)");
		return new Map();
	}
	const end = lines.indexOf("---", 1);
	if (end === -1) {
		report(file, "its frontmatter has no closing ---");
		return new Map();
	}
	const fields = new Map();
	const unquote = (value) => {
		const quoted = /^(["'])(.*)\1$/.exec(value);
		return quoted ? quoted[2].replace(/\\(["\\])/g, "$1") : value;
	};
	for (let i = 1; i < end; i++) {
		const line = lines[i];
		if (line.trim() === "") continue;
		const field = /^([a-z][a-z0-9_-]*):(?: (.*))?$/.exec(line);
		if (!field) {
			report(file, `frontmatter line ${i + 1} is not a supported form: ${JSON.stringify(line)}`);
			continue;
		}
		const [, key, rest = ""] = field;
		const block = [];
		while (i + 1 < end && (lines[i + 1].startsWith("  ") || lines[i + 1].trim() === "")) block.push(lines[++i]);
		if (/^[>|]-?$/.test(rest)) {
			const body = block.map((text) => text.trim());
			fields.set(key, rest.startsWith(">") ? body.filter(Boolean).join(" ") : body.join("\n").trim());
		} else if (rest === "") {
			const map = new Map();
			for (const entry of block.filter((text) => text.trim() !== "")) {
				const pair = /^ {2}([A-Za-z0-9_-]+): (.+)$/.exec(entry);
				if (pair) map.set(pair[1], unquote(pair[2]));
				else report(file, `frontmatter key ${key}: ${JSON.stringify(entry)} is not a "subkey: value" line`);
			}
			fields.set(key, map);
		} else if (block.some((text) => text.trim() !== "")) {
			report(file, `frontmatter key ${key}: a value on its line takes no indented lines after it`);
		} else {
			fields.set(key, unquote(rest.trim()));
		}
	}
	return fields;
}

/** The `##` headings of a Markdown text outside code blocks, each with its anchor and its offset in the text. */
function sectionHeadings(text) {
	const headings = [];
	let fenced = false;
	let offset = 0;
	for (const line of text.split("\n")) {
		if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
		const heading = !fenced && /^## (.+)$/.exec(line);
		if (heading) {
			const anchor = heading[1]
				.toLowerCase()
				.replace(/[^\p{L}\p{N}\s_-]/gu, "")
				.trim()
				.replace(/\s/g, "-");
			headings.push({ anchor, offset });
		}
		offset += line.length + 1;
	}
	return headings;
}

/** Every Markdown file under a folder. */
const markdownIn = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return markdownIn(full);
		return entry.name.endsWith(".md") ? [full] : [];
	});

/** The relative link targets of a Markdown file, outside code blocks and code spans, without their anchors. */
function relativeLinks(file) {
	const targets = [];
	let fenced = false;
	for (const line of fs.readFileSync(file, "utf8").split("\n")) {
		if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
		if (fenced) continue;
		const prose = line.replace(/``.*?``|`[^`]*`/g, "");
		for (const [, target] of prose.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)\)/g)) {
			if (/^(https?:|mailto:)/.test(target)) continue;
			const [linked] = target.split("#");
			if (linked !== "") targets.push(path.resolve(path.dirname(file), decodeURIComponent(linked)));
		}
	}
	return targets;
}

const skills = fs.existsSync(skillsDir)
	? fs
			.readdirSync(skillsDir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
			.map((entry) => entry.name)
	: [];

for (const skill of skills) {
	const folder = path.join(skillsDir, skill);
	const skillFile = path.join(folder, "SKILL.md");
	if (!fs.existsSync(skillFile)) {
		report(folder, "a skill folder without a SKILL.md");
		continue;
	}
	const exempt = EXEMPT.has(skill);
	const userInvoked = USER_INVOKED.has(skill);

	// frontmatter
	const fields = frontmatter(skillFile);
	const allowed = userInvoked ? USER_INVOKED_KEYS : PORTABLE_KEYS;
	for (const key of fields.keys()) {
		if (!allowed.has(key)) {
			report(
				skillFile,
				`frontmatter key ${key} is not one every agent accepts (${[...allowed].join(", ")})${userInvoked ? "" : "; only a user-invoked skill takes more"}`,
			);
		}
	}
	const name = fields.get("name");
	if (typeof name !== "string" || name === "") report(skillFile, "frontmatter has no name");
	else {
		if (name.length > 64 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
			report(
				skillFile,
				`name ${JSON.stringify(name)} must be 1 to 64 characters of a-z, 0-9 and single hyphens, no hyphen at either end`,
			);
		}
		if (name !== skill) report(skillFile, `name ${JSON.stringify(name)} must be the folder's name, ${skill}`);
	}
	const description = fields.get("description");
	if (typeof description !== "string" || description === "") report(skillFile, "frontmatter has no description");
	else {
		if (description.length > 1024) {
			report(skillFile, `description has ${description.length} characters; at most 1,024 fit every agent`);
		}
		if (/[<>]/.test(description)) report(skillFile, "description contains < or >, which some agents refuse");
	}
	const compatibility = fields.get("compatibility");
	if (typeof compatibility === "string" && compatibility.length > 500) {
		report(skillFile, `compatibility has ${compatibility.length} characters; at most 500`);
	}
	const metadata = fields.get("metadata");
	if (metadata !== undefined && !(metadata instanceof Map)) report(skillFile, "metadata must be a map of strings");

	// invocation
	if (userInvoked && !exempt) {
		if (fields.get("disable-model-invocation") !== "true") {
			report(skillFile, "a user-invoked skill needs disable-model-invocation: true");
		}
		const openai = path.join(folder, "agents/openai.yaml");
		const policy = fs.existsSync(openai) ? fs.readFileSync(openai, "utf8") : "";
		if (!/^policy:\s*$[\s\S]*^\s+allow_implicit_invocation:\s*false\s*$/m.test(policy)) {
			report(
				folder,
				"a user-invoked skill needs agents/openai.yaml with policy: allow_implicit_invocation: false, for Codex",
			);
		}
	}

	// sizes and contents
	const files = markdownIn(folder);
	for (const file of files) {
		const text = fs.readFileSync(file, "utf8");
		const lines = text.replace(/\n$/, "").split("\n").length;
		const limit = file === skillFile ? (SKILL_LINES.get(skill) ?? DEFAULT_SKILL_LINES) : FILE_LINES;
		if (!exempt && lines > limit) report(file, `${lines} lines; at most ${limit}`);
		if (!exempt && file !== skillFile && lines > CONTENTS_FROM) {
			const all = sectionHeadings(text);
			// the list stands before the first `##` heading, or under a first heading named Contents
			const titled = all[0]?.anchor === "contents";
			const headings = titled ? all.slice(1) : all;
			const before = headings.length === 0 ? "" : text.slice(0, headings[0].offset);
			const missing = headings.map(({ anchor }) => anchor).filter((anchor) => !before.includes(`(#${anchor})`));
			if (missing.length > 0) {
				report(
					file,
					`over ${CONTENTS_FROM} lines, so it opens with a contents list linking each ## heading; missing #${missing.join(", #")}`,
				);
			}
		}
	}

	// one level deep, and inside the folder
	const linkedFromSkill = new Set(relativeLinks(skillFile));
	for (const file of files) {
		if (file !== skillFile && !linkedFromSkill.has(file)) {
			report(file, "not linked from its SKILL.md, so an agent does not find it (references are one level deep)");
		}
		for (const target of relativeLinks(file)) {
			if (path.relative(folder, target).startsWith("..")) {
				report(
					file,
					`links outside its skill (${path.relative(root, target)}); a skill is installed alone, so name the other skill or link the site`,
				);
			} else if (file !== skillFile && target !== skillFile && target.endsWith(".md") && target !== file) {
				report(file, `links ${path.relative(folder, target)}; references link only SKILL.md, one level deep`);
			}
		}
	}
}

// every link to the site, in every Markdown file under skills/
for (const file of fs.existsSync(skillsDir) ? markdownIn(skillsDir) : []) {
	for (const url of siteUrlsIn(fs.readFileSync(file, "utf8"))) {
		const problem = siteUrlProblem(url);
		if (problem) report(file, problem);
	}
}

// the upgrade guide's items that compile, against the site's page
const upgradePage = path.join(contentDir, "docs/upgrading-from-2x.md");
const upgradeGuide = path.join(skillsDir, "pomwright/guides/upgrading-from-2x.md");
const upgradeSearches = (body) => [
	...[...body.matchAll(/```sh[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1].replace(/^ {2}/gm, "").trim()),
	...[...body.matchAll(/`(grep [^`]+)`/g)].map((match) => match[1].trim()),
];
if (fs.existsSync(upgradePage) && fs.existsSync(upgradeGuide)) {
	const onPage = fs
		.readFileSync(upgradePage, "utf8")
		.split(/\n(?=### )/)
		.filter((part) => part.startsWith("### "))
		.map((part) => {
			const [heading, ...rest] = part.split("\n");
			const body = rest.join("\n");
			const lead = body.trim().split("\n\n")[0];
			return { anchor: slugOf(heading.slice(4).trim()), compiles: /\*\*compiles\*\*|\*\*Compiles/.test(lead), body };
		})
		.filter((item) => item.compiles)
		.map((item) => ({ anchor: item.anchor, searches: upgradeSearches(item.body) }));
	const guideText = fs.readFileSync(upgradeGuide, "utf8");
	const listStart = guideText.indexOf("## The items that compile, and their searches");
	const inGuide =
		listStart === -1
			? []
			: guideText
					.slice(listStart)
					.split(/\n(?=- \[)/)
					.slice(1)
					.map((item) => ({
						anchor: item.match(
							/^- \[[^\]]*\]\(https:\/\/dyhex\.github\.io\/POMWright\/docs\/upgrading-from-2x\/#([^)]+)\)/,
						)?.[1],
						searches: upgradeSearches(item),
					}));
	const show = (items) => items.map((item) => `#${item.anchor} [${item.searches.join(" ; ")}]`).join(", ");
	if (listStart === -1) {
		report(upgradeGuide, "has no ## The items that compile, and their searches");
	} else if (JSON.stringify(onPage) !== JSON.stringify(inGuide)) {
		report(
			upgradeGuide,
			`its items that compile differ from the site's page; the page has ${show(onPage)}; the guide has ${show(inGuide)}`,
		);
	}
}

if (problems.length > 0) {
	console.error(`skills: ${problems.length} problems:\n  ${problems.join("\n  ")}`);
	process.exit(1);
}
const exempted = [...EXEMPT].filter(([skill]) => skills.includes(skill));
console.log(
	`skills: ${skills.length} checked, all pass${exempted.map(([skill, why]) => `; ${skill} exempt from sizes and invocation: ${why}`).join("")}`,
);
