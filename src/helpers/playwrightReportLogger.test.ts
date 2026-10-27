import type { TestInfo } from "@playwright/test";
import { describe, expect, it } from "vitest";
import {
	checkDateFormat,
	initialLogLevel,
	type LogEntry,
	type LogLevel,
	PlaywrightReportLogger,
} from "./playwrightReportLogger";

// A TestInfo that records attachments; what the HTML report shows is covered by the integration specs.
const setup = (level: LogLevel = "debug", use: { locale?: string; timezoneId?: string } = {}) => {
	const entries: LogEntry[] = [];
	const log = new PlaywrightReportLogger({ current: level, initial: level }, entries, "TestCase");
	const attachments: { name: string; contentType: string; body: string }[] = [];
	const testInfo = {
		project: { use },
		attach: async (name: string, options: { contentType: string; body: Buffer }) => {
			attachments.push({ name, contentType: options.contentType, body: options.body.toString() });
		},
	} as unknown as TestInfo;
	return { log, entries, attachments, testInfo };
};

const bodyOf = (call: (log: PlaywrightReportLogger) => void) => {
	const { log, attachments, testInfo } = setup();
	call(log);
	log.attachLogsToTest(testInfo);
	const [attachment] = attachments;
	if (attachment === undefined) {
		throw new Error("nothing was attached");
	}
	return attachment;
};

describe("what a log entry holds", () => {
	it("keeps the message exactly as given, with nothing appended", () => {
		expect(bodyOf((log) => log.info("ready"))).toMatchObject({ body: "ready", contentType: "text/plain" });
		expect(bodyOf((log) => log.info("line one\n    indented\ttab")).body).toBe("line one\n    indented\ttab");
	});

	it("keeps string arguments exactly as given, a blank line between the parts", () => {
		const json = JSON.stringify({ id: 7, lines: [{ sku: "A" }] }, null, 2);
		expect(bodyOf((log) => log.info("order", json)).body).toBe(`order\n\n${json}`);
	});

	it("prints every other argument as console.log does", () => {
		expect(bodyOf((log) => log.info("order", { id: 7, lines: [1, 2] })).body).toBe(
			"order\n\n{ id: 7, lines: [ 1, 2 ] }",
		);
		expect(bodyOf((log) => log.info("deep", { a: { b: { c: { d: 1 } } } })).body).toBe(
			"deep\n\n{ a: { b: { c: [Object] } } }",
		);
		expect(bodyOf((log) => log.info("values", [1, 2], 3, undefined, null)).body).toBe(
			"values\n\n[ 1, 2 ]\n\n3\n\nundefined\n\nnull",
		);
		expect(bodyOf((log) => log.info("failed", new Error("boom"))).body).toMatch(/^failed\n\nError: boom\n {4}at /);
		const circular: Record<string, unknown> = { name: "c" };
		circular.self = circular;
		expect(bodyOf((log) => log.info("cycle", circular)).body).toBe(
			"cycle\n\n<ref *1> { name: 'c', self: [Circular *1] }",
		);
	});

	it("attaches a JSON object or array message as application/json, unchanged, and anything else as text", () => {
		expect(bodyOf((log) => log.info('{"id":7,"list":[1,2]}'))).toMatchObject({
			body: '{"id":7,"list":[1,2]}',
			contentType: "application/json",
		});
		expect(bodyOf((log) => log.info("[1,2]")).contentType).toBe("application/json");
		for (const message of ["42", "true", "null", '"quoted"', "{not json"]) {
			expect(
				bodyOf((log) => log.info(message)),
				message,
			).toMatchObject({ body: message, contentType: "text/plain" });
		}
	});
});

describe("attachments", () => {
	it("keep the order of the calls, even when the clock stepped back between them", () => {
		const { log, entries, attachments, testInfo } = setup();
		log.info("first");
		log.info("second");
		const [first, second] = entries;
		if (first && second) {
			first.timestamp = new Date(Date.UTC(2026, 9, 15, 6, 0, 10));
			second.timestamp = new Date(Date.UTC(2026, 9, 15, 6, 0, 5));
		}
		log.attachLogsToTest(testInfo);
		expect(attachments.map((attachment) => attachment.body)).toEqual(["first", "second"]);
	});

	it("are named in the given locale and time zone", () => {
		const { log, entries, attachments, testInfo } = setup();
		log.warn("x");
		log.error("y");
		for (const entry of entries) {
			entry.timestamp = new Date(Date.UTC(2026, 9, 15, 6, 19, 55));
		}
		log.attachLogsToTest(testInfo, { locale: "nb-NO", timeZone: "UTC" });
		log.attachLogsToTest(testInfo, { locale: "en-US", timeZone: "UTC" });
		expect(attachments.map((attachment) => attachment.name)).toEqual([
			"06:19:55 15.10.2026 - WARN : [TestCase]",
			"06:19:55 15.10.2026 - ERROR : [TestCase]",
			"06:19:55 AM 10/15/2026 - WARN : [TestCase]",
			"06:19:55 AM 10/15/2026 - ERROR : [TestCase]",
		]);
	});

	it("are named in the project's configured locale and time zone when no format is given", () => {
		const { log, entries, attachments, testInfo } = setup("debug", { locale: "nb-NO", timezoneId: "UTC" });
		log.warn("x");
		for (const entry of entries) {
			entry.timestamp = new Date(Date.UTC(2026, 9, 15, 6, 19, 55));
		}
		log.attachLogsToTest(testInfo);
		expect(attachments.map((attachment) => attachment.name)).toEqual(["06:19:55 15.10.2026 - WARN : [TestCase]"]);
	});

	it("take each part of a given format over the project's, and the project's for a part left out", () => {
		const { log, entries, attachments, testInfo } = setup("debug", { locale: "nb-NO", timezoneId: "Asia/Tokyo" });
		log.warn("x");
		for (const entry of entries) {
			entry.timestamp = new Date(Date.UTC(2026, 9, 15, 6, 19, 55));
		}
		log.attachLogsToTest(testInfo, { locale: "en-US", timeZone: "UTC" });
		log.attachLogsToTest(testInfo, { locale: "en-US" });
		log.attachLogsToTest(testInfo, { timeZone: "UTC" });
		expect(attachments.map((attachment) => attachment.name)).toEqual([
			"06:19:55 AM 10/15/2026 - WARN : [TestCase]",
			"03:19:55 PM 10/15/2026 - WARN : [TestCase]",
			"06:19:55 15.10.2026 - WARN : [TestCase]",
		]);
	});

	it("leave out entries below the current level, as before", () => {
		const { log, attachments, testInfo } = setup("warn");
		log.debug("hidden");
		log.info("hidden");
		log.getNewChildLogger("LoginPage").warn("shown");
		log.attachLogsToTest(testInfo, { locale: "en-US", timeZone: "UTC" });
		expect(attachments).toHaveLength(1);
		expect(attachments[0]?.name).toMatch(/ - WARN : \[TestCase -> LoginPage\]$/);
	});
});

