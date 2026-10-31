import { expect, test } from "@fixtures/testApp.fixtures";
import type { Locator } from "@playwright/test";

// The getBy* strategies that match on text, a label, a placeholder or an alt text, registered in a page object and
// resolved on a page the test server serves, each against Playwright's own locator built with the same arguments. The
// locatorRegistry/add specs check the same registrations on documents set with setContent.

test.beforeEach(async ({ testGetBy }) => {
	await testGetBy.page.goto(testGetBy.fullUrl);
});

/** The registry's locator finds exactly the elements Playwright's own finds, in the same order. */
async function expectSameElements(registered: Locator, own: Locator) {
	const count = await own.count();
	expect(count, "Playwright's own locator finds an element").toBeGreaterThan(0);
	await expect(registered).toHaveCount(count);
	for (let index = 0; index < count; index++) {
		const element = await own.nth(index).elementHandle();
		expect(await registered.nth(index).evaluate((found, expected) => found === expected, element)).toBe(true);
		await element?.dispose();
	}
}

test("getByText finds on a served page what Playwright's getByText finds", async ({ page, testGetBy }) => {
	const section = page.locator("#greetings");
	await expectSameElements(
		testGetBy.getNestedLocator("greetings.text@exact"),
		section.getByText("Welcome", { exact: true }),
	);
	await expectSameElements(testGetBy.getNestedLocator("greetings.text@substring"), section.getByText("welcome"));
	await expectSameElements(testGetBy.getNestedLocator("greetings.text@regex"), section.getByText(/^welcome back/i));
	await expectSameElements(testGetBy.getNestedLocator("greetings.text@second"), section.getByText("Welcome").nth(1));

	await expect(testGetBy.getNestedLocator("greetings.text@exact")).toHaveCount(1);
	await expect(testGetBy.getNestedLocator("greetings.text@substring")).toHaveText(["Welcome", "Welcome back, Ada"]);
	await expect(testGetBy.getNestedLocator("greetings.text@regex")).toHaveText("Welcome back, Ada");
	await expect(testGetBy.getNestedLocator("greetings.text@second")).toHaveText("Welcome back, Ada");
	// the terminal alone is page-wide, so the decoy outside the section matches too
	await expect(testGetBy.getLocator("greetings.text@exact")).toHaveCount(2);
});

test("getByLabel finds an input by each kind of label, as Playwright's getByLabel does", async ({
	page,
	testGetBy,
}) => {
	const form = page.locator("#account");
	const cases = [
		["account.input@wrappingLabel", form.getByLabel("Username"), "user"],
		["account.input@forLabel", form.getByLabel("Email", { exact: true }), "email"],
		["account.input@ariaLabel", form.getByLabel("Search"), "search"],
		["account.input@labelledBy", form.getByLabel(/^password$/i), "password"],
	] as const;
	for (const [path, own, name] of cases) {
		const registered = testGetBy.getNestedLocator(path);
		await expectSameElements(registered, own);
		await expect(registered, path).toHaveAttribute("name", name);
	}
});

test("getByPlaceholder finds an input and a textarea, as Playwright's getByPlaceholder does", async ({
	page,
	testGetBy,
}) => {
	const form = page.locator("#account");
	await expectSameElements(
		testGetBy.getNestedLocator("account.input@placeholder"),
		form.getByPlaceholder("Enter your name", { exact: true }),
	);
	await expectSameElements(
		testGetBy.getNestedLocator("account.textarea@placeholder"),
		form.getByPlaceholder(/comment/),
	);
	await expectSameElements(
		testGetBy.getNestedLocator("account.field@lastPlaceholder"),
		form.getByPlaceholder("Enter").last(),
	);

	await expect(testGetBy.getNestedLocator("account.input@placeholder")).toHaveAttribute("name", "name");
	await expect(testGetBy.getNestedLocator("account.textarea@placeholder")).toHaveAttribute("name", "comment");
	await expect(testGetBy.getNestedLocator("account.field@lastPlaceholder")).toHaveAttribute("name", "comment");
	await expect(testGetBy.getLocator("account.input@placeholder")).toHaveCount(2);
});

test("getByAltText finds the served images, as Playwright's getByAltText does", async ({ page, testGetBy }) => {
	const gallery = page.locator("#gallery");
	await expectSameElements(
		testGetBy.getNestedLocator("gallery.img@exact"),
		gallery.getByAltText("Nature", { exact: true }),
	);
	await expectSameElements(testGetBy.getNestedLocator("gallery.img@regex"), gallery.getByAltText(/lights$/i));

	await expect(testGetBy.getNestedLocator("gallery.img@exact")).toHaveAttribute("src", "/images/nature.svg");
	await expect(testGetBy.getNestedLocator("gallery.img@regex")).toHaveAttribute("src", "/images/lights.svg");
	// the images are the test server's own, loaded
	await expect(testGetBy.getNestedLocator("gallery.img@regex")).toHaveJSProperty("complete", true);
	expect(
		await testGetBy.getNestedLocator("gallery.img@regex").evaluate((image: HTMLImageElement) => image.naturalWidth),
	).toBeGreaterThan(0);
	await expect(testGetBy.getLocator("gallery.img@exact")).toHaveCount(2);
});
