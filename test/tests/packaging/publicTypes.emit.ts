// Compile-only, through tsconfig.declarations.json (declaration: true): a shared locator module whose exported
// functions return pomwright's builders and seeds without annotations. It emits only if each type can be named
// from "pomwright". Playwright does not match the file name.
import type { Page } from "@playwright/test";
import {
	type Codec,
	createRegistryWithAccessors,
	json,
	type LocatorRegistry,
	PageObject,
	type PageObjectOptions,
	type PlaywrightReportLogger,
	SessionStorage,
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

// the registry of a strict standalone factory
export const strictRegistry = (page: Page) => createRegistryWithAccessors<Paths>(page, { strictChains: true }).registry;

// a preconfigured decorator shared from a module
export const boxedStep = step({ box: true });

export class Steps {
	@step()
	async load(): Promise<number> {
		return 1;
	}

	@boxedStep
	async save(): Promise<void> {}

	@step({ box: true })
	async choose<Method extends "card" | "invoice">(method: Method): Promise<Method> {
		return method;
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

// every public member, returned without annotations: a member whose type a consumer cannot name fails here
type Cart = { cart: Codec<{ items: number }> };
class ListPage extends PageObject<Paths, { baseUrlType: string; urlPathType: string; storage: Cart }> {
	constructor(page: Page) {
		super(page, "https://shop.example", "/list", { sessionStorage: { schema: { cart: json<{ items: number }>() } } });
	}
	protected defineLocators(): void {
		this.add("list").locator("ul");
	}
}
declare const page: Page;
declare const registry: LocatorRegistry<Paths>;
declare const listPage: ListPage;
declare const logger: PlaywrightReportLogger;

export const members = {
	registry: () => registry,
	verify: () => registry.verify,
	getLocator: () => registry.getLocator,
	getNestedLocator: () => registry.getNestedLocator,
	getLocatorSchema: () => registry.getLocatorSchema,
	add: () => registry.add,
	createReusable: () => registry.createReusable,
	factory: () => createRegistryWithAccessors<Paths>(page),
	factoryAdd: () => createRegistryWithAccessors<Paths>(page).add,
	query: () => registry.getLocatorSchema("list.item"),
	queryChain: () =>
		registry
			.getLocatorSchema("list.item")
			.filter({ hasText: "x" })
			.nth(0)
			.describe("d")
			.skip("list")
			.unskip("list")
			.clearSteps(),
	updateBuilder: () => registry.getLocatorSchema("list.item").update(),
	afterUpdate: () => registry.getLocatorSchema("list.item").update().locator("li"),
	replaceBuilder: () => registry.getLocatorSchema("list.item").replace(),
	afterReplace: () => registry.getLocatorSchema("list.item").replace().getByRole("listitem"),
	seed: () => registry.createReusable.getByRole("button"),
	seedChain: () => registry.createReusable.getByRole("button").filter({ hasText: "x" }).nth(0).describe("d"),
	seedDefinition: () => registry.createReusable.getByRole("button").definition,
	seedSteps: () => registry.createReusable.getByRole("button").steps,
	pageAdd: () => listPage.add,
	pageGetLocator: () => listPage.getLocator,
	pageGetNestedLocator: () => listPage.getNestedLocator,
	pageGetLocatorSchema: () => listPage.getLocatorSchema,
	navigation: () => listPage.navigation,
	navigationGoto: () => listPage.navigation.goto,
	pageSessionStorage: () => listPage.sessionStorage,
	pageSessionStorageGet: () => listPage.sessionStorage.get(["cart"]),
	fullUrl: () => listPage.fullUrl,
	baseUrl: () => listPage.baseUrl,
	label: () => listPage.label,
	sessionStorage: () => new SessionStorage(page, { label: "S", schema: { cart: json<{ items: number }>() } }),
	childLogger: () => logger.getNewChildLogger("child"),
	codec: () => json<{ items: number }>(),
	step: () => step,
	stepWithOptions: () => step({ box: true }),
};
