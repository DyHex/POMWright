import { expect, type Locator, type Page, test } from "@playwright/test";
import { createRegistryWithAccessors, PageObject } from "pomwright";

// Every locator chain the documentation shows, in a `text` block, a code comment or the running text, rebuilt here
// through the packed package and compared, one test per page (its path under website/src/content/docs, or README.md). A page's examples
// are copied as written; a chain is the locator as Playwright prints it without a description, which a resolved
// locator otherwise prints instead (`describe("")`). A selector the page shows on its own is compared through
// `page.locator(selector)`, which Playwright prints as it prints the registry's. A changed chain fails here until the
// page and this spec change together.

const chain = (locator: Locator) => `${locator.describe("")}`;
const selector = (page: Page, shown: string) => `${page.locator(shown)}`;

/** The error message an action throws on the blank page, whose call log shows the chain Playwright waited for. */
const errorMessage = async (action: Promise<unknown>) =>
	(
		await action.then(
			() => new Error("no error"),
			(caught: Error) => caught,
		)
	).message;

/** The first lines of the error an action throws, for Playwright's strict mode message. */
const errorLines = async (action: Promise<unknown>, count: number) => {
	const error = await action.then(
		() => new Error("no error"),
		(caught: Error) => caught,
	);
	return error.message.split("\n").slice(0, count);
};

// the registry of orders.locators.ts on Queries and on the LocatorQueryBuilder page
type OrdersPaths = "main" | "main.list" | "main.list.item" | "main.button@save";
const ordersRegistry = (page: Page) => {
	const { registry } = createRegistryWithAccessors<OrdersPaths>(page);
	registry.add("main").locator("main");
	registry.add("main.list").locator("ul").filter({ hasText: "Orders" });
	registry.add("main.list.item").locator("li").nth(0);
	registry.add("main.button@save").getByRole("button", { name: "Save", exact: true });
	return registry;
};

// the registry of login.locators.ts on Resolving locators, and of shop.locators.ts on the LocatorRegistry page
type LoginPaths = "main" | "main.form@login" | "main.form@login.button@login" | "main.list" | "main.list.items";
const loginRegistry = (page: Page) => {
	const { registry } = createRegistryWithAccessors<LoginPaths>(page);
	registry.add("main").locator("main");
	registry.add("main.form@login").getByRole("form", { name: "Log in" });
	registry.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
	registry.add("main.list").locator("ul");
	registry.add("main.list.items").getByRole("listitem");
	return registry;
};

test("api/class-locatorquerybuilder.md", async ({ page }) => {
	const registry = ordersRegistry(page);
	const query = () => registry.getLocatorSchema("main.list.item");
	expect
		.soft(chain(query().clearSteps().filter({ hasText: "Open" }).nth("last").getNestedLocator()))
		.toBe(
			"locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').filter({ hasText: 'Open' }).last()",
		);
	expect
		.soft(chain(query().clearSteps().getNestedLocator()))
		.toBe("locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li')");
	expect
		.soft(chain(query().clearSteps("main.list").getNestedLocator()))
		.toBe("locator('main').locator('ul').locator('li').first()");
	expect.soft(chain(query().nth("last").getLocator())).toBe("locator('li').first().last()");
	expect
		.soft(chain(query().getNestedLocator()))
		.toBe("locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()");
	expect
		.soft(chain(query().clearSteps().nth(2).getNestedLocator()))
		.toBe("locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').nth(2)");
	expect
		.soft(chain(query().replace("main.list").getByRole("list", { name: "Orders" }).getNestedLocator()))
		.toBe("locator('main').getByRole('list', { name: 'Orders' }).filter({ hasText: 'Orders' }).locator('li').first()");
	expect.soft(chain(query().skip("main.list").getNestedLocator())).toBe("locator('main').locator('li').first()");
	expect
		.soft(chain(query().skip("main.list").unskip("main.list").getNestedLocator()))
		.toBe("locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()");
	const save = () => registry.getLocatorSchema("main.button@save");
	expect
		.soft(chain(save().update().getByRole({ name: "Cancel" }).getNestedLocator()))
		.toBe("locator('main').getByRole('button', { name: 'Cancel', exact: true })");
	expect
		.soft(chain(save().update().getByRole("button", null).getNestedLocator()))
		.toBe("locator('main').getByRole('button')");
});

test("api/class-locatorregistry.md", async ({ page }) => {
	const registry = loginRegistry(page);
	expect.soft(chain(registry.getLocator("main.list.items"))).toBe("getByRole('listitem')");
	expect
		.soft(chain(registry.getLocatorSchema("main.list.items").nth("last").getNestedLocator()))
		.toBe("locator('main').locator('ul').getByRole('listitem').last()");
	expect
		.soft(chain(registry.getNestedLocator("main.form@login.button@login")))
		.toBe("locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })");
});

