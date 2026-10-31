import { test as base, type Page } from "@playwright/test";
import { PageObject } from "pomwright";

// A page object whose check right after construction fails, built in each place of the table in the docs' "How a
// mistake is reported". Each body notes how far it got as an annotation; tests/pageObject/lifecycle.outcomes.spec.ts
// runs this file and compares the report with the table.

class TypoPage extends PageObject<"body" | "body.heading"> {
	constructor(page: Page) {
		super(page, "http://localhost:9000", "/testnav", { label: "TypoPage" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
		this.add("body.heading")
			.getByRole("heading")
			.filter({ has: "body.headng" as "body" });
	}
}

const reached = (point: string) => base.info().annotations.push({ type: "reached", description: point });

const test = base.extend<{ testScoped: TypoPage }, { workerScoped: TypoPage }>({
	testScoped: async ({ page }, use) => {
		await use(new TypoPage(page));
	},
	workerScoped: [
		async ({ browser }, use) => {
			const page = await browser.newPage();
			await use(new TypoPage(page));
			await page.close();
		},
		{ scope: "worker" },
	],
});

test.describe("a test-scoped fixture", () => {
	test("first", async ({ testScoped }) => {
		reached("body");
		testScoped.getLocator("body");
	});
	test("second", async ({ testScoped }) => {
		reached("body");
		testScoped.getLocator("body");
	});
});

test.describe("a worker-scoped fixture", () => {
	test("first", async ({ workerScoped }) => {
		reached("body");
		workerScoped.getLocator("body");
	});
	test("second", async ({ workerScoped }) => {
		reached("body");
		workerScoped.getLocator("body");
	});
});

test.describe("beforeEach", () => {
	let typo: TypoPage;
	test.beforeEach(async ({ page }) => {
		typo = new TypoPage(page);
	});
	test("first", async () => {
		reached("body");
		typo.getLocator("body");
		reached("after the first use");
	});
	test("second", async () => {
		reached("body");
		typo.getLocator("body");
		reached("after the first use");
	});
});

test.describe("beforeAll", () => {
	let typo: TypoPage;
	test.beforeAll(async ({ browser }) => {
		typo = new TypoPage(await browser.newPage());
	});
	test("first", async () => {
		reached("body");
		typo.getLocator("body");
		reached("after the first use");
	});
	test("second", async () => {
		reached("body");
		typo.getLocator("body");
		reached("after the first use");
	});
});

test.describe("beforeAll in a serial group", () => {
	test.describe.configure({ mode: "serial" });
	let typo: TypoPage;
	test.beforeAll(async ({ browser }) => {
		typo = new TypoPage(await browser.newPage());
	});
	test("first", async () => {
		reached("body");
		typo.getLocator("body");
		reached("after the first use");
	});
	test("second", async () => {
		reached("body");
		typo.getLocator("body");
		reached("after the first use");
	});
});

test.describe("the test body", () => {
	test("built there, used after an await", async ({ page }) => {
		const typo = new TypoPage(page);
		reached("body");
		await new Promise((resolve) => setTimeout(resolve, 0));
		reached("after the await");
		typo.getLocator("body");
		reached("after the first use");
	});
	test("built in a test.step", async ({ page }) => {
		await base.step("a step", async () => {
			const typo = new TypoPage(page);
			reached("in the step");
			await new Promise((resolve) => setTimeout(resolve, 0));
			reached("after the await");
			typo.getLocator("body");
			reached("after the first use");
		});
	});
});
