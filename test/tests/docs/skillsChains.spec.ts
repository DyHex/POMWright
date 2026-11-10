import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { createRegistryWithAccessors, type LogEntry, PageObject, PlaywrightReportLogger } from "pomwright";
import { chain, checkThatPagesShow, flatten, recordedOnPage, selector, shows } from "./chains";

// Every locator chain the agent skills in skills/ show, rebuilt through the packed package and compared, one test per
// skill file, named by its path from the repository root (`skills/pomwright/references/registering.md`), with the
// helpers and the page check of ./chains.ts, as docsChains.spec.ts does for the site. Two checks the site does not
// have: after each test, every rendering its file shows must be one the test compared; and the sweep below fails for a
// skill file that shows a rendering and has no test. A rendering is a locator call in single quotes, as Playwright
// prints one: the snippet check keeps a skill's code in double quotes, so a single-quoted call is always a rendering.

const root = path.join(__dirname, "../../..");
const skillsDir = path.join(root, "skills");

/** A locator call as Playwright renders it: global, for every one in a file, and once, for whether a file has one. */
const RENDERING = /\b(?:locator|getBy[A-Z]\w*|frameLocator)\('/g;
const HAS_RENDERING = new RegExp(RENDERING.source);

/** The skill files that have a test here. */
const tested = new Set<string>();

/** A test of one skill file: `file` is its path from the repository root. */
const skillTest = (file: string, body: (fixtures: { page: Page }) => Promise<void>) => {
	tested.add(file);
	test(file, async ({ page }) => body({ page }));
};

checkThatPagesShow((title) => (title.startsWith("skills/") ? path.join(root, title) : undefined));

// every rendering the file shows lies inside a value the test compared, the file read as the page check reads it
test.afterEach(() => {
	const title = test.info().title;
	if (!title.startsWith("skills/")) {
		return;
	}
	const flat = flatten(readFileSync(path.join(root, title), "utf8"));
	const covered: [number, number][] = [];
	for (const shown of recordedOnPage()) {
		for (let at = flat.indexOf(shown); at !== -1; at = flat.indexOf(shown, at + 1)) {
			covered.push([at, at + shown.length]);
		}
	}
	const uncompared = [...flat.matchAll(RENDERING)]
		.filter((match) => !covered.some(([from, to]) => match.index >= from && match.index < to))
		.map((match) => flat.slice(match.index, match.index + 60));
	expect.soft(uncompared, `${title}: renderings no comparison of this test covers`).toEqual([]);
});

skillTest("skills/pomwright/SKILL.md", async ({ page }) => {
	// orders.locators.ts and the cancel method of orders.page.ts
	type Paths =
		| "main"
		| "main.table@orders"
		| "main.table@orders.row"
		| "main.table@orders.row.button@cancel"
		| "main.table@orders.row.cell@status";
	const { registry } = createRegistryWithAccessors<Paths>(page);
	registry.add("main").locator("main");
	registry.add("main.table@orders").getByRole("table", { name: "Orders" });
	registry.add("main.table@orders.row").getByRole("row");
	registry.add("main.table@orders.row.button@cancel").getByRole("button", { name: "Cancel" });
	registry.add("main.table@orders.row.cell@status").getByTestId("order-status");
	const cancel = registry
		.getLocatorSchema("main.table@orders.row.button@cancel")
		.filter("main.table@orders.row", { hasText: "ORD-1042" })
		.getNestedLocator();
	shows(chain(cancel)).toBe(
		"locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })",
	);
	shows(cancel.description()).toBe("main.table@orders.row.button@cancel");
});

skillTest("skills/pomwright/references/registering.md", async ({ page }) => {
	// one registry per example of the file, as each example registers its own paths

	// the ten methods
	const methods = createRegistryWithAccessors<"main" | "main.form@login" | "main.form@login.button@login" | "cart">(
		page,
	).registry;
	methods.add("main").locator("main");
	methods.add("main.form@login").getByRole("form", { name: "Log in" });
	methods.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
	shows(chain(methods.getNestedLocator("main.form@login.button@login"))).toBe(
		"locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })",
	);
	methods.add("cart").locator("section.cart", { hasText: "Total" });
	shows(chain(methods.getLocator("cart"))).toBe("locator('section.cart').filter({ hasText: 'Total' })");
	// the file says getByRole("main") finds the <main> element too. setContent stands in for a page the test server serves:
	// an element's role depends on its markup alone, so the stand-in hides nothing a served page would add
	await page.setContent("<main><p>content</p></main>");
	await expect(page.getByRole("main")).toHaveCount(1);
	await expect(page.locator("main")).toHaveCount(1);

	// steps
	const steps = createRegistryWithAccessors<"main.list@orders" | "main.list@orders.item@open">(page).registry;
	steps.add("main.list@orders").getByRole("list", { name: "Orders" });
	steps.add("main.list@orders.item@open").getByRole("listitem").filter({ hasText: "Open" }).describe("Open orders");
	const open = steps.getNestedLocator("main.list@orders.item@open");
	shows(chain(open)).toBe("getByRole('list', { name: 'Orders' }).getByRole('listitem').filter({ hasText: 'Open' })");
	shows(open.description()).toBe("Open orders");

	// filtering by another registered locator
	const filtering = createRegistryWithAccessors<
		"main" | "main.region@orders" | "main.region@orders.heading" | "main.region@orders.item@open"
	>(page).registry;
	filtering.add("main").locator("main");
	filtering.add("main.region@orders").getByRole("region").filter({ has: "main.region@orders.heading" });
	filtering.add("main.region@orders.heading").getByRole("heading", { name: "Orders" });
	filtering.add("main.region@orders.item@open").getByRole("listitem").filter({ hasText: "Open" });
	shows(chain(filtering.getNestedLocator("main.region@orders.item@open"))).toBe(
		"locator('main').getByRole('region').filter({ has: getByRole('heading', { name: 'Orders' }) }).getByRole('listitem').filter({ hasText: 'Open' })",
	);

	// ids: the selector a string id becomes
	const ids = createRegistryWithAccessors<"panel">(page).registry;
	ids.add("panel").getById("settings.panel");
	shows(chain(ids.getLocator("panel"))).toBe(selector(page, '[id="settings.panel"]'));

	// frames
	const frames = createRegistryWithAccessors<
		"main" | "main.region@payment" | "main.region@payment.frame" | "main.region@payment.frame.input@cardNumber"
	>(page).registry;
	frames.add("main").locator("main");
	frames.add("main.region@payment").getByRole("region", { name: "Payment" });
	frames.add("main.region@payment.frame").frameLocator("iframe");
	frames.add("main.region@payment.frame.input@cardNumber").getByLabel("Card number");
	shows(chain(frames.getNestedLocator("main.region@payment.frame.input@cardNumber"))).toBe(
		"locator('main').getByRole('region', { name: 'Payment' }).locator('iframe').contentFrame().getByLabel('Card number')",
	);
});

skillTest("skills/pomwright/references/paths-and-registry.md", async ({ page }) => {
	// segments without a locator
	const { registry } = createRegistryWithAccessors<"main.form@login" | "main.form@login.button.submit">(page);
	registry.add("main.form@login").getByRole("form", { name: "Log in" });
	registry.add("main.form@login.button.submit").getByRole("button", { name: "Log in" });
	shows(chain(registry.getNestedLocator("main.form@login.button.submit"))).toBe(
		"getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })",
	);
});

skillTest("skills/pomwright/references/resolving-and-queries.md", async ({ page }) => {
	// a row by its text
	const orders = createRegistryWithAccessors<
		"main" | "main.table@orders" | "main.table@orders.row" | "main.table@orders.row.button@cancel"
	>(page).registry;
	orders.add("main").locator("main");
	orders.add("main.table@orders").getByRole("table", { name: "Orders" });
	orders.add("main.table@orders.row").getByRole("row");
	orders.add("main.table@orders.row.button@cancel").getByRole("button", { name: "Cancel" });
	shows(
		chain(
			orders
				.getLocatorSchema("main.table@orders.row.button@cancel")
				.filter("main.table@orders.row", { hasText: "ORD-1042" })
				.getNestedLocator(),
		),
	).toBe(
		"locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })",
	);

	// a card by its heading's exact name
	const products = createRegistryWithAccessors<
		| "main.list@products"
		| "main.list@products.card"
		| "main.list@products.card.heading"
		| "main.list@products.card.button@addToCart"
	>(page).registry;
	products.add("main.list@products").getByRole("list", { name: "Products" });
	products.add("main.list@products.card").getByRole("listitem");
	products.add("main.list@products.card.heading").getByRole("heading");
	products.add("main.list@products.card.button@addToCart").getByRole("button", { name: "Add to cart" });
	const heading = products
		.getLocatorSchema("main.list@products.card.heading")
		.update()
		.getByRole({ name: "Lamp", exact: true })
		.getLocator();
	const addToCart = products
		.getLocatorSchema("main.list@products.card.button@addToCart")
		.filter("main.list@products.card", { has: heading })
		.getNestedLocator();
	shows(chain(addToCart)).toBe(
		"getByRole('list', { name: 'Products' }).getByRole('listitem').filter({ has: getByRole('heading', { name: 'Lamp', exact: true }) }).getByRole('button', { name: 'Add to cart' })",
	);
	// what the file says the two filters match. setContent stands in for a page the test server serves: which elements
	// a chain matches depends on the DOM alone, so the stand-in hides nothing a served page would add
	await page.setContent(
		`<ul aria-label="Products">
			<li><h2>Desk lamp</h2><button>Add to cart</button></li>
			<li><h2>Lamp</h2><button data-card="lamp">Add to cart</button></li>
		</ul>`,
	);
	const byText = products
		.getLocatorSchema("main.list@products.card.button@addToCart")
		.filter("main.list@products.card", { hasText: "Lamp" })
		.getNestedLocator();
	await expect(byText).toHaveCount(2);
	await expect(addToCart).toHaveCount(1);
	await expect(addToCart).toHaveAttribute("data-card", "lamp");
});

skillTest("skills/pomwright/references/reusing.md", async ({ page }) => {
	// reuse by path
	const shared = createRegistryWithAccessors<"shared.list.items" | "main.list@orders" | "main.list@orders.item@last">(
		page,
	).registry;
	shared.add("shared.list.items").getByRole("listitem");
	shared.add("main.list@orders").getByRole("list", { name: "Orders" });
	shared.add("main.list@orders.item@last", { reuse: "shared.list.items" }).nth("last").describe("Last order");
	const last = shared.getNestedLocator("main.list@orders.item@last");
	shows(chain(last)).toBe("getByRole('list', { name: 'Orders' }).getByRole('listitem').last()");
	shows(last.description()).toBe("Last order");

	// seeds
	const seeded = createRegistryWithAccessors<"card" | "card.heading@summary" | "card.headings">(page).registry;
	const heading = seeded.createReusable.getByRole("heading", { level: 2 });
	seeded.add("card").getByRole("article");
	seeded.add("card.heading@summary", { reuse: heading }).getByRole({ name: "Summary" });
	seeded.add("card.headings", { reuse: heading });
	shows(chain(seeded.getLocator("card.heading@summary"))).toBe("getByRole('heading', { name: 'Summary', level: 2 })");
	shows(chain(seeded.getLocator("card.headings"))).toBe("getByRole('heading', { level: 2 })");
});

skillTest("skills/pomwright/references/page-objects.md", async ({ page }) => {
	// the message of How a mistake is reported: a form filtered by a heading path that is never registered
	type Paths =
		| "main"
		| "main.form@login"
		| "main.form@login.heading"
		| "main.form@login.input@email"
		| "main.form@login.input@password"
		| "main.form@login.button@login";
	class BrokenLoginPage extends PageObject<Paths> {
		constructor(page: Page) {
			super(page, "https://shop.example", "/login", { label: "LoginPage" });
		}

		protected defineLocators(): void {
			this.add("main").locator("main");
			this.add("main.form@login").locator("form").filter({ has: "main.form@login.heading" });
			this.add("main.form@login.input@email").getByLabel("Email");
			this.add("main.form@login.input@password").getByLabel("Password");
			this.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
		}
	}
	// used right after new, so the check that a page object schedules runs here rather than outside the test
	let message = "";
	try {
		new BrokenLoginPage(page).getNestedLocator("main");
	} catch (error) {
		message = (error as Error).message;
	}
	shows(message).toBe(
		'LoginPage: Locator registry verification failed for 1 of 5 paths:\n  "main.form@login": No locator schema registered for path "main.form@login.heading".',
	);
});

skillTest("skills/pomwright/references/reports.md", async () => {
	// a child of a child names the whole path from the test's logger
	const entries: LogEntry[] = [];
	const log = new PlaywrightReportLogger({ current: "debug", initial: "debug" }, entries, "TestCase");
	const checkout = log.getNewChildLogger("CheckoutPage");
	checkout.info("paying");
	checkout.getNewChildLogger("fillCard").debug("filling the card ending 4242");
	shows(entries[0]?.prefix).toBe("TestCase -> CheckoutPage");
	shows(entries[1]?.prefix).toBe("TestCase -> CheckoutPage -> fillCard");
});

/** Every Markdown file under skills/, as paths from the repository root. */
const skillFiles = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return skillFiles(full);
		return /\.mdx?$/.test(entry.name) ? [path.relative(root, full).split(path.sep).join("/")] : [];
	});

test("every skill file that shows a rendering has a test", () => {
	const untested = skillFiles(skillsDir).filter(
		(file) => !tested.has(file) && HAS_RENDERING.test(readFileSync(path.join(root, file), "utf8")),
	);
	expect(untested).toEqual([]);
});
