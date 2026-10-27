// Locator modules for checkSite.spec.ts; each line a test looks for is marked with `// SITE <id>`.
import type { LocatorRegistry } from "pomwright";

export type ListPaths = "main" | "main.list";

// composable: a page object whose paths include these passes its own registry
export function defineListLocators<ExternalPaths extends string = never>(
	registry: LocatorRegistry<ListPaths | ExternalPaths>,
): void;
export function defineListLocators(registry: LocatorRegistry<ListPaths>) {
	registry.add("main").locator("main");
	registry.add("main").locator("body"); // SITE module-add
}

export type ComposedPaths = ListPaths | "main.list.item";

export function defineComposedLocators(registry: LocatorRegistry<ComposedPaths>) {
	defineListLocators(registry); // SITE composing-call
	registry.add("main.list.item").locator("li");
}

export function defineMalformedLocators(registry: LocatorRegistry<string>) {
	const path: string = "main..list";
	registry.add(path).locator("ul"); // SITE path-rule-add
}
