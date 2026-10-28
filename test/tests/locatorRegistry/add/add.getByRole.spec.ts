import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments.

test("add getByRole to registry", async ({ page }) => {
	type LocatorSchemaPaths = "buttonByRole";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.getLocator("buttonByRole")).toThrowError(
		'No locator schema registered for path "buttonByRole".',
	);

	registry.add("buttonByRole").getByRole("button", { name: "Submit" });

	await page.setContent("<button>Submit</button><button>Cancel</button>");
	await expect(registry.getLocator("buttonByRole")).toHaveCount(1);
	await expect(registry.getLocator("buttonByRole")).toHaveText("Submit");
	// the stored definition, as Playwright renders the same call without a description
	expect(`${registry.getLocatorSchema("buttonByRole").describe("").getLocator()}`).toBe(
		`${page.getByRole("button", { name: "Submit" })}`,
	);
	expect(registry.getLocator("buttonByRole").description()).toBe("buttonByRole");
});
