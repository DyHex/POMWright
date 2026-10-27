import { expect, type Page, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The packed twin of add.describe.spec.ts: its scenarios through pomwright's public API against the packed package;
// what the source spec reads from the stored record is observed through descriptions, rendered chains and reuse.

const createTestRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page).registry;

test("describe defaults to the terminal locator path", async ({ page }) => {
	type LocatorSchemaPaths = "main" | "main.button@login";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("main").locator("main").describe("Main container");
	registry.add("main.button@login").getByRole("button", { name: "Login" });

	const direct = registry.getLocator("main.button@login");
	const nested = registry.getNestedLocator("main.button@login");

	expect(direct.description()).toEqual("main.button@login");
	expect(`${direct}`).toEqual("main.button@login");
	expect(nested.description()).toEqual("main.button@login");
	expect(registry.getNestedLocator("main").description()).toEqual("Main container");
});

test("describe applies only to terminal locator paths", async ({ page }) => {
	type LocatorSchemaPaths = "list" | "list.item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("list").locator("ul.list").describe("List container");
	registry.add("list.item").getByRole("listitem").describe("List item");

	const listLocator = registry.getNestedLocator("list");
	const itemLocator = registry.getNestedLocator("list.item");

	expect(listLocator.description()).toEqual("List container");
	expect(itemLocator.description()).toEqual("List item");
	expect(`${itemLocator}`).toEqual("List item");

	const listLocator2 = registry.getLocator("list");
	const itemLocator2 = registry.getLocator("list.item");

	expect(listLocator2.description()).toEqual("List container");
	expect(itemLocator2.description()).toEqual("List item");
});

test("describe overrides previous descriptions when chained", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button").describe("Primary").describe("Final");

	expect(registry.getLocator("button").description()).toEqual("Final");
	expect(`${registry.getLocatorSchema("button").describe("").getLocator()}`).toEqual(`${page.getByRole("button")}`);
});

test("describe does not replace an explicitly supplied empty string with the path default", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button").describe("");

	const locator = registry.getLocator("button");

	expect(locator.description()).toBeNull();
	expect(`${locator}`).toEqual("getByRole('button')");
});

test("default descriptions are applied only when locators are resolved", async ({ page }) => {
	type LocatorSchemaPaths = "button" | "copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button");

	expect(registry.getLocator("button").description()).toEqual("button");
	// the default was not stored: a copy of the path, made after the resolution, defaults to its own path
	registry.add("copy", { reuse: "button" });
	expect(registry.getLocator("copy").description()).toEqual("copy");
	expect(`${registry.getLocatorSchema("copy").describe("").getLocator()}`).toEqual(`${page.getByRole("button")}`);
});

test("describe applies registered descriptions to terminal frame owner locators", async ({ page }) => {
	type LocatorSchemaPaths = "frame";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("frame").frameLocator("iframe").describe("Login frame");

	const direct = registry.getLocator("frame");
	const nested = registry.getNestedLocator("frame");
	const manualOwner = page.frameLocator("iframe").owner();

	expect(direct.description()).toEqual("Login frame");
	expect(nested.description()).toEqual("Login frame");
	expect(`${direct.describe("")}`).toEqual(`${manualOwner.describe("")}`);
	expect(`${nested.describe("")}`).toEqual(`${manualOwner.describe("")}`);
});

test("describe on reusable locators is carried into registrations", async ({ page }) => {
	type LocatorSchemaPaths = "seeded";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const seed = registry.createReusable.locator("div.seeded").describe("Seeded description");
	registry.add("seeded", { reuse: seed });

	const locator = registry.getLocator("seeded");

	expect(locator.description()).toEqual("Seeded description");
});

test("describe defaults independently for reusable locator registrations", async ({ page }) => {
	type LocatorSchemaPaths = "seeded@first" | "seeded@second";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	const seed = registry.createReusable.locator("div.seeded");
	registry.add("seeded@first", { reuse: seed });
	registry.add("seeded@second", { reuse: seed });

	expect(registry.getLocator("seeded@first").description()).toEqual("seeded@first");
	expect(registry.getLocator("seeded@second").description()).toEqual("seeded@second");
});

test("describe preserves explicit descriptions and defaults to the target path when reusing registered paths", async ({
	page,
}) => {
	type LocatorSchemaPaths = "source" | "source.copy" | "custom" | "custom.copy";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("source").getByRole("button");
	registry.add("source.copy", { reuse: "source" });
	registry.add("custom").getByRole("button").describe("Custom button");
	registry.add("custom.copy", { reuse: "custom" });

	expect(registry.getLocator("source.copy").description()).toEqual("source.copy");
	expect(registry.getLocator("custom.copy").description()).toEqual("Custom button");
});

test('describe("") removes the description; anything but a string throws', async ({ page }) => {
	type LocatorSchemaPaths = "list" | "list.item";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);
	registry.add("list").locator("ul").describe("");
	registry.add("list.item").getByRole("listitem");

	expect(registry.getLocator("list").description()).toBeNull();
	expect(`${registry.getLocator("list")}`).toEqual("locator('ul')");
	const fresh = createTestRegistry<LocatorSchemaPaths>(page);
	const builder = fresh.add("list").locator("ul");
	// @ts-expect-error describe takes a string
	expect(() => builder.describe(undefined)).toThrowError(
		'describe requires a string for "list"; pass "" to remove the description.',
	);
	expect(fresh.getLocator("list").description()).toEqual("list");
});
