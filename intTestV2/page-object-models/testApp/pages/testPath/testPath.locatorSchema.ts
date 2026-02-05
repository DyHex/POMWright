import type { LocatorRegistry } from "pomwright";

export type Paths = "body" | "body.link@color";

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("body").locator("body");

	registry.add("body.link@color").getByRole("link", { name: "Random Color Link" });
}
