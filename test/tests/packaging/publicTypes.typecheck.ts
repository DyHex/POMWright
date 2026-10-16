// Compile-only: the public types against the published declarations. Playwright does not match the file name;
// pnpm typecheck (in pack-test and CI) enforces every @ts-expect-error.
import type { Locator, Page } from "@playwright/test";
// @ts-expect-error renamed PageObjectTypeOptions in 3.0.0, no alias
import type { UrlTypeOptions } from "pomwright";
import {
	type AddAccessor,
	type BaseUrlTypeFromOptions,
	type Codec,
	createRegistryWithAccessors,
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
	SessionStorage,
	type SessionStorageSchema,
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
type Storage = [StorageTypeFromOptions<Options>, SessionStorageSchema];
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

// the internals are not reachable through any step
// @ts-expect-error private
getLocatorSchema("list.item").filter({ hasText: "x" }).applyReplacement("list.item", { type: "locator", selector: "" });
// @ts-expect-error private
getLocatorSchema("list.item").update().getByRole("listitem").applyUpdate("list.item", { type: "role" });

// type-only names are not values
// @ts-expect-error a type, not a value
const notAValue = LocatorQueryBuilder;

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

// PageObjectOptions and LocatorRegistryOptions name what a domain base class forwards (plan 10, R1)
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

// every seeded override accepts no argument and keeps the seed's definition, as update() does (plan 10, R12)
add("main", { reuse: roleSeed }).getByRole().nth(0);
add("main", { reuse: textSeed }).getByText();
add("main", { reuse: locatorSeed }).locator();
add("main", { reuse: testIdSeed }).getByTestId();
add("main", { reuse: idSeed }).getById();
// @ts-expect-error unseeded add still requires the first argument
add("list").getByRole();
// @ts-expect-error unseeded add still requires the first argument
add("list").getByTestId();

// a seeded builder held in a variable takes its one override before or after steps (plan 10, R8)
const held = add("main", { reuse: roleSeed });
held.nth(0);
held.getByRole({ name: "Cancel" });

export type Probe = [Urls, Storage, Navigation, Logging, UrlTypeOptions];
void [DomainLogin, wrongOptions];
void [accessors, typedRegistry, options, values, afterUpdate, afterReplace, notAValue, wrongSeed, misspelt];
void [wellFormed, malformed, ListPage, arrayHas, Steps];
void [copy, voidCopy, narrowed, strictRegistry, StrictPage];
