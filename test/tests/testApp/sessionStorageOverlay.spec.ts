import { expect, test } from "@playwright/test";
import { SessionStorage } from "pomwright";

const B = "http://127.0.0.1:9000";

// With video.show.test, Playwright's test.step updates an overlay in every page of the context, a round trip to the
// browser, before it runs a step's body. A navigation can commit in that gap.
test.use({ video: { mode: "on", show: { test: {} } } });

test("a seed raced by the hop fails at the call, never resolving without its entries", async ({ context }) => {
	const inFlight =
		/^SessionStorage\.seed: the page committed a document on http:\/\/127\.0\.0\.1:9000 while seed\(\) was registering/;
	// Playwright's own overlay update can fail the step before its body runs; that error is Playwright's, not a seed's
	const overlayFailure = /Execution context was destroyed/;
	for (let round = 0; round < 5; round++) {
		const page = await context.newPage();
		const seeding = new SessionStorage(page, { origin: B }).seed({ token: "t" }).then(
			() => "resolved",
			(error: Error) => error.message,
		);
		await page.goto(`${B}/teststorage`);
		const outcome = await seeding;
		const startup = await page.evaluate(() => JSON.parse((window as unknown as { __startup: string }).__startup));
		if (outcome === "resolved") {
			expect(startup, `round ${round}`).toEqual({ token: "t" });
		} else {
			expect(inFlight.test(outcome) || overlayFailure.test(outcome), `round ${round}: ${outcome}`).toBe(true);
		}
		await page.close();
	}
});
