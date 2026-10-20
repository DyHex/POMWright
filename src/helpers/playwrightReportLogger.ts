import { inspect } from "node:util";
import type { TestInfo } from "@playwright/test";

/**
 * A log level, lowest first: `"debug"`, `"info"`, `"warn"`, `"error"`. A logger records an entry at its current level
 * or above.
 *
 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#loglevel
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * One recorded entry, attached to the test as one attachment.
 *
 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#logentry
 */
export type LogEntry = {
	/** When the entry was logged, in the test process. */
	timestamp: Date;
	/** The level it was logged at. */
	logLevel: LogLevel;
	/** The name of the logger that logged it: `TestCase`, or `TestCase -> CheckoutPage` for a child logger. */
	prefix: string;
	/** The message and the further arguments, as attached: separated by a blank line. */
	message: string;
};

/** The level a test's log starts at: `warn` on the first run, `debug` on a retry. Used by the `log` fixture. */
export const initialLogLevel = (retry: number): LogLevel => (retry === 0 ? "warn" : "debug");

/**
 * A logger whose entries are attached to the test's report, one attachment per entry, in the order they were logged.
 * The `log` fixture of POMWright's `test` gives every test one, named `TestCase`, starting at `warn` on the first run
 * and at `debug` on a retry. A child logger has a name of its own and shares its parent's entries and level.
 *
 * @example
 * ```ts
 * test("checkout", async ({ log }) => {
 *   log.warn("the basket was empty; added the test product");
 * });
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/
 */
export class PlaywrightReportLogger {
	private readonly contextName: string;
	private readonly logLevels: LogLevel[] = ["debug", "info", "warn", "error"];

	/**
	 * Creates a root logger, for a fixture of your own; the `log` fixture creates one per test. The level and the entries
	 * are objects the logger and its children share and change.
	 *
	 * @param sharedLogLevel `{ current, initial }`: the level entries are recorded at, and the one `resetLogLevel()`
	 * goes back to.
	 * @param sharedLogEntry The array the entries are recorded in, in call order.
	 * @param contextName The logger's name in attachment names, such as `TestCase`.
	 *
	 * @example
	 * ```ts
	 * const log = new PlaywrightReportLogger({ current: "warn", initial: "warn" }, [], "TestCase");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#new-playwrightreportlogger
	 */
	constructor(
		private sharedLogLevel: { current: LogLevel; initial: LogLevel },
		private sharedLogEntry: LogEntry[],
		contextName: string,
	) {
		this.contextName = contextName;
	}

	/**
	 * Creates a child logger named after this one and `prefix` (`TestCase -> CheckoutPage`). It shares this logger's
	 * entries and level: changing the level on any logger of the tree changes it for all of them.
	 *
	 * @param prefix The child's own name, such as the class that logs with it.
	 * @returns The child logger.
	 *
	 * @example
	 * ```ts
	 * this.log = log.getNewChildLogger("CheckoutPage");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#getnewchildlogger
	 */
	getNewChildLogger(prefix: string): PlaywrightReportLogger {
		return new PlaywrightReportLogger(this.sharedLogLevel, this.sharedLogEntry, `${this.contextName} -> ${prefix}`);
	}

	/**
	 * Records a message if the current log level permits. The message and every string argument are kept exactly
	 * as given; any other argument is printed as `console.log` prints it (`util.inspect`); the parts are joined by
	 * a blank line. For nested data, pass `JSON.stringify(data, null, 2)`.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: logger accepts arbitrary payloads for debug output.
	private log(level: LogLevel, message: string, ...args: any[]) {
		const logLevelIndex = this.logLevels.indexOf(level);

		if (logLevelIndex < this.getCurrentLogLevelIndex()) {
			return;
		}

		this.sharedLogEntry.push({
			timestamp: new Date(),
			logLevel: level,
			prefix: this.contextName,
			// each argument as console.log prints it: strings as they are, anything else through util.inspect
			message: [message, ...args.map((arg) => (typeof arg === "string" ? arg : inspect(arg)))].join("\n\n"),
		});
	}

	/**
	 * Records a `debug` entry when the current level is `debug` or lower. Strings are attached as written, any other
	 * value as `console.log` prints it.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#debug
	 *
	 * @param message The message.
	 * @param args Further values to attach after the message.
	 *
	 * @example
	 * ```ts
	 * log.debug("order", { id: 7, total: 42 });
	 * ```
	 */
	// biome-ignore lint/suspicious/noExplicitAny: logger accepts arbitrary payloads for debug output.
	debug(message: string, ...args: any[]) {
		this.log("debug", message, ...args);
	}

	/**
	 * Records an `info` entry when the current level is `info` or lower. Strings are attached as written, any other
	 * value as `console.log` prints it.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#info
	 *
	 * @param message The message.
	 * @param args Further values to attach after the message.
	 *
	 * @example
	 * ```ts
	 * log.info("order", { id: 7, total: 42 });
	 * ```
	 */
	// biome-ignore lint/suspicious/noExplicitAny: logger accepts arbitrary payloads for debug output.
	info(message: string, ...args: any[]) {
		this.log("info", message, ...args);
	}

