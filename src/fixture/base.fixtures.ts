import { test as base } from "@playwright/test";
import {
	initialLogLevel,
	type LogEntry,
	type LogLevel,
	PlaywrightReportLogger,
} from "../helpers/playwrightReportLogger";

type BaseFixtures = {
	log: PlaywrightReportLogger;
};

/**
 * Playwright's `test` with one more fixture, `log`: a `PlaywrightReportLogger` named `TestCase`, whose entries are
 * attached to the test's report when it ends, named in Playwright's `locale` and `timezoneId`. It records `warn` and
 * `error` on a test's first run and every level on a retry. Extend it, or combine it with `mergeTests`, to add page
 * objects as fixtures.
 *
 * @example
 * ```ts
 * import { test as base } from "pomwright";
 *
 * export const test = base.extend<{ loginPage: LoginPage }>({
 *   loginPage: async ({ page }, use) => {
 *     await use(new LoginPage(page));
 *   },
 * });
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/fixtures/
 */
export const test = base.extend<BaseFixtures>({
	log: async ({ locale, timezoneId }, use, testInfo) => {
		const contextName = "TestCase";
		const sharedLogEntry: LogEntry[] = [];

		const level = initialLogLevel(testInfo.retry);
		const sharedLogLevel: { current: LogLevel; initial: LogLevel } = { current: level, initial: level };

		const log = new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, contextName);

		await use(log);

		// timestamps in the locale and time zone the tests run with
		log.attachLogsToTest(testInfo, { locale, timeZone: timezoneId });
	},
});
