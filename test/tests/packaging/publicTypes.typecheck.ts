// Compile-only: the public types against the published declarations. Playwright does not match the file name;
// pnpm typecheck (in pack-test and CI) enforces every @ts-expect-error.
import type { Locator, Page } from "@playwright/test";
// @ts-expect-error renamed PageObjectTypeOptions in 3.0.0, no alias
import type { UrlTypeOptions } from "pomwright";
import {
	type AddAccessor,
	type AllEntries,
	type BaseUrlTypeFromOptions,
	type Codec,
	createRegistryWithAccessors,
	type Decoded,
	type FilterDefinition,
	type FullUrlTypeFromOptions,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type IndexSelector,
	json,
	type LocatorQueryBuilder,
	type LocatorRegistry,
	type LocatorRegistryOptions,
	type LocatorSchemaPathArgument,
	type LocatorSchemaPathFormat,
	type LocatorUpdateBuilder,
	type LogEntry,
	type LogLevel,
	type NavigationFor,
	type NavigationOptions,
	PageObject,
	type PageObjectOptions,
	type PageObjectTypeOptions,
	PlaywrightReportLogger,
	type ReusableLocator,
	type ReusableLocatorFactory,
	type SeedOptions,
	SessionStorage,
	type SessionStorageOptions,
	type SessionStorageSchema,
	type StepDecorator,
	type StorageTypeFromOptions,
	step,
	type ThisPageOptions,
	test,
	type UrlMatcher,
	type UrlPathTypeFromOptions,
} from "pomwright";

declare const page: Page;
type Paths = "main" | "main.heading" | "list" | "list.item";
const { registry, add, getLocator, getLocatorSchema, getNestedLocator } = createRegistryWithAccessors<Paths>(page);

// every exported name, one use each
const accessors: [
	AddAccessor<Paths>,
	GetLocatorAccessor<Paths>,
	GetLocatorSchemaAccessor<Paths>,
	GetNestedLocatorAccessor<Paths>,
] = [add, getLocator, getLocatorSchema, getNestedLocator];
const typedRegistry: LocatorRegistry<Paths> = registry;
type Options = { urlPathType: RegExp; storage: { token: Codec<string> } };
const options: PageObjectTypeOptions = {} as Options;
type Urls = [BaseUrlTypeFromOptions<Options>, UrlPathTypeFromOptions<Options>, FullUrlTypeFromOptions<Options>];
type Storage = [
	StorageTypeFromOptions<Options>,
	SessionStorageSchema,
	SessionStorageOptions<Options["storage"]>,
	SeedOptions,
	Decoded<Options["storage"], "token">,
	AllEntries<Options["storage"]>,
];
type Navigation = [NavigationFor<string, string>, NavigationOptions, ThisPageOptions, UrlMatcher];
type Logging = [LogEntry, LogLevel];
const values = [json, PageObject, PlaywrightReportLogger, SessionStorage, step, test];

// the query builder keeps its name and its sub-path check through the whole chain
const query: LocatorQueryBuilder<Paths, "list.item"> = getLocatorSchema("list.item").filter({ hasText: "x" }).nth(0);
query.update("list");
// @ts-expect-error "main" is not in the chain of "list.item"
query.update("main");
const update: LocatorUpdateBuilder<Paths, "list.item", "list.item", "update"> =
	getLocatorSchema("list.item").update("list.item");
const replacement: LocatorUpdateBuilder<Paths, "list.item", "list" | "list.item", "replace"> =
	getLocatorSchema("list.item").replace();
const afterUpdate: LocatorQueryBuilder<Paths, "list.item"> = update.getByRole({ name: "x" });
const afterReplace: LocatorQueryBuilder<Paths, "list.item"> = replacement.locator("li", { hasText: "x" });

