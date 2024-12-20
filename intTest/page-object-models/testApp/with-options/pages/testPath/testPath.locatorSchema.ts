import { GetByMethod, type GetLocatorBase } from "pomwright";

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
