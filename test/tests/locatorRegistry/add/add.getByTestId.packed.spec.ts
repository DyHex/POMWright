import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

// The packed twin of add.getByTestId.spec.ts: its scenario through pomwright's public API against the packed package,
// observed on a page and against Playwright's own locator instead of in the stored record.

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
