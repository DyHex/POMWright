// A consumer module that happens to share a POMWright file name: its frames must stay in reported stacks.
import type TestStorageSecond from "@page-object-models/testApp/pages/teststorage/teststorage-second.page";

/** A value over every browser's session storage quota, so the browser refuses the write. */
export const seedTooMuch = (second: TestStorageSecond) =>
	second.sessionStorage.seed({ big: "x".repeat(12 * 1024 * 1024) });
