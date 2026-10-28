import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments.

test("add getByAltText to registry", async ({ page }) => {
	type LocatorSchemaPaths = "image";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.getLocator("image")).toThrowError('No locator schema registered for path "image".');

	registry.add("image").getByAltText("Sample Image");

	await page.setContent('<img alt="Sample Image"><img alt="Other">');
	await expect(registry.getLocator("image")).toHaveCount(1);
	await expect(registry.getLocator("image")).toHaveAttribute("alt", "Sample Image");
	// the stored definition, as Playwright renders the same call without a description
	expect(`${registry.getLocatorSchema("image").describe("").getLocator()}`).toBe(
		`${page.getByAltText("Sample Image")}`,
	);
	expect(registry.getLocator("image").description()).toBe("image");
});
