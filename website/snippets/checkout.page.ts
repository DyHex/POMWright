import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";

type Paths = "main" | "main.text@orderId" | "main.button@pay";

export class CheckoutPage extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, "https://shop.example", "/checkout");
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		this.add("main.text@orderId").getByTestId("order-id");
		this.add("main.button@pay").getByRole("button", { name: "Pay" });
	}

	async orderId(): Promise<string> {
		return (await this.getNestedLocator("main.text@orderId").textContent()) ?? "";
	}

	@step()
	async pay() {
		await this.getNestedLocator("main.button@pay").click();
	}
}
