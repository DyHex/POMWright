import type { LocatorRegistry } from "pomwright";

export type Paths =
	| "main"
	| "main.list@products"
	| "main.list@products.card"
	| "main.list@products.card.heading"
	| "main.list@products.card.button@addToCart"
	| "main.status"
	| "dialog@cookies"
	| "dialog@cookies.button@accept";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("main").locator("main");
	registry.add("main.list@products").getByRole("list", { name: "Products" });
	registry.add("main.list@products.card").getByRole("listitem");
	registry.add("main.list@products.card.heading").getByRole("heading");
	registry.add("main.list@products.card.button@addToCart").getByRole("button", { name: "Add to cart" });
	registry.add("main.status").getByRole("status");
	registry.add("dialog@cookies").getByRole("dialog", { name: "Cookies" });
	registry.add("dialog@cookies.button@accept").getByRole("button", { name: "Accept all" });
}
