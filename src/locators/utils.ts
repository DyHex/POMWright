import type { Locator } from "@playwright/test";
import type {
	FrameLocatorDefinition,
	IdDefinition,
	IndexSelector,
	LocatorBuilderTarget,
	LocatorDefinitionByType,
	LocatorStep,
	LocatorStrategyDefinition,
	LocatorStrategyDefinitionPatch,
	OptionsPatch,
} from "./types";

/**
 * The characters a locator schema path may not contain: Unicode White_Space (UAX #44) plus U+FEFF,
 * which JavaScript's `\s` has always matched. `UnicodeWhitespaceChar` is derived from this list, so the
 * type-level check and the runtime check cannot drift.
 */
export const LOCATOR_SCHEMA_PATH_WHITESPACE = [
	"\u0009",
	"\u000A",
	"\u000B",
	"\u000C",
	"\u000D",
	"\u0020",
	"\u0085",
	"\u00A0",
	"\u1680",
	"\u2000",
	"\u2001",
	"\u2002",
	"\u2003",
	"\u2004",
	"\u2005",
	"\u2006",
	"\u2007",
	"\u2008",
	"\u2009",
	"\u200A",
	"\u2028",
	"\u2029",
	"\u202F",
	"\u205F",
	"\u3000",
	"\uFEFF",
] as const;

const RUNTIME_WHITESPACE_REGEX = new RegExp(`[${LOCATOR_SCHEMA_PATH_WHITESPACE.join("")}]`, "u");
// The listed characters JSON.stringify leaves as they are, except the plain space, which is visible.
const UNESCAPED_WHITESPACE_REGEX = new RegExp(
	`[${LOCATOR_SCHEMA_PATH_WHITESPACE.filter((char) => char !== " ").join("")}]`,
	"gu",
);

/**
 * Formats a path for an error message so that its whitespace is visible: `JSON.stringify` escapes
 * quotes, backslashes and the C0 controls (`"a\tb"` shows as `a\\tb`), and every other listed
 * character but the plain space is shown as a `\u` escape (`"a\u00A0b"` shows as `a\\u00A0b`).
 */
