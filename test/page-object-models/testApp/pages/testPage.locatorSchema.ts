import type { LocatorRegistry } from "pomwright";

export type Paths =
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

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("topMenu").locator(".w3-top");

	registry.add("topMenu.logo").getByRole("link", { name: /Logo/ });

	registry.add("topMenu.news").getByTitle("News");
	registry.add("topMenu.accountSettings").getByTitle("Account Settings");
	registry.add("topMenu.messages").getByTitle("Messages");

	registry.add("topMenu.notifications").locator(".w3-dropdown-hover");
	registry.add("topMenu.notifications.button").getByRole("button");
	registry.add("topMenu.notifications.button.countBadge").locator(".w3-badge");
	registry.add("topMenu.notifications.dropdown").locator(".w3-dropdown-content");
	registry.add("topMenu.notifications.dropdown.item").locator(".w3-bar-item");

	registry.add("topMenu.myAccount").getByTitle("My Account");
}
