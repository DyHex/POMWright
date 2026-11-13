// The documentation site's pages and anchors, for the checks that read links to the site: a module, not a script.
// check-api-coverage.mjs checks the declarations' URLs with it, and check-skills.mjs the skills'.

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
export const contentDir = path.join(root, "website/src/content/docs");
export const siteUrl = "https://dyhex.github.io/POMWright/";

/** A heading's anchor, as the site makes it (github-slugger: lower case, punctuation removed). */
export const slugOf = (text) =>
	text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.trim()
		.replace(/\s/g, "-");

/** The headings of a page, outside code blocks, each with its level and its anchor (a repeated one gets `-1`, …). */
export function headingsOf(file) {
	const headings = [];
	const counts = new Map();
	let fenced = false;
	for (const line of fs.readFileSync(file, "utf8").split("\n")) {
		if (/^\s*```/.test(line)) fenced = !fenced;
		const heading = !fenced && /^(#{1,6}) (.+)$/.exec(line);
		if (!heading) continue;
		const base = slugOf(heading[2]);
		const seen = counts.get(base) ?? 0;
		counts.set(base, seen + 1);
		headings.push({ level: heading[1].length, text: heading[2].trim(), anchor: seen === 0 ? base : `${base}-${seen}` });
	}
	return headings;
}

export const anchorsOf = (file) => new Set(headingsOf(file).map((heading) => heading.anchor));

/** Every link to the site in a text, without trailing punctuation. */
export const siteUrlsIn = (text) =>
	(text.match(/https:\/\/dyhex\.github\.io\/POMWright\/[^\s)`"'<>]*/g) ?? []).map((url) => url.replace(/[.,;:]+$/, ""));

/** Why a link to the site names nothing (`no page for …`, `no heading for …`), or undefined when it resolves. */
export function siteUrlProblem(url) {
	const [pagePath, anchor] = url.slice(siteUrl.length).split("#");
	const slug = pagePath.replace(/\/$/, "");
	const page = [`${slug}.md`, `${slug}.mdx`, `${slug}/index.md`, `${slug}/index.mdx`]
		.map((candidate) => path.join(contentDir, candidate))
		.find((file) => fs.existsSync(file));
	if (!page) return `no page for ${url}`;
	if (anchor && !anchorsOf(page).has(anchor)) return `no heading for ${url}`;
	return undefined;
}
