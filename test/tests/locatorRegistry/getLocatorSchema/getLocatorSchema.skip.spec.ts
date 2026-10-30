import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

const createRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page);

// The one page here, in the last test, is a document set with page.setContent, a stand-in for a page the test server
// serves: which element a chain matches depends on the DOM alone, however the document arrived, so it could hide only
// what loading a page brings (scripts, frames, another origin).

test("the terminal path cannot be skipped", async ({ page }) => {
	type Paths = "root" | "root.target";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);

	add("root").locator("div.root");
	add("root.target").locator(".child");

	const query = getLocatorSchema("root.target");
	// @ts-expect-error skip accepts the ancestors only
	expect(() => query.skip("root.target")).toThrowError(
		'skip() cannot skip "root.target": it is the path this query resolves; skip one of its ancestors.',
	);
	// @ts-expect-error skip has no form without a sub-path
	expect(() => query.skip()).toThrowError('"undefined" is not a valid sub-path of "root.target".');
	expect(`${query.getNestedLocator().describe("")}`).toEqual("locator('div.root').locator('.child')");
});

test("unskip takes an ancestor too: not the query's own path, and not without a sub-path", async ({ page }) => {
	type Paths = "root" | "root.target";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);

	add("root").locator("div.root");
	add("root.target").locator(".child");

	const query = getLocatorSchema("root.target");
	// @ts-expect-error unskip accepts the ancestors only
	expect(() => query.unskip("root.target")).toThrowError(
		'unskip() cannot unskip "root.target": it is not skipped in this query.',
	);
	// @ts-expect-error unskip has no form without a sub-path
	expect(() => query.unskip()).toThrowError('"undefined" is not a valid sub-path of "root.target".');
});

test("skip on an ancestor leaves it out of the chain", async ({ page }) => {
	type Paths = "root" | "root.child";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);

	add("root").locator("div.root");
	add("root.child").getByRole("button", { name: "Submit" });

	const locator = getLocatorSchema("root.child").skip("root").getNestedLocator();

	expect(`${locator.describe("")}`).toEqual("getByRole('button', { name: 'Submit' })");
});

test("remove() is replaced by skip() and unskip()", async ({ page }) => {
	type Paths = "root" | "root.child";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);
	add("root").locator("div.root");
	add("root.child").locator("p");

	const query = getLocatorSchema("root.child");
	// @ts-expect-error remove() no longer exists
	expect(query.remove).toBeUndefined();
});

test.describe("against the /testfilters page", () => {
	test.beforeEach(async ({ testFilters }) => {
		await testFilters.page.goto(testFilters.fullUrl);
	});

	test("skip leaves an ancestor out and unskip brings it back exactly as it was", async ({ testFilters }) => {
		const query = testFilters.getLocatorSchema("body.section@playground.button");
		await expect(query.getNestedLocator()).toHaveCount(4);

		const skipped = query.skip("body.section@playground").getNestedLocator();
		expect(`${skipped.describe("")}`).toEqual("locator('body').getByRole('button')");
		await expect(skipped).toHaveCount(16);

		const restored = query.unskip("body.section@playground").getNestedLocator();
		expect(`${restored.describe("")}`).toEqual(
			"locator('body').locator('section').filter({ hasText: /Playground/i }).getByRole('button')",
		);
		await expect(restored).toHaveCount(4);
		expect(restored.description()).toEqual("body.section@playground.button");
	});

	test("a segment keeps what it was given before the skip", async ({ testFilters }) => {
		const query = testFilters
			.getLocatorSchema("body.section.button")
			.filter("body.section", { hasText: "Playground" })
			.update("body.section.button")
			.getByRole({ name: "Red" })
			.skip("body.section")
			.unskip("body.section");
		const locator = query.getNestedLocator();
		await expect(locator).toHaveCount(1);
		await expect(locator).toHaveText("Red");
	});

	test("getLocator resolves the terminal only, so skipping makes no difference", async ({ testFilters }) => {
		const query = testFilters.getLocatorSchema("body.section@playground.button@red");
		const before = `${query.getLocator().describe("")}`;
		const after = `${query.skip("body").skip("body.section@playground").getLocator().describe("")}`;
		expect(after).toEqual(before);
		await expect(query.getLocator()).toHaveCount(4);
	});

	test("a skipped segment rejects changes until unskip, and a rejected call changes nothing", async ({
		testFilters,
	}) => {
		const query = testFilters.getLocatorSchema("body.section@playground.button").skip("body.section@playground");
		const reason = 'it is skipped in this query; call unskip("body.section@playground") first.';
		expect(() => query.update("body.section@playground")).toThrowError(
			`update() cannot apply to "body.section@playground": ${reason}`,
		);
		expect(() => query.replace("body.section@playground")).toThrowError(
			`replace() cannot apply to "body.section@playground": ${reason}`,
		);
		expect(() => query.filter("body.section@playground", { hasText: "x" })).toThrowError(
			`filter() cannot apply to "body.section@playground": ${reason}`,
		);
		expect(() => query.nth("body.section@playground", 0)).toThrowError(
			`nth() cannot apply to "body.section@playground": ${reason}`,
		);
		expect(() => query.clearSteps("body.section@playground")).toThrowError(
			`clearSteps() cannot apply to "body.section@playground": ${reason}`,
		);
		await expect(query.unskip("body.section@playground").getNestedLocator()).toHaveCount(4);
	});

	test("a second skip and a stray unskip throw", async ({ testFilters }) => {
		const query = testFilters.getLocatorSchema("body.section@playground.button");
		expect(() => query.unskip("body")).toThrowError('unskip() cannot unskip "body": it is not skipped in this query.');
		query.skip("body");
		expect(() => query.skip("body")).toThrowError('skip() cannot skip "body": it is already skipped in this query.');
		await expect(query.getNestedLocator()).toHaveCount(4);
	});

	test("each query skips on its own; the registry is untouched", async ({ testFilters }) => {
		testFilters.getLocatorSchema("body.section@playground.button").skip("body.section@playground");
		await expect(testFilters.getNestedLocator("body.section@playground.button")).toHaveCount(4);
		await expect(testFilters.getLocatorSchema("body.section@playground.button").getNestedLocator()).toHaveCount(4);
	});
});

test("an update() or replace() builder taken before skip() cannot change the skipped segment", async ({ page }) => {
	type Paths = "root" | "root.button";

	const { add, getLocatorSchema } = createRegistry<Paths>(page);
	await page.setContent('<section id="a"><button>A</button></section><section id="b"><button>B</button></section>');

	add("root").locator("#a");
	add("root.button").getByRole("button");

	const query = getLocatorSchema("root.button");
	const pendingUpdate = query.update("root");
	const pendingReplace = query.replace("root");
	query.skip("root");
	const unskip = 'it is skipped in this query; call unskip("root") first.';
	expect(() => pendingUpdate.locator("#b")).toThrowError(`update() cannot apply to "root": ${unskip}`);
	expect(() => pendingReplace.getByRole("region")).toThrowError(`replace() cannot apply to "root": ${unskip}`);
	await expect(query.unskip("root").getNestedLocator()).toHaveText("A");
});