// replace takes Playwright's arguments
getLocatorSchema("list.item").replace().getByRole("listitem");
getLocatorSchema("list.item").replace().getByRole("listitem", undefined);
getLocatorSchema("list").replace().frameLocator();
// @ts-expect-error the role is required
getLocatorSchema("list.item").replace().getByRole();
// @ts-expect-error an options-only call is update's form
getLocatorSchema("list.item").replace().getByRole({ name: "x" });
// @ts-expect-error null options delete nothing in replace
getLocatorSchema("list.item").replace().getByRole("listitem", { name: null });
// @ts-expect-error the test id is required
getLocatorSchema("list.item").replace().getByTestId();
getLocatorSchema("list.item").update().getByRole({ name: null });
// undefined as update's primary keeps the registered one, also from a variable that may be undefined
declare const maybeRole: "listitem" | undefined;
getLocatorSchema("list.item").update().getByRole(undefined, { name: "x" });
getLocatorSchema("list.item").update().getByRole(maybeRole, { name: "x" });
getLocatorSchema("list.item").update().getByText(undefined);
getLocatorSchema("list.item").update().getByTestId(undefined);
// @ts-expect-error replace takes Playwright's arguments: the role is required
getLocatorSchema("list.item").replace().getByRole(undefined, { name: "x" });
// @ts-expect-error a registration's first argument is required
add("main").getByRole(undefined, { name: "x" });

// the internals are not reachable through any step
// @ts-expect-error private
getLocatorSchema("list.item").filter({ hasText: "x" }).applyReplacement("list.item", { type: "locator", selector: "" });
// @ts-expect-error private
getLocatorSchema("list.item").update().getByRole("listitem").applyUpdate("list.item", { type: "role" });

// type-only names are not values
// @ts-expect-error a type, not a value
const notAValue = LocatorQueryBuilder;
// @ts-expect-error the seed factory's class is not exported, only its type
type FactoryValue = typeof import("pomwright")["ReusableLocatorFactory"];
const seeds: ReusableLocatorFactory<Paths> = registry.createReusable;
// @ts-expect-error step()'s decorator type is a type, not a value
type DecoratorValue = typeof import("pomwright")["StepDecorator"];
const decorator: StepDecorator = step("x");

// seeds: narrow and wide
const roleSeed: ReusableLocator<Paths, "role"> = registry.createReusable.getByRole("heading", { level: 2 });
const wideSeed: ReusableLocator<Paths> = roleSeed;
// @ts-expect-error a locator seed is not a role seed
const wrongSeed: ReusableLocator<Paths, "role"> = registry.createReusable.locator("h2");
add("main.heading", { reuse: roleSeed }).getByRole({ name: "x" });
// @ts-expect-error a role seed offers only the getByRole override
add("main.heading", { reuse: roleSeed }).getByText("x");
add("main.heading", { reuse: wideSeed }).getByText("x");

// filters, indices and the path rules
const filter: FilterDefinition<Paths> = { has: "list.item", hasText: "x" };
// @ts-expect-error a misspelt path reference
const misspelt: FilterDefinition<Paths> = { has: "list.itme" };
const index: IndexSelector = "last";
getLocatorSchema("list.item").filter(filter).nth(index);
const wellFormed: LocatorSchemaPathFormat<"main.heading"> = "main.heading";
// @ts-expect-error the format of an invalid path is an error tuple
const malformed: LocatorSchemaPathFormat<"main..heading"> = "main..heading";
const bom = createRegistryWithAccessors<"main" | "main\uFEFF.form">(page);
// @ts-expect-error U+FEFF is rejected by the type-level check as by the runtime check
bom.add("main\uFEFF.form");

// a domain base class generic in its paths forwards a path with LocatorSchemaPathArgument
abstract class ShopApp<P extends string> extends PageObject<P> {
	nested<Path extends P>(path: LocatorSchemaPathArgument<Path>): Locator {
		return this.getNestedLocator(path);
	}
	query<Path extends P>(path: LocatorSchemaPathArgument<Path>) {
		return this.getLocatorSchema(path);
	}
}
class ListPage extends ShopApp<Paths> {
	protected defineLocators(): void {}
	use() {
		this.nested("list.item");
		this.query("list.item").update("list");
		// @ts-expect-error the helper keeps the path check at its own call site
		this.nested("list.itme");
	}
}

