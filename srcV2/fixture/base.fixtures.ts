import { test as base } from "@playwright/test";
import { type LogEntry, type LogLevel, PlaywrightReportLogger } from "../helpers/playwrightReportLogger";

type BaseFixtures = {
	log: PlaywrightReportLogger;
};

export const test = base.extend<BaseFixtures>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright does not support the use of _
	log: async ({}, use, testInfo) => {
		const contextName = "TestCase";
		const sharedLogEntry: LogEntry[] = [];

		const sharedLogLevel: { current: LogLevel; initial: LogLevel } =
			testInfo.retry === 0 ? { current: "warn", initial: "warn" } : { current: "debug", initial: "debug" };

		const log = new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, contextName);

		await use(log);

		log.attachLogsToTest(testInfo);
	},
});
