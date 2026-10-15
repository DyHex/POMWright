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
	type LocatorSchemaPathArgument,
	type LocatorSchemaPathFormat,
	type LocatorUpdateBuilder,
	type LogEntry,
	type LogLevel,
	type NavigationFor,
	type NavigationOptions,
	PageObject,
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

export type Probe = [Urls, Storage, Navigation, Logging, UrlTypeOptions];
void [accessors, typedRegistry, options, values, afterUpdate, afterReplace, notAValue, wrongSeed, misspelt];
void [wellFormed, malformed, ListPage, arrayHas, Steps];