// skip and unskip take the ancestors only; remove() is gone
getLocatorSchema("list.item").skip("list").unskip("list");
// @ts-expect-error the terminal path cannot be skipped
getLocatorSchema("list.item").skip("list.item");
// @ts-expect-error skip needs a sub-path
getLocatorSchema("list.item").skip();
// @ts-expect-error remove() is replaced by skip() and unskip()
getLocatorSchema("list.item").remove("list");
// @ts-expect-error a one-segment query has nothing to skip
getLocatorSchema("list").skip("list");

// describe takes a string ("" removes the description), nth an index, has a Locator or a path
getLocatorSchema("list.item").describe("");
// @ts-expect-error describe takes a string
getLocatorSchema("list.item").describe(null);
// @ts-expect-error null is not an index, in Playwright either
getLocatorSchema("list.item").nth(null);
// @ts-expect-error an array is neither a Locator nor a path
const arrayHas: FilterDefinition<Paths> = { has: [] };

// @step decorates methods that return a Promise
class Steps {
	@step()
	async load(): Promise<number> {
		return 1;
	}
	@step()
	static async create(): Promise<string> {
		return "c";
	}
	@step()
	promised(): Promise<number> {
		return Promise.resolve(1);
	}
	@step({ box: true })
	async generic<T extends string>(value: T): Promise<T> {
		return value;
	}
	// @ts-expect-error "@step decorates methods that return a Promise: make the method async"
	@step()
	sync(): number {
		return 1;
	}
}

// reuse by path returns filter, nth and describe, and no strategy method (3.0.0)
const copy = add("main.heading", { reuse: "list" }).filter({ hasText: "x" }).nth(0).describe("Copy");
// @ts-expect-error no strategy override after a path: TypeScript does not know the path's strategy
add("main.heading", { reuse: "list" }).getByRole("heading");
// biome-ignore lint/suspicious/noConfusingVoidType: the probe asserts that path reuse is no longer void
type VoidResult = void;
// @ts-expect-error path reuse is no longer void
const voidCopy: VoidResult = add("main.heading", { reuse: "list" });

// seed methods return a seed of the same strategy
const narrowed: ReusableLocator<Paths, "role"> = roleSeed.filter({ hasText: "x" }).nth(0).describe("d");

// strictChains: a boolean on the factory and on the page object
const strictRegistry = createRegistryWithAccessors<Paths>(page, { strictChains: true }).registry;
// @ts-expect-error strictChains is a boolean
createRegistryWithAccessors<Paths>(page, { strictChains: "yes" });
class StrictPage extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, "https://app.example", "/", { label: "Strict", locators: { strictChains: true } });
	}
	protected defineLocators(): void {
		this.add("main").locator("main");
	}
}

// a seeded override takes update's argument shapes, for every strategy with options
const textSeed = registry.createReusable.getByText("Save", { exact: true });
const labelSeed = registry.createReusable.getByLabel("Save", { exact: true });
const placeholderSeed = registry.createReusable.getByPlaceholder("Save", { exact: true });
const altSeed = registry.createReusable.getByAltText("Save", { exact: true });
const titleSeed = registry.createReusable.getByTitle("Save", { exact: true });
const locatorSeed = registry.createReusable.locator("button", { hasText: "Save" });
const testIdSeed = registry.createReusable.getByTestId("save");
const idSeed = registry.createReusable.getById("save");
const frameSeed = registry.createReusable.frameLocator("iframe");
add("main", { reuse: roleSeed }).getByRole(null);
add("main", { reuse: roleSeed }).getByRole({ name: null });
add("main", { reuse: roleSeed }).getByRole("link", null);
add("main", { reuse: roleSeed }).getByRole("link", { exact: null });
add("main", { reuse: textSeed }).getByText(null);
add("main", { reuse: textSeed }).getByText({ exact: null });
add("main", { reuse: textSeed }).getByText(/Sa/i, null);
add("main", { reuse: labelSeed }).getByLabel(null);
add("main", { reuse: labelSeed }).getByLabel("x", { exact: null });
add("main", { reuse: placeholderSeed }).getByPlaceholder({ exact: null });
add("main", { reuse: altSeed }).getByAltText(null);
add("main", { reuse: titleSeed }).getByTitle("x", null);
add("main", { reuse: locatorSeed }).locator(null);
add("main", { reuse: locatorSeed }).locator({ hasText: null });
add("main", { reuse: locatorSeed }).locator("a", null);
add("main", { reuse: testIdSeed }).getByTestId(undefined);
add("main", { reuse: roleSeed }).getByRole(undefined, { name: "x" });
add("main", { reuse: textSeed }).getByText(undefined, { exact: false });
add("main", { reuse: locatorSeed }).locator(undefined);
add("main", { reuse: frameSeed }).frameLocator();
// @ts-expect-error a primary is never null: with two arguments the first is the primary
add("main", { reuse: roleSeed }).getByRole(null, null);
// @ts-expect-error a primary is never null: getByTestId has no options
add("main", { reuse: testIdSeed }).getByTestId(null);
// @ts-expect-error a primary is never null: getById has no options
add("main", { reuse: idSeed }).getById(null);
// @ts-expect-error a primary is never null: frameLocator has no options
add("main", { reuse: frameSeed }).frameLocator(null);
// @ts-expect-error unseeded add keeps Playwright's option types: no null options
add("list").getByRole("button", null);
// @ts-expect-error unseeded add keeps Playwright's option types: no null keys
add("list").getByText("x", { exact: null });
// @ts-expect-error unseeded add has no options-only form
add("list").locator(null);
// @ts-expect-error a seed's own factory keeps Playwright's option types
registry.createReusable.getByRole("button", null);

