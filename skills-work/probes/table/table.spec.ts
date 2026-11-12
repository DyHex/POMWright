// Probe for the locator guide's table example (2026-11-11): the practice shop's real cart page, whose rows have no row
// header (<td> cells only, <th> in <thead>). A row is picked by its product cell's exact name through `has`, with the
// cells registered plural; the quantity cell by its column. "Desk lamp" is in the cart beside "Lamp".
import { expect, type Page, test } from "@playwright/test";
import { json, PageObject, step } from "pomwright";

type Paths =
	| "main"
	| "main.table@cart"
	| "main.table@cart.rows"
	| "main.table@cart.rows.cells"
	| "main.table@cart.rows.cell@quantity"
	| "main.table@cart.rows.button@remove";

const storage = { cart: json<{ items: { name: string; quantity: number }[] }>() };

class CartPage extends PageObject<Paths, { storage: typeof storage }> {
	constructor(page: Page) {
		super(page, "http://localhost:4177", "/cart", { sessionStorage: { schema: storage } });
	}

	protected defineLocators(): void {
		this.add("main").locator("main");
		this.add("main.table@cart").getByRole("table", { name: "Cart" });
		this.add("main.table@cart.rows").getByRole("row");
		this.add("main.table@cart.rows.cells").getByRole("cell");
		this.add("main.table@cart.rows.cell@quantity").getByRole("cell").nth(1);
		this.add("main.table@cart.rows.button@remove").getByRole("button", { name: "Remove" });
	}

	productName(product: string) {
		return this.getLocatorSchema("main.table@cart.rows.cells")
			.update()
			.getByRole({ name: product, exact: true })
			.getLocator();
	}

	quantity(product: string) {
		return this.getLocatorSchema("main.table@cart.rows.cell@quantity")
			.filter("main.table@cart.rows", { has: this.productName(product) })
			.getNestedLocator();
	}

	@step()
	async remove(options: { product: string }) {
		await this.getLocatorSchema("main.table@cart.rows.button@remove")
			.filter("main.table@cart.rows", { has: this.productName(options.product) })
			.getNestedLocator()
			.click();
	}
}

test("a row without a row header is picked by its cell's exact name", async ({ page }) => {
	const cart = new CartPage(page);
	await cart.sessionStorage.seed({
		cart: {
			items: [
				{ name: "Desk lamp", quantity: 3 },
				{ name: "Lamp", quantity: 2 },
				{ name: "Chair", quantity: 1 },
			],
		},
	});
	await cart.navigation.goto();

	// the registered cells are every cell of every row: 3 rows x 3 cells; the header row has columnheaders, not cells
	await expect(cart.getNestedLocator("main.table@cart.rows.cells")).toHaveCount(9);
	// hasText is a substring, ignoring case: "Lamp" passes the Desk lamp's row too
	await expect(
		cart
			.getLocatorSchema("main.table@cart.rows")
			.filter("main.table@cart.rows", { hasText: "Lamp" })
			.getNestedLocator(),
	).toHaveCount(2);
	// the exact name picks one cell, and through `has`, one row
	await expect(cart.productName("Lamp")).toHaveCount(1);
	await expect(cart.quantity("Lamp")).toHaveText("2");
	await expect(cart.quantity("Desk lamp")).toHaveText("3");

	await cart.remove({ product: "Lamp" });
	await expect(cart.getNestedLocator("main.table@cart.rows.cells")).toHaveCount(6);
	await expect(cart.quantity("Desk lamp")).toHaveText("3");
	console.log(`${test.info().project.name}: ${cart.quantity("Lamp")}`);
});
