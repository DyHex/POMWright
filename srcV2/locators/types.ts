import type { FrameLocator, Locator, Page } from "@playwright/test";
// All Unicode characters with White_Space=Yes (UAX #44)
// Kept in one place so TS and runtime stay conceptually aligned. No trolling in tests allowed.
export type UnicodeWhitespaceChar =
	| "\u0009" // CHARACTER TABULATION: "\t"
	| "\u000A" // LINE FEED: "\n"
	| "\u000B" // LINE TABULATION: "\v"
	| "\u000C" // FORM FEED: "\f"
	| "\u000D" // CARRIAGE RETURN: "\r"
	| "\u0020" // SPACE: " "
	| "\u0085" // NEXT LINE: ""
	| "\u00A0" // NO-BREAK SPACE: " "
	| "\u1680" // OGHAM SPACE MARK: " "
	| "\u2000" // EN QUAD: " "
	| "\u2001" // EM QUAD: " "
	| "\u2002" // EN SPACE: " "
	| "\u2003" // EM SPACE: " "
	| "\u2004" // THREE-PER-EM SPACE: " "
	| "\u2005" // FOUR-PER-EM SPACE: " "
	| "\u2006" // SIX-PER-EM SPACE: " "
	| "\u2007" // FIGURE SPACE: " "
	| "\u2008" // PUNCTUATION SPACE: " "
	| "\u2009" // THIN SPACE: " "
	| "\u200A" // HAIR SPACE: " "
	| "\u2028" // LINE SEPARATOR: vscode says no
	| "\u2029" // PARAGRAPH SEPARATOR: vscode says no
	| "\u202F" // NARROW NO-BREAK SPACE: " "
	| "\u205F" // MEDIUM MATHEMATICAL SPACE: " "
	| "\u3000"; // IDEOGRAPHIC SPACE: "　"

export type LocatorSchemaPathError<S extends string, Reason extends string> = [
	"Invalid locator schema path",
	Reason,
	S,
];

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

export type LocatorSchemaPathErrors<Paths extends string> = Exclude<LocatorSchemaPathFormat<Paths>, Paths>;

export type LocatorSchemaPathValid<Path extends string> = Path extends unknown
	? LocatorSchemaPathFormat<Path> extends Path
		? Path
		: never
	: never;

export type RegistryPath<LocatorSchemaPathType extends string> = LocatorSchemaPathType &
	LocatorSchemaPathValid<LocatorSchemaPathType>;

export type ValidLocatorPath<LocatorSchemaPathType extends string> = LocatorSchemaPathType &
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

export type LocatorSchemaPathAlias<LocatorSchemaPathType extends string> = LocatorSchemaPathType &
	LocatorSchemaPathValid<LocatorSchemaPathType>;

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

export type FrameLocatorDefinition = {
	type: "frameLocator";
	selector: Parameters<Page["frameLocator"]>[0];
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
export type ResolvedFilterDefinition = PlaywrightFilterDefinition;
export type LocatorDescription = Parameters<Locator["describe"]>[0];

export type LocatorStep<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> =
	| { kind: "filter"; filter: FilterDefinition<LocatorSchemaPathType, AllowedPaths> }
	| { kind: "index"; index: IndexSelector | null };

export type ReusableLocator<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
	Type extends LocatorStrategyDefinition["type"] = LocatorStrategyDefinition["type"],
> = {
	type: Type;
	definition: Extract<LocatorStrategyDefinition, { type: Type }>;
	steps: LocatorStep<LocatorSchemaPathType, AllowedPaths>[];
	description?: LocatorDescription;
};

export type FilterLocatorReference<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> = Locator | AllowedPaths;

export type FilterDefinition<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> =
	| PlaywrightFilterDefinition
	| (Omit<PlaywrightFilterDefinition, "has" | "hasNot"> & {
			has?: PlaywrightFilterDefinition["has"] | FilterLocatorReference<LocatorSchemaPathType, AllowedPaths>;
			hasNot?: PlaywrightFilterDefinition["hasNot"] | FilterLocatorReference<LocatorSchemaPathType, AllowedPaths>;
	  });

export type FilterPatch<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> =
	| FilterDefinition<LocatorSchemaPathType, AllowedPaths>[]
	| {
			append?:
				| FilterDefinition<LocatorSchemaPathType, AllowedPaths>
				| FilterDefinition<LocatorSchemaPathType, AllowedPaths>[];
			replace?:
				| FilterDefinition<LocatorSchemaPathType, AllowedPaths>
				| FilterDefinition<LocatorSchemaPathType, AllowedPaths>[];
			clear?: boolean;
	  };

export type LocatorBuilderTarget = Page | Locator | FrameLocator;

export type LocatorSchemaRecord<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> = {
	locatorSchemaPath: LocatorSchemaPathAlias<LocatorSchemaPathType>;
	definition: LocatorStrategyDefinition;
	steps?: LocatorStep<LocatorSchemaPathType, AllowedPaths>[];
	description?: LocatorDescription;
};

type LocatorUpdateFor<Definition extends LocatorStrategyDefinition> = { type: Definition["type"] } & Partial<
	Omit<Definition, "type">
>;

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

export type IndexSelector = number | "first" | "last";

export type PathIndexMap = Partial<Record<string, IndexSelector | null | undefined>>;
