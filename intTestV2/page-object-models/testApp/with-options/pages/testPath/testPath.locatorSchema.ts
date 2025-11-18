import type { LocatorRegistry } from "pomwright";

export type LocatorSchemaPath = "body" | "body.link@color";

export function initLocatorSchemas(locators: LocatorRegistry<LocatorSchemaPath>) {
	locators.add("body").locator("body");

	locators.add("body.link@color").getByRole("link", { name: "Random Color Link" });
}
