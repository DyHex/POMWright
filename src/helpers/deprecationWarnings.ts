import type { PlaywrightReportLogger } from "./playwrightReportLogger";

const warnedDeprecationsByScope = new WeakMap<object, Set<string>>();

const getWarningScope = (logger?: Pick<PlaywrightReportLogger, "warn">): object => {
	if (!logger) {
		return globalThis;
	}

	const maybeSharedLogEntries = (logger as PlaywrightReportLogger as { sharedLogEntry?: unknown }).sharedLogEntry;
	if (Array.isArray(maybeSharedLogEntries)) {
		return maybeSharedLogEntries;
	}

	return logger as object;
};

export const warnDeprecationOncePerTest = (
	key: string,
	message: string,
	logger?: Pick<PlaywrightReportLogger, "warn">,
): void => {
	const warningScope = getWarningScope(logger);
	const warnedDeprecations = warnedDeprecationsByScope.get(warningScope) ?? new Set<string>();

	if (warnedDeprecations.has(key)) {
		return;
	}

	warnedDeprecations.add(key);
	warnedDeprecationsByScope.set(warningScope, warnedDeprecations);
	logger?.warn(message);
};