test("api/class-locatorupdatebuilder.md", async ({ page }) => {
	type Paths =
		| "main"
		| "main.button@pay"
		| "main.text@total"
		| "main.input@email"
		| "main.input@search"
		| "main.image@card"
		| "main.icon@help"
		| "main.list@items"
		| "main.frame@payment"
		| "main.frame@payment.button@confirm"
		| "main.rows@cart"
		| "main.panel@summary";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("main").locator("main");
	registry.add("main.button@pay").getByRole("button", { name: "Pay", exact: true });
	registry.add("main.text@total").getByText("Total", { exact: true });
	registry.add("main.input@email").getByLabel("Email");
	registry.add("main.input@search").getByPlaceholder("Search");
	registry.add("main.image@card").getByAltText("Card logo");
	registry.add("main.icon@help").getByTitle("Help");
	registry.add("main.list@items").locator("ul", { hasText: "Items" });
	registry.add("main.frame@payment").frameLocator("iframe#payment");
	registry.add("main.frame@payment.button@confirm").getByRole("button", { name: "Confirm" });
	registry.add("main.rows@cart").getByTestId("cart-row");
	registry.add("main.panel@summary").getById("summary");
	// for update() and replace() of the path itself; a sub-path needs the query's path as a literal, as the page has it
	const query = (path: Paths) => registry.getLocatorSchema(path);

	expect
		.soft(
			chain(
				registry
					.getLocatorSchema("main.frame@payment.button@confirm")
					.update("main.frame@payment")
					.frameLocator("iframe#card")
					.getNestedLocator(),
			),
		)
		.toBe("locator('main').locator('iframe#card').contentFrame().getByRole('button', { name: 'Confirm' })");
	expect
		.soft(
			chain(
				registry
					.getLocatorSchema("main.frame@payment.button@confirm")
					.skip("main")
					.replace("main.frame@payment")
					.frameLocator()
					.getNestedLocator(),
			),
		)
		.toBe("frameLocator().getByRole('button', { name: 'Confirm' })");
	expect
		.soft(chain(query("main.image@card").update().getByAltText(/logo/i).getNestedLocator()))
		.toBe("locator('main').getByAltText(/logo/i)");
	expect
		.soft(chain(query("main.image@card").replace().getByAltText("Visa").getNestedLocator()))
		.toBe("locator('main').getByAltText('Visa')");
	expect
		.soft(
			chain(
				query("main.panel@summary")
					.update()
					.getById(/^summary/)
					.getNestedLocator(),
			),
		)
		.toBe(`${page.locator("main").locator("internal:attr=[id=/^summary/]")}`);
	expect
		.soft(chain(query("main.panel@summary").replace().getById("order-summary").getNestedLocator()))
		.toBe(`${page.locator("main").locator('[id="order-summary"]')}`);
	expect
		.soft(chain(query("main.input@email").update().getByLabel("E-mail").getNestedLocator()))
		.toBe("locator('main').getByLabel('E-mail')");
	expect
		.soft(chain(query("main.input@email").replace().getByLabel("Email address").getNestedLocator()))
		.toBe("locator('main').getByLabel('Email address')");
	expect
		.soft(chain(query("main.input@search").update().getByPlaceholder({ exact: true }).getNestedLocator()))
		.toBe("locator('main').getByPlaceholder('Search', { exact: true })");
	expect
		.soft(chain(query("main.input@search").replace().getByPlaceholder("Search products").getNestedLocator()))
		.toBe("locator('main').getByPlaceholder('Search products')");
	expect
		.soft(chain(query("main.button@pay").update().getByRole({ name: "Pay now" }).getNestedLocator()))
		.toBe("locator('main').getByRole('button', { name: 'Pay now', exact: true })");
	expect
		.soft(chain(query("main.button@pay").update().getByRole({ exact: null }).getNestedLocator()))
		.toBe("locator('main').getByRole('button', { name: 'Pay' })");
	expect
		.soft(chain(query("main.button@pay").update().getByRole("link", null).getNestedLocator()))
		.toBe("locator('main').getByRole('link')");
	expect
		.soft(chain(query("main.button@pay").replace().getByRole("link", { name: "Pay" }).getNestedLocator()))
		.toBe("locator('main').getByRole('link', { name: 'Pay' })");
	expect
		.soft(chain(query("main.rows@cart").update().getByTestId("cart-item").getNestedLocator()))
		.toBe("locator('main').getByTestId('cart-item')");
	expect
		.soft(chain(query("main.rows@cart").replace().getByTestId(/cart-/).getNestedLocator()))
		.toBe("locator('main').getByTestId(/cart-/)");
	expect
		.soft(chain(query("main.text@total").update().getByText({ exact: null }).getNestedLocator()))
		.toBe("locator('main').getByText('Total')");
	expect
		.soft(chain(query("main.button@pay").replace().getByText("Pay", { exact: true }).getNestedLocator()))
		.toBe("locator('main').getByText('Pay', { exact: true })");
	expect
		.soft(chain(query("main.icon@help").update().getByTitle({ exact: true }).getNestedLocator()))
		.toBe("locator('main').getByTitle('Help', { exact: true })");
	expect
		.soft(chain(query("main.icon@help").replace().getByTitle("More help").getNestedLocator()))
		.toBe("locator('main').getByTitle('More help')");
	expect
		.soft(chain(query("main.list@items").update().locator({ hasText: "Cart" }).getNestedLocator()))
		.toBe("locator('main').locator('ul').filter({ hasText: 'Cart' })");
	expect
		.soft(chain(query("main.list@items").update().locator("ol", null).getNestedLocator()))
		.toBe("locator('main').locator('ol')");
	expect
		.soft(chain(query("main.list@items").replace().locator("ol.cart").getNestedLocator()))
		.toBe("locator('main').locator('ol.cart')");
});

