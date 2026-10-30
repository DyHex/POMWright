import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments. The page is a document set
// with page.setContent, a stand-in for a page the test server serves: a locator matches on the DOM alone, however the
// document arrived, so it could hide only what loading a page brings (scripts, frames, another origin). No spec uses
// getByLabel on a served page: a gap, of little weight for a match on the DOM.

test("add getByLabel to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByLabel";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.getLocator("elementByLabel")).toThrowError(
		'No locator schema registered for path "elementByLabel".',
	);

	registry.add("elementByLabel").getByLabel("Username");

	await page.setContent('<label>Username <input name="user"></label><label>Password <input name="pass"></label>');
	await expect(registry.getLocator("elementByLabel")).toHaveCount(1);
	await expect(registry.getLocator("elementByLabel")).toHaveAttribute("name", "user");
	// the stored definition, as Playwright renders the same call without a description
	expect(`${registry.getLocatorSchema("elementByLabel").describe("").getLocator()}`).toBe(
		`${page.getByLabel("Username")}`,
	);
	expect(registry.getLocator("elementByLabel").description()).toBe("elementByLabel");
});
