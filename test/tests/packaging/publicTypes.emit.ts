// Compile-only, through tsconfig.declarations.json (declaration: true): a shared locator module whose exported
// functions return pomwright's builders and seeds without annotations. It emits only if each type can be named
// from "pomwright". Playwright does not match the file name.
import type { LocatorRegistry } from "pomwright";

export type Paths = "main" | "main.heading" | "list" | "list.item";

export const headingSeed = (registry: LocatorRegistry<Paths>) =>
	registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: "Summary" });

export const anySeed = (registry: LocatorRegistry<Paths>) => registry.createReusable.locator("h2").nth(0);

export const lastRow = (registry: LocatorRegistry<Paths>) => registry.getLocatorSchema("list.item").nth("last");

export const rowUpdate = (registry: LocatorRegistry<Paths>) => registry.getLocatorSchema("list.item").update();

export const rowReplacement = (registry: LocatorRegistry<Paths>) =>
	registry.getLocatorSchema("list.item").replace("list");

export const rowFilter = (text: string) => ({ hasText: text, has: "list.item" as const });

export function defineLocators(registry: LocatorRegistry<Paths>) {
	registry.add("main").locator("main");
	registry.add("main.heading", { reuse: headingSeed(registry) });
	registry.add("list").locator("ul");
	registry.add("list.item").getByRole("listitem").filter(rowFilter("Row"));
}
