import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths = "main" | "main.heading";

export class AccountPage extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, "https://shop.example", "/account");
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		this.add("main.heading").getByRole("heading", { level: 1 });
	}
}