test("api/class-registrationbuilder.md", async ({ page }) => {
	type Paths =
		| "main"
		| "main.list"
		| "main.list.item"
		| "main.list.items@open"
		| "main.list.item@last"
		| "main.list.item@lastOpen"
		| "shell"
		| "shell.frame@payment"
		| "shell.frame@payment.button@pay"
		| "anyFrame"
		| "anyFrame.button@accept"
		| "header.image@logo"
		| "main.panel@settings"
		| "main.button@submit"
		| "main.form.input@email"
		| "main.input@search"
		| "main.button@save"
		| "main.row@order"
		| "main.alert@error"
		| "main.icon@info"
		| "main.button@cancel"
		| "main.link@plain";
	const fresh = () => createRegistryWithAccessors<Paths>(page).registry;

	// the page's first example
	let registry = fresh();
	registry.add("main").locator("main");
	registry.add("main.list").locator("ul.orders");
	registry.add("main.list.item").getByRole("listitem").filter({ hasText: "Open" }).nth(0);
	expect
		.soft(chain(registry.getNestedLocator("main.list.item")))
		.toBe("locator('main').locator('ul.orders').getByRole('listitem').filter({ hasText: 'Open' }).first()");

	// frameLocator()
	registry = fresh();
	registry.add("shell").locator("div.shell");
	registry.add("shell.frame@payment").frameLocator("iframe#payment");
	registry.add("shell.frame@payment.button@pay").getByRole("button", { name: "Pay" });
	registry.add("anyFrame").frameLocator();
	registry.add("anyFrame.button@accept").getByRole("button", { name: "Accept" });
	expect
		.soft(chain(registry.getNestedLocator("shell.frame@payment.button@pay")))
		.toBe("locator('div.shell').locator('iframe#payment').contentFrame().getByRole('button', { name: 'Pay' })");
	expect
		.soft(chain(registry.getNestedLocator("anyFrame.button@accept")))
		.toBe("frameLocator().getByRole('button', { name: 'Accept' })");

	// one locator method each
	registry = fresh();
	registry.add("header.image@logo").getByAltText("Shop logo");
	registry.add("main.panel@settings").getById("settings.panel");
	registry.add("main.button@submit").getById(/^button\.submit\.[a-z0-9]{4}$/i);
	registry.add("main.form.input@email").getByLabel("Email", { exact: true });
	registry.add("main.input@search").getByPlaceholder("Search");
	registry.add("main.button@save").getByRole("button", { name: "Save" });
	registry.add("main.row@order").getByTestId("order-row");
	registry.add("main.alert@error").getByText(/failed/i);
	registry.add("main.icon@info").getByTitle("More information");
	registry.add("main.list").locator("ul.orders");
	registry.add("main.list.item@last").getByRole("listitem").nth("last");
	expect.soft(chain(registry.getLocator("header.image@logo"))).toBe("getByAltText('Shop logo')");
	expect.soft(chain(registry.getLocator("main.panel@settings"))).toBe(selector(page, '[id="settings.panel"]'));
	expect
		.soft(chain(registry.getLocator("main.button@submit")))
		.toBe(selector(page, "internal:attr=[id=/^button\\.submit\\.[a-z0-9]{4}$/i]"));
	expect.soft(chain(registry.getLocator("main.form.input@email"))).toBe("getByLabel('Email', { exact: true })");
	expect.soft(chain(registry.getLocator("main.input@search"))).toBe("getByPlaceholder('Search')");
	expect.soft(chain(registry.getLocator("main.button@save"))).toBe("getByRole('button', { name: 'Save' })");
	expect.soft(chain(registry.getLocator("main.row@order"))).toBe("getByTestId('order-row')");
	expect.soft(chain(registry.getLocator("main.alert@error"))).toBe("getByText(/failed/i)");
	expect.soft(chain(registry.getLocator("main.icon@info"))).toBe("getByTitle('More information')");
	expect.soft(chain(registry.getLocator("main.list"))).toBe("locator('ul.orders')");
	expect.soft(chain(registry.getLocator("main.list.item@last"))).toBe("getByRole('listitem').last()");

	// reuse by path
	registry = fresh();
	registry.add("main").locator("main");
	registry.add("main.list").locator("ul");
	registry.add("main.list.items@open").getByRole("listitem").filter({ hasText: "Open" });
	registry.add("main.list.item@lastOpen", { reuse: "main.list.items@open" }).nth("last").describe("Last open item");
	expect
		.soft(chain(registry.getNestedLocator("main.list.item@lastOpen")))
		.toBe("locator('main').locator('ul').getByRole('listitem').filter({ hasText: 'Open' }).last()");

	// a seed's override
	registry = fresh();
	const saveButton = registry.createReusable.getByRole("button", { name: "Save", exact: true });
	registry.add("main.button@cancel", { reuse: saveButton }).getByRole({ name: "Cancel" });
	registry.add("main.link@plain", { reuse: saveButton }).getByRole("link", null);
	expect
		.soft(chain(registry.getLocator("main.button@cancel")))
		.toBe("getByRole('button', { name: 'Cancel', exact: true })");
	expect.soft(chain(registry.getLocator("main.link@plain"))).toBe("getByRole('link')");
});

