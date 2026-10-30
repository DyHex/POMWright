// The seeds of the generated declaration-emit check: a value of every export of pomwright that has members, keyed by
// the export's name (a variant after a dot), and the exports that have none to walk. scripts/generate-emit-members.mjs
// reads them with the published declarations, fails when an export is in neither, and writes test/.emit-members/, which
// returns every public member of every seed, and the protected members of the page objects declared here, on its own,
// for tsconfig.declarations.json to emit. Compile-only; Playwright does not match the file name.
import type { Page } from "@playwright/test";
import {
	type AddAccessor,
	type AllEntries,
	type Codec,
	createRegistryWithAccessors,
	type FilterDefinition,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	json,
	type LocatorQueryBuilder,
	type LocatorRegistry,
	type LocatorRegistryOptions,
	type LocatorUpdateBuilder,
	type LogEntry,
	type NavigationFor,
	type NavigationOptions,
	PageObject,
	type PageObjectOptions,
	PlaywrightReportLogger,
	type ReusableLocator,
	type ReusableLocatorFactory,
	type SeedOptions,
	SessionStorage,
	type SessionStorageOptions,
	type StepDecorator,
	step,
	type ThisPageOptions,
	test,
	type UrlMatcher,
} from "pomwright";

export type Paths = "main" | "main.heading" | "list" | "list.item";
const cartSchema = { cart: json<{ items: number }>() };
type Cart = typeof cartSchema;

export class ListPage extends PageObject<Paths, { baseUrlType: string; urlPathType: string; storage: Cart }> {
	constructor(page: Page) {
		super(page, "https://shop.example", "/list", { sessionStorage: { schema: cartSchema } });
	}
	protected defineLocators(): void {
		this.add("list").locator("ul");
	}
}

export class OrderPage extends PageObject<Paths, { baseUrlType: RegExp; urlPathType: RegExp }> {
	constructor(page: Page) {
		super(page, /shop/, /^\/orders\/\d+$/);
	}
	protected defineLocators(): void {
		this.add("list").locator("ul");
	}
}

declare const page: Page;
declare const registry: LocatorRegistry<Paths>;
declare const query: LocatorQueryBuilder<Paths, "list.item">;
declare const updateBuilder: LocatorUpdateBuilder<Paths, "list.item", "list.item", "update">;
declare const replaceBuilder: LocatorUpdateBuilder<Paths, "list.item", "list" | "list.item", "replace">;
declare const roleSeed: ReusableLocator<Paths, "role">;
declare const anySeed: ReusableLocator<Paths>;
declare const factory: ReusableLocatorFactory<Paths>;
declare const listPage: ListPage;
declare const orderPage: OrderPage;
declare const stringNavigation: NavigationFor<string, string>;
declare const regExpPathNavigation: NavigationFor<string, UrlMatcher>;
declare const anyNavigation: NavigationFor<RegExp, UrlMatcher>;
declare const matcher: UrlMatcher;
declare const storage: SessionStorage<Cart>;
declare const plainStorage: SessionStorage;
declare const logger: PlaywrightReportLogger;
declare const entry: LogEntry;
declare const codec: Codec<{ items: number }>;
declare const decorator: StepDecorator;
declare const add: AddAccessor<Paths>;
declare const getLocator: GetLocatorAccessor<Paths>;
declare const getNestedLocator: GetNestedLocatorAccessor<Paths>;
declare const getLocatorSchema: GetLocatorSchemaAccessor<Paths>;
declare const filter: FilterDefinition<Paths, Paths>;
declare const allEntries: AllEntries<Cart>;
declare const navigationOptions: NavigationOptions;
declare const thisPageOptions: ThisPageOptions;
declare const seedOptions: SeedOptions;
declare const storageOptions: SessionStorageOptions<Cart>;
declare const registryOptions: LocatorRegistryOptions;
declare const pageObjectOptions: PageObjectOptions<{ baseUrlType: string; urlPathType: string; storage: Cart }>;

export const seeds = {
	test,
	json,
	step,
	createRegistryWithAccessors,
	"createRegistryWithAccessors.result": createRegistryWithAccessors<Paths>(page),
	"PageObject.class": PageObject,
	"PageObject.string": listPage,
	"PageObject.regExp": orderPage,
	"SessionStorage.class": SessionStorage,
	SessionStorage: storage,
	"SessionStorage.plain": plainStorage,
	"PlaywrightReportLogger.class": PlaywrightReportLogger,
	PlaywrightReportLogger: logger,
	LogEntry: entry,
	LocatorRegistry: registry,
	LocatorQueryBuilder: query,
	"LocatorUpdateBuilder.update": updateBuilder,
	"LocatorUpdateBuilder.replace": replaceBuilder,
	ReusableLocator: roleSeed,
	"ReusableLocator.any": anySeed,
	ReusableLocatorFactory: factory,
	NavigationFor: stringNavigation,
	"NavigationFor.regExpPath": regExpPathNavigation,
	"NavigationFor.any": anyNavigation,
	UrlMatcher: matcher,
	Codec: codec,
	StepDecorator: decorator,
	AddAccessor: add,
	GetLocatorAccessor: getLocator,
	GetNestedLocatorAccessor: getNestedLocator,
	GetLocatorSchemaAccessor: getLocatorSchema,
	FilterDefinition: filter,
	AllEntries: allEntries,
	NavigationOptions: navigationOptions,
	ThisPageOptions: thisPageOptions,
	SeedOptions: seedOptions,
	SessionStorageOptions: storageOptions,
	LocatorRegistryOptions: registryOptions,
	PageObjectOptions: pageObjectOptions,
};

/**
 * The exports with no members to walk: unions and type functions, which no value carries, and the shapes a consumer
 * writes rather than receives (a schema, the page object's type options).
 */
export const memberless = [
	"LogLevel",
	"IndexSelector",
	"Decoded",
	"LocatorSchemaPathArgument",
	"LocatorSchemaPathFormat",
	"SessionStorageSchema",
	"PageObjectTypeOptions",
	"BaseUrlTypeFromOptions",
	"FullUrlTypeFromOptions",
	"UrlPathTypeFromOptions",
	"StorageTypeFromOptions",
] as const;