describe("the locale and the time zone", () => {
	it("accept a BCP 47 tag in any case and a time zone Intl knows", () => {
		expect(checkDateFormat("en-US", "Europe/Oslo", "log fixture")).toEqual({
			locale: "en-US",
			timeZone: "Europe/Oslo",
		});
		expect(checkDateFormat("nb-NO", "UTC", "log fixture")).toEqual({ locale: "nb-NO", timeZone: "UTC" });
		expect(checkDateFormat("EN-us", undefined, "log fixture")).toEqual({ locale: "EN-us", timeZone: undefined });
	});

	it("take an empty string as no value, as Playwright does", () => {
		expect(checkDateFormat("", "", "log fixture")).toEqual({ locale: undefined, timeZone: undefined });
	});

	it("reject an underscore tag with a hint, and any other malformed tag, naming the option and the value", () => {
		expect(() => checkDateFormat("en_US", undefined, "log fixture")).toThrowError(
			'log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"',
		);
		expect(() => checkDateFormat("xx-!!", undefined, "log fixture")).toThrowError(
			/^log fixture: locale "xx-!!" is not a BCP 47 language tag$/,
		);
	});

	it("reject a time zone Intl does not know, named as the caller names it", () => {
		expect(() => checkDateFormat(undefined, "Invalid/Zone", "log fixture")).toThrowError(
			`log fixture: timezoneId "Invalid/Zone" is not a time zone Node's Intl knows`,
		);
		expect(() => checkDateFormat(undefined, "Invalid/Zone", "attachLogsToTest")).toThrowError(
			`attachLogsToTest: timeZone "Invalid/Zone" is not a time zone Node's Intl knows`,
		);
	});

	it("are checked by attachLogsToTest before anything is attached, given or from the project", () => {
		const given = setup();
		given.log.warn("kept");
		expect(() => given.log.attachLogsToTest(given.testInfo, { locale: "en_US" })).toThrowError(
			'attachLogsToTest: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"',
		);
		expect(given.attachments).toEqual([]);
		const configured = setup("debug", { timezoneId: "Invalid/Zone" });
		configured.log.warn("kept");
		expect(() => configured.log.attachLogsToTest(configured.testInfo)).toThrowError(
			`attachLogsToTest: timeZone "Invalid/Zone" is not a time zone Node's Intl knows`,
		);
	});

	it("attach in the machine's locale and time zone for an empty string", () => {
		const { log, attachments, testInfo } = setup("debug", { locale: "en-GB" });
		log.warn("kept");
		log.attachLogsToTest(testInfo, { locale: "", timeZone: "" });
		expect(attachments).toHaveLength(1);
	});
});

describe("the level", () => {
	it("is shared by a logger and its children: set, read, compare, reset", () => {
		const { log } = setup("warn");
		const child = log.getNewChildLogger("LoginPage");
		expect(child.getCurrentLogLevel()).toBe("warn");
		expect(log.isCurrentLogLevel("warn")).toBe(true);
		child.setLogLevel("debug");
		expect(log.getCurrentLogLevel()).toBe("debug");
		expect(log.getCurrentLogLevelIndex()).toBe(0);
		expect(log.isCurrentLogLevel("warn")).toBe(false);
		log.resetLogLevel();
		expect(child.getCurrentLogLevel()).toBe("warn");
	});

	it("enables the current level and those above it", () => {
		const { log, entries } = setup("info");
		expect(["debug", "info", "warn", "error"].map((level) => log.isLogLevelEnabled(level as LogLevel))).toEqual([
			false,
			true,
			true,
			true,
		]);
		log.setLogLevel("error");
		log.warn("hidden");
		log.error("shown");
		expect(entries.map((entry) => entry.message)).toEqual(["shown"]);
	});

	it("starts at warn on the first run and at debug on a retry, as the log fixture sets it", () => {
		expect(initialLogLevel(0)).toBe("warn");
		expect(initialLogLevel(1)).toBe("debug");
		expect(initialLogLevel(2)).toBe("debug");
	});
});
