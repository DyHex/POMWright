#!/usr/bin/env node
// Maps a running site for the pomwright-map-site skill, with the project's own Playwright (1.64 or later).
//
//   node <skill>/scripts/map.mjs crawl <url> [--depth 2] [--limit 40] [--storage-state <file>]
//   node <skill>/scripts/map.mjs snapshot <url> [--out <dir>] [--consent "<button>"] [--wait-for "<role>=<name>"]
//   node <skill>/scripts/map.mjs reveal <url> --click "<role>=<name>" [--click …] [--out <dir>] [--consent "<button>"]
//
// Run it from the project's root: it loads @playwright/test from there, and launches chromium headless. Every request
// but GET and HEAD is aborted, in every command, so nothing it does sends data to the site; what was aborted is listed.
//
// - crawl: opens the start page, follows the links on the same origin breadth first, up to --depth link hops and
//   --limit pages, and prints every page found: its path, its title, and the path pattern it shares with pages whose
//   paths differ only in an id (`/orders/42` and `/orders/43` as `/orders/[id]`).
// - snapshot: opens one page and prints Playwright's aria snapshot of it in the "ai" mode (each element with a ref,
//   iframes included), the locator Playwright's locator.normalize() suggests for each landmark, container, heading and
//   interactive element, and what the snapshot does not name: elements with a test id, ids in main, and elements
//   hidden from assistive technology that show text. It saves the snapshot, the page's DOM (to search, not to read
//   whole: it is many times the snapshot's size) and a full-page screenshot under --out (default: a folder in the
//   system's temp directory), and prints their paths.
// - reveal: opens one page and clicks, in order, each element the user confirmed, found by its role and exact name
//   (--click "button=Show more", --click "radio=Business"); after each it says whether the URL changed, saves a
//   snapshot and a screenshot, prints the snapshot lines that appeared, and goes back when the click navigated.
//
// --wait-for "<role>=<name>" waits, after the load, until that element shows: for a page whose content arrives later
// (a table behind a progress bar), so the snapshot is of the page a user reads.
// --consent "<button>" answers a cookie dialog first, with the button the user picked (the least consent, such as
// "Only necessary cookies"), when the page shows one. --storage-state loads a logged-in state the user saved.

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
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
const options = (name) => rest.flatMap((value, at) => (rest[at - 1] === `--${name}` ? [value] : []));
if (
	!["crawl", "snapshot", "reveal"].includes(command) ||
	!start ||
	(command === "reveal" && options("click").length === 0)
) {
	console.error("usage: map.mjs crawl <url> [--depth 2] [--limit 40] [--storage-state <file>]");
	console.error('       map.mjs snapshot <url> [--out <dir>] [--consent "<button>"] [--wait-for "<role>=<name>"]');
	console.error('       map.mjs reveal <url> --click "<role>=<name>" [--click …] [--out <dir>] [--consent "<button>"]');
	process.exit(2);
}
const origin = new URL(start).origin;
const storageState = option("storage-state", undefined);
const consent = option("consent", undefined);
const waitFor = option("wait-for", undefined);
const out = option("out", path.join(os.tmpdir(), "pomwright-map", new URL(start).hostname));

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
const context = await browser.newContext({
	viewport: { width: 1280, height: 900 },
	...(storageState ? { storageState } : {}),
});
const page = await context.newPage();
let exitCode = 0;

// nothing that sends data reaches the site: every request but GET and HEAD is aborted, and listed at the end
const aborted = [];
await context.route("**/*", (route) => {
	const request = route.request();
	if (["GET", "HEAD"].includes(request.method())) return route.continue();
	aborted.push(`${request.method()} ${request.url().slice(0, 120)}`);
	return route.abort();
});

/** A file name for a page: its path, readable. */
const slugOf = (url) =>
	(new URL(url).pathname.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "-") || "start").slice(0, 80);

/** Opens a page, waits for its load, and answers its cookie dialog with the user's button when one shows. */
async function open(url) {
	await page.goto(url, { waitUntil: "load" });
	if (waitFor !== undefined) {
		const [role, ...name] = waitFor.split("=");
		await page
			.getByRole(role, { name: name.join("="), exact: true })
			.first()
			.waitFor({ state: "visible" });
	}
	if (consent === undefined) return;
	const button = page.getByRole("button", { name: consent, exact: true });
	if (await button.isVisible()) {
		await button.click();
		await button.waitFor({ state: "hidden" });
		console.log(`# answered the cookie dialog: "${consent}"`);
	}
}

