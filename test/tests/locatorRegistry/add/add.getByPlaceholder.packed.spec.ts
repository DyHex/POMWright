import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The packed twin of add.getByPlaceholder.spec.ts: its scenario through pomwright's public API against the packed package,
// observed on a page and against Playwright's own locator instead of in the stored record.

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
