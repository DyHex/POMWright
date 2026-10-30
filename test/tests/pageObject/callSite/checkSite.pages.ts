// Page objects for checkSite.spec.ts, each with one registry mistake; each line a test looks for is marked with
// `// SITE <id>`.
import type { Page } from "@playwright/test";
import { PageObject, type PageObjectOptions } from "pomwright";
import {
	type ComposedPaths,
	defineComposedLocators,
	defineListLocators,
	defineMalformedLocators,
	type ListPaths,
} from "./checkSite.locators";

export class DirectPage extends PageObject<"main"> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/");
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		this.add("main").locator("body"); // SITE direct-add
	}
}

/** A project's own base class, as *Organizing a project* recommends: every page object's `super(…)` is this one line. */
abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
	protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
		super(page, "http://localhost:9000", urlPath, options); // SITE base-super
	}
}

export class BasedPage extends ShopPage<"main"> {
	constructor(page: Page) {
		super(page, "/");
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		this.add("main").locator("body");
	}
}

export class ModulePage extends PageObject<ListPaths> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/");
	}

	protected defineLocators(): void {
		defineListLocators(this.locatorRegistry); // SITE module-call
	}
}

export class ComposedPage extends PageObject<ComposedPaths> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/");
	}

	protected defineLocators(): void {
		defineComposedLocators(this.locatorRegistry); // SITE composed-call
	}
}

export class MalformedPage extends PageObject<string> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/");
	}

	protected defineLocators(): void {
		defineMalformedLocators(this.locatorRegistry);
	}
}

export class MisspelledPage extends PageObject<"main" | "main.list"> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/");
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		// only verify() finds it: a has reference to a path that is not registered
		this.add("main.list")
			.locator("ul")
			.filter({ has: "mian" as "main" });
	}
}
