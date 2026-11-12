// Probe of the eval-only pages of the practice shop (2026-11-11): each behaves as the cases built on it say.
import { expect, test } from "@playwright/test";

test("/orders: a progress bar, then the table, the badge only a test id names, rows with ids", async ({ page }) => {
	await page.goto("/orders");
	await expect(page.getByRole("progressbar", { name: "Loading orders" })).toBeVisible();
	const table = page.getByRole("table", { name: "Orders" });
	await expect(table.getByRole("row")).toHaveCount(4);
	await expect(page.getByRole("progressbar")).toHaveCount(0);
	await expect(page.locator('[data-qa="orders-count"]')).toHaveText("3");
	await expect(page.getByText("3", { exact: true })).toHaveCount(1);
	await expect(page.locator("#order-1042")).toContainText("Open");
	await expect(
		table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "ORD-1044", exact: true }) }),
	).toContainText("Cancelled");
});

test("/products/<id>: one product per id, unknown ids not found", async ({ page }) => {
	await page.goto("/products/2");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Desk lamp");
	await expect(page.getByText("399 kr")).toBeVisible();
	await page.getByRole("button", { name: "Add to cart" }).click();
	await expect(page.getByRole("status")).toHaveText("Added Desk lamp");
	await page.goto("/products/9");
	await expect(page.getByRole("heading", { level: 1 })).toHaveText("Product not found");
});

test("/deals: the survey covers the page on some visits; a locator handler closes it", async ({ page }) => {
	let shown = 0;
	await page.addLocatorHandler(page.getByRole("dialog", { name: "Survey" }), async (survey) => {
		shown += 1;
		await survey.getByRole("button", { name: "No thanks" }).click();
	});
	for (let visit = 0; visit < 12; visit += 1) {
		await page.goto("/deals");
		await page
			.getByRole("listitem")
			.filter({ has: page.getByRole("heading", { name: "Chair", exact: true }) })
			.getByRole("button", { name: "Add to cart" })
			.click();
		await expect(page.getByRole("status")).toHaveText("Added Chair");
		await page.waitForTimeout(800); // probe only: let a late survey appear before the next visit counts it
	}
	console.log(`survey handled on ${shown} of 12 visits`);
});

test("/deals: without a handler, a click the survey covers fails", async ({ page }) => {
	let failed = 0;
	for (let visit = 0; visit < 12; visit += 1) {
		await page.goto("/deals");
		await page.waitForTimeout(800); // probe only: the survey, if this visit gets one, is up
		const covered = await page.getByRole("dialog", { name: "Survey" }).isVisible();
		const click = page
			.getByRole("button", { name: "Add to cart" })
			.first()
			.click({ timeout: 1500 })
			.then(
				() => "clicked",
				() => "failed",
			);
		const result = await click;
		if (covered && result === "failed") failed += 1;
		if (covered !== (result === "failed")) throw new Error(`visit ${visit}: covered ${covered}, click ${result}`);
	}
	console.log(`covered and failed on ${failed} of 12 visits`);
});

test("/promo: a JSON-encoded string is applied, a raw one is not", async ({ page }) => {
	await page.goto("/promo");
	await page.evaluate(() => sessionStorage.setItem("promo", JSON.stringify("SUMMER")));
	await page.reload();
	await expect(page.getByRole("status")).toHaveText("Code SUMMER applied");
	await page.evaluate(() => sessionStorage.setItem("promo", "SUMMER"));
	await page.reload();
	await expect(page.getByRole("status")).toHaveText("No code applied");
});
