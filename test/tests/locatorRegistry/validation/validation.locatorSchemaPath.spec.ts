import { expect, test } from "@fixtures/testApp.fixtures.js";
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

/**
 * A path as an error message shows it: JSON's escapes, and every other whitespace character as \uXXXX, a space
 * excepted (the rule of POMWright's internal formatLocatorSchemaPathForError, which a unit test holds).
 */
const formatLocatorSchemaPathForError = (path: string): string =>
	JSON.stringify(path)
		.slice(1, -1)
		.replace(
			/[\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]/gu,
			(char) => `\\u${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
		);

const createTestRegistry = <Paths extends string>(page: Page) => createRegistryWithAccessors<Paths>(page).registry;

test("flags invalid LocatorSchemaPaths at compile time and rejects them at runtime", async ({ page }) => {
	type Paths =
		| "valid"
		| "valid.path"
		| "valid.path@special-characters!$&'()*+,-./:;=?^_`{|}~"
		// invalid paths below:
		| "" // empty string
		| ".leading" // leading dot
		| "a..b" // consecutive dots
		| "trailing." // trailing dot
		| " " // SPACE
		| "a b" // SPACE anywhere
		| "a\u0020b" // SPACE unicode
		| "\t" // CHARACTER TABULATION
		| "\n" // LINE FEED
		| "\v" // LINE TABULATION
		| "\f" // FORM FEED
		| "\r" // CARRIAGE RETURN
		| "a\u0085b" // NEXT LINE: "\u0085"
		| " " // NO-BREAK SPACE
		| " " // OGHAM SPACE MARK
		| " " // EN QUAD
		| " " // EM QUAD
		| " " // EN SPACE
		| " " // EM SPACE
		| " " // THREE-PER-EM SPACE
		| " " // FOUR-PER-EM SPACE
		| " " // SIX-PER-EM SPACE
		| " " // FIGURE SPACE
		| " " // PUNCTUATION SPACE
		| " " // THIN SPACE
		| " " // HAIR SPACE
		| "\u2028" // LINE SEPARATOR
		| "\u2029" // PARAGRAPH SEPARATOR
		| " " // NARROW NO-BREAK SPACE
		| " " // MEDIUM MATHEMATICAL SPACE
		| "　"; // IDEOGRAPHIC SPACE

	// Compile-time errors expected for invalid paths above,
	// but they won't fail the test run; they are reported in the IDE
	// via the createTestRegistry<Paths> helper and as a result NOT listed/suggested on registry.add(...) calls below.
	const registry = createTestRegistry<Paths>(page);

	// Valid paths should work fine at runtime:
	registry.add("valid").locator("body");
	registry.add("valid.path").locator("div.class");
	registry.add("valid.path@special-characters!$&'()*+,-./:;=?^_`{|}~").locator("span#id");

	// --- Runtime errors for non-whitespace structural rules ---

	// @ts-expect-error: testing compile-time validation
	expect(() => registry.add("").locator("invalid")).toThrow("LocatorSchemaPath string cannot be empty");

	// @ts-expect-error: testing compile-time validation
	expect(() => registry.add(".leading").locator("invalid")).toThrow(
		"LocatorSchemaPath string cannot start with a dot: .leading",
	);

	// @ts-expect-error: testing compile-time validation
	expect(() => registry.add("a..b").locator("invalid")).toThrow(
		"LocatorSchemaPath string cannot contain consecutive dots: a..b",
	);

	// @ts-expect-error: testing compile-time validation
	expect(() => registry.add("trailing.").locator("invalid")).toThrow(
		"LocatorSchemaPath string cannot end with a dot: trailing.",
	);

	// --- Runtime errors for all whitespace-related invalid paths ---

	const whitespacePaths = [
		" ", // SPACE
		"a b", // SPACE anywhere
		"a\u0020b", // SPACE unicode
		"\t", // CHARACTER TABULATION
		"\n", // LINE FEED
		"\v", // LINE TABULATION
		"\f", // FORM FEED
		"\r", // CARRIAGE RETURN
		"a\u0085b", // NEXT LINE: "\u0085"
		" ", // NO-BREAK SPACE
		" ", // OGHAM SPACE MARK
		" ", // EN QUAD
		" ", // EM QUAD
		" ", // EN SPACE
		" ", // EM SPACE
		" ", // THREE-PER-EM SPACE
		" ", // FOUR-PER-EM SPACE
		" ", // SIX-PER-EM SPACE
		" ", // FIGURE SPACE
		" ", // PUNCTUATION SPACE
		" ", // THIN SPACE
		" ", // HAIR SPACE
		"\u2028", // LINE SEPARATOR
		"\u2029", // PARAGRAPH SEPARATOR
		" ", // NARROW NO-BREAK SPACE
		" ", // MEDIUM MATHEMATICAL SPACE
		"　", // IDEOGRAPHIC SPACE
		"main\uFEFF.form", // ZERO WIDTH NO-BREAK SPACE (BOM), which JavaScript's \s matches
	] as const;

	for (const path of whitespacePaths) {
		const escaped = formatLocatorSchemaPathForError(path);
		// @ts-expect-error: testing compile-time validation of whitespace in paths
		expect(() => registry.add(path).locator("invalid")).toThrow(
			`LocatorSchemaPath string cannot contain whitespace chars: ${escaped}`,
		);
	}
});
