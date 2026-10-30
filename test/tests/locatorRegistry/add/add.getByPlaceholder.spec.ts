import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments. The page is a document set
// with page.setContent, a stand-in for a page the test server serves: a locator matches on the DOM alone, however the
// document arrived, so it could hide only what loading a page brings (scripts, frames, another origin).
// testApp/testGetBy.spec.ts resolves getByPlaceholder on a page the test server serves, through a page object.

test("add getByPlaceholder to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByPlaceholder";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.getLocator("elementByPlaceholder")).toThrowError(
		'No locator schema registered for path "elementByPlaceholder".',
	);

	registry.add("elementByPlaceholder").getByPlaceholder("Enter your name");

	await page.setContent('<input placeholder="Enter your name"><input placeholder="Enter your email">');
	await expect(registry.getLocator("elementByPlaceholder")).toHaveCount(1);
	await expect(registry.getLocator("elementByPlaceholder")).toHaveAttribute("placeholder", "Enter your name");
	// the stored definition, as Playwright renders the same call without a description
	expect(`${registry.getLocatorSchema("elementByPlaceholder").describe("").getLocator()}`).toBe(
		`${page.getByPlaceholder("Enter your name")}`,
	);
	expect(registry.getLocator("elementByPlaceholder").description()).toBe("elementByPlaceholder");
});
