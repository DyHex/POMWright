// A consumer module that happens to share a POMWright file name: its frames must stay in reported stacks.
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class BrokenPage extends PageObject<"list" | "list.item"> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/");
	}

	protected defineLocators(): void {
		this.add("list").locator("ul");
		// a misspelt has reference: the check right after construction fails
		this.add("list.item")
			.locator("li")
			.filter({ has: "list.titel" as "list" });
	}
}
