// Probe for the skills' scope example (2026-11-11): the practice shop's real products page, whose cookie dialog sits
// after </main>. A path that starts at the dialog finds it; the same dialog under `main` matches nothing, so a `main`
// segment keeps its paths' search inside the main content; the dialog's "Accept all" is outside main too.
import { expect, type Page, test } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths =
	| "main"
	| "main.dialog@cookies"
	| "main.button@acceptAll"
	| "dialog@cookies"
	| "dialog@cookies.button@accept";

class ProductsPage extends PageObject<Paths> {
	constructor(page: Page) {
		super(page, "http://localhost:4178", "/products");
	}

	protected defineLocators(): void {
		this.add("main").getByRole("main");
		this.add("main.dialog@cookies").getByRole("dialog", { name: "Cookies" });
		this.add("main.button@acceptAll").getByRole("button", { name: "Accept all" });
		this.add("dialog@cookies").getByRole("dialog", { name: "Cookies" });
		this.add("dialog@cookies.button@accept").getByRole("button", { name: "Accept all" });
	}
}

test("the cookie dialog outside main: found from its own root, not under main", async ({ page }) => {
	const products = new ProductsPage(page);
	await products.navigation.goto();
	await expect(products.getNestedLocator("main")).toHaveCount(1);
	await expect(products.getNestedLocator("dialog@cookies")).toBeVisible();
	await expect(products.getNestedLocator("main.dialog@cookies")).toHaveCount(0);
	await expect(products.getNestedLocator("main.button@acceptAll")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Accept all" })).toHaveCount(1);
	await products.getNestedLocator("dialog@cookies.button@accept").click();
	await expect(products.getNestedLocator("dialog@cookies")).toBeHidden();
	expect(await page.evaluate(() => sessionStorage.getItem("consent"))).toBe("given");
	expect(`${products.getNestedLocator("dialog@cookies.button@accept").describe("")}`).toBe(
		"getByRole('dialog', { name: 'Cookies' }).getByRole('button', { name: 'Accept all' })",
	);
});
