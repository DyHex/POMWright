import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";

// A session storage call tells a replaced document from the same one by a handle to the page's document, taken before
// its first storage call and evaluated after each: Playwright disposes of a handle when its frame navigates to a new
// document, and evaluating it then throws "Execution context was destroyed", which the call reads as a navigation.
// This pins that behavior of Playwright's, for every kind of navigation, on the test server's own pages.

const A = "http://localhost:9000";

/** Takes a handle to the page's document, runs `navigate`, and tells whether the handle still evaluates. */
const handleAfter = async (page: Page, navigate: () => Promise<unknown>) => {
	const handle = await page.evaluateHandle(() => document);
	await navigate();
	return handle.evaluate(() => "alive").catch((error: Error) => error.message);
};
const destroyed = /Execution context was destroyed/;

test.describe("a handle to the page's document", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(`${A}/teststorage`);
	});

	test("is gone after a reload", async ({ page }) => {
		expect(await handleAfter(page, () => page.reload())).toMatch(destroyed);
	});

	test("is gone after page.goto, to the same URL too", async ({ page }) => {
		expect(await handleAfter(page, () => page.goto(`${A}/teststorage`))).toMatch(destroyed);
	});

	test("is gone after location.replace and location.assign within the origin", async ({ page }) => {
		const replaced = await handleAfter(page, async () => {
			await page.evaluate(() => location.replace("/teststorage?replaced=1"));
			await page.waitForURL(`${A}/teststorage?replaced=1`);
		});
		expect(replaced).toMatch(destroyed);
		const assigned = await handleAfter(page, async () => {
			await page.evaluate(() => location.assign("/teststorage?assigned=1"));
			await page.waitForURL(`${A}/teststorage?assigned=1`);
		});
		expect(assigned).toMatch(destroyed);
	});

	test("is gone after a link and a form within the origin", async ({ page }) => {
		const linked = await handleAfter(page, async () => {
			await page.locator("#same-origin").click();
			await page.waitForURL(`${A}/teststorage?second=1`);
		});
		expect(linked).toMatch(destroyed);
		const posted = await handleAfter(page, async () => {
			await page.evaluate(() => {
				const form = document.createElement("form");
				form.method = "post";
				form.action = "/teststorage?posted=1";
				document.body.append(form);
				form.submit();
			});
			await page.waitForURL(`${A}/teststorage?posted=1`);
			await expect(page.locator("#method")).toHaveText("POST");
		});
		expect(posted).toMatch(destroyed);
	});

	test("is gone after a meta refresh within the origin", async ({ page }) => {
		const refreshed = await handleAfter(page, async () => {
			await page.evaluate(() => {
				const meta = document.createElement("meta");
				meta.httpEquiv = "refresh";
				meta.content = "0;url=/teststorage?meta=1";
				document.head.append(meta);
			});
			await page.waitForURL(`${A}/teststorage?meta=1`);
		});
		expect(refreshed).toMatch(destroyed);
	});

	test("is gone after going back and forward", async ({ page }) => {
		await page.goto(`${A}/teststorage?second=1`);
		expect(await handleAfter(page, () => page.goBack())).toMatch(destroyed);
		expect(page.url()).toBe(`${A}/teststorage`);
		expect(await handleAfter(page, () => page.goForward())).toMatch(destroyed);
		expect(page.url()).toBe(`${A}/teststorage?second=1`);
	});

	test("stays after pushState, replaceState and a hash change, which keep the document", async ({ page }) => {
		expect(await handleAfter(page, () => page.evaluate(() => history.pushState({}, "", "/teststorage?pushed=1")))).toBe(
			"alive",
		);
		expect(
			await handleAfter(page, () => page.evaluate(() => history.replaceState({}, "", "/teststorage?replaced=1"))),
		).toBe("alive");
		expect(
			await handleAfter(page, async () => {
				await page.evaluate(() => {
					location.hash = "section";
				});
				await page.waitForURL(`${A}/teststorage?replaced=1#section`);
			}),
		).toBe("alive");
	});

	test("stays after a navigation that commits no document", async ({ page }) => {
		const kept = await handleAfter(page, async () => {
			const response = page.waitForResponse(`${A}/teststorage/204`);
			await page.evaluate(() => {
				location.href = "/teststorage/204";
			});
			await response;
		});
		expect(kept).toBe("alive");
		expect(page.url()).toBe(`${A}/teststorage`);
	});
});
