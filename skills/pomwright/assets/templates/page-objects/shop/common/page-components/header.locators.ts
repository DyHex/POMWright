import type { LocatorRegistry } from "pomwright";

export type Paths = "header" | "header.link@home" | "header.link@cart";

export function defineLocators<ExternalPaths extends string = never>(
	registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("header").getByRole("banner");
	registry.add("header.link@home").getByRole("link", { name: "Shop" });
	registry.add("header.link@cart").getByRole("link", { name: "Cart" });
}
