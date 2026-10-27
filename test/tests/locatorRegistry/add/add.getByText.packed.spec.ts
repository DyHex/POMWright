import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The packed twin of add.getByText.spec.ts: its scenario through pomwright's public API against the packed package,
// observed on a page and against Playwright's own locator instead of in the stored record.

test("add getByText to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByText";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.getLocator("elementByText")).toThrowError(
		'No locator schema registered for path "elementByText".',
	);

	registry.add("elementByText").getByText("Welcome");

	await page.setContent("<p>Welcome</p><p>Goodbye</p>");
	await expect(registry.getLocator("elementByText")).toHaveCount(1);
	await expect(registry.getLocator("elementByText")).toHaveText("Welcome");
	// the stored definition, as Playwright renders the same call without a description
	expect(`${registry.getLocatorSchema("elementByText").describe("").getLocator()}`).toBe(
		`${page.getByText("Welcome")}`,
	);
	expect(registry.getLocator("elementByText").description()).toBe("elementByText");
});
