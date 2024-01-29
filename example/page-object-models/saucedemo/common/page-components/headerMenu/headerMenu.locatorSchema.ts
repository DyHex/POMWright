import { GetByMethod, GetLocatorBase } from "pomwright";

export type LocatorSchemaPath =
	| "common.headerMenu"
	| "common.headerMenu.button.burger"
	| "common.sidebar"
	| "common.sidebar.menu"
	| "common.sidebar.menu.link.logout";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
	locators.addSchema("common.headerMenu", {
		locator: ".primary_header",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("common.headerMenu.button.burger", {
		role: "button",
		roleOptions: {
			name: "Open Menu",
		},
		id: "react-burger-menu-btn",
		locatorMethod: GetByMethod.role,
	});

	locators.addSchema("common.sidebar", {
		locator: ".bm-menu-wrap",
		id: "",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("common.sidebar.menu", {
		locator: ".bm-menu",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("common.sidebar.menu.link.logout", {
		role: "link",
		roleOptions: {
			name: "Logout",
		},
		text: "Logout",
		id: "logout_sidebar_link",
		locatorMethod: GetByMethod.text,
	});
}
