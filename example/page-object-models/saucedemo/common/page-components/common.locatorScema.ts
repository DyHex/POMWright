import { POMWrightGetLocatorBase } from "pomwright";
import {
	type LocatorSchemaPath as headerMenu,
	initLocatorSchemas as initHeaderMenu,
} from "./headerMenu/headerMenu.locatorSchema";

export type LocatorSchemaPath = headerMenu;

export function initLocatorSchemas(locators: POMWrightGetLocatorBase<LocatorSchemaPath>) {
	initHeaderMenu(locators);
}
