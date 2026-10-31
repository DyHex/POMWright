import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments. The page is a document set
// with page.setContent, a stand-in for a page the test server serves: a locator matches on the DOM alone, however the
// document arrived, so it could hide only what loading a page brings (scripts, frames, another origin). testApp/'s page
// objects use getByRole on the test server's pages.

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
