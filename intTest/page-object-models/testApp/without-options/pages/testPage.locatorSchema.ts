import { GetByMethod, GetLocatorBase } from "pomwright";

export type LocatorSchemaPath =
	| "topMenu"
	| "topMenu.logo"
	| "topMenu.news"
	| "topMenu.accountSettings"
	| "topMenu.messages"
	| "topMenu.notifications"
	| "topMenu.notifications.button"
	| "topMenu.notifications.button.countBadge"
	| "topMenu.notifications.dropdown"
	| "topMenu.notifications.dropdown.item"
	| "topMenu.myAccount";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
	locators.addSchema("topMenu", {
		locator: ".w3-top",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("topMenu.logo", {
		role: "link",
		roleOptions: {
			name: /Logo/,
		},
		locatorMethod: GetByMethod.role,
	});

	locators.addSchema("topMenu.news", {
		title: "News",
		locatorMethod: GetByMethod.title,
	});

	locators.addSchema("topMenu.accountSettings", {
		title: "Account Settings",
		locatorMethod: GetByMethod.title,
	});

	locators.addSchema("topMenu.messages", {
		title: "Messages",
		locatorMethod: GetByMethod.title,
	});

	locators.addSchema("topMenu.notifications", {
		locator: ".w3-dropdown-hover",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("topMenu.notifications.button", {
		role: "button",
		locatorMethod: GetByMethod.role,
	});

	locators.addSchema("topMenu.notifications.button.countBadge", {
		locator: ".w3-badge",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("topMenu.notifications.dropdown", {
		locator: ".w3-dropdown-content",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("topMenu.notifications.dropdown.item", {
		locator: ".w3-bar-item",
		locatorMethod: GetByMethod.locator,
	});

	locators.addSchema("topMenu.myAccount", {
		title: "My Account",
		locatorMethod: GetByMethod.title,
	});
}
