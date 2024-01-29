import { GetLocatorBase } from "pomwright";
import {
	type LocatorSchemaPath as headerMenu,
	initLocatorSchemas as initHeaderMenu,
} from "./headerMenu/headerMenu.locatorSchema";

export type LocatorSchemaPath = headerMenu;

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
	initHeaderMenu(locators);
}
