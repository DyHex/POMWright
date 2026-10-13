import type { Locator } from "@playwright/test";
import type {
	AltTextDefinition,
	FrameLocatorDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorBuilderTarget,
	LocatorDefinition,
	LocatorStep,
	LocatorStrategyDefinition,
	LocatorStrategyDefinitionPatch,
	PlaceholderDefinition,
	RoleDefinition,
	TestIdDefinition,
	TextDefinition,
	TitleDefinition,
} from "./types";

// Used only at runtime for messages: escape all special chars so
// whitespace, quotes, etc. are visible and testable.
export const formatLocatorSchemaPathForError = (path: string): string => {
	// JSON.stringify returns a quoted string literal; strip the outer quotes.
	// Example:
	//   path = "\n"         -> JSON.stringify -> "\"\\n\""      -> "\\n"
	//   path = "a\u00A0b"   -> "\"a\\u00a0b\"" -> "a\\u00a0b"
	const json = JSON.stringify(path);
	return json.slice(1, -1);
};

// Precompiled regex for "any JS whitespace OR U+0085"
const RUNTIME_WHITESPACE_REGEX = /[\s\u0085]/u;

export const validateLocatorSchemaPath = (path: string) => {
	if (!path) {
		throw new Error("LocatorSchemaPath string cannot be empty");
	}

	// Runtime: reject any Unicode whitespace (aligned with compile-time)
	if (RUNTIME_WHITESPACE_REGEX.test(path)) {
		const escaped = formatLocatorSchemaPathForError(path);
		throw new Error(`LocatorSchemaPath string cannot contain whitespace chars: ${escaped}`);
	}

	if (path.startsWith(".")) {
		throw new Error(`LocatorSchemaPath string cannot start with a dot: ${path}`);
	}

	if (path.endsWith(".")) {
		throw new Error(`LocatorSchemaPath string cannot end with a dot: ${path}`);
	}

	if (path.includes("..")) {
		throw new Error(`LocatorSchemaPath string cannot contain consecutive dots: ${path}`);
	}
};