test("api/class-reusablelocator.md", async ({ page }) => {
	type Paths = "table" | "table.row@first" | "table.rows@open" | "table.row@lastOpen" | "main" | "main.heading@orders";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("table").locator("table");
	const row = registry.createReusable.locator("tr");
	const openRow = row.filter({ hasText: "Open" });
	registry.add("table.row@first", { reuse: row.nth(0) });
	registry.add("table.rows@open", { reuse: openRow });
	registry.add("table.row@lastOpen", { reuse: openRow.nth("last").describe("Last open row") });
	expect.soft(chain(registry.getNestedLocator("table.row@first"))).toBe("locator('table').locator('tr').first()");
	expect
		.soft(chain(registry.getNestedLocator("table.rows@open")))
		.toBe("locator('table').locator('tr').filter({ hasText: 'Open' })");
	expect
		.soft(chain(registry.getNestedLocator("table.row@lastOpen")))
		.toBe("locator('table').locator('tr').filter({ hasText: 'Open' }).last()");

	const heading = registry.createReusable.getByRole("heading", { level: 2 });
	registry.add("main.heading@orders", { reuse: heading.filter({ hasText: "Orders" }) });
	expect
		.soft(chain(registry.getLocator("main.heading@orders")))
		.toBe("getByRole('heading', { level: 2 }).filter({ hasText: 'Orders' })");
});

test("docs/descriptions.md", async ({ page }) => {
	const { registry } = createRegistryWithAccessors<"main" | "main.button@login" | "main.button@submit">(page);
	registry.add("main").locator("main");
	registry.add("main.button@login").getByRole("button", { name: "Log in" });
	registry.add("main.button@submit").getByRole("button", { name: "Submit" }).describe("Primary submit button");
	// the page shows toString() itself, after describe("") on the query
	expect
		.soft(registry.getLocatorSchema("main.button@submit").describe("").getLocator().toString())
		.toBe("getByRole('button', { name: 'Submit' })");

	// "Where Playwright shows it": the call log and a strict mode error show the chain, described or not
	const login = registry.getNestedLocator("main.button@login");
	expect
		.soft(await errorMessage(login.click({ timeout: 500 })))
		.toContain("waiting for locator('main').getByRole('button', { name: 'Log in' })");
	await page.setContent("<main><button>Log in</button><button>Log in</button></main>");
	expect
		.soft(await errorMessage(login.click({ timeout: 2_000 })))
		.toContain("strict mode violation: locator('main').getByRole('button', { name: 'Log in' }) resolved to 2 elements");

	// "Chaining further": a locator chained further has no description, so it prints its chain
	expect.soft(`${registry.getNestedLocator("main").locator("li")}`).toBe("locator('main').locator('li')");
});

test("docs/first-page-object.md", async ({ page }) => {
	type Paths =
		| "main"
		| "main.aside"
		| "main.aside.button@login"
		| "main.form@login"
		| "main.form@login.input@email"
		| "main.form@login.input@password"
		| "main.form@login.button@login";
	class LoginPage extends PageObject<Paths> {
		constructor(page: Page) {
			super(page, "https://shop.example", "/login");
		}
		protected defineLocators(): void {
			this.add("main").locator("main");
			this.add("main.aside").locator("aside");
			this.add("main.aside.button@login").getByRole("button", { name: "Log in" });
			this.add("main.form@login").getByRole("form", { name: "Log in" });
			this.add("main.form@login.input@email").getByLabel("Email");
			this.add("main.form@login.input@password").getByLabel("Password");
			this.add("main.form@login.button@login", { reuse: "main.aside.button@login" });
		}
	}
	const loginPage = new LoginPage(page);
	expect
		.soft(chain(loginPage.getNestedLocator("main.aside.button@login")))
		.toBe("locator('main').locator('aside').getByRole('button', { name: 'Log in' })");
	expect.soft(chain(loginPage.getLocator("main.aside.button@login"))).toBe("getByRole('button', { name: 'Log in' })");
	// the trace viewer's Log tab starts with the call log's first line
	expect
		.soft(await errorMessage(loginPage.getNestedLocator("main.form@login.button@login").click({ timeout: 500 })))
		.toContain("waiting for locator('main').getByRole('form', { name: 'Log in' })");
});

