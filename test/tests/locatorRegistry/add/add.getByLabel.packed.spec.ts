import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The packed twin of add.getByLabel.spec.ts: its scenario through pomwright's public API against the packed package,
// observed on a page and against Playwright's own locator instead of in the stored record.

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
