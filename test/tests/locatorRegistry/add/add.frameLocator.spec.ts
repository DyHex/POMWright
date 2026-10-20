import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";
const render = (locator: { describe: (description: string) => unknown }) => `${locator.describe("")}`;
const anyFrameSteps = (method: string, part: string) =>
	`${method} cannot apply to "${part}": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`;
const noElement = (part: string) =>
	`frameLocator() without a selector does not point to a particular iframe; "${part}" cannot be resolved on its own, filtered or indexed; resolve a path inside it.`;

test("add frameLocator to registry", async ({ page }) => {
	type LocatorSchemaPaths = "iframe";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("iframe")).toThrowError(`${errMsg} "iframe".`);

	registry.add("iframe").frameLocator("iframe#my-frame");

	expect(registry.get("iframe")).toEqual({
		definition: { selector: "iframe#my-frame", type: "frameLocator" },
		locatorSchemaPath: "iframe",
		steps: [],
	});
});

test("a frame segment is locator(selector) plus its steps, then contentFrame() for the descendants", async ({
	page,
}) => {
	type LocatorSchemaPaths = "frames" | "frames.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("frames").frameLocator("iframe").nth(1);
	registry.add("frames.button").getByRole("button");

	expect(registry.get("frames").steps).toEqual([{ kind: "index", index: 1 }]);
	expect(render(registry.getNestedLocator("frames.button"))).toEqual(
		render(page.locator("iframe").nth(1).contentFrame().getByRole("button")),
	);
	// the terminal form is the iframe element itself, steps applied
	expect(render(registry.getNestedLocator("frames"))).toEqual(render(page.locator("iframe").nth(1)));
	expect(render(registry.getLocator("frames"))).toEqual(render(page.locator("iframe").nth(1)));
});

test("a step-less frame renders exactly as page.frameLocator does", async ({ page }) => {
	type LocatorSchemaPaths = "shell" | "shell.frame" | "shell.frame.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("shell").locator("main");
	registry.add("shell.frame").frameLocator("iframe");
	registry.add("shell.frame.button").getByRole("button");

	expect(render(registry.getNestedLocator("shell.frame.button"))).toEqual(
		render(page.locator("main").frameLocator("iframe").getByRole("button")),
	);
	expect(render(registry.getNestedLocator("shell.frame"))).toEqual(
		render(page.locator("main").frameLocator("iframe").owner()),
	);
});

test("an ancestor frame with filter and last renders Playwright's own chain", async ({ page }) => {
	type LocatorSchemaPaths = "shell" | "shell.frame" | "shell.frame.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("shell").locator("main");
	registry.add("shell.frame").frameLocator("iframe").filter({ visible: true }).nth("last");
	registry.add("shell.frame.button").getByRole("button");

	const nested = registry.getNestedLocator("shell.frame.button");
	expect(render(nested)).toEqual(
		render(page.locator("main").locator("iframe").filter({ visible: true }).last().contentFrame().getByRole("button")),
	);
	expect(render(nested)).toEqual(
		"locator('main').locator('iframe').visible().last().contentFrame().getByRole('button')",
	);
});

test("nested frames apply steps on each level", async ({ page }) => {
	type LocatorSchemaPaths = "outer" | "outer.inner" | "outer.inner.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("outer").frameLocator("iframe").nth("first");
	registry.add("outer.inner").frameLocator("iframe").nth(1);
	registry.add("outer.inner.button").getByRole("button");

	expect(render(registry.getNestedLocator("outer.inner.button"))).toEqual(
		render(page.locator("iframe").first().contentFrame().locator("iframe").nth(1).contentFrame().getByRole("button")),
	);
});

test("a seeded frame keeps its step, accepts more, and inherits on an omitted selector", async ({ page }) => {
	type LocatorSchemaPaths = "frames" | "frames.copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const seed = registry.createReusable.frameLocator("iframe").nth(1);

	registry.add("frames", { reuse: seed }).filter({ visible: true });
	expect(registry.get("frames")).toEqual({
		locatorSchemaPath: "frames",
		definition: { type: "frameLocator", selector: "iframe" },
		steps: [
			{ kind: "index", index: 1 },
			{ kind: "filter", filter: { visible: true } },
		],
	});

	registry.add("frames.copy", { reuse: seed }).frameLocator(undefined);
	expect(registry.get("frames.copy").definition).toEqual({ type: "frameLocator", selector: "iframe" });
	expect(render(registry.getLocator("frames"))).toEqual(
		render(page.locator("iframe").nth(1).filter({ visible: true })),
	);
});

