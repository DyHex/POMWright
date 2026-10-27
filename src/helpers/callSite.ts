import path from "node:path";
import { fileURLToPath } from "node:url";

/** POMWright's published bundle: its frames never point at the consumer's code. */
const BUNDLE_FRAME = /[\\/]pomwright[\\/]dist[\\/]index\.(js|mjs|cjs)/;

type Boundary = NonNullable<Parameters<typeof Error.captureStackTrace>[1]>;

/**
 * Captures where `boundary` was called from: V8 leaves out `boundary`'s own frame and every frame above
 * it, so the stack starts in the code that called it, whatever that file is named. The stack is
 * formatted only when the site is used.
 */
export const captureCallSite = (boundary: Boundary): Error => {
	const site = new Error();
	Error.captureStackTrace(site, boundary);
	return site;
};

/** Rewrites an error's stack to the captured site, so the report's code frame is the consumer's call. */
export const atCallSite = (error: Error, site: Error): Error => {
	const frames = (site.stack ?? "")
		.split("\n")
		.slice(1)
		.filter((line) => !BUNDLE_FRAME.test(line));
	if (frames.length > 0) {
		error.stack = `${error.name}: ${error.message}\n${frames.join("\n")}`;
	}
	return error;
};

/** A step's location, in the shape `test.step` takes as its `location` option. */
export type StepLocation = { file: string; line: number; column: number };

/** `at name (file:line:column)`: the location inside the first parenthesis, so a path may hold spaces or parentheses. */
const NAMED_FRAME = /\((.+):(\d+):(\d+)\)$/;
/** `at file:line:column`, a frame without a function name. */
const BARE_FRAME = /^at (?:async )?(.+):(\d+):(\d+)$/;

/**
 * The file, line and column of one stack frame, or `undefined` for a frame without a file (`native`, `<anonymous>`,
 * `index 0` of a `Promise.all`, code from `eval`). A `file://` URL becomes a path.
 */
export const frameLocation = (frame: string): StepLocation | undefined => {
	const text = frame.trim();
	const match = NAMED_FRAME.exec(text) ?? BARE_FRAME.exec(text);
	const [, file, line, column] = match ?? [];
	if (file === undefined || line === undefined || column === undefined) {
		return undefined;
	}
	if (file.startsWith("eval at ") || file.startsWith("<") || file === "native") {
		return undefined;
	}
	return { file: file.startsWith("file://") ? fileURLToPath(file) : file, line: Number(line), column: Number(column) };
};

/**
 * Where a captured site points: its first frame with a file, the consumer's line, as a boxed step's `location`.
 * `undefined` when no frame has one (a boundary not on the stack, or `Error.stackTraceLimit` at 0).
 */
export const siteLocation = (site: Error): StepLocation | undefined => {
	for (const frame of (site.stack ?? "").split("\n").slice(1)) {
		const location = frameLocation(frame);
		if (location !== undefined) {
			return location;
		}
	}
	return undefined;
};

/**
 * The line that called `boundary`, for a boxed step's `location`. Playwright takes a boxed step's location from the
 * stack only when no ancestor step is boxed, so a fixed number of POMWright frames cannot be right in both cases; a
 * `location` it is given is used whatever the ancestors are.
 */
export const callerLocation = (boundary: Boundary): StepLocation | undefined => siteLocation(captureCallSite(boundary));

/**
 * Where a captured site points, as `file:line:column` for a message: its first frame with a file outside POMWright's
 * bundle, the path relative to the working directory when the file is inside it. `undefined` when no frame has one.
 */
export const siteText = (site: Error): string | undefined => {
	for (const frame of (site.stack ?? "").split("\n").slice(1)) {
		const location = BUNDLE_FRAME.test(frame) ? undefined : frameLocation(frame);
		if (location !== undefined) {
			const relative = path.relative(process.cwd(), location.file);
			const file = relative.startsWith("..") || path.isAbsolute(relative) ? location.file : relative;
			return `${file}:${location.line}:${location.column}`;
		}
	}
	return undefined;
};
