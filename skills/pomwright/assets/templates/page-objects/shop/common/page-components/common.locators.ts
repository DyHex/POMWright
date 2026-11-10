import type { LocatorRegistry } from "pomwright";
import { defineLocators as addHeader, type Paths as Header } from "./header.locators";

/** What every page of the shop has; "main.heading" is a slot, which each page registers as its own. */
export type Paths = Header | "main" | "main.heading";

export function defineLocators<ExternalPaths extends string = never>(
	registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
	addHeader(registry);
	registry.add("main").locator("main");
}
