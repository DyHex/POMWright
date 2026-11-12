import { expect, type Page } from "@playwright/test";
import {
	json,
	PageObject,
	type PageObjectOptions,
	type PageObjectTypeOptions,
	type UrlPathTypeFromOptions,
} from "pomwright";

const shopStorage = { cart: json<{ items: { name: string; quantity: number }[] }>() };
type ShopOptions<O extends PageObjectTypeOptions> = {
	baseUrlType: string;
	urlPathType: UrlPathTypeFromOptions<O>;
	storage: typeof shopStorage;
};
type Common =
	| "header"
	| "header.navigation@main"
	| "header.navigation@main.link@cart"
	| "main"
	| "main.heading"
	| "dialog@cookies"
	| "dialog@cookies.button@accept";

abstract class ShopPage<
	Paths extends string,
	O extends PageObjectTypeOptions = { urlPathType: string },
> extends PageObject<Paths | Common, ShopOptions<O>> {
	protected constructor(
		page: Page,
		urlPath: UrlPathTypeFromOptions<ShopOptions<O>>,
		options?: PageObjectOptions<ShopOptions<O>>,
	) {
		super(page, "http://localhost:4173", urlPath, { ...options, sessionStorage: { schema: shopStorage } });
	}
	protected defineLocators(): void {
		this.add("header").getByRole("banner");
		this.add("header.navigation@main").getByRole("navigation", { name: "Main" });
		this.add("header.navigation@main.link@cart").getByRole("link", { name: "Cart" });
		this.add("main").locator("main");
		this.add("dialog@cookies").getByRole("dialog", { name: "Cookies" });
		this.add("dialog@cookies.button@accept").getByRole("button", { name: "Accept all" });
		this.definePageLocators();
	}
	protected abstract definePageLocators(): void;
	async acceptCookies() {
		await this.getNestedLocator("dialog@cookies.button@accept").click();
		await expect(this.getNestedLocator("dialog@cookies")).toBeHidden();
	}
}

export class HomePage extends ShopPage<
	| "main.form@newsletter"
	| "main.form@newsletter.input@email"
	| "main.form@newsletter.button@subscribe"
	| "main.form@newsletter.text@confirmation"
> {
	constructor(page: Page) {
		super(page, "");
	}
	protected definePageLocators(): void {
		this.add("main.heading").getByRole("heading", { level: 1 });
		this.add("main.form@newsletter").getByRole("form", { name: "Newsletter" });
		this.add("main.form@newsletter.input@email").getByLabel("Email");
		this.add("main.form@newsletter.button@subscribe").getByRole("button", { name: "Subscribe" });
		this.add("main.form@newsletter.text@confirmation").getByText("Thanks for subscribing");
	}
}

export class ProductsPage extends ShopPage<
	| "main.list@products"
	| "main.list@products.card"
	| "main.list@products.card.heading"
	| "main.list@products.card.button@addToCart"
	| "main.status"
> {
	constructor(page: Page) {
		super(page, "/products");
	}
	protected definePageLocators(): void {
		this.add("main.heading").getByRole("heading", { level: 1 });
		this.add("main.list@products").getByRole("list", { name: "Products" });
		this.add("main.list@products.card").getByRole("listitem");
		this.add("main.list@products.card.heading").getByRole("heading");
		this.add("main.list@products.card.button@addToCart").getByRole("button", { name: "Add to cart" });
		this.add("main.status").getByRole("status");
	}
	async addToCart(product: string) {
		const heading = this.getLocatorSchema("main.list@products.card.heading")
			.update()
			.getByRole({ name: product, exact: true })
			.getLocator();
		await this.getLocatorSchema("main.list@products.card.button@addToCart")
			.filter("main.list@products.card", { has: heading })
			.getNestedLocator()
			.click();
	}
}

export class CartPage extends ShopPage<
	"main.table@cart" | "main.table@cart.row" | "main.table@cart.row.button@remove" | "main.text@empty"
> {
	constructor(page: Page) {
		super(page, "/cart");
	}
	protected definePageLocators(): void {
		this.add("main.heading").getByRole("heading", { level: 1 });
		this.add("main.table@cart").getByRole("table", { name: "Cart" });
		this.add("main.table@cart.row").getByRole("row");
		this.add("main.table@cart.row.button@remove").getByRole("button", { name: "Remove" });
		this.add("main.text@empty").getByText("Your cart is empty");
	}
	row(product: string) {
		return this.getLocatorSchema("main.table@cart.row").filter({ hasText: product }).getNestedLocator();
	}
	async remove(product: string) {
		await this.getLocatorSchema("main.table@cart.row.button@remove")
			.filter("main.table@cart.row", { hasText: product })
			.getNestedLocator()
			.click();
	}
}

export class PaymentPage extends ShopPage<
	| "main.region@card"
	| "main.region@card.frame"
	| "main.region@card.frame.input@cardNumber"
	| "main.region@card.frame.button@pay"
	| "main.region@card.frame.text@paid"
> {
	constructor(page: Page) {
		super(page, "/payment");
	}
	protected definePageLocators(): void {
		this.add("main.heading").getByRole("heading", { level: 1 });
		this.add("main.region@card").getByRole("region", { name: "Card details" });
		this.add("main.region@card.frame").frameLocator('iframe[title="Card form"]');
		this.add("main.region@card.frame.input@cardNumber").getByLabel("Card number");
		this.add("main.region@card.frame.button@pay").getByRole("button", { name: "Pay" });
		this.add("main.region@card.frame.text@paid").getByText("Payment received");
	}
}

export class LoginPage extends ShopPage<
	"main.form@login" | "main.form@login.input@email" | "main.form@login.input@password" | "main.form@login.button@login"
> {
	constructor(page: Page) {
		super(page, "/login");
	}
	protected definePageLocators(): void {
		this.add("main.heading").getByRole("heading", { level: 1 });
		this.add("main.form@login").getByRole("form", { name: "Log in" });
		this.add("main.form@login.input@email").getByLabel("Email");
		this.add("main.form@login.input@password").getByLabel("Password");
		this.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
	}
}

export class AccountPage extends ShopPage<"main.region@orders", { urlPathType: RegExp }> {
	constructor(page: Page) {
		super(page, /^\/account\/\d+$/);
	}
	protected definePageLocators(): void {
		this.add("main.heading").getByRole("heading", { level: 1 });
		this.add("main.region@orders").getByRole("region", { name: "Orders" });
	}
}
