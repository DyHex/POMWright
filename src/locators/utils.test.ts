import { describe, expect, it } from "vitest";
import type { IdDefinition, LocatorBuilderTarget } from "./types";
import {
	applyDefinitionPatch,
	assertIdValue,
	buildIdSelector,
	createLocator,
	escapeCssString,
	escapeRegExpForSelector,
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
