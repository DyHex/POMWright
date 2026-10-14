import type { Locator } from "@playwright/test";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { FrameLocatorDefinition, IdDefinition, LocatorBuilderTarget, UnicodeWhitespaceChar } from "./types";
import {
	applyDefinitionPatch,
	assertIdValue,
	assertPrimaryValue,
	buildIdSelector,
	cloneLocatorStrategyDefinition,
	createLocator,
	escapeCssString,
	escapeRegExpForSelector,
	formatLocatorSchemaPathForError,
	isAnyFrameDefinition,
	LOCATOR_SCHEMA_PATH_WHITESPACE,
	methodForStrategy,
	validateLocatorSchemaPath,
} from "./utils";

describe("escapeCssString", () => {
	it("escapes the five characters that are special inside a double-quoted CSS string", () => {
		expect(escapeCssString('say"hi')).toBe('say\\"hi');
		expect(escapeCssString("back\\slash")).toBe("back\\\\slash");
		expect(escapeCssString("a\nb")).toBe("a\\a b");
		expect(escapeCssString("a\rb")).toBe("a\\d b");
		expect(escapeCssString("a\fb")).toBe("a\\c b");
	});

	it("passes everything else through verbatim", () => {
		const verbatim = [
			"settings.panel",
			"form:user",
			"items[0]",
			"has space",
			"a\tb",
			"#literal-hash",
			"id=weird",
			"a>>b",
			"1st",
			"résumé",
			"a\0b",
			"",
		];
		for (const value of verbatim) {
			expect(escapeCssString(value)).toBe(value);
		}
	});
});

