import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths = "main" | "main.list@orders" | "main.list@orders.item";

export class OrdersPage extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, "https://shop.example", "/orders");
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		this.add("main.list@orders").getByRole("list", { name: "Orders" });
		this.add("main.list@orders.item").getByRole("listitem");
	}
}