// PageObjectOptions and LocatorRegistryOptions name what a domain base class forwards
const registryOptions: LocatorRegistryOptions = { strictChains: true };
abstract class DomainPage<P extends string> extends PageObject<P> {
	protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
		super(page, "https://app.example", urlPath, { ...options, locators: { strictChains: true, ...options?.locators } });
	}
}
class DomainLogin extends DomainPage<Paths> {
	constructor(page: Page) {
		super(page, "/login", { label: "Login", navOptions: { timeout: 1 }, locators: registryOptions });
	}
	protected defineLocators(): void {
		this.add("main").locator("main");
	}
}
// @ts-expect-error locators takes the registry options
const wrongOptions: PageObjectOptions = { locators: { strictChains: "yes" } };

// every seeded override accepts no argument and keeps the seed's definition, as update() does
add("main", { reuse: roleSeed }).getByRole().nth(0);
add("main", { reuse: textSeed }).getByText();
add("main", { reuse: locatorSeed }).locator();
add("main", { reuse: testIdSeed }).getByTestId();
add("main", { reuse: idSeed }).getById();
// @ts-expect-error unseeded add still requires the first argument
add("list").getByRole();
// @ts-expect-error unseeded add still requires the first argument
add("list").getByTestId();

// a seeded builder held in a variable takes its one override before or after steps
const held = add("main", { reuse: roleSeed });
held.nth(0);
held.getByRole({ name: "Cancel" });

export type Probe = [Urls, Storage, Navigation, Logging, UrlTypeOptions, FactoryValue, DecoratorValue];
void [DomainLogin, wrongOptions];
void [
	accessors,
	typedRegistry,
	options,
	values,
	afterUpdate,
	afterReplace,
	notAValue,
	seeds,
	decorator,
	wrongSeed,
	misspelt,
];
void [wellFormed, malformed, ListPage, arrayHas, Steps];
void [copy, voidCopy, narrowed, strictRegistry, StrictPage];

// a session storage key typed string, not a literal, may be any key: its value is a string or any declared codec's type
declare const storageWithCodecs: SessionStorage<{ user: Codec<{ name: string }> }>;
declare const anyKey: string;
const widenedValue: Promise<string | { name: string } | null> = storageWithCodecs.get(anyKey);
// @ts-expect-error a declared codec's type may come back, so the value is not known to be a string
const narrowedValue: Promise<string | null> = storageWithCodecs.get(anyKey);
const literalValue: Promise<{ name: string } | null> = storageWithCodecs.get("user");
// @ts-expect-error the key's type comes from the key alone: a declared key keeps its codec's type
storageWithCodecs.set("user", "a string");
void [widenedValue, narrowedValue, literalValue];

