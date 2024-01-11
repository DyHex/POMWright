import { test as base } from "@playwright/test";
import {
	type LogEntry,
	type LogLevel,
	PlaywrightReportLogger,
} from "../helpers/playwrightReportLogger";

type baseFixtures = {
	log: PlaywrightReportLogger;
};

export const test = base.extend<baseFixtures>({
	// biome-ignore lint/correctness/noEmptyPattern: <explanation>
	log: async ({}, use, testInfo) => {
		const contextName = "TestCase";
		const sharedLogEntry: LogEntry[] = [];

		const sharedLogLevel: { current: LogLevel; initial: LogLevel } =
			testInfo.retry === 0
				? { current: "warn", initial: "warn" }
				: { current: "debug", initial: "debug" };

		// Set up fixture, logLevel defaults to "warn" unless a test is retried:
		const log = new PlaywrightReportLogger(
			sharedLogLevel,
			sharedLogEntry,
			contextName,
		);

		// Use the fixture value in the test:
		await use(log);

		// After the test is done, attach the logs to the test case in the HTML report
		log.attachLogsToTest(testInfo);
	},
});
