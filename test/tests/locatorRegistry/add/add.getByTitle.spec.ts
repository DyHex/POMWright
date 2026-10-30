import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments. The page is a document set
// with page.setContent, a stand-in for a page the test server serves: a locator matches on the DOM alone, however the
// document arrived, so it could hide only what loading a page brings (scripts, frames, another origin). testApp/'s page
// objects use getByTitle on the test server's pages.

test("add getByTitle to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByTitle";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.getLocator("elementByTitle")).toThrowError(
		'No locator schema registered for path "elementByTitle".',
	);

	registry.add("elementByTitle").getByTitle("Home Page");

	await page.setContent('<a title="Home Page">Home</a><a title="Other">Other</a>');
	await expect(registry.getLocator("elementByTitle")).toHaveCount(1);
	await expect(registry.getLocator("elementByTitle")).toHaveText("Home");
	// the stored definition, as Playwright renders the same call without a description
	expect(`${registry.getLocatorSchema("elementByTitle").describe("").getLocator()}`).toBe(
		`${page.getByTitle("Home Page")}`,
	);
	expect(registry.getLocator("elementByTitle").description()).toBe("elementByTitle");
});
