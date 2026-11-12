import type { LocatorRegistry } from "pomwright";
import { defineLocators as addHeader, type Paths as Header } from "./header.locators";

/** What every page of the shop has. A page's heading is its own: the module of each page that has one declares it. */
export type Paths = Header | "main";

export function defineLocators<ExternalPaths extends string = never>(
	registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
	addHeader(registry);

	registry.add("main").getByRole("main");
}
