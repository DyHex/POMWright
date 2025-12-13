import type { Locator, Page } from "@playwright/test";
import type {
	AltTextDefinition,
	DataCyDefinition,
	FilterDefinition,
	FrameLocatorDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorBuilderTarget,
	LocatorDefinition,
	LocatorOverrides,
	LocatorStep,
	LocatorStepOverride,
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

export const cssEscape = (value: string) => {
	// Simple CSS escape implementation covering common cases.
	return value.replace(/([\\"'#.:;,?*+<>{}[\\]()])/g, "\\$1");
};

export const normalizeSteps = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	steps?: LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
) => (steps ? steps.map((step) => ({ ...step })) : []);

export const normalizeOverrideSteps = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	value?:
		| LocatorOverrides<LocatorSchemaPathType, AllowedPaths>[keyof LocatorOverrides<LocatorSchemaPathType, AllowedPaths>]
		| undefined,
) => {
	if (value === undefined) {
		return { steps: [] as LocatorStep<LocatorSchemaPathType, AllowedPaths>[], replaceIndex: false };
	}

	if (typeof value === "number" || value === "first" || value === "last" || value === null) {
		return {
			steps: [{ kind: "index", index: value }] as LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
			replaceIndex: true,
		};
	}

	const entries = Array.isArray(value) ? value : [value];
	const steps: LocatorStep<LocatorSchemaPathType, AllowedPaths>[] = [];
	let replaceIndex = false;

	for (const entry of entries as LocatorStepOverride<LocatorSchemaPathType, AllowedPaths>[]) {
		if (entry && typeof entry === "object" && "nth" in entry) {
			steps.push({ kind: "index", index: entry.nth ?? null });
			replaceIndex = true;
			continue;
		}

		if (entry && typeof entry === "object" && "filter" in entry) {
			steps.push({ kind: "filter", filter: entry.filter });
			continue;
		}

		steps.push({ kind: "filter", filter: entry as FilterDefinition<LocatorSchemaPathType, AllowedPaths> });
	}

	return { steps, replaceIndex } as const;
};

export function normalizeIdValue(id: string): string;
export function normalizeIdValue(id: RegExp): RegExp;
export function normalizeIdValue(id: string | RegExp | undefined): string | RegExp | undefined;
export function normalizeIdValue(id: string | RegExp | undefined) {
	if (typeof id !== "string") {
		return id;
	}

	if (id.startsWith("#")) {
		return id.slice(1);
	}

	if (id.startsWith("id=")) {
		return id.slice("id=".length);
	}

	return id;
}

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

export const createLocator = (
	target: LocatorBuilderTarget,
	definition: LocatorStrategyDefinition,
): Locator | ReturnType<Page["frameLocator"]> => {
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
		case "frameLocator":
			return target.frameLocator(definition.selector);
		case "testId":
			return target.getByTestId(definition.testId);
		case "id": {
			if (typeof definition.id === "string") {
				const normalized = normalizeIdValue(definition.id);
				return target.locator(`#${cssEscape(normalized ?? "")}`);
			}
			const pattern = definition.id.source;
			const safePattern = cssEscape(pattern);
			return target.locator(`[id*="${safePattern}"]`);
		}
		case "dataCy":
			return target.locator(`data-cy=${definition.value}`);
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
			return { type: "frameLocator", selector: definition.selector };
		case "testId":
			return { type: "testId", testId: definition.testId };
		case "id":
			return { type: "id", id: definition.id };
		case "dataCy":
			return { type: "dataCy", value: definition.value };
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
			return { type: "frameLocator", selector } satisfies FrameLocatorDefinition;
		}
		case "testId": {
			const testId = patch.testId !== undefined ? patch.testId : (base as TestIdDefinition).testId;
			return { type: "testId", testId } satisfies TestIdDefinition;
		}
		case "id": {
			const id =
				patch.id !== undefined ? (normalizeIdValue(patch.id) ?? (base as IdDefinition).id) : (base as IdDefinition).id;
			return { type: "id", id } satisfies IdDefinition;
		}
		case "dataCy": {
			const value = patch.value ?? (base as DataCyDefinition).value;
			return { type: "dataCy", value } satisfies DataCyDefinition;
		}
		default: {
			const exhaustive: never = patch;
			return exhaustive;
		}
	}
};

export const isFrameLocatorDefinition = (definition: LocatorStrategyDefinition): definition is FrameLocatorDefinition =>
	definition.type === "frameLocator";

export const isLocatorInstance = (value: unknown): value is Locator => {
	return !!value && typeof value === "object" && typeof (value as Locator).filter === "function";
};
