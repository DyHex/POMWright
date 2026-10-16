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
