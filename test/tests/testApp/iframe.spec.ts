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

test.describe("steps on frame segments and the any-frame segment", () => {
	test.beforeEach(async ({ iframePage }) => {
		await iframePage.page.goto(iframePage.fullUrl);
	});

	test("nth, last and filter({ visible }) on the iframe element select the frame", async ({ iframePage }) => {
		const second = iframePage.getNestedLocator("iframes@second.toggle");
		await expect(second).toHaveText("Toggle B: Off");
		await second.click();
		await expect(second).toHaveText("Toggle B: On");
		await expect(iframePage.getNestedLocator("sectionA.frame.toggle")).toHaveText("Toggle A: Off");

		await expect(iframePage.getNestedLocator("iframes@lastVisible.toggle")).toHaveText("Toggle B: On");
		await expect(iframePage.getNestedLocator("iframes@second")).toHaveId("iframeB");
		await expect(iframePage.getLocator("iframes@second")).toHaveId("iframeB");
	});

	test("a hidden iframe is reachable through its step, and its content is hidden", async ({ iframePage }) => {
		await expect(iframePage.getNestedLocator("iframes@last")).toBeHidden();
		await expect(iframePage.getNestedLocator("iframes@last")).toHaveId("iframeHidden");
		await expect(iframePage.getNestedLocator("iframes@last.toggle")).not.toBeVisible();
		await expect(iframePage.getNestedLocator("section@hidden")).toHaveId("sectionC");
	});

	test("query-builder steps on a frame sub-path apply at resolution", async ({ iframePage }) => {
		const first = iframePage
			.getLocatorSchema("iframes@second.toggle")
			.clearSteps("iframes@second")
			.nth("iframes@second", 0)
			.getNestedLocator();
		await expect(first).toHaveText("Toggle A: Off");

		const unstepped = iframePage
			.getLocatorSchema("iframes@second.toggle")
			.clearSteps("iframes@second")
			.getNestedLocator();
		await expect(unstepped.textContent({ timeout: 1000 })).rejects.toThrow(/strict mode violation/);

		// hasText on an iframe element never matches: the frame's document is not the parent's text
		const byText = iframePage
			.getLocatorSchema("iframes@second")
			.clearSteps()
			.filter({ hasText: "Toggle" })
			.getNestedLocator();
		await expect(byText).toHaveCount(0);
	});

	test("the rendered chains match Playwright's own", async ({ iframePage, page }) => {
		expect(`${iframePage.getNestedLocator("iframes@second.toggle").describe("")}`).toEqual(
			`${page.locator("iframe").nth(1).contentFrame().getByRole("button").describe("")}`,
		);
		expect(`${iframePage.getNestedLocator("iframes@lastVisible.toggle").describe("")}`).toEqual(
			`${page.locator("iframe").filter({ visible: true }).last().contentFrame().getByRole("button").describe("")}`,
		);
		expect(`${iframePage.getNestedLocator("sectionB.frame.innerFrame.toggle").describe("")}`).toEqual(
			`${page.locator("#sectionB").frameLocator("#iframeB").frameLocator("#iframeC").getByTestId("toggle-c").describe("")}`,
		);
		expect(`${iframePage.getNestedLocator("anyFrame.toggleC").describe("")}`).toEqual(
			"frameLocator().getByTestId('toggle-c')",
		);
	});

	test("the any-frame segment finds elements in whichever single frame holds them", async ({ iframePage }) => {
		const toggleC = iframePage.getNestedLocator("anyFrame.toggleC");
		await expect(toggleC).toHaveText("Toggle C: Off");
		await toggleC.click();
		await expect(toggleC).toHaveText("Toggle C: On");

		// the main frame counts as a frame too
		await expect(iframePage.getNestedLocator("anyFrame.title")).toHaveText("Iframe playground");

		// matches in several frames are Playwright's error at action time
		await expect(iframePage.getNestedLocator("anyFrame.button").textContent({ timeout: 1000 })).rejects.toThrow(
			/matched elements in multiple frames/,
		);

		// no terminal form
		const noElement =
			'frameLocator() without a selector does not point to a particular iframe; "anyFrame" cannot be resolved';
		expect(() => iframePage.getLocator("anyFrame")).toThrowError(noElement);
		expect(() => iframePage.getNestedLocator("anyFrame")).toThrowError(noElement);
	});
});
