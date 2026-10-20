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
