import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// Checked on a page, and against Playwright's own locator built with the same arguments.

test("add getByTestId to registry", async ({ page }) => {
	type LocatorSchemaPaths = "elementByTestId";

	const { registry } = createRegistryWithAccessors<LocatorSchemaPaths>(page);

	expect(() => registry.getLocator("elementByTestId")).toThrowError(
		'No locator schema registered for path "elementByTestId".',
	);

	registry.add("elementByTestId").getByTestId("login-button");

	await page.setContent('<button data-testid="login-button">Log in</button><button data-testid="other">Other</button>');
	await expect(registry.getLocator("elementByTestId")).toHaveCount(1);
	await expect(registry.getLocator("elementByTestId")).toHaveText("Log in");
	// the stored definition, as Playwright renders the same call without a description
	expect(`${registry.getLocatorSchema("elementByTestId").describe("").getLocator()}`).toBe(
		`${page.getByTestId("login-button")}`,
	);
	expect(registry.getLocator("elementByTestId").description()).toBe("elementByTestId");
});
