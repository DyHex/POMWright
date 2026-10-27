import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// @step under experimentalDecorators as tsc writes it: pnpm typecheck emits legacy/legacyWidget.ts into
// test/.legacy-decorators, and this spec runs the legacy (target, key, descriptor) calls from there. A step titled by
// its class and method is marked with that title, `// LOCATION LegacyWidget.bare`.
const emitted = path.join(__dirname, "..", ".legacy-decorators", "legacyWidget.js");
if (!existsSync(emitted)) {
	throw new Error(`${emitted} is missing: pnpm typecheck emits it (tsc -p test/tsconfig.legacyDecorators.emit.json)`);
}
const { LegacyWidget } = require(emitted) as typeof import("./legacy/legacyWidget");

/** What a call rejects with: an unboxed step is placed where its caller waits, so the call and the await share a line. */
const rejection = (pending: unknown) => (pending as Promise<unknown>).catch((thrown: unknown) => thrown);

test("bare, called, boxed, titled and boxed, static and detached: each step where its method was called", async () => {
	const widget = new LegacyWidget();
	await widget.bare(); // LOCATION LegacyWidget.bare
	await widget.called(); // LOCATION LegacyWidget.called
	await widget.boxed(); // LOCATION LegacyWidget.boxed
	await widget.titledBoxed(); // LOCATION legacy-titled-boxed
	await LegacyWidget.staticBare(); // LOCATION LegacyWidget.staticBare
	const { detached } = widget;
	await detached(); // LOCATION Anonymous.detached
});

test("a method that returns a plain value rejects with the compile error's text", async () => {
	const error = await rejection(new LegacyWidget().plain()); // LOCATION legacy-plain
	expect(error).toBeInstanceOf(TypeError);
	expect((error as TypeError).message).toBe("@step decorates methods that return a Promise: make the method async");
});

test("a boxed method that throws: the step and the error at the line that called it", async () => {
	test.fail();
	await new LegacyWidget().throws(); // LOCATION legacy-throws
});
