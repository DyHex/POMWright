import { GetByMethod, GetLocatorBase } from "pomwright";
import {
	type LocatorSchemaPath as commmon,
	initLocatorSchemas as initCommon,
} from "../../common/page-components/headerMenu/headerMenu.locatorSchema";

export type LocatorSchemaPath = commmon | "inventory" | "inventory.container" | "inventory.container.list";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
	initCommon(locators);

	locators.addSchema("inventory", {
		id: "inventory_container", // duplicate, will resolve to multiple locators
		locatorMethod: GetByMethod.id,
	});

	locators.addSchema("inventory.container", {
		locator: ".inventory_container",
		id: "inventory_container", // duplicate, will resolve to multiple locators
		locatorMethod: GetByMethod.locator,
	});
}
