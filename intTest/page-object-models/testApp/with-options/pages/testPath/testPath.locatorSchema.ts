import { GetByMethod, type GetLocatorBase, type LocatorRegistry } from "pomwright";

export type LocatorSchemaPath = "body" | "body.link@color";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
	locators.addSchema("body", {
		locator: "body",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("body.link@color", {
		role: "link",
		roleOptions: {
			name: "Random Color Link",
		},
		locatorMethod: GetByMethod.role,
	});
}

export function defineLocators(registry: LocatorRegistry<LocatorSchemaPath>) {
	registry.add("body").locator("body");
	registry.add("body.link@color").getByRole("link", { name: "Random Color Link" });
}
