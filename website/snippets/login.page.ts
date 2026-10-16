import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";

type Paths =
	| "main"
	| "main.form@login"
	| "main.form@login.input@email"
	| "main.form@login.input@password"
	| "main.form@login.button@submit";

export class LoginPage extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, "https://shop.example", "/login");
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		this.add("main.form@login").getByRole("form", { name: "Log in" });
		this.add("main.form@login.input@email").getByLabel("Email");
		this.add("main.form@login.input@password").getByLabel("Password");
		this.add("main.form@login.button@submit").getByRole("button", { name: "Log in" });
	}

	@step()
	async logIn(email: string, password: string) {
		await this.getNestedLocator("main.form@login.input@email").fill(email);
		await this.getNestedLocator("main.form@login.input@password").fill(password);
		await this.getNestedLocator("main.form@login.button@submit").click();
	}
}
