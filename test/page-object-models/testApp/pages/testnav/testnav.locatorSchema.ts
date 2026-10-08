import type { LocatorRegistry } from "pomwright";

/** Paths for the /testnav page, the fixture for the navigation helper. */
export type Paths =
	| "body"
	| "body.heading"
	| "body.link@selfQuery"
	| "body.link@selfHash"
	| "body.link@trailing"
	| "body.link@item"
	| "body.link@other"
	| "body.button@delayedItem"
	| "body.button@delayedOther"
	| "body.button@bounce";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("body").locator("body");
	registry.add("body.heading").getByRole("heading", { name: "Navigation playground" });
	registry.add("body.link@selfQuery").getById("self-query");
	registry.add("body.link@selfHash").getById("self-hash");
	registry.add("body.link@trailing").getById("trailing");
	registry.add("body.link@item").getById("item");
	registry.add("body.link@other").getById("other");
	registry.add("body.button@delayedItem").getById("delayed-item");
	registry.add("body.button@delayedOther").getById("delayed-other");
	registry.add("body.button@bounce").getById("bounce");
}
