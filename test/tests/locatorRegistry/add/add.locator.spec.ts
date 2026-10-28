import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments.

test("add locator to registry", async ({ page }) => {
	type LocatorSchemaPaths = "body";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.getLocator("body")).toThrowError('No locator schema registered for path "body".');

	registry.add("body").locator("body");

	await page.setContent("<p>content</p>");
	await expect(registry.getLocator("body")).toHaveCount(1);
	await expect(registry.getLocator("body")).toContainText("content");
	// the stored definition, as Playwright renders the same call without a description
	expect(`${registry.getLocatorSchema("body").describe("").getLocator()}`).toBe(`${page.locator("body")}`);
	expect(registry.getLocator("body").description()).toBe("body");
});