export const expandSchemaPath = (path: string): string[] => {
	validateLocatorSchemaPath(path);
	const parts = path.split(".");
	return parts.map((_part, index) => parts.slice(0, index + 1).join("."));
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
 * Serialises a RegExp for Playwright's selector syntax (`internal:attr=[id=/source/flags]`).
 * Port of Playwright's `escapeRegexForSelector` (playwright-core, Apache-2.0): unescaped quotes
 * and backticks are backslash-escaped, `>>` is escaped so the selector parser does not split the
 * chain, and unicode-mode regexes (`u`, `v`) are passed through as-is because unicode mode rejects
 * identity escapes. All flags are kept; POMWright adds no regex semantics of its own.
 */
export const escapeRegExpForSelector = (re: RegExp): string => {
	if (re.flags.includes("u") || re.flags.includes("v")) {
		return String(re);
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

export const normalizeSteps = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	steps?: LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
) => (steps ? steps.map((step) => ({ ...step })) : []);

export const stringifyForLog = (value: unknown) => {
	const seen = new WeakSet();
	return JSON.stringify(
		value,
		(_key, current) => {
			if (typeof current === "object" && current !== null) {
				if (seen.has(current)) {
					return "[Circular]";
				}
				seen.add(current);
			}
			if (current instanceof RegExp) {
				return { type: "RegExp", source: current.source, flags: current.flags };
			}
			return current;
		},
		2,
	);
};

export const applyIndexSelector = (locator: Locator, selector: IndexSelector | null | undefined) => {
	if (selector === undefined || selector === null) {
		return locator;
	}
	if (selector === "first") {
		return locator.first();
	}
	if (selector === "last") {
		return locator.last();
	}
	return locator.nth(selector);
};

export const createLocator = (target: LocatorBuilderTarget, definition: LocatorStrategyDefinition): Locator => {
	switch (definition.type) {
		case "role":
			return target.getByRole(definition.role, definition.options);
		case "text":
			return target.getByText(definition.text, definition.options);
		case "label":
			return target.getByLabel(definition.text, definition.options);
		case "placeholder":
			return target.getByPlaceholder(definition.text, definition.options);
		case "altText":
			return target.getByAltText(definition.text, definition.options);
		case "title":
			return target.getByTitle(definition.text, definition.options);
		case "locator":
			return target.locator(definition.selector, definition.options);
		case "frameLocator": {
			if (definition.selector === undefined) {
				throw new Error(
					'Locator definition of type "frameLocator" has no selector; the any-frame form is resolved by the chain.',
				);
			}
			return target.locator(definition.selector);
		}
		case "testId":
			return target.getByTestId(definition.testId);
		case "id": {
			const { id } = definition as { id?: IdDefinition["id"] };
			if (id === undefined) {
				throw new Error('Locator definition of type "id" has no id value.');
			}
			return target.locator(buildIdSelector(id));
		}
		default: {
			const exhaustive: never = definition;
			return exhaustive;
		}
	}
};

export const cloneLocatorStrategyDefinition = (definition: LocatorStrategyDefinition): LocatorStrategyDefinition => {
	switch (definition.type) {
		case "role":
			return {
				type: "role",
				role: definition.role,
				...(definition.options ? { options: { ...definition.options } } : {}),
			};
		case "text":
			return {
				type: "text",
				text: definition.text,
				...(definition.options ? { options: { ...definition.options } } : {}),
			};
		case "label":
			return {
				type: "label",
				text: definition.text,
				...(definition.options ? { options: { ...definition.options } } : {}),
			};
		case "placeholder":
			return {
				type: "placeholder",
				text: definition.text,
				...(definition.options ? { options: { ...definition.options } } : {}),
			};
		case "altText":
			return {
				type: "altText",
				text: definition.text,
				...(definition.options ? { options: { ...definition.options } } : {}),
			};
		case "title":
			return {
				type: "title",
				text: definition.text,
				...(definition.options ? { options: { ...definition.options } } : {}),
			};
		case "locator":
			return {
				type: "locator",
				selector: definition.selector,
				...(definition.options ? { options: { ...definition.options } } : {}),
			};
		case "frameLocator":
			return {
				type: "frameLocator",
				...(definition.selector !== undefined ? { selector: definition.selector } : {}),
			};
		case "testId":
			return { type: "testId", testId: definition.testId };
		case "id":
			return { type: "id", id: definition.id };
		default: {
			const exhaustive: never = definition;
			return exhaustive;
		}
	}
};

export const applyDefinitionPatch = (
	seed: LocatorStrategyDefinition,
	patch: LocatorStrategyDefinition | LocatorStrategyDefinitionPatch,
): LocatorStrategyDefinition => {
	const base = cloneLocatorStrategyDefinition(seed);

	switch (patch.type) {
		case "locator": {
			const selector = patch.selector !== undefined ? patch.selector : (base as LocatorDefinition).selector;
			const options =
				patch.options || (base as LocatorDefinition).options
					? { ...(base as LocatorDefinition).options, ...patch.options }
					: undefined;
			return { type: "locator", selector, ...(options ? { options } : {}) } satisfies LocatorDefinition;
		}
		case "role": {
			const role = patch.role ?? (base as RoleDefinition).role;
			const options =
				patch.options || (base as RoleDefinition).options
					? { ...(base as RoleDefinition).options, ...patch.options }
					: undefined;
			return { type: "role", role, ...(options ? { options } : {}) } satisfies RoleDefinition;
		}
		case "text": {
			const text = patch.text ?? (base as TextDefinition).text;
			const options =
				patch.options || (base as TextDefinition).options
					? { ...(base as TextDefinition).options, ...patch.options }
					: undefined;
			return { type: "text", text, ...(options ? { options } : {}) } satisfies TextDefinition;
		}
		case "label": {
			const text = patch.text ?? (base as LabelDefinition).text;
			const options =
				patch.options || (base as LabelDefinition).options
					? { ...(base as LabelDefinition).options, ...patch.options }
					: undefined;
			return { type: "label", text, ...(options ? { options } : {}) } satisfies LabelDefinition;
		}
		case "placeholder": {
			const text = patch.text ?? (base as PlaceholderDefinition).text;
			const options =
				patch.options || (base as PlaceholderDefinition).options
					? { ...(base as PlaceholderDefinition).options, ...patch.options }
					: undefined;
			return { type: "placeholder", text, ...(options ? { options } : {}) } satisfies PlaceholderDefinition;
		}
		case "altText": {
			const text = patch.text ?? (base as AltTextDefinition).text;
			const options =
				patch.options || (base as AltTextDefinition).options
					? { ...(base as AltTextDefinition).options, ...patch.options }
					: undefined;
			return { type: "altText", text, ...(options ? { options } : {}) } satisfies AltTextDefinition;
		}
		case "title": {
			const text = patch.text ?? (base as TitleDefinition).text;
			const options =
				patch.options || (base as TitleDefinition).options
					? { ...(base as TitleDefinition).options, ...patch.options }
					: undefined;
			return { type: "title", text, ...(options ? { options } : {}) } satisfies TitleDefinition;
		}
		case "frameLocator": {
			const selector = patch.selector !== undefined ? patch.selector : (base as FrameLocatorDefinition).selector;
			return {
				type: "frameLocator",
				...(selector !== undefined ? { selector } : {}),
			} satisfies FrameLocatorDefinition;
		}
		case "testId": {
			const testId = patch.testId !== undefined ? patch.testId : (base as TestIdDefinition).testId;
			return { type: "testId", testId } satisfies TestIdDefinition;
		}
		case "id": {
			const id = patch.id !== undefined ? patch.id : (base as IdDefinition).id;
			return { type: "id", id } satisfies IdDefinition;
		}
		default: {
			const exhaustive: never = patch;
			return exhaustive;
		}
	}
};

export const isFrameLocatorDefinition = (definition: LocatorStrategyDefinition): definition is FrameLocatorDefinition =>
	definition.type === "frameLocator";

/** Message for an any-frame segment that is not the first resolved segment of its chain (Playwright's rule). */
export const anyFrameNotFirstMessage = (part: string, ancestor: string) =>
	`frameLocator() without a selector must be the first segment of the chain; "${part}" has the ancestor "${ancestor}".`;

/** Message for an any-frame segment used where an element is needed: a terminal, a filter reference, a step. */
export const anyFrameNoElementMessage = (part: string) =>
	`frameLocator() without a selector does not point to a particular iframe; "${part}" cannot be resolved on its own, filtered or indexed; resolve a path inside it.`;

/** The any-frame form of a frame segment: `frameLocator()` registered without a selector. */
export const isAnyFrameDefinition = (definition: LocatorStrategyDefinition): definition is FrameLocatorDefinition =>
	definition.type === "frameLocator" && definition.selector === undefined;

/** The ten DSL method names by strategy type, for error messages. */
export const methodForStrategy: Record<LocatorStrategyDefinition["type"], string> = {
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
};

export const isLocatorInstance = (value: unknown): value is Locator => {
	return !!value && typeof value === "object" && typeof (value as Locator).filter === "function";
};
