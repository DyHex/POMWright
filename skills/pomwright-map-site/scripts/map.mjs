#!/usr/bin/env node
// Maps a running site for the pomwright-map-site skill, with the project's own Playwright (1.64 or later).
//
//   node <skill>/scripts/map.mjs crawl <url> [--depth 2] [--limit 40] [--storage-state <file>]
//   node <skill>/scripts/map.mjs snapshot <url> [--storage-state <file>]
//
// Run it from the project's root: it loads @playwright/test from there, and launches chromium headless.
//
// - crawl: opens the start page, follows the links on the same origin breadth first, up to --depth link hops and
//   --limit pages, and prints every page found: its path, its title, and the path pattern it shares with pages whose
//   paths differ only in an id (`/orders/42` and `/orders/43` as `/orders/[id]`).
// - snapshot: opens one page and prints Playwright's aria snapshot of it in the "ai" mode (each element with a ref,
//   iframes included), then, for each landmark, container, heading and interactive element, the locator Playwright's
//   locator.normalize() suggests for it, as codegen writes it.
//
// It only navigates, with GET requests to the URLs given or linked: it never clicks, types, submits a form or opens a
// link to another origin. --storage-state loads a logged-in state the user saved (Playwright's storageState file).

import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));
let chromium;
try {
	({ chromium } = require("@playwright/test"));
} catch {
	console.error(`map.mjs: @playwright/test is not installed in ${process.cwd()}; run it from the project's root`);
	process.exit(2);
}

const [command, start, ...rest] = process.argv.slice(2);
const option = (name, fallback) => {
	const at = rest.indexOf(`--${name}`);
	return at === -1 ? fallback : rest[at + 1];
};
if (!["crawl", "snapshot"].includes(command) || !start) {
	console.error("usage: map.mjs crawl <url> [--depth 2] [--limit 40] [--storage-state <file>]");
	console.error("       map.mjs snapshot <url> [--storage-state <file>]");
	process.exit(2);
}
const origin = new URL(start).origin;
const storageState = option("storage-state", undefined);

/** The roles whose elements become segments or paths: landmarks, containers, headings and interactive elements. */
const MAPPED_ROLES = new Set([
	"banner",
	"main",
	"navigation",
	"contentinfo",
	"complementary",
	"search",
	"region",
	"form",
	"dialog",
	"alertdialog",
	"table",
	"row",
	"list",
	"listitem",
	"article",
	"heading",
	"iframe",
	"button",
	"link",
	"textbox",
	"searchbox",
	"checkbox",
	"radio",
	"combobox",
	"listbox",
	"option",
	"switch",
	"slider",
	"spinbutton",
	"tab",
	"tabpanel",
	"menuitem",
	"img",
	"alert",
	"status",
]);

/** A path's pattern: a segment that is a number, a UUID or a long hex or mixed id becomes `[id]`. */
const patternOf = (pathname) =>
	pathname
		.split("/")
		.map((segment) =>
			/^\d+$/.test(segment) ||
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
			(/\d/.test(segment) && /^[0-9a-z_-]{12,}$/i.test(segment))
				? "[id]"
				: segment,
		)
		.join("/");

const browser = await chromium.launch();
const context = await browser.newContext(storageState ? { storageState } : {});
const page = await context.newPage();
let exitCode = 0;

try {
	if (command === "crawl") {
		const depth = Number(option("depth", "2"));
		const limit = Number(option("limit", "40"));
		const seen = new Map(); // url without hash -> { title, depth } or { error }
		let queue = [[new URL(start).href.replace(/#.*$/, ""), 0]];
		while (queue.length > 0 && seen.size < limit) {
			const next = [];
			for (const [url, level] of queue) {
				if (seen.has(url) || seen.size >= limit) continue;
				try {
					const response = await page.goto(url, { waitUntil: "load" });
					if (new URL(page.url()).origin !== origin) {
						seen.set(url, { error: `left the origin for ${new URL(page.url()).origin}` });
						continue;
					}
					seen.set(url, { title: await page.title(), status: response?.status() });
					if (level >= depth) continue;
					const links = await page.$$eval("a[href]", (anchors) => anchors.map((anchor) => anchor.href));
					for (const link of links) {
						const target = new URL(link);
						if (target.origin !== origin || !/^https?:$/.test(target.protocol)) continue;
						target.hash = "";
						if (!seen.has(target.href)) next.push([target.href, level + 1]);
					}
				} catch (error) {
					seen.set(url, { error: String(error.message ?? error).split("\n")[0] });
				}
			}
			queue = next;
		}
		const byPattern = new Map();
		for (const [url, found] of seen) {
			const { pathname, search } = new URL(url);
			const pattern = patternOf(pathname);
			if (!byPattern.has(pattern)) byPattern.set(pattern, []);
			byPattern.get(pattern).push({ path: `${pathname}${search}`, ...found });
		}
		console.log(`# ${seen.size} pages on ${origin} (depth ${depth}, limit ${limit})\n`);
		for (const [pattern, pages] of [...byPattern].sort(([a], [b]) => a.localeCompare(b))) {
			const first = pages[0];
			const what = first.error ? `not mapped: ${first.error}` : `${first.title || "(no title)"} [${first.status}]`;
			const others =
				pages.length > 1
					? ` (${pages.length} pages, e.g. ${pages
							.map((p) => p.path)
							.slice(0, 3)
							.join(", ")})`
					: "";
			console.log(`${pattern}  ${what}${pattern === first.path ? "" : ` from ${first.path}`}${others}`);
		}
	} else {
		await page.goto(start, { waitUntil: "load" });
		console.log(`# ${page.url()}  ${await page.title()}\n`);
		const snapshot = await page.ariaSnapshot({ mode: "ai" });
		console.log(snapshot);
		console.log("\n# Suggested locators (locator.normalize(): a candidate; prefer a role with its name)\n");
		for (const line of snapshot.split("\n")) {
			// a line the snapshot quotes (a name with a colon in it) starts with an apostrophe
			const element = /^\s*- '?([a-z]+)(?: "((?:[^"\\]|\\.)*)")?.*?\[ref=([a-z0-9]+)\]/.exec(line);
			if (!element || !MAPPED_ROLES.has(element[1])) continue;
			const [, role, name, ref] = element;
			try {
				const suggested = await page.getByRef(ref).normalize();
				console.log(`${ref}  ${role}${name === undefined ? "" : ` "${name}"`}  ->  ${suggested}`);
			} catch (error) {
				console.log(`${ref}  ${role}  ->  (no locator: ${String(error.message ?? error).split("\n")[0]})`);
			}
		}
	}
} catch (error) {
	console.error(`map.mjs: ${String(error.message ?? error).split("\n")[0]}`);
	exitCode = 1;
} finally {
	await browser.close();
}
process.exit(exitCode);
