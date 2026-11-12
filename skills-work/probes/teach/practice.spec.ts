import { expect } from "@playwright/test";
import { test as base } from "pomwright";
import { AccountPage, CartPage, HomePage, LoginPage, PaymentPage, ProductsPage } from "./shop";

const test = base.extend<{
	home: HomePage;
	products: ProductsPage;
	cart: CartPage;
	payment: PaymentPage;
	login: LoginPage;
	account: AccountPage;
}>({
	home: async ({ page }, use) => use(new HomePage(page)),
	products: async ({ page }, use) => use(new ProductsPage(page)),
	cart: async ({ page }, use) => use(new CartPage(page)),
	payment: async ({ page }, use) => use(new PaymentPage(page)),
	login: async ({ page }, use) => use(new LoginPage(page)),
	account: async ({ page }, use) => use(new AccountPage(page)),
});

test("the cookie dialog and the newsletter", async ({ home }) => {
	await home.navigation.goto();
	await home.acceptCookies();
	await home.getNestedLocator("main.form@newsletter.input@email").fill("ada@shop.example");
	await home.getNestedLocator("main.form@newsletter.button@subscribe").click();
	await expect(home.getNestedLocator("main.form@newsletter.text@confirmation")).toBeVisible();
});

test("a card found by its heading's exact name, into the cart", async ({ products, cart }) => {
	await products.navigation.goto();
	await products.acceptCookies();
	await products.addToCart("Lamp");
	await expect(products.getNestedLocator("main.status")).toHaveText("Added Lamp");
	await products.getNestedLocator("header.navigation@main.link@cart").click();
	await cart.navigation.expectThisPage();
	await expect(cart.row("Lamp")).toContainText("1");
	await expect(cart.row("Desk lamp")).toHaveCount(0);
});

test("a seeded cart, then a removal", async ({ cart }) => {
	await cart.sessionStorage.seed({ cart: { items: [{ name: "Chair", quantity: 2 }] }, consent: "given" });
	await cart.navigation.goto();
	await expect(cart.getNestedLocator("dialog@cookies")).toBeHidden();
	await expect(cart.row("Chair")).toContainText("2");
	await cart.remove("Chair");
	await expect(cart.getNestedLocator("main.text@empty")).toBeVisible();
	expect(await cart.sessionStorage.get("cart")).toEqual({ items: [] });
});

test("paying inside the iframe", async ({ payment }) => {
	await payment.sessionStorage.seed({ consent: "given" });
	await payment.navigation.goto();
	await payment.getNestedLocator("main.region@card.frame.input@cardNumber").fill("4242 4242 4242 4242");
	await payment.getNestedLocator("main.region@card.frame.button@pay").click();
	await expect(payment.getNestedLocator("main.region@card.frame.text@paid")).toBeVisible();
});

test("logging in lands on an account page whose URL varies", async ({ login, account }) => {
	await login.sessionStorage.seed({ consent: "given" });
	await login.navigation.goto();
	await login.getNestedLocator("main.form@login.input@email").fill("ada@shop.example");
	await login.getNestedLocator("main.form@login.input@password").fill("correct horse");
	await login.getNestedLocator("main.form@login.button@login").click();
	await login.navigation.expectAnotherPage();
	await account.navigation.expectThisPage();
	await expect(account.getNestedLocator("main.heading")).toHaveText("Account 42");
});
