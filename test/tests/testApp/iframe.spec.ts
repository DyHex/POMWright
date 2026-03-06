import { expect, test } from "@fixtures/testApp.fixtures";

const toggleStates = {
	on: "On",
	off: "Off",
} as const;

test.describe("iframe handling", () => {
	test.beforeEach(async ({ iframePage }) => {
		await iframePage.page.goto(iframePage.fullUrl);
	});

	test("getLocator finds iframeA and iframeB", async ({ iframePage }) => {
		const iframeA = iframePage.getLocator("sectionA.frame");
		const iframeB = iframePage.getLocator("sectionB.frame");

		await expect(iframeA).toBeVisible();
		await expect(iframeB).toBeVisible();
	});

	test("getLocator does not finds iframeC as it is inside iframeB", async ({ iframePage }) => {
		const iframeC = iframePage.getLocator("sectionB.frame.innerFrame");

		await expect(iframeC).not.toBeVisible();
	});

	test("getNestedLocator finds iframeA and iframeB", async ({ iframePage }) => {
		const iframeA = iframePage.getNestedLocator("sectionA.frame");
		const iframeB = iframePage.getNestedLocator("sectionB.frame");

		await expect(iframeA).toBeVisible();
		await expect(iframeB).toBeVisible();
	});

	test("getNestedLocator finds nested iframeC", async ({ iframePage }) => {
		const iframeC = iframePage.getNestedLocator("sectionB.frame.innerFrame");
		await expect(iframeC).toBeVisible();
	});

	test("toggle elements inside each iframe", async ({ iframePage }) => {
		const toggleA = iframePage.getNestedLocator("sectionA.frame.toggle");
		const toggleB = iframePage.getNestedLocator("sectionB.frame.toggle");
		const toggleC = iframePage.getNestedLocator("sectionB.frame.innerFrame.toggle");

		await expect(toggleA).toHaveText(`Toggle A: ${toggleStates.off}`);
		await expect(toggleB).toHaveText(`Toggle B: ${toggleStates.off}`);
		await expect(toggleC).toHaveText(`Toggle C: ${toggleStates.off}`);

		await toggleA.click();
		await toggleB.click();
		await toggleC.click();

		await expect(toggleA).toHaveText(`Toggle A: ${toggleStates.on}`);
		await expect(toggleB).toHaveText(`Toggle B: ${toggleStates.on}`);
		await expect(toggleC).toHaveText(`Toggle C: ${toggleStates.on}`);
	});
});
