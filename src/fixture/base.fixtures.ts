/* eslint-disable no-empty-pattern */
import { test as base } from "@playwright/test";
import {
  PlaywrightReportLogger,
  type LogEntry,
  type LogLevel,
} from "../helpers/playwrightReportLogger";

type baseFixtures = {
  log: PlaywrightReportLogger;
};

export const test = base.extend<baseFixtures>({
  log: async ({}, use, testInfo) => {
    const contextName = "TestCase";
    const sharedLogEntry: LogEntry[] = [];
    // eslint-disable-next-line prefer-const
    let sharedLogLevel: { current: LogLevel; initial: LogLevel } =
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
