import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The packed twin of add.getById.spec.ts: its scenarios through pomwright's public API against the packed package,
// observed on a page and in the rendered chain instead of in the stored record.

const ids =
	'<div id="unique-element">plain</div><div id="#unique-element">hash</div><div id="settings.panel">dot</div>' +
	'<div id=\'say"hi\'>quote</div><div id="id=weird">prefix</div><div id="A.B">pattern</div>';

test("add getById to registry", async ({ page }) => {
	type LocatorSchemaPaths = "stringId" | "stringId.#stringId" | "regExpId";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	for (const path of ["stringId", "stringId.#stringId", "regExpId"] as const) {
		expect(() => registry.getLocator(path)).toThrowError(`No locator schema registered for path "${path}".`);
	}

	registry.add("stringId").getById("unique-element");
	registry.add("stringId.#stringId").getById("#unique-element");
	registry.add("regExpId").getById(/unique-\w+/);

	await page.setContent(ids);
	await expect(registry.getLocator("stringId")).toHaveText("plain");
	// the "#" is part of the id, not a prefix
	await expect(registry.getLocator("stringId.#stringId")).toHaveText("hash");
	expect(`${registry.getLocator("stringId.#stringId").describe("")}`).toEqual(`locator('[id="#unique-element"]')`);
	// a RegExp is tested against each id, as written
	await expect(registry.getLocator("regExpId")).toHaveText(["plain", "hash"]);
});

test("getById stores ids verbatim and renders attribute selectors", async ({ page }) => {
	type LocatorSchemaPaths = "dot" | "quote" | "idEq" | "pattern";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	registry.add("dot").getById("settings.panel");
	registry.add("quote").getById('say"hi');
	registry.add("idEq").getById("id=weird");
	registry.add("pattern").getById(/^a\.b$/i);

	await page.setContent(ids);
	await expect(registry.getLocator("dot")).toHaveText("dot");
	await expect(registry.getLocator("quote")).toHaveText("quote");
	await expect(registry.getLocator("idEq")).toHaveText("prefix");
	await expect(registry.getLocator("pattern")).toHaveText("pattern");
	expect(`${registry.getLocator("idEq").describe("")}`).toEqual(`locator('[id="id=weird"]')`);
	expect(`${registry.getLocator("dot").describe("")}`).toEqual(`locator('[id="settings.panel"]')`);
	expect(`${registry.getLocator("quote").describe("")}`).toEqual(`locator('[id="say\\\\"hi"]')`);
	expect(`${registry.getLocator("pattern").describe("")}`).toEqual(`locator('internal:attr=[id=/^a\\\\.b$/i]')`);
});

test("getById rejects an empty id at registration and passes every RegExp flag through", async ({ page }) => {
	type LocatorSchemaPaths = "main.form@user" | "flags" | "sticky";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.add("main.form@user").getById("")).toThrowError(
		'getById requires a non-empty id for "main.form@user".',
	);
	expect(() => registry.getLocator("main.form@user")).toThrowError(
		'No locator schema registered for path "main.form@user".',
	);

	registry.add("flags").getById(/x/gi);
	expect(`${registry.getLocator("flags").describe("")}`).toEqual("locator('internal:attr=[id=/x/gi]')");

	registry.add("sticky").getById(/x/y);
	expect(`${registry.getLocator("sticky").describe("")}`).toEqual("locator('internal:attr=[id=/x/y]')");
	await page.setContent('<div id="x">one</div><div id="X">two</div>');
	await expect(registry.getLocator("flags")).toHaveText(["one", "two"]);
});
