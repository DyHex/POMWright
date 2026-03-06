import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

test("registry.get returns a cloned definition copy", async ({ page }) => {
	type LocatorSchemaPaths = "button";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("button").getByRole("button", { name: "Submit", exact: true });

	const firstRecord = registry.get("button");

	expect(firstRecord).toEqual({
		locatorSchemaPath: "button",
		definition: {
			type: "role",
			role: "button",
			options: { name: "Submit", exact: true },
		},
		steps: [],
	});

	if (firstRecord.definition.type !== "role") {
		throw new Error("Expected role definition for mutation test");
	}

	firstRecord.definition.options = { name: "Mutated" };

	const secondRecord = registry.get("button");

	expect(secondRecord).toEqual({
		locatorSchemaPath: "button",
		definition: {
			type: "role",
			role: "button",
			options: { name: "Submit", exact: true },
		},
		steps: [],
	});
});

test("registry.getIfExists returns a cloned definition copy", async ({ page }) => {
	type LocatorSchemaPaths = "banner";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("banner").locator("section.banner", { hasText: "Welcome" });

	const firstRecord = registry.getIfExists("banner");
	expect(firstRecord).toBeDefined();

	if (!firstRecord || firstRecord.definition.type !== "locator") {
		throw new Error("Expected locator definition for mutation test");
	}

	firstRecord.definition.options = { hasText: "Mutated" };
	if (!firstRecord.steps) {
		throw new Error("Expected steps array on cloned record");
	}
	firstRecord.steps.push({ kind: "index", index: 0 });

	const secondRecord = registry.getIfExists("banner");

	expect(secondRecord).toEqual({
		locatorSchemaPath: "banner",
		definition: {
			type: "locator",
			selector: "section.banner",
			options: { hasText: "Welcome" },
		},
		steps: [],
	});
});
