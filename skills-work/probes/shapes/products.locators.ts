import type { LocatorRegistry } from "pomwright";

export type Paths =
	| "main"
	| "main.list@products"
	| "main.list@products.cards"
	| "main.list@products.cards.heading"
	| "main.list@products.cards.button@addToCart"
	| "main.status";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("main").locator("main");
	registry.add("main.list@products").getByRole("list", { name: "Products" });
	registry.add("main.list@products.cards").getByRole("listitem");
	registry.add("main.list@products.cards.heading").getByRole("heading");
	registry.add("main.list@products.cards.button@addToCart").getByRole("button", { name: "Add to cart" });
	registry.add("main.status").getByRole("status");
}