// a key typed as a pattern may be any declared key it matches, so its value may be that key's codec type
type UserSchema = { user: Codec<{ name: string }>; attempts: Codec<number> };
const patternValue: Decoded<UserSchema, `u${string}`> = { name: "Ada" };
// @ts-expect-error a pattern that only "user" matches does not take "attempts"' type
const notMatched: Decoded<UserSchema, `u${string}`> = 3;
void [patternValue, notMatched];

// sub-path arguments, typed per member of the path union
// a literal member: a segment of the chain; a namespace that is not a declared path is never accepted
const shop = createRegistryWithAccessors<"main" | "main.form.submit" | "footer">(page);
shop.getLocatorSchema("main.form.submit").nth("main", 0);
shop.getLocatorSchema("main.form.submit").nth("main.form.submit", 0);
// @ts-expect-error "main.form" is a namespace, not a declared path
shop.getLocatorSchema("main.form.submit").nth("main.form", 0);
// @ts-expect-error "footer" is not in the chain
shop.getLocatorSchema("main.form.submit").nth("footer", 0);
shop.getLocatorSchema("main.form.submit").skip("main");
// @ts-expect-error the query's own path cannot be skipped
shop.getLocatorSchema("main.form.submit").skip("main.form.submit");
// a template member: the query's own path, and a literal ancestor
const orders = createRegistryWithAccessors<"main" | "main.orders" | `main.orders.row@${string}`>(page);
orders.getLocatorSchema("main.orders.row@1042").nth("main.orders", 0);
orders.getLocatorSchema("main.orders.row@1042").nth("main.orders.row@1042", 0);
orders.getLocatorSchema("main.orders.row@1042").update("main.orders.row@1042");
orders.getLocatorSchema("main.orders.row@1042").filter("main.orders.row@1042", { hasText: "Open" });
// @ts-expect-error another row is not in the chain
orders.getLocatorSchema("main.orders.row@1042").nth("main.orders.row@1043", 0);
// @ts-expect-error the query's own path cannot be skipped
orders.getLocatorSchema("main.orders.row@1042").skip("main.orders.row@1042");
// a template ancestor
const tabs = createRegistryWithAccessors<"main" | `main.tab@${string}`>(page);
tabs.getLocatorSchema("main.tab@open.title").nth("main.tab@open", 0);
tabs.getLocatorSchema("main.tab@open.title").skip("main.tab@open");
// @ts-expect-error another tab is not in the chain
tabs.getLocatorSchema("main.tab@open.title").nth("main.tab@closed", 0);
// a finite template union, registered in a loop and used through a method over the union
const actions = ["confirm", "cancel"] as const;
type Action = (typeof actions)[number];
const dialog = createRegistryWithAccessors<"dialog" | `dialog.button@${Action}`>(page);
for (const action of actions) dialog.add(`dialog.button@${action}`).getByRole("button", { name: action });
dialog.getLocatorSchema("dialog.button@confirm").nth("dialog", 0);
// @ts-expect-error another button is not in the chain
dialog.getLocatorSchema("dialog.button@confirm").nth("dialog.button@cancel", 0);
// @ts-expect-error not declared
dialog.getNestedLocator("dialog.button@delete");
// <string>: any sub-path compiles, and the runtime checks it
const untypedPaths = createRegistryWithAccessors<string>(page);
untypedPaths.getLocatorSchema("main.list.item").nth("main.list", 0);
untypedPaths.getLocatorSchema("main.list.item").update("main.list.item");
untypedPaths.getLocatorSchema("main.list.item").skip("main.list");
untypedPaths.getLocatorSchema("main.list.item").nth("footer", 0);
// a registry created without its paths takes none
const noPaths = createRegistryWithAccessors(page);
noPaths.registry.verify();
// @ts-expect-error createRegistryWithAccessors needs its paths as a type argument
noPaths.add("main").locator("main");
// @ts-expect-error createRegistryWithAccessors needs its paths as a type argument
noPaths.getNestedLocator("main");
// a generic wrapper passes its own paths
const registryFor = <P extends string>(target: Page) => createRegistryWithAccessors<P>(target);
registryFor<"main">(page).getNestedLocator("main");
// a generic base that adds common paths: sub-paths on the common paths compile in its methods
type CommonPaths = "header" | "dialog@consent" | "dialog@consent.button@accept";
abstract class SitePage<PagePaths extends string> extends PageObject<PagePaths | CommonPaths> {
	acceptCookies() {
		this.getLocatorSchema("dialog@consent.button@accept").filter("dialog@consent", { hasText: "Cookies" });
		this.getLocatorSchema("dialog@consent.button@accept").nth("dialog@consent.button@accept", 0);
		this.getLocatorSchema("dialog@consent.button@accept").skip("dialog@consent");
		this.getLocatorSchema("dialog@consent.button@accept").clearSteps("dialog@consent");
		// @ts-expect-error "header" is not in the chain
		this.getLocatorSchema("dialog@consent.button@accept").filter("header", { hasText: "x" });
		// @ts-expect-error "dialog@consent.button" is a namespace
		this.getLocatorSchema("dialog@consent.button@accept").nth("dialog@consent.button", 0);
		// @ts-expect-error the query's own path cannot be skipped
		this.getLocatorSchema("dialog@consent.button@accept").skip("dialog@consent.button@accept");
		// @ts-expect-error a descendant is not a sub-path
		this.getLocatorSchema("dialog@consent").nth("dialog@consent.button@accept", 0);
	}
}
abstract class OrdersListPage extends SitePage<"main.list@orders" | "main.list@orders.row"> {
	firstRow() {
		this.getLocatorSchema("main.list@orders.row").nth("main.list@orders", 0);
		this.getLocatorSchema("dialog@consent.button@accept").filter("dialog@consent", { hasText: "Cookies" });
	}
}
void [OrdersListPage];

