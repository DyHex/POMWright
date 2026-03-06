import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("filter cycle detection throws on direct self-reference", async ({ page }) => {
	type LocatorSchemaPaths = "main.h1";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("main.h1").getByRole("heading", { level: 1 }).filter({ has: "main.h1" });

	expect(() => registry.getLocator("main.h1")).toThrow(/resolving "main\.h1": "main\.h1"/);
});

test("filter cycle detection throws on indirect reference loops", async ({ page }) => {
	type LocatorSchemaPaths = "a" | "b";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("a").getByRole("button").filter({ has: "b" });
	registry.add("b").getByRole("button").filter({ has: "a" });

	expect(() => registry.getLocator("a")).toThrow(/resolving "a": "b"/);
});

test("filter cycle detection allows repeated non-cyclic references", async ({ page }) => {
	type LocatorSchemaPaths = "a" | "a.b" | "shared.heading";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("shared.heading").getByRole("heading", { level: 2 });
	registry.add("a").getByRole("button").filter({ has: "shared.heading" });
	registry.add("a.b").getByRole("button").filter({ has: "shared.heading" });

	expect(() => registry.getLocator("a")).not.toThrow();
	expect(() => registry.getLocator("a.b")).not.toThrow();
});