	/**
	 * Records a `warn` entry when the current level is `warn` or lower. Strings are attached as written, any other
	 * value as `console.log` prints it.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#warn
	 *
	 * @param message The message.
	 * @param args Further values to attach after the message.
	 *
	 * @example
	 * ```ts
	 * log.warn("order", { id: 7, total: 42 });
	 * ```
	 */
	// biome-ignore lint/suspicious/noExplicitAny: logger accepts arbitrary payloads for debug output.
	warn(message: string, ...args: any[]) {
		this.log("warn", message, ...args);
	}

	/**
	 * Records an `error` entry when the current level is `error` or lower. Strings are attached as written, any other
	 * value as `console.log` prints it.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#error
	 *
	 * @param message The message.
	 * @param args Further values to attach after the message.
	 *
	 * @example
	 * ```ts
	 * log.error("order", { id: 7, total: 42 });
	 * ```
	 */
	// biome-ignore lint/suspicious/noExplicitAny: logger accepts arbitrary payloads for debug output.
	error(message: string, ...args: any[]) {
		this.log("error", message, ...args);
	}

	/**
	 * Sets the level entries are recorded at, for this logger and every logger of its tree, until it is set or reset
	 * again.
	 *
	 * @param level The new level.
	 *
	 * @example
	 * ```ts
	 * log.setLogLevel("debug"); // from here on, everything for this test
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#setloglevel
	 */
	setLogLevel(level: LogLevel) {
		this.sharedLogLevel.current = level;
	}

	/**
	 * Returns the level entries are recorded at.
	 *
	 * @returns The current level.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#getcurrentloglevel
	 */
	getCurrentLogLevel(): LogLevel {
		return this.sharedLogLevel.current;
	}

	/**
	 * Returns the current level's position in `["debug", "info", "warn", "error"]`, `0` for `debug`.
	 *
	 * @returns The index.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#getcurrentloglevelindex
	 */
	getCurrentLogLevelIndex(): number {
		return this.logLevels.indexOf(this.sharedLogLevel.current);
	}

	/**
	 * Sets the level back to the one the test started with: `warn` on a first run of the `log` fixture, `debug` on a
	 * retry.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#resetloglevel
	 */
	resetLogLevel() {
		this.sharedLogLevel.current = this.sharedLogLevel.initial;
	}

	/**
	 * Returns whether the current level is `level`.
	 *
	 * @param level The level to compare with.
	 * @returns `true` when it is the current level.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#iscurrentloglevel
	 */
	isCurrentLogLevel(level: LogLevel): boolean {
		return this.sharedLogLevel.current === level;
	}

	/**
	 * Returns whether an entry at `level` would be recorded: whether `level` is the current level or above. For code
	 * that should only do work when its entry is recorded.
	 *
	 * @param level The level to check.
	 * @returns `true` when an entry at `level` is recorded.
	 *
	 * @example
	 * ```ts
	 * if (log.isLogLevelEnabled("debug")) log.debug("cart", await cart.textContent());
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#isloglevelenabled
	 */
	public isLogLevelEnabled(level: LogLevel): boolean {
		const logLevelIndex = this.logLevels.indexOf(level);

		if (logLevelIndex < this.getCurrentLogLevelIndex()) {
			return false;
		}

		return true;
	}

	/**
	 * Attaches the recorded entries to the test, one attachment per entry in call order, each body exactly as logged:
	 * `application/json` when the message is a JSON object or array, `text/plain` otherwise. Each name is the time, the
	 * date, the level and the logger's name (`11:39:57 PM 10/16/2026 - WARN : [TestCase]`). The `log` fixture calls it
	 * when the test ends; call it in a fixture of your own.
	 *
	 * @param testInfo The test's `TestInfo`.
	 * @param format `{ locale, timeZone }` for the time and date in the names; the `log` fixture passes Playwright's
	 * `locale` and `timezoneId`. Without it, the machine's are used.
	 *
	 * @example
	 * ```ts
	 * log.attachLogsToTest(testInfo, { locale, timeZone: timezoneId });
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-playwrightreportlogger/#attachlogstotest
	 */
	attachLogsToTest(testInfo: TestInfo, format?: { locale?: string; timeZone?: string }) {
		// the entries are in call order already
		for (const log of this.sharedLogEntry) {
			const printTime = log.timestamp.toLocaleTimeString(format?.locale, {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				timeZone: format?.timeZone,
			});
			const printDate = log.timestamp.toLocaleDateString(format?.locale, {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				timeZone: format?.timeZone,
			});
			const printLogLevel = `${log.logLevel.toUpperCase()}`;
			const printPrefix = log.prefix ? `: [${log.prefix}]` : "";

			// the body exactly as logged; JSON only names the content type of a message that is a JSON object or array
			testInfo.attach(`${printTime} ${printDate} - ${printLogLevel} ${printPrefix}`, {
				contentType: isJsonDocument(log.message) ? "application/json" : "text/plain",
				body: Buffer.from(log.message),
			});
		}
	}
}

const isJsonDocument = (text: string): boolean => {
	try {
		const parsed: unknown = JSON.parse(text);
		return typeof parsed === "object" && parsed !== null;
	} catch {
		return false;
	}
};
