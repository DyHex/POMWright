import { expect, test } from "@fixtures/testApp.fixtures";
import type { Page } from "@playwright/test";
import { LocatorRegistryInternal } from "../../../../src/locators";

const createTestRegistry = <Paths extends string>(page: Page) => new LocatorRegistryInternal<Paths>(page);

const errMsg = "No locator schema registered for path";

test("add getById to registry", async ({ page }) => {
	type LocatorSchemaPaths = "stringId" | "stringId.#stringId" | "regExpId";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.get("stringId")).toThrowError(`${errMsg} "stringId".`);
	expect(() => registry.get("stringId.#stringId")).toThrowError(`${errMsg} "stringId.#stringId".`);
	expect(() => registry.get("regExpId")).toThrowError(`${errMsg} "regExpId".`);

	registry.add("stringId").getById("unique-element");
	registry.add("stringId.#stringId").getById("#unique-element");

	const expectedStringIdDefinition = {
		definition: { id: "unique-element", type: "id" },
		locatorSchemaPath: "stringId",
		steps: [],
	};

	const expectedHashIdDefinition = {
		...expectedStringIdDefinition,
		locatorSchemaPath: "stringId.#stringId",
	};

	expect(registry.get("stringId")).toEqual(expectedStringIdDefinition);
	expect(registry.get("stringId.#stringId")).toEqual(expectedHashIdDefinition);

	const locator = registry.getLocator("stringId.#stringId");
	expect(`${locator}`).toEqual("locator('#unique-element')");

	registry.add("regExpId").getById(/unique-\w+/);
	const regExpDefinition = {
		definition: { id: /unique-\w+/, type: "id" },
		locatorSchemaPath: "regExpId",
		steps: [],
	};
	expect(registry.get("regExpId")).toEqual(regExpDefinition);
});
