import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

const BASE = "http://localhost:9000";

/**
 * The differences a browser has from `new URL` in the URL it reports, for a printable ASCII character in the path,
 * the query or the fragment. A string path compares these as one (`comparable` in src/helpers/url.ts); a new one fails
 * the sweep below and needs an entry there.
 */
const KNOWN: Record<string, string[]> = { chromium: ['"|" in the path: /testpath/a%7Cb'], firefox: [], webkit: [] };
// Node 20 and 22 (ada 2) keep a "^" in a path, which every browser and Node 24 (ada 4) write as "%5E"
const caretKept = new URL("/a^b", BASE).pathname === "/a^b";
if (caretKept) {
	KNOWN.chromium?.unshift('"^" in the path: /testpath/a%5Eb');
	KNOWN.firefox?.push('"^" in the path: /testpath/a%5Eb');
	KNOWN.webkit?.push('"^" in the path: /testpath/a%5Eb');
}

test("the URL each browser reports differs from new URL's only where a string path allows for it", async ({
	page,
	browserName,
}) => {
	test.setTimeout(120_000);
	const differences: string[] = [];
	for (let code = 0x20; code <= 0x7e; code++) {
		const character = String.fromCharCode(code);
		// the characters that end or escape a part
		if ("#?/%\\".includes(character)) {
			continue;
		}
		const url = `${BASE}/testpath/a${character}b?q=a${character}b#a${character}b`;
		await page.goto(url, { waitUntil: "commit" });
		const expected = new URL(url);
		const reported = new URL(page.url());
		for (const part of ["pathname", "search", "hash"] as const) {
			if (reported[part] !== expected[part]) {
				const where = { pathname: "the path", search: "the query", hash: "the fragment" }[part];
				differences.push(`${JSON.stringify(character)} in ${where}: ${reported[part]}`);
			}
		}
	}
	expect(differences).toEqual(KNOWN[browserName]);
});

class CaretPage extends PageObject<"body"> {
	constructor(page: Page) {
		super(page, BASE, "/testpath/a^b", { label: "CaretPage" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
}

test('a string path with "^" is this page on every browser and Node version, and never another page', async ({
	page,
}) => {
	const caretPage = new CaretPage(page);
	await caretPage.navigation.goto({ waitUntil: "commit" });
	// fullUrl is the form the browser reports, "%5E", also on Node 20 and 22, whose new URL keeps the "^"
	expect(caretPage.fullUrl).toBe(`${BASE}/testpath/a%5Eb`);
	await expect(page).toHaveURL(caretPage.fullUrl);
	await caretPage.navigation.expectThisPage({ waitUntil: "commit" });
	await expect(caretPage.navigation.expectAnotherPage({ waitUntil: "commit", timeout: 500 })).rejects.toThrow(
		"CaretPage: expected to have left",
	);
});

class PipePage extends PageObject<"body"> {
	constructor(page: Page) {
		super(page, BASE, "/testpath/a|b", { label: "PipePage" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
}

test('a string path with "|" is this page on every browser, and never another page', async ({ page, browserName }) => {
	const pipePage = new PipePage(page);
	await pipePage.navigation.goto({ waitUntil: "commit" });
	if (browserName === "chromium") {
		// the known difference: Chromium reports "%7C", so fullUrl, with the "|", is not the URL it reports;
		// expectThisPage() below matches on every browser
		await expect(page).not.toHaveURL(pipePage.fullUrl);
	} else {
		await expect(page).toHaveURL(pipePage.fullUrl);
	}
	await pipePage.navigation.expectThisPage({ waitUntil: "commit" });
	await expect(pipePage.navigation.expectAnotherPage({ waitUntil: "commit", timeout: 500 })).rejects.toThrow(
		"PipePage: expected to have left",
	);
});
