import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments. The page is a document set
// with page.setContent, a stand-in for a page the test server serves: a locator matches on the DOM alone, however the
// document arrived, so it could hide only what loading a page brings (scripts, frames, another origin). No spec uses
// getByText on a served page: a gap, of little weight for a match on the DOM.

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
