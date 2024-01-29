import type { TestInfo } from "@playwright/test";

// Defines valid log levels as a union of string literal types.
export type LogLevel = "debug" | "info" | "warn" | "error";

// Defines the structure of a log entry.
export type LogEntry = {
	timestamp: Date;
	logLevel: LogLevel;
	prefix: string;
	message: string;
};

/**
 * PlaywrightReportLogger is a logger implementation designed for Playwright tests.
 * It records log messages and attaches them to the Playwright HTML report.
 *
 * The logger enables all fixtures implementing it to share the same log level
 * within the scope of a single test, independant of other tests run in parallell.
 * In the same way each fixture will share a single logEntry for recording all log
 * statements produced throughout the tests execution, when the test is done, all log
 * entries are chronologically sorted and attached to the playwright HTML report.
 *
 * Log messages can be recorded with various log levels (debug, info, warn, error).
 *
 * The getNewChildLogger method allows you to create a new 'child' logger instance
 * with a new contextual name (e.g. the class it's used), while sharing the logLevel
 * and LogEntry with the 'parent'.
 *
 * @example
 * 20:49:50 05.05.2023 - DEBUG : [TestCase]
 * 20:49:50 05.05.2023 - DEBUG : [TestCase -> MobilEier]
 * 20:49:51 05.05.2023 - ERROR : [TestCase -> MobilEier -> Axe]
 * 20:49:52 05.05.2023 - INFO : [TestCase -> MobilEier]
 * 20:49:52 05.05.2023 - DEBUG : [TestCase -> MobilEier -> GetBy]
 */
export class PlaywrightReportLogger {
	private readonly contextName: string;
	private readonly logLevels: LogLevel[] = ["debug", "info", "warn", "error"];

	// Initializes the logger with shared log level, log entries, and a context name.
	constructor(
		private sharedLogLevel: { current: LogLevel; initial: LogLevel },
		private sharedLogEntry: LogEntry[],
		contextName: string,
	) {
		this.contextName = contextName;
	}

	/**
	 * Creates a child logger with a new contextual name, sharing the same log level and log entries with the parent logger.
	 *
	 * The root loggers log "level" is referenced by all child loggers and their child loggers and so on...
	 * Changing the log "level" of one, will change it for all.
	 */
	getNewChildLogger(prefix: string): PlaywrightReportLogger {
		return new PlaywrightReportLogger(this.sharedLogLevel, this.sharedLogEntry, `${this.contextName} -> ${prefix}`);
	}

	/**
	 * Logs a message with the specified log level, prefix, and additional arguments if the current log level permits.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private log(level: LogLevel, message: string, ...args: any[]) {
		const logLevelIndex = this.logLevels.indexOf(level);

		if (logLevelIndex < this.getCurrentLogLevelIndex()) {
			return;
		}

		this.sharedLogEntry.push({
			timestamp: new Date(),
			logLevel: level,
			prefix: this.contextName,
			message: `${message}\n\n${args.join("\n\n")}`,
		});
	}

	/**
	 * Logs a debug-level message with the specified message and arguments.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	debug(message: string, ...args: any[]) {
		this.log("debug", message, ...args);
	}

	/**
	 * Logs a info-level message with the specified message and arguments.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	info(message: string, ...args: any[]) {
		this.log("info", message, ...args);
	}

	/**
	 * Logs a warn-level message with the specified message and arguments.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	warn(message: string, ...args: any[]) {
		this.log("warn", message, ...args);
	}

	/**
	 * Logs a error-level message with the specified message and arguments.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	error(message: string, ...args: any[]) {
		this.log("error", message, ...args);
	}

	/**
	 * Sets the current log level to the specified level during runTime.
	 */
	setLogLevel(level: LogLevel) {
		this.sharedLogLevel.current = level;
	}

	/**
	 * Retrieves the current log level during runtime.
	 */
	getCurrentLogLevel(): LogLevel {
		return this.sharedLogLevel.current;
	}

	/**
	 * Retrieves the index of the current log level in the logLevels array during runtime.
	 */
	getCurrentLogLevelIndex(): number {
		return this.logLevels.indexOf(this.sharedLogLevel.current);
	}

	/**
	 * Resets the current log level to the initial level during runtime.
	 */
	resetLogLevel() {
		this.sharedLogLevel.current = this.sharedLogLevel.initial;
	}

	/**
	 * Checks if the input log level is equal to the current log level of the PlaywrightReportLogger instance.
	 */
	isCurrentLogLevel(level: LogLevel): boolean {
		return this.sharedLogLevel.current === level;
	}

	/**
	 * Returns 'true' if the "level" parameter provided has an equal or greater index than the current logLevel.
	 */
	public isLogLevelEnabled(level: LogLevel): boolean {
		const logLevelIndex = this.logLevels.indexOf(level);

		if (logLevelIndex < this.getCurrentLogLevelIndex()) {
			return false;
		}

		return true;
	}

	/**
	 * Attaches the recorded log entries to the Playwright HTML report in a sorted and formatted manner.
	 */
	attachLogsToTest(testInfo: TestInfo) {
		this.sharedLogEntry.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		for (const log of this.sharedLogEntry) {
			const printTime = log.timestamp.toLocaleTimeString("nb-NO", {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			});
			const printDate = log.timestamp.toLocaleDateString("nb-NO", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			});
			const printLogLevel = `${log.logLevel.toUpperCase()}`;
			const printPrefix = log.prefix ? `: [${log.prefix}]` : "";

			let messageBody = "";
			let messageContentType = "";
			try {
				const parsedMessage = JSON.parse(log.message);
				messageContentType = "application/json";
				messageBody = JSON.stringify(parsedMessage, null, 2);
			} catch (error) {
				messageContentType = "text/plain";
				messageBody = log.message;
			}

			testInfo.attach(`${printTime} ${printDate} - ${printLogLevel} ${printPrefix}`, {
				contentType: messageContentType,
				body: Buffer.from(messageBody),
			});
		}
	}
}
