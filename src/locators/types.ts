import type { FrameLocator, Locator, Page } from "@playwright/test";
import type { LOCATOR_SCHEMA_PATH_WHITESPACE } from "./utils";

/** A character the path check rejects; the same list drives the runtime check in `validateLocatorSchemaPath`. */
export type UnicodeWhitespaceChar = (typeof LOCATOR_SCHEMA_PATH_WHITESPACE)[number];

export type LocatorSchemaPathError<S extends string, Reason extends string> = [
	"Invalid locator schema path",
	Reason,
	S,
];

/**
 * The path rules as a type: `S` itself when it is a well-formed path (not empty, no leading, trailing or consecutive
 * `.`, no whitespace), otherwise a tuple naming the rule it breaks, which TypeScript shows in the error. A wide
 * `string` is not checked here; the runtime check applies to every path.
 *
 * @example
 * ```ts
 * type Checked = LocatorSchemaPathFormat<"main..list">;
 * // ["Invalid locator schema path", "String can't contain consecutive '.'", "main..list"]
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/types/#locatorschemapathformat
 */
export type LocatorSchemaPathFormat<S extends string> = string extends S
	? // If S is a wide string (not a literal union), don't try to deeply validate
		S
	: S extends ""
		? LocatorSchemaPathError<S, "String can't be empty">
		: _LocatorSchemaPathFormat<S, S, true, false>;

type _LocatorSchemaPathFormat<
	Original extends string,
	Rest extends string,
	AtStart extends boolean,
	PrevDot extends boolean,
> = Rest extends ""
	? PrevDot extends true
		? LocatorSchemaPathError<Original, "String can't end with '.'">
		: Original
	: Rest extends `${infer C}${infer Tail}`
		? C extends UnicodeWhitespaceChar
			? LocatorSchemaPathError<Original, "String can't contain whitespace chars">
			: C extends "."
				? AtStart extends true
					? LocatorSchemaPathError<Original, "String can't start with '.'">
					: PrevDot extends true
						? LocatorSchemaPathError<Original, "String can't contain consecutive '.'">
						: _LocatorSchemaPathFormat<Original, Tail, false, true>
				: _LocatorSchemaPathFormat<Original, Tail, false, false>
		: never;

export type LocatorSchemaPathValid<Path extends string> = Path extends unknown
	? LocatorSchemaPathFormat<Path> extends Path
		? Path
		: never
	: never;

export type RegistryPath<LocatorSchemaPathType extends string> = LocatorSchemaPathType &
	LocatorSchemaPathValid<LocatorSchemaPathType>;

export type ExtractSubPaths<Path extends string> = Path extends `${infer Head}.${infer Tail}`
	? Head | `${Head}.${ExtractSubPaths<Tail>}`
	: Path;

export type LocatorChainPaths<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends LocatorSchemaPathType | undefined,
> = LocatorSubstring extends string
	? Extract<LocatorSchemaPathType, LocatorSubstring | ExtractSubPaths<LocatorSubstring>>
	: never;

export type RoleDefinition = {
	type: "role";
	role: Parameters<Page["getByRole"]>[0];
	options?: Parameters<Page["getByRole"]>[1];
};

export type TextDefinition = {
	type: "text";
	text: Parameters<Page["getByText"]>[0];
	options?: Parameters<Page["getByText"]>[1];
};

export type LabelDefinition = {
	type: "label";
	text: Parameters<Page["getByLabel"]>[0];
	options?: Parameters<Page["getByLabel"]>[1];
};

export type PlaceholderDefinition = {
	type: "placeholder";
	text: Parameters<Page["getByPlaceholder"]>[0];
	options?: Parameters<Page["getByPlaceholder"]>[1];
};

export type AltTextDefinition = {
	type: "altText";
	text: Parameters<Page["getByAltText"]>[0];
	options?: Parameters<Page["getByAltText"]>[1];
};

export type TitleDefinition = {
	type: "title";
	text: Parameters<Page["getByTitle"]>[0];
	options?: Parameters<Page["getByTitle"]>[1];
};

export type LocatorDefinition = {
	type: "locator";
	selector: Parameters<Page["locator"]>[0];
	options?: Parameters<Page["locator"]>[1];
};