export const formatLocatorSchemaPathForError = (path: string): string =>
	JSON.stringify(path)
		.slice(1, -1)
		.replace(
			UNESCAPED_WHITESPACE_REGEX,
			(char) => `\\u${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
		);

/** How an error message names a value that is not of the expected type: a primitive as itself, anything else as an object. */
export const describeReceived = (value: unknown): string =>
	value === null || (typeof value !== "object" && typeof value !== "function") ? String(value) : "an object";

/**
 * Checks a path against every rule, in a fixed order (whitespace, a leading dot, a trailing dot, consecutive dots), the
 * order `LocatorSchemaPathFormat` names them at compile time. One broken rule gives its own message; several give one
 * message naming them all. The path is shown escaped when whitespace is among them.
 */
export const validateLocatorSchemaPath = (path: unknown) => {
	if (typeof path !== "string") {
		throw new Error(`LocatorSchemaPath must be a string; received ${describeReceived(path)}.`);
	}
	if (!path) {
		throw new Error("LocatorSchemaPath string cannot be empty");
	}
	const broken = [
		RUNTIME_WHITESPACE_REGEX.test(path) && "contain whitespace chars",
		path.startsWith(".") && "start with a dot",
		path.endsWith(".") && "end with a dot",
		path.includes("..") && "contain consecutive dots",
	].filter((rule) => rule !== false);
	if (broken.length === 0) {
		return;
	}
	const shown = broken[0] === "contain whitespace chars" ? formatLocatorSchemaPathForError(path) : path;
	const last = broken.pop();
	const rules = broken.length === 0 ? `cannot ${last}` : `cannot ${broken.join(", cannot ")} and cannot ${last}`;
	throw new Error(`LocatorSchemaPath string ${rules}: ${shown}`);
};

/** A path's chain, each ancestor then the path itself, for a path already checked. */
export const schemaPathChain = (path: string): string[] => {
	const parts = path.split(".");
	return parts.map((_part, index) => parts.slice(0, index + 1).join("."));
};

export const expandSchemaPath = (path: string): string[] => {
	validateLocatorSchemaPath(path);
	return schemaPathChain(path);
};

/**
 * Escapes a value for use inside a double-quoted CSS string, e.g. `[id="…"]`.
 * Only `"`, `\` and the three CSS newline characters (LF, CR, FF) are special there; everything
 * else, including `.`, `:`, `[`, spaces and non-ASCII, is passed through verbatim. NUL is left as
 * is: no CSS selector can express it, so such an id is unmatchable either way.
 */
export const escapeCssString = (value: string): string =>
	value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\a ")
		.replace(/\r/g, "\\d ")
		.replace(/\f/g, "\\c ");

/**
 * Serializes a RegExp for Playwright's selector syntax (`internal:attr=[id=/source/flags]`).
 * Based on Playwright's `escapeRegexForSelector` (playwright-core, Apache-2.0): unescaped quotes
 * and backticks are backslash-escaped, and `>>` is escaped so the selector parser does not split
 * the chain. Unicode mode (`u`, `v`) rejects those identity escapes, and Playwright passes such a
 * RegExp through as it is, which its own parser then fails on; here a quote or a backtick is
 * written by its code (`\x22`, `\x27`, `\x60`) and the second `>` of each `>>` as `\x3e`, so a
 * named group's closing `>` stays. Only the selector text changes, never the RegExp it describes.
 * All flags are kept; POMWright adds no regex semantics of its own.
 */
export const escapeRegExpForSelector = (re: RegExp): string => {
	if (re.flags.includes("u") || re.flags.includes("v")) {
		return String(re)
			.replace(/["'`]/g, (quote) => `\\x${quote.charCodeAt(0).toString(16)}`)
			.replace(/>>/g, ">\\x3e");
	}
	return String(re)
		.replace(/(^|[^\\])(\\\\)*(["'`])/g, "$1$2\\$3")
		.replace(/>>/g, "\\>\\>");
};

/**
 * Builds the selector string for an `id` definition: an exact, case-sensitive attribute match for
 * strings, and Playwright's attribute engine with a real RegExp for patterns (the same engine
 * `getByTestId(RegExp)` compiles to).
 */
export const buildIdSelector = (id: string | RegExp): string =>
	typeof id === "string" ? `[id="${escapeCssString(id)}"]` : `internal:attr=[id=${escapeRegExpForSelector(id)}]`;

/**
 * Validates a strategy's primary argument at the DSL boundary. A missing value always throws; an
 * empty string throws unless `allowEmpty` is set, which is the case for the strategies Playwright
 * can match with an empty string (`getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`,
 * `getByTitle`, `getByTestId`). RegExp values are accepted as they are. The message names the
 * calling method and, when known, the registry path.
 */
export function assertPrimaryValue(
	value: string | RegExp | undefined,
	source: { method: string; field: string; path?: string; allowEmpty: boolean },
): asserts value is string | RegExp {
	const where = source.path === undefined ? "" : ` for "${source.path}"`;
	if (value === undefined) {
		const article = /^[aeiou]/i.test(source.field) ? "an" : "a";
		throw new Error(`${source.method} requires ${article} ${source.field} value${where}.`);
	}
	if (!source.allowEmpty && typeof value === "string" && value.length === 0) {
		throw new Error(`${source.method} requires a non-empty ${source.field}${where}.`);
	}
}

/**
 * Validates an id value at the DSL boundary. Throws for an empty string or a missing value, naming
 * the calling method and, when known, the registry path. RegExp values are accepted as they are.
 */
export function assertIdValue(
	id: string | RegExp | undefined,
	source: { method: string; path?: string },
): asserts id is string | RegExp {
	if (id === undefined) {
		const where = source.path === undefined ? "" : ` for "${source.path}"`;
		throw new Error(`${source.method} requires a non-empty id${where}.`);
	}
	assertPrimaryValue(id, { ...source, field: "id", allowEmpty: false });
}

/**
 * A leaf of a definition, an options object or a filter, as the registry keeps it. A RegExp is copied with its source
 * and flags, since `RegExp.prototype.compile()` rewrites one in place; a primitive is a value; a Locator is kept, since
 * every method of a Locator returns a new one.
 */
export const copyValue = <Value>(value: Value): Value =>
	value instanceof RegExp ? (new RegExp(value) as Value) : value;

/**
 * The entries of an options, patch or filter object as Playwright reads them, by property access: the object's own
 * properties, enumerable or not, then the properties of its prototypes up to `Object.prototype`, such as a class's
 * getters or an inherited default. Methods are left out, except an own enumerable one, which `Object.entries` keeps.
 */
export const readFields = (fields: object): [string, unknown][] => {
	const entries: [string, unknown][] = Object.entries(fields);
	let prototype: object | null = Object.getPrototypeOf(fields);
	const ownNames = Object.getOwnPropertyNames(fields);
	// a plain object whose own properties are all enumerable, the common case, has nothing more to read
	if ((prototype === null || prototype === Object.prototype) && ownNames.length === entries.length) {
		return entries;
	}
	const seen = new Set(entries.map(([key]) => key));
	// own properties that are not enumerable (Object.defineProperty), which Playwright reads by property access too
	for (const name of ownNames) {
		if (seen.has(name)) {
			continue;
		}
		seen.add(name);
		const value: unknown = (fields as Record<string, unknown>)[name];
		if (typeof value !== "function") {
			entries.push([name, value]);
		}
	}
	for (; prototype !== null && prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype)) {
		for (const name of Object.getOwnPropertyNames(prototype)) {
			if (seen.has(name)) {
				continue;
			}
			seen.add(name);
			const value: unknown = (fields as Record<string, unknown>)[name];
			if (typeof value !== "function") {
				entries.push([name, value]);
			}
		}
	}
	return entries;
};

/**
 * An options or filter object, copied with every value through `copyValue`, read as Playwright reads it
 * (`readFields`). Its values are leaves (strings, numbers, booleans, RegExps, Locators), so nothing below it is left to
 * copy.
 */
export const copyFields = <Fields extends object>(fields: Fields): Fields =>
	Object.fromEntries(readFields(fields).map(([key, value]) => [key, copyValue(value)])) as Fields;

/** A filter as given, copied with `copyFields`: a copy shares nothing a caller can change. */
export const copyFilter = <Filter>(filter: Filter): Filter =>
	typeof filter === "object" && filter !== null ? copyFields(filter) : filter;

/** Copies steps and their filter objects, so no copy shares anything a caller or another copy can change. */
export const normalizeSteps = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	steps?: LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
) =>
	steps
		? steps.map((step) => (step.kind === "filter" ? { ...step, filter: copyFilter(step.filter) } : { ...step }))
		: [];

/** Validates `describe`'s argument at the DSL boundary: a string; `""` removes the description. */
export function assertDescription(
	description: unknown,
	source: { method: string; path?: string },
): asserts description is string {
	if (typeof description === "string") {
		return;
	}
	const where = source.path === undefined ? "" : ` for "${source.path}"`;
	throw new Error(`${source.method} requires a string${where}; pass "" to remove the description.`);
}

/**
 * JSON for error messages. A Playwright `Locator` is printed as Playwright prints it, a RegExp as its source and
 * flags, each time it appears; `"[Circular]"` marks only an object that contains itself.
 */
export const stringifyForLog = (value: unknown) => {
	const printable = (current: unknown, ancestors: readonly object[]): unknown => {
		if (isLocatorInstance(current)) {
			return String(current);
		}
		if (current instanceof RegExp) {
			return { type: "RegExp", source: current.source, flags: current.flags };
		}
		if (typeof current !== "object" || current === null) {
			return current;
		}
		if (ancestors.includes(current)) {
			return "[Circular]";
		}
		const inside = [...ancestors, current];
		if (Array.isArray(current)) {
			return current.map((item) => printable(item, inside));
		}
		return Object.fromEntries(Object.entries(current).map(([key, item]) => [key, printable(item, inside)]));
	};
	return JSON.stringify(printable(value, []), null, 2);
};

/** `"first"` and `"last"` are POMWright's; every other value goes to Playwright's `nth` as given. */
export const applyIndexSelector = (locator: Locator, selector: IndexSelector) => {
	if (selector === "first") {
		return locator.first();
	}
	if (selector === "last") {
		return locator.last();
	}
	return locator.nth(selector);
};

export type StrategyType = LocatorStrategyDefinition["type"];

/** The definition field that holds a strategy's first argument: `role`, `text`, `selector`, `testId` or `id`. */
type PrimaryField<Type extends StrategyType> = Exclude<keyof LocatorDefinitionByType[Type], "type" | "options">;

/** What POMWright needs to know about one strategy. Every per-strategy rule reads it from `STRATEGIES`. */
type StrategySpec<Type extends StrategyType> = {
	/** The DSL method, as `add(path)`, `createReusable`, `update` and `replace` name it. */
	readonly method: string;
	/** The definition field that holds the first argument. */
	readonly primary: PrimaryField<Type>;
	/** Whether the strategy takes Playwright's options object. */
	readonly options: "options" extends keyof LocatorDefinitionByType[Type] ? true : false;
	/** Whether `""` is a value Playwright matches, so it is stored rather than rejected. */
	readonly allowEmpty: boolean;
	/** Whether the first argument may be absent: only `frameLocator()`, Playwright's any-frame locator. */
	readonly optionalPrimary?: true;
	/** Builds the element locator on a page, a locator or a frame. */
	readonly create: (target: LocatorBuilderTarget, definition: LocatorDefinitionByType[Type]) => Locator;
};

/** The ten strategies, one row each, in the order the DSL lists them. */
export const STRATEGIES = {
	role: {
		method: "getByRole",
		primary: "role",
		options: true,
		allowEmpty: false,
		create: (target, definition) => target.getByRole(definition.role, definition.options),
	},
	text: {
		method: "getByText",
		primary: "text",
		options: true,
		allowEmpty: true,
		create: (target, definition) => target.getByText(definition.text, definition.options),
	},
	label: {
		method: "getByLabel",
		primary: "text",
		options: true,
		allowEmpty: true,
		create: (target, definition) => target.getByLabel(definition.text, definition.options),
	},
	placeholder: {
		method: "getByPlaceholder",
		primary: "text",
		options: true,
		allowEmpty: true,
		create: (target, definition) => target.getByPlaceholder(definition.text, definition.options),
	},
	altText: {
		method: "getByAltText",
		primary: "text",
		options: true,
		allowEmpty: true,
		create: (target, definition) => target.getByAltText(definition.text, definition.options),
	},
	title: {
		method: "getByTitle",
		primary: "text",
		options: true,
		allowEmpty: true,
		create: (target, definition) => target.getByTitle(definition.text, definition.options),
	},
	locator: {
		method: "locator",
		primary: "selector",
		options: true,
		allowEmpty: false,
		create: (target, definition) => target.locator(definition.selector, definition.options),
	},
	frameLocator: {
		method: "frameLocator",
		primary: "selector",
		options: false,
		allowEmpty: false,
		optionalPrimary: true,
		create: (target, definition) => {
			if (definition.selector === undefined) {
				throw new Error(
					'Locator definition of type "frameLocator" has no selector; the any-frame form is resolved by the chain.',
				);
			}
			return target.locator(definition.selector);
		},
	},
	testId: {
		method: "getByTestId",
		primary: "testId",
		options: false,
		allowEmpty: true,
		create: (target, definition) => target.getByTestId(definition.testId),
	},
	id: {
		method: "getById",
		primary: "id",
		options: false,
		allowEmpty: false,
		create: (target, definition) => {
			const { id } = definition as { id?: IdDefinition["id"] };
			if (id === undefined) {
				throw new Error('Locator definition of type "id" has no id value.');
			}
			return target.locator(buildIdSelector(id));
		},
	},
} as const satisfies { [Type in StrategyType]: StrategySpec<Type> };

/** The DSL method names, in table order. */
export type StrategyMethod = (typeof STRATEGIES)[StrategyType]["method"];

/** A definition or a patch read field by field; the table says which fields a strategy has. */
type DefinitionFields = { type: StrategyType; options?: object | null } & Record<string, unknown>;

/** A row as the generic helpers read it: the field names as strings, the definition as the row's own. */
type StrategyRow = {
	readonly method: string;
	readonly primary: string;
	readonly options: boolean;
	readonly allowEmpty: boolean;
	readonly optionalPrimary?: true;
	readonly create: (target: LocatorBuilderTarget, definition: never) => Locator;
};

export const strategyOf = (type: StrategyType): StrategyRow => {
	const spec = (STRATEGIES as unknown as Record<string, StrategyRow | undefined>)[type];
	if (spec === undefined) {
		throw new Error(`Unknown locator strategy "${String(type)}".`);
	}
	return spec;
};

/** Assembles a definition: the primary unless an any-frame selector is absent, then options when given. */
export const assembleDefinition = (type: StrategyType, primary: unknown, options: object | undefined) => {
	const spec = strategyOf(type);
	return {
		type,
		...(primary !== undefined || !spec.optionalPrimary ? { [spec.primary]: primary } : {}),
		...(options !== undefined ? { options } : {}),
	} as LocatorStrategyDefinition;
};

/** The strategies whose first argument may be a RegExp, as Playwright's own methods allow. */
const REGEXP_PRIMARIES: ReadonlySet<StrategyType> = new Set([
	"text",
	"label",
	"placeholder",
	"altText",
	"title",
	"testId",
	"id",
]);

/** The table's check of a strategy's first argument at the DSL boundary; `getById` keeps its own message. */
export function assertStrategyPrimary(
	type: StrategyType,
	value: unknown,
	source: { method: string; path?: string },
): asserts value is string | RegExp {
	// A primary Playwright cannot take for this strategy (null, a number, a RegExp where only strings go) is
	// no primary at all: it gets the missing-value message, as add() has always given a non-string role.
	const accepted = typeof value === "string" || (value instanceof RegExp && REGEXP_PRIMARIES.has(type));
	const given = value === undefined || accepted ? value : undefined;
	if (type === "id") {
		assertIdValue(given as string | RegExp | undefined, source);
		return;
	}
	const spec = strategyOf(type);
	assertPrimaryValue(given as string | RegExp | undefined, {
		...source,
		field: spec.primary,
		allowEmpty: spec.allowEmpty,
	});
}

export const createLocator = (target: LocatorBuilderTarget, definition: LocatorStrategyDefinition): Locator =>
	strategyOf(definition.type).create(target, definition as never);

/** A definition copied all the way to its leaves: the first argument and every option through `copyValue`. */
export const cloneLocatorStrategyDefinition = (definition: LocatorStrategyDefinition): LocatorStrategyDefinition => {
	const spec = strategyOf(definition.type);
	const fields = definition as unknown as DefinitionFields;
	return assembleDefinition(
		definition.type,
		copyValue(fields[spec.primary]),
		spec.options && fields.options ? copyFields(fields.options) : undefined,
	);
};

/**
 * JSON Merge Patch over a Playwright options object: an absent patch leaves the options alone,
 * `null` deletes them all, and inside a patch a `null` key is deleted, an `undefined` key is skipped
 * and any other value replaces. An empty result is no options at all.
 */
export const mergeOptions = <Options extends object>(
	current: Options | undefined,
	patch: OptionsPatch<Options> | null | undefined,
): Options | undefined => {
	if (patch === undefined) {
		return current;
	}
	if (patch === null) {
		return undefined;
	}
	const merged: Record<string, unknown> = { ...(current ?? {}) };
	for (const [key, value] of readFields(patch)) {
		if (value === undefined) {
			continue;
		}
		if (value === null) {
			delete merged[key];
		} else {
			merged[key] = value;
		}
	}
	return Object.keys(merged).length > 0 ? (merged as Options) : undefined;
};

/** A seeded override: a provided primary replaces the seed's; the options follow JSON Merge Patch, as `update`'s. */
export const applyDefinitionPatch = (
	seed: LocatorStrategyDefinition,
	patch: LocatorStrategyDefinition | LocatorStrategyDefinitionPatch,
): LocatorStrategyDefinition => {
	if (patch.type !== seed.type) {
		throw new Error(`applyDefinitionPatch: a "${seed.type}" seed cannot take a "${patch.type}" patch.`);
	}
	const spec = strategyOf(seed.type);
	const base = cloneLocatorStrategyDefinition(seed) as unknown as DefinitionFields;
	const given = patch as unknown as DefinitionFields;
	const primary = given[spec.primary] !== undefined ? given[spec.primary] : base[spec.primary];
	const options = spec.options
		? mergeOptions(base.options ?? undefined, given.options as OptionsPatch<object> | null | undefined)
		: undefined;
	return assembleDefinition(seed.type, primary, options);
};

/** Reads a definition or a patch field by field, for the generic merge and replacement in `locatorUpdateBuilder.ts`. */
export const definitionFields = (definition: object) => definition as DefinitionFields;

export const isFrameLocatorDefinition = (definition: LocatorStrategyDefinition): definition is FrameLocatorDefinition =>
	definition.type === "frameLocator";

/** Message for an any-frame segment that is not the first resolved segment of its chain (Playwright's rule). */
export const anyFrameNotFirstMessage = (part: string, ancestor: string) =>
	`frameLocator() without a selector must be the first segment of the chain; "${part}" has the ancestor "${ancestor}".`;

/** Message for an any-frame segment used where an element is needed: a terminal, a filter reference, a step. */
export const anyFrameNoElementMessage = (part: string) =>
	`frameLocator() without a selector does not point to a particular iframe; "${part}" cannot be resolved on its own, filtered or indexed; resolve a path inside it.`;

/** A step or description offered to an any-frame definition: by `filter()`, `nth()`, `describe()` or a reused seed. */
export const anyFrameStepsMessage = (what: string, part: string) =>
	`${what} cannot apply to "${part}": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`;

/** `replace(sub).frameLocator()` on a segment that has steps in the query: the any-frame form takes none. */
export const anyFrameReplaceStepsMessage = (part: string) =>
	`replace() cannot apply to "${part}": it has filter or nth steps, and frameLocator() without a selector takes none; call clearSteps("${part}") first.`;

/** `replace().frameLocator()` on the path a query resolves: the any-frame form has no terminal form. */
export const anyFrameReplaceTerminalMessage = (part: string) =>
	`replace() cannot apply to "${part}": it is the path this query resolves, and frameLocator() without a selector has no element to resolve to; replace an ancestor instead.`;

/** The any-frame form of a frame segment: `frameLocator()` registered without a selector. */
export const isAnyFrameDefinition = (definition: LocatorStrategyDefinition): definition is FrameLocatorDefinition =>
	definition.type === "frameLocator" && definition.selector === undefined;

/** The ten DSL method names by strategy type, for error messages. */
export const methodForStrategy = Object.fromEntries(
	Object.entries(STRATEGIES).map(([type, spec]) => [type, spec.method]),
) as { [Type in StrategyType]: (typeof STRATEGIES)[Type]["method"] };

/** Whether a value has the shape of a seed: an object whose `definition` names one of the ten strategies. */
export const isReusableLocator = (value: unknown): value is { definition: LocatorStrategyDefinition } => {
	const definition = (value as { definition?: unknown } | null | undefined)?.definition;
	return (
		typeof definition === "object" &&
		definition !== null &&
		Object.hasOwn(STRATEGIES, (definition as { type?: unknown }).type as PropertyKey)
	);
};

/**
 * Whether a value is a Playwright `Locator`: an object with `filter`, `nth` and `locator` methods. An
 * array (which has `filter`), a `FrameLocator` (no `filter`) and a `Page` (no `filter` or `nth`) are not.
 */
export const isLocatorInstance = (value: unknown): value is Locator =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as Locator).filter === "function" &&
	typeof (value as Locator).nth === "function" &&
	typeof (value as Locator).locator === "function";
