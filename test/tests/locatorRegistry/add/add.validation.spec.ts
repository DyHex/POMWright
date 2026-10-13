import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The primary argument of every strategy is required on every builder. An empty string is rejected
// only where Playwright cannot use it (locator, frameLocator, getByRole, getById); the text-likes and
// getByTestId store it verbatim because Playwright matches elements with empty attributes.

type Paths = "a" | "a.b";
const createRegistry = (page: Page) => createRegistryWithAccessors<Paths>(page).registry;

const strategies: {
	method: string;
	field: string;
	allowEmpty: boolean;
	missing: (registry: ReturnType<typeof createRegistry>) => unknown;
	empty: (registry: ReturnType<typeof createRegistry>) => unknown;
	emptyDefinition?: Record<string, unknown>;
}[] = [
	{
		method: "getByRole",
		field: "role",
		allowEmpty: false,
		missing: (r) => r.add("a").getByRole(undefined as never),
		empty: (r) => r.add("a").getByRole("" as never),
	},
	{
		method: "getByText",
		field: "text",
		allowEmpty: true,
		missing: (r) => r.add("a").getByText(undefined as never),
		empty: (r) => r.add("a").getByText(""),
		emptyDefinition: { type: "text", text: "" },
	},
	{
		method: "getByLabel",
		field: "text",
		allowEmpty: true,
		missing: (r) => r.add("a").getByLabel(undefined as never),
		empty: (r) => r.add("a").getByLabel(""),
		emptyDefinition: { type: "label", text: "" },
	},
	{
		method: "getByPlaceholder",
		field: "text",
		allowEmpty: true,
		missing: (r) => r.add("a").getByPlaceholder(undefined as never),
		empty: (r) => r.add("a").getByPlaceholder(""),
		emptyDefinition: { type: "placeholder", text: "" },
	},
	{
		method: "getByAltText",
		field: "text",
		allowEmpty: true,
		missing: (r) => r.add("a").getByAltText(undefined as never),
		empty: (r) => r.add("a").getByAltText(""),
		emptyDefinition: { type: "altText", text: "" },
	},
	{
		method: "getByTitle",
		field: "text",
		allowEmpty: true,
		missing: (r) => r.add("a").getByTitle(undefined as never),
		empty: (r) => r.add("a").getByTitle(""),
		emptyDefinition: { type: "title", text: "" },
	},
	{
		method: "locator",
		field: "selector",
		allowEmpty: false,
		missing: (r) => r.add("a").locator(undefined as never),
		empty: (r) => r.add("a").locator(""),
	},
	{
		method: "getByTestId",
		field: "testId",
		allowEmpty: true,
		missing: (r) => r.add("a").getByTestId(undefined as never),
		empty: (r) => r.add("a").getByTestId(""),
		emptyDefinition: { type: "testId", testId: "" },
	},
];

for (const { method, field, allowEmpty, missing, empty, emptyDefinition } of strategies) {
	test(`${method}: a missing primary throws naming the method and the path, and registers nothing`, async ({ page }) => {
		const registry = createRegistry(page);
		const article = /^[aeiou]/.test(field) ? "an" : "a";
		expect(() => missing(registry)).toThrowError(`${method} requires ${article} ${field} value for "a".`);
		expect(() => registry.getLocator("a")).toThrowError('No locator schema registered for path "a".');
		// the path is still free
		registry.add("a").locator("body");
	});

	test(`${method}: an empty string is ${allowEmpty ? "stored verbatim" : "rejected"}`, async ({ page }) => {
		const registry = createRegistry(page);
		if (allowEmpty) {
			empty(registry);
			const internal = registry as unknown as { get: (path: Paths) => { definition: unknown } };
			expect(internal.get("a").definition).toEqual(emptyDefinition);
		} else {
			expect(() => empty(registry)).toThrowError(`${method} requires a non-empty ${field} for "a".`);
			expect(() => registry.getLocator("a")).toThrowError('No locator schema registered for path "a".');
		}
	});
}

test("frameLocator: an empty selector is rejected, a missing one is the any-frame form", async ({ page }) => {
	const registry = createRegistry(page);
	expect(() => registry.add("a").frameLocator("")).toThrowError('frameLocator requires a non-empty selector for "a".');
	expect(registry.add("a").frameLocator()).toBeUndefined();
	const internal = registry as unknown as { get: (path: Paths) => { definition: unknown } };
	expect(internal.get("a").definition).toEqual({ type: "frameLocator" });
});

test("getById: an empty string is rejected, as plan 1.1-1.2 decided", async ({ page }) => {
	const registry = createRegistry(page);
	expect(() => registry.add("a").getById("")).toThrowError('getById requires a non-empty id for "a".');
	expect(() => registry.add("a").getById(undefined as never)).toThrowError('getById requires a non-empty id for "a".');
});

test("a seeded builder inherits on undefined and stores or rejects an empty string per strategy", async ({ page }) => {
	const registry = createRegistry(page);
	const internal = registry as unknown as { get: (path: Paths) => { definition: unknown } };

	const testIdSeed = registry.createReusable.getByTestId("seeded");
	registry.add("a", { reuse: testIdSeed }).getByTestId(undefined);
	expect(internal.get("a").definition).toEqual({ type: "testId", testId: "seeded" });
	registry.add("a.b", { reuse: testIdSeed }).getByTestId("");
	expect(internal.get("a.b").definition).toEqual({ type: "testId", testId: "" });

	const other = createRegistry(page);
	const otherInternal = other as unknown as { get: (path: Paths) => { definition: unknown } };
	const frameSeed = other.createReusable.frameLocator("iframe#x");
	other.add("a", { reuse: frameSeed }).frameLocator(undefined);
	expect(otherInternal.get("a").definition).toEqual({ type: "frameLocator", selector: "iframe#x" });
	expect(() => other.add("a.b", { reuse: frameSeed }).frameLocator("")).toThrowError(
		'frameLocator requires a non-empty selector for "a.b".',
	);
	expect(otherInternal.get("a.b").definition).toEqual({ type: "frameLocator", selector: "iframe#x" });
});

test("createReusable applies the same rules under its own label", async ({ page }) => {
	const { createReusable } = createRegistry(page);
	expect(() => createReusable.locator("")).toThrowError("createReusable.locator requires a non-empty selector.");
	expect(() => createReusable.frameLocator("")).toThrowError("createReusable.frameLocator requires a non-empty selector.");
	expect(() => createReusable.getByRole("" as never)).toThrowError("createReusable.getByRole requires a non-empty role.");
	expect(() => createReusable.getByText(undefined as never)).toThrowError("createReusable.getByText requires a text value.");
	expect(createReusable.getByTestId("").definition).toEqual({ type: "testId", testId: "" });
	expect(createReusable.getByText("").definition).toEqual({ type: "text", text: "" });
});

test("an empty testId and an empty text match real elements", async ({ page, testIds }) => {
	type DomPaths = "emptyTestId" | "anyText";
	const { add, getLocator } = createRegistryWithAccessors<DomPaths>(page);
	add("emptyTestId").getByTestId("");
	add("anyText").getByText("");
	await page.goto(testIds.fullUrl);
	await expect(getLocator("emptyTestId")).toHaveText("empty testid");
	expect(await getLocator("anyText").count()).toBeGreaterThan(0);
});