// reuse by path: a self-reuse is a compile error only for one and the same literal; variables are checked at run time
const publicToolbarButtons = ["save", "publish", "cancel"] as const;
type PublicToolbarButton = (typeof publicToolbarButtons)[number];
type PublicReusePaths =
	| "shared.button"
	| "main"
	| `main.toolbar.button@${PublicToolbarButton}`
	| `dialog.button@${PublicToolbarButton}`
	| "main.heading"
	| "dialog.heading";
const publicReuse = createRegistryWithAccessors<PublicReusePaths>(page).registry;
publicReuse.add("main.toolbar.button@save", { reuse: "shared.button" });
// @ts-expect-error a literal path that reuses itself
publicReuse.add("main.heading", { reuse: "main.heading" });
for (const button of publicToolbarButtons) publicReuse.add(`main.toolbar.button@${button}`, { reuse: "shared.button" });
for (const button of publicToolbarButtons) {
	publicReuse.add(`dialog.button@${button}`, { reuse: `main.toolbar.button@${button}` });
}
const publicHeadingCopies: ReadonlyArray<{ target: PublicReusePaths; source: PublicReusePaths }> = [
	{ target: "dialog.heading", source: "main.heading" },
];
for (const { target, source } of publicHeadingCopies) publicReuse.add(target, { reuse: source });
declare const publicEitherHeading: "main.heading" | "dialog.heading";
publicReuse.add(publicEitherHeading, { reuse: publicEitherHeading });
publicReuse.add("main.toolbar.button@cancel", { reuse: "shared.button" }).filter({ hasText: "Cancel" });
const publicUntypedReuse = createRegistryWithAccessors<string>(page).registry;
declare const publicAnyTarget: string;
declare const publicAnySource: string;
publicUntypedReuse.add(publicAnyTarget, { reuse: publicAnySource });
// @ts-expect-error a literal path that reuses itself, on a registry typed <string> too
publicUntypedReuse.add("main.heading", { reuse: "main.heading" });
const publicListRegistry = createRegistryWithAccessors<"list" | "list.item@first" | `list.item@${string}`>(
	page,
).registry;
declare const publicItemId: string;
publicListRegistry.add(`list.item@${publicItemId}`, { reuse: "list.item@first" });
// @ts-expect-error a literal matching a template member, reusing itself
publicListRegistry.add("list.item@first", { reuse: "list.item@first" });
