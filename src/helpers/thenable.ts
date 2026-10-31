/** A value `await` would wait for: an object or a function with a `then` method. */
export const isThenable = (value: unknown): value is PromiseLike<unknown> =>
	(typeof value === "object" || typeof value === "function") &&
	value !== null &&
	typeof (value as { then?: unknown }).then === "function";