describe("escapeRegExpForSelector", () => {
	it("renders source and flags", () => {
		expect(escapeRegExpForSelector(/^panel-\d+$/i)).toBe("/^panel-\\d+$/i");
	});

	it("escapes unescaped quotes and backticks", () => {
		expect(escapeRegExpForSelector(/say"hi/)).toBe('/say\\"hi/');
		expect(escapeRegExpForSelector(/it's/)).toBe("/it\\'s/");
		expect(escapeRegExpForSelector(/a`b/)).toBe("/a\\`b/");
	});

	it("leaves an already escaped quote alone", () => {
		// source is  say\"hi  (one backslash before the quote); no second backslash is added
		expect(escapeRegExpForSelector(/say"hi/)).toBe('/say\\"hi/');
	});

	it("escapes Playwright's chain separator", () => {
		expect(escapeRegExpForSelector(/a>>b/)).toBe("/a\\>\\>b/");
	});

	it("passes unicode-mode regexes through untouched", () => {
		expect(escapeRegExpForSelector(/say"hi/u)).toBe('/say"hi/u');
		expect(escapeRegExpForSelector(/say"hi/v)).toBe('/say"hi/v');
	});

	it("keeps every flag, including sticky", () => {
		expect(escapeRegExpForSelector(/x/gimsy)).toBe("/x/gimsy");
	});
});

describe("buildIdSelector", () => {
	it("builds an exact attribute selector for strings", () => {
		expect(buildIdSelector("settings.panel")).toBe('[id="settings.panel"]');
		expect(buildIdSelector('say"hi')).toBe('[id="say\\"hi"]');
		expect(buildIdSelector("back\\slash")).toBe('[id="back\\\\slash"]');
		expect(buildIdSelector("#literal-hash")).toBe('[id="#literal-hash"]');
		expect(buildIdSelector("id=weird")).toBe('[id="id=weird"]');
	});

	it("builds an attribute-regex selector for RegExps, flags included", () => {
		expect(buildIdSelector(/^button\.submit\.[a-z0-9]{4}$/)).toBe(
			"internal:attr=[id=/^button\\.submit\\.[a-z0-9]{4}$/]",
		);
		expect(buildIdSelector(/settings/i)).toBe("internal:attr=[id=/settings/i]");
		expect(buildIdSelector(/a>>b/)).toBe("internal:attr=[id=/a\\>\\>b/]");
		expect(buildIdSelector(/\/slash/)).toBe("internal:attr=[id=/\\/slash/]");
		expect(buildIdSelector(/x/u)).toBe("internal:attr=[id=/x/u]");
	});
});

describe("assertIdValue", () => {
	it("rejects an empty string and names the path", () => {
		expect(() => assertIdValue("", { method: "getById", path: "main.form@user" })).toThrowError(
			'getById requires a non-empty id for "main.form@user".',
		);
	});

	it("rejects a missing value with the same message", () => {
		expect(() => assertIdValue(undefined, { method: "getById", path: "main.form@user" })).toThrowError(
			'getById requires a non-empty id for "main.form@user".',
		);
	});

	it("uses the method label alone when there is no path", () => {
		expect(() => assertIdValue("", { method: "createReusable.getById" })).toThrowError(
			"createReusable.getById requires a non-empty id.",
		);
	});

	it("accepts non-empty strings and RegExps with any flags", () => {
		const accepted: (string | RegExp)[] = ["x", " ", "#x", /x/, /x/g, /x/i, /x/m, /x/s, /x/u, /x/v, /x/y, /x/gimsuy];
		for (const id of accepted) {
			expect(() => assertIdValue(id, { method: "getById", path: "p" })).not.toThrow();
		}
	});
});

describe("createLocator, id case", () => {
	const stubTarget = () => {
		const calls: string[] = [];
		const target = {
			locator: (selector: string) => {
				calls.push(selector);
				return { selector };
			},
		} as unknown as LocatorBuilderTarget;
		return { target, calls };
	};

	it("passes the string selector to target.locator", () => {
		const { target, calls } = stubTarget();
		createLocator(target, { type: "id", id: "settings.panel" });
		expect(calls).toEqual(['[id="settings.panel"]']);
	});

	it("passes the RegExp selector to target.locator", () => {
		const { target, calls } = stubTarget();
		createLocator(target, { type: "id", id: /^a\.b$/i });
		expect(calls).toEqual(["internal:attr=[id=/^a\\.b$/i]"]);
	});

	it("throws a descriptive error when the definition has no id", () => {
		const { target } = stubTarget();
		expect(() => createLocator(target, { type: "id" } as unknown as IdDefinition)).toThrowError(
			'Locator definition of type "id" has no id value.',
		);
	});
});

describe("applyDefinitionPatch, id case", () => {
	it("stores the patched id verbatim", () => {
		expect(applyDefinitionPatch({ type: "id", id: "base" }, { type: "id", id: "#literal" })).toEqual({
			type: "id",
			id: "#literal",
		});
		expect(applyDefinitionPatch({ type: "id", id: "base" }, { type: "id", id: "id=weird" })).toEqual({
			type: "id",
			id: "id=weird",
		});
	});

	it("inherits the base id when the patch has none", () => {
		expect(applyDefinitionPatch({ type: "id", id: "base" }, { type: "id" })).toEqual({ type: "id", id: "base" });
		const pattern = /x/i;
		expect(applyDefinitionPatch({ type: "id", id: pattern }, { type: "id" })).toEqual({ type: "id", id: pattern });
	});
});

describe("assertPrimaryValue", () => {
	it("rejects a missing value for every field, naming the method and the path", () => {
		expect(() =>
			assertPrimaryValue(undefined, { method: "getByRole", field: "role", path: "main.button", allowEmpty: false }),
		).toThrowError('getByRole requires a role value for "main.button".');
		expect(() =>
			assertPrimaryValue(undefined, { method: "getByText", field: "text", path: "p", allowEmpty: true }),
		).toThrowError('getByText requires a text value for "p".');
		expect(() =>
			assertPrimaryValue(undefined, { method: "getById", field: "id", path: "p", allowEmpty: false }),
		).toThrowError('getById requires an id value for "p".');
	});

	it("uses the method label alone when there is no path", () => {
		expect(() =>
			assertPrimaryValue(undefined, { method: "createReusable.locator", field: "selector", allowEmpty: false }),
		).toThrowError("createReusable.locator requires a selector value.");
	});

	it("rejects an empty string only when allowEmpty is false", () => {
		expect(() =>
			assertPrimaryValue("", { method: "locator", field: "selector", path: "list", allowEmpty: false }),
		).toThrowError('locator requires a non-empty selector for "list".');
		expect(() => assertPrimaryValue("", { method: "frameLocator", field: "selector", allowEmpty: false })).toThrowError(
			"frameLocator requires a non-empty selector.",
		);
		expect(() =>
			assertPrimaryValue("", { method: "getByTestId", field: "testId", path: "p", allowEmpty: true }),
		).not.toThrow();
		expect(() =>
			assertPrimaryValue("", { method: "getByText", field: "text", path: "p", allowEmpty: true }),
		).not.toThrow();
	});

	it("accepts non-empty strings and RegExps whatever the flags", () => {
		for (const value of ["x", " ", /x/, /x/gimsuy]) {
			expect(() => assertPrimaryValue(value, { method: "m", field: "f", allowEmpty: false })).not.toThrow();
		}
	});
});

describe("createLocator, frame case", () => {
	const stubTarget = () => {
		const calls: string[] = [];
		const target = {
			locator: (selector: string) => {
				calls.push(`locator:${selector}`);
				return { selector };
			},
			frameLocator: (selector?: string) => {
				calls.push(`frameLocator:${selector}`);
				return { selector };
			},
		} as unknown as LocatorBuilderTarget;
		return { target, calls };
	};

	it("builds the iframe element with target.locator and never calls target.frameLocator", () => {
		const { target, calls } = stubTarget();
		createLocator(target, { type: "frameLocator", selector: "iframe#login" });
		expect(calls).toEqual(["locator:iframe#login"]);
	});

	it("throws for the any-frame definition, which the chain resolves itself", () => {
		const { target, calls } = stubTarget();
		expect(() => createLocator(target, { type: "frameLocator" })).toThrowError(
			'Locator definition of type "frameLocator" has no selector; the any-frame form is resolved by the chain.',
		);
		expect(calls).toEqual([]);
	});

	it("returns a Locator for every strategy", () => {
		expectTypeOf(createLocator).returns.toEqualTypeOf<Locator>();
	});
});

describe("frame definitions without a selector", () => {
	it("are recognised by isAnyFrameDefinition", () => {
		expect(isAnyFrameDefinition({ type: "frameLocator" })).toBe(true);
		expect(isAnyFrameDefinition({ type: "frameLocator", selector: "iframe" })).toBe(false);
		expect(isAnyFrameDefinition({ type: "locator", selector: "iframe" })).toBe(false);
	});

	it("clone and patch keep the selector absent instead of storing undefined", () => {
		const anyFrame: FrameLocatorDefinition = { type: "frameLocator" };
		expect(cloneLocatorStrategyDefinition(anyFrame)).toEqual({ type: "frameLocator" });
		expect(Object.keys(cloneLocatorStrategyDefinition(anyFrame))).toEqual(["type"]);
		expect(cloneLocatorStrategyDefinition({ type: "frameLocator", selector: "iframe" })).toEqual({
			type: "frameLocator",
			selector: "iframe",
		});
		expect(applyDefinitionPatch({ type: "frameLocator", selector: "iframe" }, { type: "frameLocator" })).toEqual({
			type: "frameLocator",
			selector: "iframe",
		});
		expect(
			applyDefinitionPatch({ type: "frameLocator", selector: "iframe" }, { type: "frameLocator", selector: "x" }),
		).toEqual({
			type: "frameLocator",
			selector: "x",
		});
	});
});

describe("methodForStrategy", () => {
	it("names the DSL method of every strategy", () => {
		expect(methodForStrategy).toEqual({
			role: "getByRole",
			text: "getByText",
			label: "getByLabel",
			placeholder: "getByPlaceholder",
			altText: "getByAltText",
			title: "getByTitle",
			locator: "locator",
			frameLocator: "frameLocator",
			testId: "getByTestId",
			id: "getById",
		});
	});
});

describe("path whitespace", () => {
	const rejects = (path: string) => {
		try {
			validateLocatorSchemaPath(path);
			return false;
		} catch {
			return true;
		}
	};

	it("is Unicode White_Space plus U+FEFF, one list for the type and the runtime check", () => {
		const whiteSpace = /\p{White_Space}/u;
		const expected: string[] = [];
		for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
			const char = String.fromCodePoint(codePoint);
			if (whiteSpace.test(char) || codePoint === 0xfeff) {
				expected.push(char);
			}
		}
		expect([...LOCATOR_SCHEMA_PATH_WHITESPACE].sort()).toEqual(expected.sort());
		expectTypeOf<UnicodeWhitespaceChar>().toEqualTypeOf<(typeof LOCATOR_SCHEMA_PATH_WHITESPACE)[number]>();
		expectTypeOf<"\uFEFF">().toExtend<UnicodeWhitespaceChar>();
	});

	it("rejects a code point at runtime exactly when it is in the list", () => {
		const listed = new Set<string>(LOCATOR_SCHEMA_PATH_WHITESPACE);
		const mismatches: string[] = [];
		for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
			const char = String.fromCodePoint(codePoint);
			if (rejects(`main${char}form`) !== listed.has(char)) {
				mismatches.push(`U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`);
			}
		}
		expect(mismatches).toEqual([]);
	});

	it("shows every listed character escaped in the message, except the plain space", () => {
		expect(formatLocatorSchemaPathForError("a\u00A0b")).toBe("a\\u00A0b");
		expect(formatLocatorSchemaPathForError("a\uFEFFb")).toBe("a\\uFEFFb");
		expect(formatLocatorSchemaPathForError("a\u2028b")).toBe("a\\u2028b");
		expect(formatLocatorSchemaPathForError("a\u0085b")).toBe("a\\u0085b");
		expect(formatLocatorSchemaPathForError("a\u3000b")).toBe("a\\u3000b");
		expect(formatLocatorSchemaPathForError("a\tb\n")).toBe("a\\tb\\n");
		expect(formatLocatorSchemaPathForError("a b")).toBe("a b");
		for (const char of LOCATOR_SCHEMA_PATH_WHITESPACE) {
			const shown = formatLocatorSchemaPathForError(char);
			expect(shown === " " || shown.startsWith("\\"), JSON.stringify(char)).toBe(true);
		}
		expect(() => validateLocatorSchemaPath("main\uFEFF.form")).toThrowError(
			"LocatorSchemaPath string cannot contain whitespace chars: main\\uFEFF.form",
		);
	});
});
