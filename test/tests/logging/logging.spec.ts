import { readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type TestInfo } from "@playwright/test";
import { test as base } from "pomwright";

type Attachments = TestInfo["attachments"];
type AfterLog = { check?: (attachments: Attachments) => void };

// The log fixture attaches its entries when it is torn down. This auto fixture is set up before it and so torn
// down after it: a test hands it the expectations on the attachments, and a failing one fails the test.
const test = base.extend<{ afterLog: AfterLog }>({
	afterLog: [
		// biome-ignore lint/correctness/noEmptyPattern: Playwright does not support the use of _
		async ({}, use, testInfo) => {
			const holder: AfterLog = {};
			await use(holder);
			holder.check?.(testInfo.attachments.filter((attachment) => attachment.name.includes(" : [TestCase")));
		},
		{ auto: true },
	],
});

const bodies = (attachments: Attachments) => attachments.map((attachment) => attachment.body?.toString());

test("the message and string arguments are attached exactly as given, in call order", async ({ log, afterLog }) => {
	const json = JSON.stringify({ id: 7, lines: [{ sku: "A", qty: { value: 2 } }] }, null, 2);
	log.warn("first line\nsecond line\n    indented\ttab");
	log.warn("order", json);
	log.error("last");
	afterLog.check = (attachments) => {
		expect(bodies(attachments)).toEqual(["first line\nsecond line\n    indented\ttab", `order\n\n${json}`, "last"]);
		expect(attachments.map((attachment) => attachment.contentType)).toEqual(["text/plain", "text/plain", "text/plain"]);
	};
});

test("other arguments are printed as console.log prints them", async ({ log, afterLog, page }) => {
	log.warn("order", { id: 7, lines: [1, 2] });
	log.warn("deep", { a: { b: { c: { d: 1 } } } });
	log.warn("values", 3, undefined, null);
	log.warn("locator", page.locator("li").filter({ hasText: "x" }));
	log.warn("failed", new Error("boom"));
	afterLog.check = (attachments) => {
		const [order, deep, values, locator, failed] = bodies(attachments);
		expect(order).toBe("order\n\n{ id: 7, lines: [ 1, 2 ] }");
		expect(deep).toBe("deep\n\n{ a: { b: { c: [Object] } } }");
		expect(values).toBe("values\n\n3\n\nundefined\n\nnull");
		expect(locator).toBe("locator\n\nlocator('li').filter({ hasText: 'x' })");
		expect(failed).toMatch(/^failed\n\nError: boom\n {4}at /);
	};
});

test("a JSON object or array message is attached as application/json, unchanged", async ({ log, afterLog }) => {
	log.warn('{"id":7,"list":[1,2]}');
	log.warn("[1,2]");
	log.warn("42");
	afterLog.check = (attachments) => {
		expect(bodies(attachments)).toEqual(['{"id":7,"list":[1,2]}', "[1,2]", "42"]);
		expect(attachments.map((attachment) => attachment.contentType)).toEqual([
			"application/json",
			"application/json",
			"text/plain",
		]);
	};
});

test("entries below the level are left out; the first run logs from warn, a retry from debug", async ({
	log,
	afterLog,
}) => {
	log.info("hidden on the first run");
	log.getNewChildLogger("LoginPage").warn("shown");
	const expected = test.info().retry === 0 ? ["shown"] : ["hidden on the first run", "shown"];
	afterLog.check = (attachments) => {
		expect(bodies(attachments)).toEqual(expected);
		expect(attachments.at(-1)?.name).toMatch(/ - WARN : \[TestCase -> LoginPage\]$/);
	};
});

test("attachment names follow Playwright's default locale, en-US", async ({ log, afterLog }) => {
	log.warn("x");
	afterLog.check = (attachments) => {
		expect(attachments[0]?.name).toMatch(/^\d{2}:\d{2}:\d{2}\s(AM|PM) \d{2}\/\d{2}\/\d{4} - WARN : \[TestCase\]$/);
	};
});

test("the clock API changes the page's time, not the log's", async ({ log, afterLog, page }) => {
	await page.clock.install({ time: new Date("2001-02-03T04:05:06Z") });
	await page.clock.setFixedTime(new Date("1999-12-31T23:59:59Z"));
	const today = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
	log.warn("x");
	afterLog.check = (attachments) => {
		expect(attachments[0]?.name).toContain(today);
		expect(attachments[0]?.name).not.toContain("1999");
	};
});

test.describe('with use: { locale: "nb-NO", timezoneId: "UTC" }', () => {
	test.use({ locale: "nb-NO", timezoneId: "UTC" });

	test("attachment names follow the configured locale and time zone", async ({ log, afterLog }) => {
		const hours = [new Date()];
		log.warn("x");
		hours.push(new Date());
		const utcHours = hours.map((date) => String(date.getUTCHours()).padStart(2, "0"));
		afterLog.check = (attachments) => {
			const name = attachments[0]?.name ?? "";
			expect(name).toMatch(/^\d{2}:\d{2}:\d{2} \d{2}\.\d{2}\.\d{4} - WARN : \[TestCase\]$/);
			expect(utcHours).toContain(name.slice(0, 2));
		};
	});
});

test.describe("the locale and the time zone, checked when the test starts", () => {
	for (const locale of ["", "EN-us"]) {
		test.describe(`locale ${JSON.stringify(locale)}`, () => {
			test.use({ locale });
			test("names the entries", async ({ log, afterLog }) => {
				log.warn("kept");
				afterLog.check = (attachments) => {
					expect(bodies(attachments)).toEqual(["kept"]);
				};
			});
		});
	}

	test.describe("an underscore locale, which only Chromium accepts", () => {
		test.describe.configure({ mode: "serial" });
		test.use({ locale: "en_US" });
		// the failing test's worker is replaced, so its error is handed to the next test through a file
		const errorFile = () =>
			path.join(
				test.info().project.outputDir,
				`log-locale-${test.info().project.name}-${test.info().repeatEachIndex}.txt`,
			);
		test.afterEach(() => {
			const [error] = test.info().errors;
			if (error?.message !== undefined) {
				writeFileSync(errorFile(), error.message);
			}
		});

		test.fail("fails the test when the log fixture is set up, before its body", async ({ log }) => {
			log.warn("never logged");
		});

		test("with a message naming the value and its hyphenated form", () => {
			const message = readFileSync(errorFile(), "utf8");
			rmSync(errorFile());
			expect(message).toContain(
				'log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"',
			);
		});
	});
});

// a fixture that depends on log is torn down before it, so what it logs in its teardown is still attached
const withTeardownLog = test.extend<{ loggingTeardown: undefined }>({
	loggingTeardown: async ({ log }, use) => {
		await use(undefined);
		log.warn("logged in a fixture's teardown");
	},
});

withTeardownLog(
	"an entry a fixture that depends on log logs in its teardown is attached, after the test's",
	async ({ log, afterLog, loggingTeardown }) => {
		void loggingTeardown;
		log.warn("logged in the test");
		afterLog.check = (attachments) => {
			expect(bodies(attachments)).toEqual(["logged in the test", "logged in a fixture's teardown"]);
		};
	},
);
