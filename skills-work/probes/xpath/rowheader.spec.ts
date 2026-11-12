// Probe: an orders table's row found by its row header's exact name, as SKILL.md's example does, in a POMWright chain.
// STAND-IN, disclosed: page.setContent, because no page of the practice shop or the test server has a table with row
// headers. It holds for a native <th scope="row">; it could hide an app whose table builds its header otherwise.
import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

type Paths =
	| "main"
	| "main.table@orders"
	| "main.table@orders.rows"
	| "main.table@orders.rows.rowheader"
	| "main.table@orders.rows.button@cancel";

test("a row by its header's exact name; hasText would match ORD-10420 too", async ({ page }) => {
	await page.setContent(`
		<main><table aria-label="Orders">
			<thead><tr><th>Order</th><th>Status</th><th></th></tr></thead>
			<tbody>
				<tr><th scope="row">ORD-10420</th><td>Open</td><td><button onclick="this.textContent='Cancelled'">Cancel</button></td></tr>
				<tr><th scope="row">ORD-1042</th><td>Open</td><td><button onclick="this.textContent='Cancelled'">Cancel</button></td></tr>
			</tbody>
		</table></main>`);
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("main").locator("main");
	registry.add("main.table@orders").getByRole("table", { name: "Orders" });
	registry.add("main.table@orders.rows").getByRole("row");
	registry.add("main.table@orders.rows.rowheader").getByRole("rowheader");
	registry.add("main.table@orders.rows.button@cancel").getByRole("button", { name: "Cancel" });
	const orderNumber = registry
		.getLocatorSchema("main.table@orders.rows.rowheader")
		.update()
		.getByRole({ name: "ORD-1042", exact: true })
		.getLocator();
	const cancel = registry
		.getLocatorSchema("main.table@orders.rows.button@cancel")
		.filter("main.table@orders.rows", { has: orderNumber })
		.getNestedLocator();
	console.log(test.info().project.name, `${cancel}`);
	await expect(cancel).toHaveCount(1);
	const bySubstring = registry
		.getLocatorSchema("main.table@orders.rows.button@cancel")
		.filter("main.table@orders.rows", { hasText: "ORD-1042" })
		.getNestedLocator();
	await expect(bySubstring).toHaveCount(2);
	await cancel.click();
	await expect(page.getByRole("row").nth(2)).toContainText("Cancelled");
	await expect(page.getByRole("row").nth(1)).not.toContainText("Cancelled");
});
