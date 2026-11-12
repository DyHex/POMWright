// Probe: XPath in a POMWright chain, and XPath against an open shadow root. Real pages: the practice shop's
// /products (3 prices in the list, 2 more <p> outside it) and the test server's /testids (an open shadow root holding
// <p id="in.open">). The packed build 3.0.2, Playwright 1.64.0, three browsers.
import { expect, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

type ShopPaths =
	| "main"
	| "main.list@products"
	| "main.list@products.prices@css"
	| "main.list@products.prices@xpath"
	| "main.list@products.prices@xpathPrefix"
	| "main.list@products.prices@absolute"
	| "main.list@products.card@lamp"
	| "main.list@products.card@lamp.parent";

test("an XPath segment is scoped to the segment before it", async ({ page }) => {
	await page.goto("http://localhost:4176/products");
	const { add, getNestedLocator } = createRegistryWithAccessors<ShopPaths>(page);
	add("main").getByRole("main");
	add("main.list@products").getByRole("list", { name: "Products" });
	add("main.list@products.prices@css").locator("p");
	add("main.list@products.prices@xpath").locator("//p");
	add("main.list@products.prices@xpathPrefix").locator("xpath=//p");
	add("main.list@products.prices@absolute").locator("xpath=/html/body/main/ul/li/p");
	add("main.list@products.card@lamp").getByRole("listitem").filter({ hasText: "249 kr" });
	add("main.list@products.card@lamp.parent").locator("xpath=..");

	await expect(page.locator("//p")).toHaveCount(5);
	await expect(page.locator("xpath=/html/body/main/ul/li/p")).toHaveCount(3);
	await expect(getNestedLocator("main.list@products.prices@css")).toHaveCount(3);
	const counts = {
		xpath: await getNestedLocator("main.list@products.prices@xpath").count(),
		xpathPrefix: await getNestedLocator("main.list@products.prices@xpathPrefix").count(),
		absolute: await getNestedLocator("main.list@products.prices@absolute").count(),
	};
	console.log(test.info().project.name, "counts", JSON.stringify(counts));
	console.log(test.info().project.name, "xpath chain", `${getNestedLocator("main.list@products.prices@xpath")}`);
	expect(counts).toEqual({ xpath: 3, xpathPrefix: 3, absolute: 0 });
	await expect(getNestedLocator("main.list@products.card@lamp.parent")).toHaveAttribute("aria-label", "Products");
});

test("XPath does not reach into an open shadow root; CSS and getById do", async ({ page }) => {
	await page.goto("http://localhost:9000/testids");
	const { add, getNestedLocator } = createRegistryWithAccessors<"shadow@byId" | "shadow@xpath">(page);
	add("shadow@byId").getById("in.open");
	add("shadow@xpath").locator("//p[@id='in.open']");

	await expect(page.locator("[id='in.open']")).toHaveCount(1);
	await expect(page.getByText("shadow", { exact: true })).toHaveCount(1);
	await expect(getNestedLocator("shadow@byId")).toHaveCount(1);
	await expect(getNestedLocator("shadow@xpath")).toHaveCount(0);
	await expect(page.locator("//div[@id='shadow-host']")).toHaveCount(1);
});

// Do text, label, placeholder and alt text compete for the same element? The test server's /testgetby: a field with a
// wrapping label, a field with a for= label, fields with placeholders, images with alt text.
test("text, label, placeholder and alt text find different elements", async ({ page }) => {
	await page.goto("http://localhost:9000/testgetby");
	const form = page.locator("#account");
	await expect(form.getByLabel("Email")).toHaveJSProperty("tagName", "INPUT");
	await expect(form.getByText("Email", { exact: true })).toHaveJSProperty("tagName", "LABEL");
	await expect(form.getByLabel("Username")).toHaveJSProperty("tagName", "INPUT");
	await expect(form.getByText("Username")).toHaveJSProperty("tagName", "LABEL");
	await expect(form.getByPlaceholder("Enter your name")).toHaveJSProperty("tagName", "INPUT");
	await expect(form.getByText("Enter your name")).toHaveCount(0);
	await expect(page.locator("#gallery").getByAltText("Nature")).toHaveJSProperty("tagName", "IMG");
	await expect(page.locator("#gallery").getByText("Nature")).toHaveCount(0);
	await expect(page.locator("#gallery").getByRole("img", { name: "Nature" })).toHaveJSProperty("tagName", "IMG");
	await expect(form.getByRole("textbox", { name: "Email" })).toHaveJSProperty("tagName", "INPUT");
	await expect(form.getByRole("textbox", { name: "Enter your name" })).toHaveJSProperty("name", "name");
});

// Narrowing one locator before moving down the order: filter's hasText, hasNotText, has and hasNot, on the practice
// shop's product cards ("Lamp", "Desk lamp", "Chair"), registered in a POMWright chain.
type CardPaths =
	| "main"
	| "main.list@products"
	| "main.list@products.cards"
	| "main.list@products.cards@lampText"
	| "main.list@products.card@lampNotDesk"
	| "main.list@products.card@lampHeading"
	| "main.list@products.cards@not399";

test("filter narrows a role locator by text and by an element inside", async ({ page }) => {
	await page.goto("http://localhost:4176/products");
	const { add, getNestedLocator } = createRegistryWithAccessors<CardPaths>(page);
	add("main").getByRole("main");
	add("main.list@products").getByRole("list", { name: "Products" });
	add("main.list@products.cards").getByRole("listitem");
	add("main.list@products.cards@lampText").getByRole("listitem").filter({ hasText: "Lamp" });
	add("main.list@products.card@lampNotDesk").getByRole("listitem").filter({ hasText: "Lamp", hasNotText: "Desk" });
	add("main.list@products.card@lampHeading")
		.getByRole("listitem")
		.filter({ has: page.getByRole("heading", { name: "Lamp", exact: true }) });
	add("main.list@products.cards@not399")
		.getByRole("listitem")
		.filter({ hasNot: page.getByText("399 kr") });

	await expect(getNestedLocator("main.list@products.cards")).toHaveCount(3);
	await expect(getNestedLocator("main.list@products.cards@lampText")).toHaveCount(2);
	await expect(getNestedLocator("main.list@products.card@lampNotDesk")).toHaveCount(1);
	await expect(getNestedLocator("main.list@products.card@lampNotDesk")).toContainText("249 kr");
	await expect(getNestedLocator("main.list@products.card@lampHeading")).toHaveCount(1);
	await expect(getNestedLocator("main.list@products.card@lampHeading")).toContainText("249 kr");
	await expect(getNestedLocator("main.list@products.cards@not399")).toHaveCount(2);
	await expect(page.getByText("Lamp", { exact: true })).toHaveJSProperty("tagName", "H2");
});