test("docs/filters-and-indices.md", async ({ page }) => {
	type Paths =
		| "section@orders"
		| "section@orders.item@open"
		| "main"
		| "main.section@orders"
		| "main.section@orders.heading"
		| "main.section@orders.item@open"
		| "list.item";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("section@orders").locator("section").filter({ hasText: "Orders" });
	registry.add("section@orders.item@open").getByRole("listitem").filter({ hasText: "Open" });
	expect
		.soft(chain(registry.getNestedLocator("section@orders.item@open")))
		.toBe("locator('section').filter({ hasText: 'Orders' }).getByRole('listitem').filter({ hasText: 'Open' })");

	registry.add("main").locator("main");
	registry.add("main.section@orders").locator("section").filter({ has: "main.section@orders.heading" });
	registry.add("main.section@orders.heading").getByRole("heading", { name: "Orders" });
	registry.add("main.section@orders.item@open").getByRole("listitem").filter({ hasText: "Open" });
	// the page breaks this chain over two comment lines
	expect
		.soft(chain(registry.getNestedLocator("main.section@orders.item@open")))
		.toBe(
			"locator('main').locator('section').filter({ has: getByRole('heading', { name: 'Orders' }) })" +
				".getByRole('listitem').filter({ hasText: 'Open' })",
		);

	registry.add("list.item").locator("li").filter({ hasText: "Open" }).nth(0).filter({ hasNotText: "#9" });
	expect
		.soft(chain(registry.getLocator("list.item")))
		.toBe("locator('li').filter({ hasText: 'Open' }).first().filter({ hasNotText: '#9' })");
});

test("docs/frames.md", async ({ page }) => {
	type Paths =
		| "checkout"
		| "checkout.section@payment"
		| "checkout.section@payment.frame"
		| "checkout.section@payment.frame.input@cardNumber"
		| "checkout.section@payment.frame.button@pay"
		| "widgets"
		| "widgets.frame@second"
		| "widgets.frame@second.button@go"
		| "widgets.frame@visible"
		| "widgets.frame"
		| "widgets.frame.button@go"
		| "anyFrame"
		| "anyFrame.button@accept";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("checkout").locator("main");
	registry.add("checkout.section@payment").getByRole("region", { name: "Payment" });
	registry.add("checkout.section@payment.frame").frameLocator("iframe");
	registry.add("checkout.section@payment.frame.input@cardNumber").getByLabel("Card number");
	registry.add("checkout.section@payment.frame.button@pay").getByRole("button", { name: "Pay" });
	expect
		.soft(chain(registry.getNestedLocator("checkout.section@payment.frame.input@cardNumber")))
		.toBe(
			"locator('main').getByRole('region', { name: 'Payment' }).locator('iframe').contentFrame().getByLabel('Card number')",
		);
	// a frame segment as the terminal is the <iframe> element
	expect
		.soft(chain(registry.getNestedLocator("checkout.section@payment.frame")))
		.toBe("locator('main').getByRole('region', { name: 'Payment' }).locator('iframe')");

	registry.add("widgets").locator(".widgets");
	registry.add("widgets.frame@second").frameLocator("iframe").nth(1);
	registry.add("widgets.frame@second.button@go").getByRole("button", { name: "Go" });
	registry.add("widgets.frame@visible").frameLocator("iframe").filter({ visible: true }).nth("last");
	expect
		.soft(chain(registry.getNestedLocator("widgets.frame@second.button@go")))
		.toBe("locator('.widgets').locator('iframe').nth(1).contentFrame().getByRole('button', { name: 'Go' })");

	// the strict mode error of a frame segment without a step, when several iframes match
	registry.add("widgets.frame").frameLocator("iframe");
	registry.add("widgets.frame.button@go").getByRole("button", { name: "Go" });
	await page.setContent(
		'<div class="widgets"><iframe srcdoc="<button>Go</button>"></iframe><iframe srcdoc="<button>Go</button>"></iframe><iframe srcdoc="<button>Go</button>"></iframe></div>',
	);
	expect
		.soft(await errorLines(registry.getNestedLocator("widgets.frame.button@go").click({ timeout: 2_000 }), 1))
		.toEqual([
			"locator.click: Error: strict mode violation: locator('.widgets').locator('iframe') resolved to 3 elements:",
		]);

	registry.add("anyFrame").frameLocator();
	registry.add("anyFrame.button@accept").getByRole("button", { name: "Accept" });
	expect
		.soft(chain(registry.getNestedLocator("anyFrame.button@accept")))
		.toBe("frameLocator().getByRole('button', { name: 'Accept' })");
});

test("docs/locating-by-id.md", async ({ page }) => {
	const { registry } = createRegistryWithAccessors<"panel" | "greeting">(page);
	registry.add("panel").getById("settings.panel");
	registry.add("greeting").getById('say "hi"');
	expect.soft(chain(registry.getLocator("panel"))).toBe(selector(page, '[id="settings.panel"]'));
	expect.soft(chain(registry.getLocator("greeting"))).toBe(selector(page, '[id="say \\"hi\\""]'));
});

