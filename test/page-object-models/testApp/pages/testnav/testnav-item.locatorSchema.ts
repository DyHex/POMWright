import type { LocatorRegistry } from "pomwright";

/** Paths for the /testnav/item/:id pages. */
export type Paths = "body" | "body.heading" | "body.link@back";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("body").locator("body");
	registry.add("body.heading").getById("item-heading");
	registry.add("body.link@back").getById("back");
}
