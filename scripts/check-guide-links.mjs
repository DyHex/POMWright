// Checks the links of the contributor guide, the agent skills and the two pages GitHub shows at the repository's root:
// the root AGENTS.md, the AGENTS.md of each folder, docs/*.md, every Markdown file under skills/, README.md and
// SECURITY.md. Every relative link must resolve: a link's file or folder must exist; an anchor into a Markdown file
// must name one of its headings, as GitHub makes them (lower case, punctuation but hyphens dropped, spaces as hyphens,
// a repeated heading with -1, -2, …); a line anchor into another file (#L64, #L64-L70) is GitHub's and is taken as
// written. Every link to the documentation site (https://dyhex.github.io/POMWright/…), in a code block too, must name
// one of its pages and, after #, one of that page's headings (site-pages.mjs), except under skills/, whose links to the
// site check-skills.mjs checks. Other links to a site (http, https, mailto) are not checked: the site's own links are
// the site build's.
//
//   node scripts/check-guide-links.mjs   # pnpm lint:guide; CI's lint job

import fs from "node:fs";
import path from "node:path";
import { siteUrlProblem, siteUrlsIn } from "./site-pages.mjs";

const root = path.resolve(import.meta.dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".git", ".pack", "dist"]);

function guideFiles(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : guideFiles(full);
		return entry.name === "AGENTS.md" ? [full] : [];
	});
}
const markdownIn = (dir) =>
	fs.existsSync(dir)
		? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) return markdownIn(full);
				return entry.name.endsWith(".md") ? [full] : [];
			})
		: [];
const files = [
	...new Set([
		...guideFiles(root),
		...fs
			.readdirSync(path.join(root, "docs"))
			.filter((name) => name.endsWith(".md"))
			.map((name) => path.join(root, "docs", name)),
		...markdownIn(path.join(root, "skills")),
		path.join(root, "README.md"),
		path.join(root, "SECURITY.md"),
	]),
];
const skillsDir = path.join(root, "skills") + path.sep;

const slugs = new Map(); // a Markdown file -> the anchors of its headings
function anchorsOf(file) {
	if (!slugs.has(file)) {
		const seen = new Map();
		const anchors = new Set();
		let fenced = false;
		for (const line of fs.readFileSync(file, "utf8").split("\n")) {
			if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
			const heading = !fenced && /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
			if (!heading) continue;
			const base = heading[1]
				.toLowerCase()
				.replace(/[^\p{L}\p{N}\s_-]/gu, "")
				.replace(/\s/g, "-");
			const count = seen.get(base) ?? 0;
			seen.set(base, count + 1);
			anchors.add(count === 0 ? base : `${base}-${count}`);
		}
		slugs.set(file, anchors);
	}
	return slugs.get(file);
}

const problems = [];
let checked = 0;
for (const file of files) {
	const lines = fs.readFileSync(file, "utf8").split("\n");
	const siteLinks = !file.startsWith(skillsDir);
	let fenced = false;
	for (const [index, line] of lines.entries()) {
		const where = `${path.relative(root, file)}:${index + 1}`;
		for (const url of siteLinks ? siteUrlsIn(line) : []) {
			checked++;
			const problem = siteUrlProblem(url);
			if (problem) problems.push(`${where}: ${problem}`);
		}
		if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
		if (fenced) continue;
		// a link, not an image, outside a code span; the target ends at the first space or closing parenthesis
		const prose = line.replace(/``.*?``|`[^`]*`/g, "");
		for (const [, target] of prose.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)\)/g)) {
			if (/^(https?:|mailto:)/.test(target)) continue;
			checked++;
			const [linked, anchor] = target.split("#");
			const resolved = linked === "" ? file : path.resolve(path.dirname(file), decodeURIComponent(linked));
			if (!fs.existsSync(resolved)) {
				problems.push(`${where}: ${target} does not exist`);
				continue;
			}
			if (anchor === undefined || anchor === "") continue;
			if (!resolved.endsWith(".md")) {
				if (!/^L\d+(-L\d+)?$/.test(anchor)) problems.push(`${where}: ${target}: only a line anchor (#L12) fits a file`);
				continue;
			}
			if (!anchorsOf(resolved).has(anchor)) {
				problems.push(`${where}: ${target}: ${path.relative(root, resolved)} has no heading #${anchor}`);
			}
		}
	}
}

if (problems.length > 0) {
	console.error(`guide links: ${problems.length} of ${checked} do not resolve:\n  ${problems.join("\n  ")}`);
	process.exit(1);
}
console.log(`guide links: ${checked} links in ${files.length} files, all resolve`);