test("docs/locator-modules.md", async ({ page }) => {
	type Paths = "main" | "main.list@products" | "main.list@products.items@onSale";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("main").locator("main");
	registry.add("main.list@products").getByRole("list", { name: "Products" });
	registry
		.add("main.list@products.items@onSale")
		.getByRole("listitem")
		.filter({ has: page.getByText("Sale", { exact: true }) });
	expect
		.soft(chain(registry.getNestedLocator("main.list@products.items@onSale")))
		.toBe(
			"locator('main').getByRole('list', { name: 'Products' }).getByRole('listitem').filter({ has: getByText('Sale', { exact: true }) })",
		);
});

test("docs/locator-paths.md", async ({ page }) => {
	type Paths =
		| "main"
		| "main.section@order"
		| "main.section@order.region@subscriptions"
		| "main.section@order.region@subscriptions.region@subscription"
		| "main.section@order.region@subscriptions.region@subscription.button@edit";
	const { add, getNestedLocator } = createRegistryWithAccessors<Paths>(page);
	// "A wrapper is removed": the Subscriptions region's add(…) deleted, and nothing else
	add("main").locator("main");
	add("main.section@order").getByRole("region", { name: "Order" });
	add("main.section@order.region@subscriptions.region@subscription").getByRole("region", {
		name: "Mobile subscription",
	});
	add("main.section@order.region@subscriptions.region@subscription.button@edit").getByRole("button", { name: "Edit" });
	expect
		.soft(chain(getNestedLocator("main.section@order.region@subscriptions.region@subscription.button@edit")))
		.toBe(
			"locator('main').getByRole('region', { name: 'Order' }).getByRole('region', { name: 'Mobile subscription' }).getByRole('button', { name: 'Edit' })",
		);
});

test("docs/queries.md", async ({ page }) => {
	const registry = ordersRegistry(page);
	const query = () => registry.getLocatorSchema("main.list.item");
	expect
		.soft(chain(query().clearSteps().nth("last").getNestedLocator()))
		.toBe("locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').last()");
	expect
		.soft(chain(query().filter("main.list", { hasText: "Open" }).getNestedLocator()))
		.toBe(
			"locator('main').locator('ul').filter({ hasText: 'Orders' }).filter({ hasText: 'Open' }).locator('li').first()",
		);
	expect
		.soft(chain(query().nth("last").getNestedLocator()))
		.toBe("locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first().last()");
	expect
		.soft(chain(query().replace("main.list").getByRole("list", { name: "Orders" }).getNestedLocator()))
		.toBe("locator('main').getByRole('list', { name: 'Orders' }).filter({ hasText: 'Orders' }).locator('li').first()");
	const skipped = query().skip("main.list");
	expect.soft(chain(skipped.getNestedLocator())).toBe("locator('main').locator('li').first()");
	expect
		.soft(chain(skipped.unskip("main.list").getNestedLocator()))
		.toBe("locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()");

	// a query kept and updated
	const { registry: lamp } = createRegistryWithAccessors<
		"main" | "main.product@lamp" | "main.product@lamp.button@wishlist"
	>(page);
	lamp.add("main").locator("main");
	lamp.add("main.product@lamp").getByRole("article", { name: "Desk lamp" });
	lamp.add("main.product@lamp.button@wishlist").getByRole("button", { name: "Add to wishlist" });
	const wishlistButton = lamp.getLocatorSchema("main.product@lamp.button@wishlist");
	wishlistButton.update().getByRole({ name: "Remove from wishlist" });
	expect
		.soft(chain(wishlistButton.getNestedLocator()))
		.toBe(
			"locator('main').getByRole('article', { name: 'Desk lamp' }).getByRole('button', { name: 'Remove from wishlist' })",
		);
});

test("docs/registering-locators.md", async ({ page }) => {
	type Paths = "cart" | "cart.text@total" | "main.list.item@last" | "form.button@save" | "list" | "list.item";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("cart").locator("section.cart", { hasText: "Total" });
	registry.add("cart.text@total").getByText("Total", { exact: true });
	expect.soft(chain(registry.getLocator("cart"))).toBe("locator('section.cart').filter({ hasText: 'Total' })");
	expect.soft(chain(registry.getLocator("cart.text@total"))).toBe("getByText('Total', { exact: true })");

	registry
		.add("main.list.item@last")
		.getByRole("listitem", { name: /Row/ })
		.filter({ hasText: "Row" })
		.nth("last")
		.describe("Last matching row");
	const last = registry.getLocator("main.list.item@last");
	expect.soft(chain(last)).toBe("getByRole('listitem', { name: /Row/ }).filter({ hasText: 'Row' }).last()");
	expect.soft(last.description()).toBe("Last matching row");

	const options = { name: "Save" };
	registry.add("form.button@save").getByRole("button", options);
	options.name = "Cancel";
	expect.soft(chain(registry.getLocator("form.button@save"))).toBe("getByRole('button', { name: 'Save' })");

	const item = registry.add("list.item").getByRole("listitem");
	item.nth(0);
	registry.add("list").locator("ul");
	expect(() => item.filter({ hasText: "Open" })).toThrow();
	expect.soft(chain(registry.getLocator("list.item"))).toBe("getByRole('listitem').first()");
});

