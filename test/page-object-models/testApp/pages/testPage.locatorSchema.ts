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
	registry.add("topMenu").locator(".top");

	registry.add("topMenu.logo").getByRole("link", { name: /Logo/ });

	registry.add("topMenu.news").getByTitle("News");
	registry.add("topMenu.accountSettings").getByTitle("Account Settings");
	registry.add("topMenu.messages").getByTitle("Messages");

	registry.add("topMenu.notifications").locator(".dropdown-hover");
	registry.add("topMenu.notifications.button").getByRole("button");
	registry.add("topMenu.notifications.button.countBadge").locator(".badge");
	registry.add("topMenu.notifications.dropdown").locator(".dropdown-content");
	registry.add("topMenu.notifications.dropdown.item").locator(".bar-item");

	registry.add("topMenu.myAccount").getByTitle("My Account");
}
