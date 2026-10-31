// A consumer's module, compiled by scripts/consumer-check.sh against the installed package under each module resolution
// (copied to consumer.ts, consumer.mts and consumer.cts) and each TypeScript version, in both decorator modes. Values and
// types come from the package root, as the docs say; the @ts-expect-error lines fail the compile if the package's types
// were lost (typed any), a wrong path were accepted, or @step took a method that does not return a Promise.
import type { Page } from "@playwright/test";
import {
	type AllEntries,
	type Codec,
	createRegistryWithAccessors,
	type Decoded,
	json,
	type LocatorQueryBuilder,
	PageObject,
	PlaywrightReportLogger,
	type ReusableLocator,
	type SeedOptions,
	SessionStorage,
	type SessionStorageOptions,
	step,
	test,
} from "pomwright";

type Paths = "main" | "main.list" | "main.list.item";
const schema = { user: json<{ name: string }>() };
const boxedStep = step({ box: true });

export class ShopPage extends PageObject<Paths, { storage: typeof schema }> {
	constructor(page: Page) {
		super(page, "https://shop.example", "/", { label: "Shop", sessionStorage: { schema } });
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		this.add("main.list").getByRole("list");
		this.add("main.list.item").getByRole("listitem");
	}

	@step()
	async open(): Promise<void> {
		await this.navigation.goto();
	}

	@boxedStep
	async firstItem(): Promise<string | null> {
		return await this.getNestedLocator("main.list.item").first().textContent();
	}

	@step()
	async choose<Method extends "card" | "invoice">(method: Method): Promise<Method> {
		return method;
	}

	// @ts-expect-error a generic method that does not return a Promise
	@step()
	plain<T>(value: T): T {
		return value;
	}
}

export const chosen = (shop: ShopPage): Promise<"card"> => shop.choose("card");

export const lastItem = (page: Page): LocatorQueryBuilder<Paths, "main.list.item"> =>
	createRegistryWithAccessors<Paths>(page).getLocatorSchema("main.list.item").nth("last");

export const button = (page: Page): ReusableLocator<Paths, "role"> =>
	createRegistryWithAccessors<Paths>(page).registry.createReusable.getByRole("button");

export const missing = (page: Page) =>
	// @ts-expect-error a path that is not in Paths
	createRegistryWithAccessors<Paths>(page).getNestedLocator("main.missing");

export type StorageTypes = [
	AllEntries<typeof schema>,
	Decoded<typeof schema, "user">,
	SeedOptions,
	SessionStorageOptions<typeof schema>,
	Codec<number>,
];

export const values = [SessionStorage, PlaywrightReportLogger, test];
