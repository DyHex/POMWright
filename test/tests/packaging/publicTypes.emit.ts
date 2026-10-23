// Compile-only, through tsconfig.declarations.json (declaration: true): a shared locator module whose exported
// functions return pomwright's builders and seeds without annotations. It emits only if each type can be named
// from "pomwright". Playwright does not match the file name.
import type { Page } from "@playwright/test";
import {
	createRegistryWithAccessors,
	json,
	type LocatorRegistry,
	PageObject,
	type PageObjectOptions,
	type SessionStorage,
	step,
} from "pomwright";

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

export const skippedList = (registry: LocatorRegistry<Paths>) => registry.getLocatorSchema("list.item").skip("list");

// a registering function returns void: a block body emits after a path reuse with describe
export function defineCopy(registry: LocatorRegistry<Paths>) {
	registry.add("main.heading", { reuse: "list.item" }).describe("Copy of a row");
}

// the registry of a strict standalone factory; the factory's whole result also holds add, whose registration
// views are unexported, so it does not emit (as in 2.x)
export const strictRegistry = (page: Page) => createRegistryWithAccessors<Paths>(page, { strictChains: true }).registry;

export class Steps {
	@step()
	async load(): Promise<number> {
		return 1;
	}
}

// a domain base class that forwards the constructor options by name
export abstract class DomainPage<P extends string> extends PageObject<P> {
	protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
		super(page, "https://app.example", urlPath, options);
	}
}

export const strictOptions = (options?: PageObjectOptions) => ({ ...options, locators: { strictChains: true } });

// a storage module whose readers return what get() returns, without annotations
const accountStorage = { user: json<{ name: string }>() };
export const readUser = (storage: SessionStorage<typeof accountStorage>) => storage.get("user");
export const readEverything = (storage: SessionStorage<typeof accountStorage>) => storage.get();