/**
 * A frame segment. With a selector it is the `<iframe>` element (`locator(selector)` plus the
 * segment's steps, so the selector is `locator`'s argument) whose descendants resolve inside the
 * frame through `contentFrame()`; without a selector it is Playwright's any-frame
 * `page.frameLocator()`, valid only as the first segment of a chain, with no steps and no terminal
 * form.
 */
export type FrameLocatorDefinition = {
	type: "frameLocator";
	selector?: Parameters<Page["locator"]>[0];
};

export type TestIdDefinition = {
	type: "testId";
	testId: Parameters<Page["getByTestId"]>[0];
};

export type IdDefinition = {
	type: "id";
	id: string | RegExp;
};

export type LocatorStrategyDefinition =
	| RoleDefinition
	| TextDefinition
	| LabelDefinition
	| PlaceholderDefinition
	| AltTextDefinition
	| TitleDefinition
	| LocatorDefinition
	| FrameLocatorDefinition
	| TestIdDefinition
	| IdDefinition;

export type LocatorStrategyDefinitionPatch =
	| { type: "role"; role?: RoleDefinition["role"]; options?: RoleDefinition["options"] }
	| { type: "text"; text?: TextDefinition["text"]; options?: TextDefinition["options"] }
	| { type: "label"; text?: LabelDefinition["text"]; options?: LabelDefinition["options"] }
	| { type: "placeholder"; text?: PlaceholderDefinition["text"]; options?: PlaceholderDefinition["options"] }
	| { type: "altText"; text?: AltTextDefinition["text"]; options?: AltTextDefinition["options"] }
	| { type: "title"; text?: TitleDefinition["text"]; options?: TitleDefinition["options"] }
	| { type: "locator"; selector?: LocatorDefinition["selector"]; options?: LocatorDefinition["options"] }
	| { type: "frameLocator"; selector?: FrameLocatorDefinition["selector"] }
	| { type: "testId"; testId?: TestIdDefinition["testId"] }
	| { type: "id"; id?: IdDefinition["id"] };

export type PlaywrightFilterDefinition = NonNullable<Parameters<Locator["filter"]>[0]>;
export type LocatorDescription = Parameters<Locator["describe"]>[0];

export type LocatorStep<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = RegistryPath<LocatorSchemaPathType>,
> =
	| { kind: "filter"; filter: FilterDefinition<LocatorSchemaPathType, AllowedPaths> }
	| { kind: "index"; index: IndexSelector };

/**
 * The definition of each strategy, looked up by its name. An indexed access keeps `ReusableLocator`
 * covariant in its strategy, which `Extract<…, { type: Type }>` does not.
 */
export type LocatorDefinitionByType = {
	role: RoleDefinition;
	text: TextDefinition;
	label: LabelDefinition;
	placeholder: PlaceholderDefinition;
	altText: AltTextDefinition;
	title: TitleDefinition;
	locator: LocatorDefinition;
	frameLocator: FrameLocatorDefinition;
	testId: TestIdDefinition;
	id: IdDefinition;
};

/**
 * A seed, from `registry.createReusable`: a locator strategy with its arguments, its `filter` and `nth` steps and a
 * description, registered under no path. `add(path, { reuse: seed })` registers it at a path. A seed is a value, as a
 * Playwright `Locator` is: `filter`, `nth` and `describe` return a new seed and leave this one as it was. `Strategy`
 * narrows the seed to one strategy (`"role"`, `"text"`, `"label"`, `"placeholder"`, `"altText"`, `"title"`,
 * `"locator"`, `"frameLocator"`, `"testId"`, `"id"`); the default accepts a seed of any.
 *
 * @example
 * ```ts
 * export const headingSeed = (registry: LocatorRegistry<Paths>): ReusableLocator<Paths, "role"> =>
 *   registry.createReusable.getByRole("heading", { level: 2 });
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/
 */
export type ReusableLocator<
	LocatorSchemaPathType extends string,
	Type extends LocatorStrategyDefinition["type"] = LocatorStrategyDefinition["type"],
