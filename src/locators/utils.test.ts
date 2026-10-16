import type { Locator } from "@playwright/test";
import { describe, expect, expectTypeOf, it } from "vitest";
import { FakeLocator } from "./fakePage";
import type {
	FrameLocatorDefinition,
	IdDefinition,
	IndexSelector,
	LocatorBuilderTarget,
	LocatorStep,
	UnicodeWhitespaceChar,
} from "./types";
import {
	applyDefinitionPatch,
	applyIndexSelector,
	assertDescription,
	assertIdValue,
	assertPrimaryValue,
	assertStrategyPrimary,
	buildIdSelector,
	cloneLocatorStrategyDefinition,
	createLocator,
	escapeCssString,
	escapeRegExpForSelector,
	formatLocatorSchemaPathForError,
	isAnyFrameDefinition,
	isLocatorInstance,
	LOCATOR_SCHEMA_PATH_WHITESPACE,
	methodForStrategy,
	normalizeSteps,
	STRATEGIES,
	type StrategyMethod,
	type StrategyType,
	stringifyForLog,
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

describe("isLocatorInstance", () => {
	const fn = () => undefined;
	it("accepts an object with filter, nth and locator methods, as a Playwright Locator has", () => {
		expect(isLocatorInstance(new FakeLocator("locator('b')"))).toBe(true);
		expect(isLocatorInstance({ filter: fn, nth: fn, locator: fn })).toBe(true);
	});

	it("rejects arrays, filter-only objects, frame locators, pages and non-objects", () => {
		const cases: [string, unknown][] = [
			["an empty array", []],
			["an array of locators", [new FakeLocator("locator('b')")]],
			["an object with only filter", { filter: fn }],
			["a FrameLocator (nth and locator, no filter)", { nth: fn, locator: fn, first: fn, last: fn }],
			["a Page (locator only)", { locator: fn, goto: fn }],
			["null", null],
			["undefined", undefined],
			["a path string", "list.item"],
		];
		for (const [label, value] of cases) {
			expect(isLocatorInstance(value), label).toBe(false);
		}
	});
});

describe("stringifyForLog", () => {
	it("renders a Locator as Playwright prints it, not its internals", () => {
		const output = stringifyForLog({ filter: { has: new FakeLocator("locator('b')"), hasText: "x" } });
		expect(output).toContain(`"has": "locator('b')"`);
		expect(output).not.toContain("chain");
	});

	it("keeps rendering RegExps and cycles as before", () => {
		const circular: Record<string, unknown> = { name: "c" };
		circular.self = circular;
		expect(JSON.parse(stringifyForLog({ re: /a.b/i, circular }))).toEqual({
			re: { type: "RegExp", source: "a.b", flags: "i" },
			circular: { name: "c", self: "[Circular]" },
		});
	});
});

describe("normalizeSteps", () => {
	it("copies every step and every filter object, so a copy shares nothing that can change", () => {
		const filter = { hasText: "Save" };
		const steps: LocatorStep<"a", "a">[] = [
			{ kind: "filter", filter },
			{ kind: "index", index: 1 },
		];
		const copy = normalizeSteps(steps);
		expect(copy).toEqual(steps);
		expect(copy[0]).not.toBe(steps[0]);
		expect((copy[0] as { filter: object }).filter).not.toBe(filter);
		filter.hasText = "Other";
		expect(copy[0]).toEqual({ kind: "filter", filter: { hasText: "Save" } });
	});

	it("keeps a Locator in a filter by reference", () => {
		const has = new FakeLocator("locator('b')");
		const copy = normalizeSteps<"a", "a">([{ kind: "filter", filter: { has: has as never } }]);
		expect((copy[0] as { filter: { has: unknown } }).filter.has).toBe(has);
	});
});

describe("assertDescription", () => {
	it("accepts any string; an empty string removes the description", () => {
		expect(() => assertDescription("", { method: "describe", path: "a" })).not.toThrow();
		expect(() => assertDescription("Save button", { method: "describe", path: "a" })).not.toThrow();
	});

	it("rejects anything else, naming the method and the path when there is one", () => {
		for (const value of [null, undefined, 1, {}]) {
			expect(() => assertDescription(value, { method: "describe", path: "list.item" })).toThrowError(
				'describe requires a string for "list.item"; pass "" to remove the description.',
			);
		}
		expect(() => assertDescription(null, { method: "createReusable.describe" })).toThrowError(
			'createReusable.describe requires a string; pass "" to remove the description.',
		);
	});
});

describe("applyIndexSelector", () => {
	const nthOf = (index: unknown) => String(applyIndexSelector(new FakeLocator("li") as never, index as IndexSelector));

	it('maps "first" and "last" to first() and last()', () => {
		expect(nthOf("first")).toBe("li.first()");
		expect(nthOf("last")).toBe("li.last()");
	});

	it("hands every other value to Playwright's nth as given, null and undefined included", () => {
		expect(nthOf(0)).toBe("li.nth(0)");
		expect(nthOf(-1)).toBe("li.nth(-1)");
		expect(nthOf(1.5)).toBe("li.nth(1.5)");
		expect(nthOf("2")).toBe("li.nth('2')");
		expect(nthOf(null)).toBe("li.nth(null)");
		expect(nthOf(undefined)).toBe("li.nth(undefined)");
	});
});

describe("STRATEGIES", () => {
	it("holds one row per strategy: the DSL method, the primary field, options, the empty-string rule", () => {
		const rows = Object.fromEntries(
			Object.entries(STRATEGIES).map(([type, spec]) => [
				type,
				[spec.method, spec.primary, spec.options, spec.allowEmpty, "optionalPrimary" in spec],
			]),
		);
		expect(rows).toEqual({
			role: ["getByRole", "role", true, false, false],
			text: ["getByText", "text", true, true, false],
			label: ["getByLabel", "text", true, true, false],
			placeholder: ["getByPlaceholder", "text", true, true, false],
			altText: ["getByAltText", "text", true, true, false],
			title: ["getByTitle", "text", true, true, false],
			locator: ["locator", "selector", true, false, false],
			frameLocator: ["frameLocator", "selector", false, false, true],
			testId: ["getByTestId", "testId", false, true, false],
			id: ["getById", "id", false, false, false],
		});
	});

	it("names the ten DSL methods in its type", () => {
		expectTypeOf<StrategyMethod>().toEqualTypeOf<
			| "getByRole"
			| "getByText"
			| "getByLabel"
			| "getByPlaceholder"
			| "getByAltText"
			| "getByTitle"
			| "locator"
			| "frameLocator"
			| "getByTestId"
			| "getById"
		>();
	});

	it("rejects a definition of no known strategy instead of passing it on", () => {
		const unknown = { type: "css", css: "b" } as never;
		expect(() => createLocator(new FakeLocator("") as unknown as LocatorBuilderTarget, unknown)).toThrowError(
			'Unknown locator strategy "css".',
		);
		expect(() => cloneLocatorStrategyDefinition(unknown)).toThrowError('Unknown locator strategy "css".');
		expect(() => applyDefinitionPatch(unknown, unknown)).toThrowError('Unknown locator strategy "css".');
	});
});

describe("assertStrategyPrimary", () => {
	const missing: Record<StrategyType, string> = {
		role: 'getByRole requires a role value for "x".',
		text: 'getByText requires a text value for "x".',
		label: 'getByLabel requires a text value for "x".',
		placeholder: 'getByPlaceholder requires a text value for "x".',
		altText: 'getByAltText requires a text value for "x".',
		title: 'getByTitle requires a text value for "x".',
		locator: 'locator requires a selector value for "x".',
		frameLocator: 'frameLocator requires a selector value for "x".',
		testId: 'getByTestId requires a testId value for "x".',
		id: 'getById requires a non-empty id for "x".',
	};
	const types = Object.keys(missing) as StrategyType[];

	it("gives each strategy's missing-value message, as the builders did", () => {
		for (const type of types) {
			expect(() => assertStrategyPrimary(type, undefined, { method: STRATEGIES[type].method, path: "x" })).toThrowError(
				missing[type],
			);
		}
	});

	it("rejects an empty string where Playwright cannot use it and keeps it where Playwright matches it", () => {
		for (const type of types) {
			const call = () => assertStrategyPrimary(type, "", { method: STRATEGIES[type].method, path: "x" });
			if (STRATEGIES[type].allowEmpty) {
				expect(call).not.toThrow();
			} else if (type === "id") {
				expect(call).toThrowError('getById requires a non-empty id for "x".');
			} else {
				expect(call).toThrowError(
					`${STRATEGIES[type].method} requires a non-empty ${STRATEGIES[type].primary} for "x".`,
				);
			}
		}
	});

	it("accepts a value", () => {
		for (const type of types) {
			expect(() => assertStrategyPrimary(type, "v", { method: STRATEGIES[type].method, path: "x" })).not.toThrow();
		}
	});
});
