import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

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

	expect(registry.get("button")).toEqual({
		description: "Final",
		definition: { role: "button", type: "role" },
		locatorSchemaPath: "button",
		steps: [],
	});
	expect(registry.getLocator("button").description()).toEqual("Final");
});

test("describe does not replace an explicitly supplied empty string with the path default", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button").describe("");

	expect(registry.get("button").description).toEqual("");

	const locator = registry.getLocator("button");

	expect(locator.description()).toBeNull();
	expect(`${locator}`).toEqual("getByRole('button')");
});

test("default descriptions are applied only when locators are resolved", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button");

	expect(registry.get("button")).toEqual({
		definition: { role: "button", type: "role" },
		locatorSchemaPath: "button",
		steps: [],
	});
	expect(registry.getLocator("button").description()).toEqual("button");
	expect(registry.get("button")).toEqual({
		definition: { role: "button", type: "role" },
		locatorSchemaPath: "button",
		steps: [],
	});
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
