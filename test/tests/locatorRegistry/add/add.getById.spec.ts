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

	// the "#" is part of the id, not a prefix
	const expectedHashIdDefinition = {
		definition: { id: "#unique-element", type: "id" },
		locatorSchemaPath: "stringId.#stringId",
		steps: [],
	};

	expect(registry.get("stringId")).toEqual(expectedStringIdDefinition);
	expect(registry.get("stringId.#stringId")).toEqual(expectedHashIdDefinition);

	const locator = registry.getLocator("stringId.#stringId");
	expect(`${locator.describe("")}`).toEqual(`locator('[id="#unique-element"]')`);

	registry.add("regExpId").getById(/unique-\w+/);
	const regExpDefinition = {
		definition: { id: /unique-\w+/, type: "id" },
		locatorSchemaPath: "regExpId",
		steps: [],
	};
	expect(registry.get("regExpId")).toEqual(regExpDefinition);
});

test("getById stores ids verbatim and renders attribute selectors", async ({ page }) => {
	type LocatorSchemaPaths = "dot" | "quote" | "idEq" | "pattern";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	registry.add("dot").getById("settings.panel");
	registry.add("quote").getById('say"hi');
	registry.add("idEq").getById("id=weird");
	registry.add("pattern").getById(/^a\.b$/i);

	expect(registry.get("idEq").definition).toEqual({ id: "id=weird", type: "id" });
	expect(`${registry.getLocator("dot").describe("")}`).toEqual(`locator('[id="settings.panel"]')`);
	expect(`${registry.getLocator("quote").describe("")}`).toEqual(`locator('[id="say\\\\"hi"]')`);
	expect(`${registry.getLocator("pattern").describe("")}`).toEqual(`locator('internal:attr=[id=/^a\\\\.b$/i]')`);
});

test("getById rejects an empty id at registration and passes every RegExp flag through", async ({ page }) => {
	type LocatorSchemaPaths = "main.form@user" | "flags" | "sticky";

	const registry = createTestRegistry<LocatorSchemaPaths>(page);

	expect(() => registry.add("main.form@user").getById("")).toThrowError(
		'getById requires a non-empty id for "main.form@user".',
	);
	expect(() => registry.get("main.form@user")).toThrowError(`${errMsg} "main.form@user".`);

	registry.add("flags").getById(/x/gi);
	expect(registry.get("flags").definition).toEqual({ id: /x/gi, type: "id" });

	registry.add("sticky").getById(/x/y);
	expect(`${registry.getLocator("sticky").describe("")}`).toEqual("locator('internal:attr=[id=/x/y]')");
});
