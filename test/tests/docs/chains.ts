import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";

// What the chain specs share: each test is named after a page (a page of the site, the README or a skill file), rebuilds
// the chains the page shows through the packed package and compares them, and records each value the page must show;
// after the test, the page is read and must show every one, so a change on either side fails until the page and its
// spec change together. A chain is the locator as Playwright prints it without a description, which a resolved locator
// otherwise prints instead (`describe("")`). A selector a page shows on its own is compared through
// `page.locator(selector)`, which Playwright prints as it prints the registry's.

/** A locator as Playwright prints it without a description. */
export const chain = (locator: Locator) => `${locator.describe("")}`;

/** What the page a test is named after must show, gathered as its comparisons run. */
const shownOnPage: string[] = [];
/** Renderings compared in place of a selector the page shows: the selector is what the page must hold. */
const renderings = new Set<string>();
export const onPage = (shown: string) => {
	if (!renderings.has(shown)) {
		shownOnPage.push(shown);
	}
};
/** What the current test has recorded so far: the values its page must show. */
export const recordedOnPage = () => [...shownOnPage];
/** A selector the page shows, rendered as Playwright prints a locator built from it. */
export const selector = (page: Page, shown: string) => {
	onPage(shown);
	const rendered = `${page.locator(shown)}`;
	renderings.add(rendered);
	return rendered;
};
/** A selector the page shows under `main`, rendered as Playwright prints the nested locator. */
export const nested = (page: Page, shown: string) => {
	onPage(shown);
	const rendered = `${page.locator("main").locator(shown)}`;
	renderings.add(rendered);
	return rendered;
};
// A line of Playwright's strict mode error, as the page shows it: without the numbering and the call's prefix.
export const asShown = (line: string) => line.replace(/^\s+\d\) /, "").replace(/^locator\.click: Error: /, "");
// Firefox names two elements and then "...", which the page leaves out on purpose: it shows Chromium's and WebKit's.
export const FIREFOX_ELLIPSIS = "    ...";

/** `expect.soft`, which also records what the page must show. */
export const shows = (actual: unknown) => ({
	toBe: (expected: string) => {
		expect.soft(actual).toBe(expected);
		onPage(expected);
	},
	toContain: (expected: string) => {
		expect.soft(actual).toContain(expected);
		onPage(expected);
	},
	toEqual: (expected: string[]) => {
		expect.soft(actual).toEqual(expected);
		for (const line of expected) {
			if (line !== FIREFOX_ELLIPSIS) {
				onPage(asShown(line));
			}
		}
	},
	toMatch: (expected: RegExp) => expect.soft(actual).toMatch(expected),
});

// a page may break a chain over lines, in a comment or a `text` block: compared without line breaks, indentation and
// comment markers too
export const flatten = (text: string) => text.replace(/\n\s*(\/\/|#)?\s*/g, "");

/**
 * Registers the hooks of a chain spec, in the spec file that calls it (hooks registered in this shared module itself
 * would belong to whichever spec loaded it first): before each test the record is cleared, and after it the page the
 * test is named after, read from `fileOf(title)`, must show everything the test recorded. A test whose title names no
 * page (`fileOf` returns undefined) is not checked.
 */
export function checkThatPagesShow(fileOf: (title: string) => string | undefined) {
	test.beforeEach(() => {
		shownOnPage.length = 0;
		renderings.clear();
	});

	test.afterEach(() => {
		const title = test.info().title;
		const file = fileOf(title);
		if (file === undefined) {
			return;
		}
		const text = readFileSync(file, "utf8");
		const flat = flatten(text);
		for (const shown of shownOnPage) {
			expect.soft(text.includes(shown) || flat.includes(shown), `${title} shows ${JSON.stringify(shown)}`).toBe(true);
		}
	});
}

/** The error message an action throws on the blank page, whose call log shows the chain Playwright waited for. */
export const errorMessage = async (action: Promise<unknown>) =>
	(
		await action.then(
			() => new Error("no error"),
			(caught: Error) => caught,
		)
	).message;

/** The first lines of the error an action throws, for Playwright's strict mode message. */
export const errorLines = async (action: Promise<unknown>, count: number) => {
	const error = await action.then(
		() => new Error("no error"),
		(caught: Error) => caught,
	);
	return error.message.split("\n").slice(0, count);
};