/** Saves the page's snapshot and full-page screenshot (and, with dom, its DOM) under --out; returns the snapshot. */
async function save(name, { dom } = {}) {
	mkdirSync(out, { recursive: true });
	const snapshot = await page.ariaSnapshot({ mode: "ai" });
	writeFileSync(path.join(out, `${name}.snapshot.yml`), snapshot);
	await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
	const files = [`${name}.snapshot.yml`, `${name}.png`];
	if (dom) {
		writeFileSync(path.join(out, `${name}.dom.html`), await page.content());
		files.push(`${name}.dom.html`);
	}
	console.log(`# saved in ${out}: ${files.join(", ")}`);
	return snapshot;
}

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
	} else if (command === "snapshot") {
		await open(start);
		console.log(`# ${page.url()}  ${await page.title()}\n`);
		const snapshot = await save(slugOf(page.url()), { dom: true });
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
		const unnamed = await page.evaluate(() => {
			const describe = (element) =>
				`<${element.tagName.toLowerCase()}> "${(element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60)}"`;
			const testIds = [
				...document.querySelectorAll("[data-testid],[data-test-id],[data-test],[data-qa],[data-cy]"),
			].map((element) => {
				const attribute = ["data-testid", "data-test-id", "data-test", "data-qa", "data-cy"].find((name) =>
					element.hasAttribute(name),
				);
				return `${attribute}="${element.getAttribute(attribute)}" ${describe(element)}`;
			});
			const main = document.querySelector("main") ?? document.body;
			const ids = [...main.querySelectorAll("[id]")].map((element) => `id="${element.id}" ${describe(element)}`);
			const hidden = [...main.querySelectorAll('[aria-hidden="true"]')]
				.filter((element) => (element.textContent ?? "").trim() !== "")
				.map(describe);
			return { testIds, ids, hidden };
		});
		const list = (title, items) =>
			console.log(
				`\n# ${title} (${items.length}${items.length > 40 ? ", the first 40" : ""})\n${items.slice(0, 40).join("\n") || "(none)"}`,
			);
		console.log("\n# What the snapshot does not name: search the DOM file for more, never read it whole");
		list("Elements with a test id", unnamed.testIds);
		list("Elements with an id, in main", unnamed.ids);
		list("Elements hidden from assistive technology that show text, in main", unnamed.hidden);
	} else {
		await open(start);
		let before = await save(`${slugOf(page.url())}.before`);
		for (const [index, target] of options("click").entries()) {
			const [role, ...name] = target.split("=");
			const element = page.getByRole(role, { name: name.join("="), exact: true });
			const count = await element.count();
			console.log(`\n# ${index + 1}. click ${role} "${name.join("=")}"`);
			if (count !== 1) {
				console.log(`not clicked: ${count} elements match; name it so that one does`);
				continue;
			}
			const url = page.url();
			try {
				await element.click({ timeout: 5_000 });
			} catch (error) {
				// such as another element covering it: a fact about the page, reported, not worked around
				const lines = String(error.message ?? error).split("\n");
				const why = lines.find((line) => /intercepts pointer events/.test(line)) ?? lines[0];
				console.log(`not clicked: ${why.trim()}`);
				continue;
			}
			await page.waitForLoadState("load");
			// a mapping tool, not a test: let what the click starts show before the snapshot
			await page.waitForTimeout(500);
			const navigated = page.url() !== url;
			console.log(navigated ? `navigated to ${page.url()}  ${await page.title()}` : "the URL did not change");
			const after = await save(`${slugOf(url)}.click-${index + 1}`);
			const seen = new Set(before.split("\n").map((line) => line.replace(/\[ref=[a-z0-9]+\]/g, "")));
			const appeared = after.split("\n").filter((line) => !seen.has(line.replace(/\[ref=[a-z0-9]+\]/g, "")));
			console.log(
				`appeared (${appeared.length} snapshot lines):\n${appeared.slice(0, 80).join("\n") || "(nothing new)"}`,
			);
			if (navigated) {
				await page.goBack({ waitUntil: "load" });
				console.log(`went back to ${page.url()}`);
			}
			before = await page.ariaSnapshot({ mode: "ai" });
		}
	}
	if (aborted.length > 0) {
		console.log(`\n# Aborted (every request but GET and HEAD): ${aborted.length}\n${aborted.slice(0, 20).join("\n")}`);
	}
} catch (error) {
	console.error(`map.mjs: ${String(error.message ?? error).split("\n")[0]}`);
	exitCode = 1;
} finally {
	await browser.close();
}
process.exit(exitCode);