test("docs/resolving-locators.md", async ({ page, browserName }) => {
	const registry = loginRegistry(page);
	expect
		.soft(chain(registry.getNestedLocator("main.form@login.button@login")))
		.toBe("locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })");
	const submit = registry.getLocator("main.form@login.button@login");
	expect
		.soft(`${page.getByRole("dialog", { name: "Session expired" }).locator(submit)}`)
		.toBe("getByRole('dialog', { name: 'Session expired' }).locator(getByRole('button', { name: 'Log in' }))");

	// getLocator alone matches the three buttons, and Playwright's strict mode error names each; on Firefox it names
	// two and then "...", as Playwright does there (the page shows Chromium's and WebKit's)
	await page.setContent(
		'<main><form aria-label="Log in"><button>Log in</button></form></main><aside><button>Log in</button></aside><div role="dialog" aria-label="Session expired"><button>Log in</button></div>',
	);
	expect
		.soft(await errorLines(submit.click({ timeout: 2_000 }), 4))
		.toEqual([
			"locator.click: Error: strict mode violation: getByRole('button', { name: 'Log in' }) resolved to 3 elements:",
			"    1) <button>Log in</button> aka getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })",
			"    2) <button>Log in</button> aka getByRole('complementary').getByRole('button', { name: 'Log in' })",
			browserName === "firefox"
				? "    ..."
				: "    3) <button>Log in</button> aka getByRole('dialog', { name: 'Session expired' }).getByRole('button', { name: 'Log in' })",
		]);

	type OrdersPaths = "main" | "main.list@orders" | "main.list@orders.items" | "main.list@orders.item@first";
	const { registry: orders } = createRegistryWithAccessors<OrdersPaths>(page);
	orders.add("main").locator("main");
	orders.add("main.list@orders").getByRole("list", { name: "Orders" });
	orders.add("main.list@orders.items").getByRole("listitem");
	orders.add("main.list@orders.item@first", { reuse: "main.list@orders.items" }).nth("first");
	expect
		.soft(chain(orders.getNestedLocator("main.list@orders.items")))
		.toBe("locator('main').getByRole('list', { name: 'Orders' }).getByRole('listitem')");
	expect
		.soft(chain(orders.getNestedLocator("main.list@orders.item@first")))
		.toBe("locator('main').getByRole('list', { name: 'Orders' }).getByRole('listitem').first()");

	const { registry: cart } = createRegistryWithAccessors<
		"main" | "main.table@cart" | "main.table@cart.inputs@quantity"
	>(page);
	cart.add("main").locator("main");
	cart.add("main.table@cart").getByRole("table", { name: "Cart" });
	cart.add("main.table@cart.inputs@quantity").getByLabel("Quantity");
	expect
		.soft(chain(cart.getNestedLocator("main.table@cart.inputs@quantity")))
		.toBe("locator('main').getByRole('table', { name: 'Cart' }).getByLabel('Quantity')");

	const { registry: names } = createRegistryWithAccessors<"main.form" | "main.form.button.submit">(page);
	names.add("main.form").getByRole("form", { name: "Log in" });
	names.add("main.form.button.submit").getByRole("button", { name: "Log in" });
	expect
		.soft(chain(names.getNestedLocator("main.form.button.submit")))
		.toBe("getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })");
});