> = {
	/** The seed's strategy: `"role"`, `"text"`, `"label"`, `"placeholder"`, `"altText"`, `"title"`, `"locator"`, …. */
	readonly type: Type;
	/** A copy of the seed's locator: its strategy and arguments, such as `{ type: "role", role: "button" }`. */
	readonly definition: LocatorDefinitionByType[Type];
	/** A copy of the seed's `filter` and `nth` steps, in the order they were added. */
	readonly steps: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[];
	/** The seed's description, or `undefined` when it has none; a path registered from it then shows its own path. */
	readonly description: LocatorDescription | undefined;
	/**
	 * Returns a new seed with a `locator.filter()` step added; this seed is unchanged, as a Playwright `Locator` is.
	 *
	 * @param filter Playwright's filter options; `has` and `hasNot` also take a registered path.
	 * @returns A new seed.
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list.item@open", { reuse: row.filter({ hasText: "Open" }) });
	 * ```
	 */
	filter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	): ReusableLocator<LocatorSchemaPathType, Type>;
	/**
	 * Returns a new seed with an index step added; this seed is unchanged.
	 *
	 * @param index A number, `"first"` or `"last"`.
	 * @returns A new seed.
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list.item@last", { reuse: row.nth("last") });
	 * ```
	 */
	nth(index: IndexSelector): ReusableLocator<LocatorSchemaPathType, Type>;
	/**
	 * Returns a new seed with a description; this seed is unchanged. A path registered from it shows the description
	 * instead of the path.
	 *
	 * @param description A string; `""` removes the description.
	 * @returns A new seed.
	 * @throws When the description is not a string (from JavaScript):
	 * `createReusable.describe requires a string; pass "" to remove the description.`
	 */
	describe(description: LocatorDescription): ReusableLocator<LocatorSchemaPathType, Type>;
};

export type FilterLocatorReference<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = RegistryPath<LocatorSchemaPathType>,
> = Locator | AllowedPaths;

/**
 * The argument of `filter`: Playwright's `locator.filter()` options (`hasText`, `hasNotText`, `has`, `hasNot`,
 * `visible`), where `has` and `hasNot` also take a registered path.
 *
 * @example
 * ```ts
 * export const withBadge: FilterDefinition<Paths> = { has: "list.item.badge" };
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/types/#filterdefinition
 */
export type FilterDefinition<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = RegistryPath<LocatorSchemaPathType>,
> = Omit<PlaywrightFilterDefinition, "has" | "hasNot"> & {
	/**
	 * Keeps the elements that contain this one: a Playwright `Locator`, or a registered path, resolved to that path's
	 * own locator without its ancestors, since Playwright looks for it inside each element being filtered.
	 */
	has?: FilterLocatorReference<LocatorSchemaPathType, AllowedPaths>;
	/** Keeps the elements that do not contain this one: a Playwright `Locator`, or a registered path, as for `has`. */
	hasNot?: FilterLocatorReference<LocatorSchemaPathType, AllowedPaths>;
};

export type LocatorBuilderTarget = Page | Locator | FrameLocator;

export type LocatorSchemaRecord<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = RegistryPath<LocatorSchemaPathType>,
> = {
	locatorSchemaPath: RegistryPath<LocatorSchemaPathType>;
	definition: LocatorStrategyDefinition;
	steps?: LocatorStep<LocatorSchemaPathType, AllowedPaths>[];
	description?: LocatorDescription;
};

/**
 * JSON Merge Patch over a Playwright options object: a provided key replaces, `null` deletes the
 * key, an absent or `undefined` key leaves it alone.
 */
export type OptionsPatch<Options> = { [Key in keyof NonNullable<Options>]?: NonNullable<Options>[Key] | null };

type LocatorUpdateFor<Definition extends LocatorStrategyDefinition> = { type: Definition["type"] } & Partial<
	Omit<Definition, "type" | "options">
> &
	("options" extends keyof Definition
		? { options?: OptionsPatch<Definition["options"]> | null }
		: Record<never, never>);

export type LocatorUpdate =
	| LocatorUpdateFor<RoleDefinition>
	| LocatorUpdateFor<TextDefinition>
	| LocatorUpdateFor<LabelDefinition>
	| LocatorUpdateFor<PlaceholderDefinition>
	| LocatorUpdateFor<AltTextDefinition>
	| LocatorUpdateFor<TitleDefinition>
	| LocatorUpdateFor<LocatorDefinition>
	| LocatorUpdateFor<FrameLocatorDefinition>
	| LocatorUpdateFor<TestIdDefinition>
	| LocatorUpdateFor<IdDefinition>;

/**
 * The argument of `nth`: a number, as Playwright's `locator.nth()` takes it (`-1` is the last element), `"first"` or
 * `"last"`.
 *
 * @see https://dyhex.github.io/POMWright/api/types/#indexselector
 */
export type IndexSelector = number | "first" | "last";
