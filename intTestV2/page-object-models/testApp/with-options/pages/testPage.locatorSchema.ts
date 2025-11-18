import type { LocatorRegistry } from "pomwright";

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

export function initLocatorSchemas(locators: LocatorRegistry<LocatorSchemaPath>) {
	locators.add("topMenu").locator(".w3-top");

	locators.add("topMenu.logo").getByRole("link", { name: /Logo/ });

	locators.add("topMenu.news").getByTitle("News");
	locators.add("topMenu.accountSettings").getByTitle("Account Settings");
	locators.add("topMenu.messages").getByTitle("Messages");

	locators.add("topMenu.notifications").locator(".w3-dropdown-hover");
	locators.add("topMenu.notifications.button").getByRole("button");
	locators.add("topMenu.notifications.button.countBadge").locator(".w3-badge");
	locators.add("topMenu.notifications.dropdown").locator(".w3-dropdown-content");
	locators.add("topMenu.notifications.dropdown.item").locator(".w3-bar-item");

	locators.add("topMenu.myAccount").getByTitle("My Account");
}