test("docs/reusing-locators.md", async ({ page }) => {
	type Paths =
		| "shared.list.items"
		| "shared.error@invalidPassword"
		| "main.list"
		| "main.list.item@last"
		| "main.form.error@invalidPassword"
		| "table.rows"
		| "table.row@first"
		| "table.row@last"
		| "card.heading@summary"
		| "card.links"
		| "card.headings";
	const fresh = () => createRegistryWithAccessors<Paths>(page).registry;

	let registry = fresh();
	registry.add("shared.list.items").getByRole("listitem");
	registry.add("shared.error@invalidPassword").getByText("Invalid password");
	registry.add("main.list").locator("ul");
	registry.add("main.list.item@last", { reuse: "shared.list.items" }).nth("last").describe("Last item");
	registry.add("main.form.error@invalidPassword", { reuse: "shared.error@invalidPassword" });
	const last = registry.getNestedLocator("main.list.item@last");
	expect.soft(chain(last)).toBe("locator('ul').getByRole('listitem').last()");
	expect.soft(last.description()).toBe("Last item");
	const error = registry.getNestedLocator("main.form.error@invalidPassword");
	expect.soft(chain(error)).toBe("getByText('Invalid password')");
	expect.soft(error.description()).toBe("main.form.error@invalidPassword");

	registry = fresh();
	const row = registry.createReusable.locator("tr");
	registry.add("table.rows", { reuse: row });
	registry.add("table.row@first", { reuse: row.nth(0) });
	registry.add("table.row@last", { reuse: row.nth("last") });
	expect.soft(chain(registry.getNestedLocator("table.rows"))).toBe("locator('tr')");
	expect.soft(chain(registry.getNestedLocator("table.row@first"))).toBe("locator('tr').first()");
	expect.soft(chain(registry.getNestedLocator("table.row@last"))).toBe("locator('tr').last()");

	registry = fresh();
	let heading = registry.createReusable.getByRole("heading", { level: 2 });
	registry.add("card.heading@summary", { reuse: heading }).getByRole({ name: "Summary" });
	registry.add("card.links", { reuse: heading }).getByRole("link", null);
	registry.add("card.headings", { reuse: heading }).getByRole({ level: null });
	expect
		.soft(chain(registry.getNestedLocator("card.heading@summary")))
		.toBe("getByRole('heading', { name: 'Summary', level: 2 })");
	expect.soft(chain(registry.getNestedLocator("card.links"))).toBe("getByRole('link')");
	expect.soft(chain(registry.getNestedLocator("card.headings"))).toBe("getByRole('heading')");

	registry = fresh();
	heading = registry.createReusable.getByRole("heading", { level: 2 });
	const summaryHeading = registry.add("card.heading@summary", { reuse: heading });
	summaryHeading.filter({ hasText: "Summary" }).nth(0);
	summaryHeading.getByRole({ name: "Summary" });
	expect
		.soft(chain(registry.getNestedLocator("card.heading@summary")))
		.toBe("getByRole('heading', { name: 'Summary', level: 2 }).filter({ hasText: 'Summary' }).first()");
});

test("docs/upgrading-from-2x.md", async ({ page }) => {
	type Paths =
		| "shell.frame@payment"
		| "shell.frame@payment.button@pay"
		| "main"
		| "main.list"
		| "main.list.item"
		| "table"
		| "table.row@first"
		| "table.row@last";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("shell.frame@payment").frameLocator("iframe").nth(1);
	registry.add("shell.frame@payment.button@pay").getByRole("button", { name: "Pay" });
	expect
		.soft(chain(registry.getNestedLocator("shell.frame@payment.button@pay")))
		.toBe("locator('iframe').nth(1).contentFrame().getByRole('button', { name: 'Pay' })");

	// the page declares these paths without their locators; its chain shows them
	registry.add("main").locator("main");
	registry.add("main.list").locator("ul");
	registry.add("main.list.item").getByRole("listitem");
	expect
		.soft(chain(registry.getLocatorSchema("main.list.item").skip("main.list").getNestedLocator()))
		.toBe("locator('main').getByRole('listitem')");

	registry.add("table").locator("table");
	const row = registry.createReusable.locator("tr");
	registry.add("table.row@first", { reuse: row.nth(0) });
	registry.add("table.row@last", { reuse: row.nth("last") });
	expect.soft(chain(registry.getNestedLocator("table.row@last"))).toBe("locator('table').locator('tr').last()");
});

test("internal/resolution.md", async ({ page }) => {
	type Paths = "main" | "main.section@orders" | "main.section@orders.heading";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("main").locator("main");
	registry.add("main.section@orders").locator("section").filter({ has: "main.section@orders.heading" });
	registry.add("main.section@orders.heading").getByRole("heading", { name: "Orders" });
	expect
		.soft(chain(registry.getNestedLocator("main.section@orders")))
		.toBe("locator('main').locator('section').filter({ has: getByRole('heading', { name: 'Orders' }) })");
	// the heading path resolved alone, as the filter resolves it, and as its chain, which starts at main
	expect
		.soft(chain(registry.getLocator("main.section@orders.heading")))
		.toBe("getByRole('heading', { name: 'Orders' })");
	expect.soft(chain(registry.getNestedLocator("main.section@orders.heading"))).toMatch(/^locator\('main'\)\./);
});

test("README.md", async ({ page }) => {
	type Paths =
		| "main"
		| "main.table@orders"
		| "main.table@orders.row"
		| "main.table@orders.row.button@cancel"
		| "main.table@orders.row.cell@status";
	class OrdersPage extends PageObject<Paths> {
		constructor(page: Page) {
			super(page, "https://shop.example", "/orders");
		}
		protected defineLocators(): void {
			this.add("main").locator("main");
			this.add("main.table@orders").getByRole("table", { name: "Orders" });
			this.add("main.table@orders.row").getByRole("row");
			this.add("main.table@orders.row.button@cancel").getByRole("button", { name: "Cancel" });
			this.add("main.table@orders.row.cell@status").getByTestId("order-status");
		}
		cancelButton(order: string) {
			return this.getLocatorSchema("main.table@orders.row.button@cancel")
				.filter("main.table@orders.row", { hasText: order })
				.getNestedLocator();
		}
	}
	const cancel = new OrdersPage(page).cancelButton("ORD-1042");
	expect
		.soft(chain(cancel))
		.toBe(
			"locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })",
		);
	expect.soft(cancel.description()).toBe("main.table@orders.row.button@cancel");
});