test("frameLocator('') throws on every builder and registers nothing", async ({ page }) => {
	type LocatorSchemaPaths = "frames" | "frames.copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	expect(() => registry.add("frames").frameLocator("")).toThrowError(
		'frameLocator requires a non-empty selector for "frames".',
	);
	expect(registry.getIfExists("frames")).toBeUndefined();

	const seed = registry.createReusable.frameLocator("iframe");
	expect(() => registry.add("frames.copy", { reuse: seed }).frameLocator("")).toThrowError(
		'frameLocator requires a non-empty selector for "frames.copy".',
	);
	expect(registry.get("frames.copy").definition).toEqual({ type: "frameLocator", selector: "iframe" });

	expect(() => registry.createReusable.frameLocator("")).toThrowError(
		"createReusable.frameLocator requires a non-empty selector.",
	);

	registry.add("frames").frameLocator("iframe");
	expect(() => registry.getLocatorSchema("frames").update().frameLocator("")).toThrowError(
		'frameLocator requires a non-empty selector for "frames".',
	);
	expect(() => registry.getLocatorSchema("frames").replace().frameLocator("")).toThrowError(
		'frameLocator requires a non-empty selector for "frames".',
	);
});

test("the any-frame segment must be the first resolved segment of its chain", async ({ page }) => {
	type LocatorSchemaPaths =
		| "shell"
		| "shell.anyFrame"
		| "shell.anyFrame.button"
		| "root.anyFrame"
		| "root.anyFrame.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("shell").locator("main");
	registry.add("shell.anyFrame").frameLocator();
	registry.add("shell.anyFrame.button").getByRole("button");

	expect(() => registry.getNestedLocator("shell.anyFrame.button")).toThrowError(
		'frameLocator() without a selector must be the first segment of the chain; "shell.anyFrame" has the ancestor "shell".',
	);
	// a skipped ancestor leaves the page as the target, so the any-frame segment is first again
	expect(render(registry.getLocatorSchema("shell.anyFrame.button").skip("shell").getNestedLocator())).toEqual(
		"frameLocator().getByRole('button')",
	);

	// a sparse chain whose ancestor is not registered resolves from the page
	registry.add("root.anyFrame").frameLocator();
	registry.add("root.anyFrame.button").getByRole("button");
	expect(render(registry.getNestedLocator("root.anyFrame.button"))).toEqual("frameLocator().getByRole('button')");
});

test("the any-frame segment has no element: no terminal form, no reference, no steps", async ({ page }) => {
	type LocatorSchemaPaths = "anyFrame" | "anyFrame.button" | "section";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	const result = registry.add("anyFrame").frameLocator();
	expect(result).toBeUndefined();
	registry.add("anyFrame.button").getByRole("button");

	expect(registry.get("anyFrame")).toEqual({
		locatorSchemaPath: "anyFrame",
		definition: { type: "frameLocator" },
		steps: [],
	});
	expect(render(registry.getNestedLocator("anyFrame.button"))).toEqual("frameLocator().getByRole('button')");
	expect(render(registry.getLocator("anyFrame.button"))).toEqual("getByRole('button')");

	expect(() => registry.getLocator("anyFrame")).toThrowError(noElement("anyFrame"));
	expect(() => registry.getNestedLocator("anyFrame")).toThrowError(noElement("anyFrame"));
	// a step in a query gets the message add gives
	expect(() => registry.getLocatorSchema("anyFrame.button").nth("anyFrame", 1)).toThrowError(
		anyFrameSteps("nth()", "anyFrame"),
	);
	expect(() => registry.getLocatorSchema("anyFrame.button").filter("anyFrame", { visible: true })).toThrowError(
		anyFrameSteps("filter()", "anyFrame"),
	);
	// replacing with the any-frame form is refused at the call where it can never resolve
	expect(() => registry.getLocatorSchema("anyFrame.button").replace().frameLocator()).toThrowError(
		'replace() cannot apply to "anyFrame.button": it is the path this query resolves, and frameLocator() without a selector has no element to resolve to; replace an ancestor instead.',
	);

	registry.add("section").locator("section").filter({ has: "anyFrame" });
	expect(() => registry.getLocator("section")).toThrowError(noElement("anyFrame"));
});

test("an any-frame segment may be followed by a selector frame", async ({ page }) => {
	type LocatorSchemaPaths = "anyFrame" | "anyFrame.inner" | "anyFrame.inner.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("anyFrame").frameLocator();
	registry.add("anyFrame.inner").frameLocator("#iframeC");
	registry.add("anyFrame.inner.button").getByRole("button");

	expect(render(registry.getNestedLocator("anyFrame.inner.button"))).toEqual(
		render(page.frameLocator().locator("#iframeC").contentFrame().getByRole("button")),
	);
});

test("replace().frameLocator() makes a sub-path any-frame; update().frameLocator() changes nothing", async ({
	page,
}) => {
	type LocatorSchemaPaths = "root" | "root.button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("root").frameLocator("iframe");
	registry.add("root.button").getByRole("button");

	expect(render(registry.getLocatorSchema("root.button").replace("root").frameLocator().getNestedLocator())).toEqual(
		"frameLocator().getByRole('button')",
	);
	expect(render(registry.getLocatorSchema("root.button").update("root").frameLocator().getNestedLocator())).toEqual(
		render(page.frameLocator("iframe").getByRole("button")),
	);
	expect(render(registry.getNestedLocator("root.button"))).toEqual(
		render(page.frameLocator("iframe").getByRole("button")),
	);
});
