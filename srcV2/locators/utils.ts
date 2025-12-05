// All Unicode characters with White_Space=Yes (UAX #44)
// Kept in one place so TS and runtime stay conceptually aligned. No trolling in tests allowed.
type UnicodeWhitespaceChar =
	| "\u0009" // CHARACTER TABULATION: "\t"
	| "\u000A" // LINE FEED: "\n"
	| "\u000B" // LINE TABULATION: "\v"
	| "\u000C" // FORM FEED: "\f"
	| "\u000D" // CARRIAGE RETURN: "\r"
	| "\u0020" // SPACE: " "
	| "\u0085" // NEXT LINE: ""
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

export type ValidLocatorPath<LocatorSchemaPathType extends string> = LocatorSchemaPathType &
	LocatorSchemaPathValid<LocatorSchemaPathType>;

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

export type ExtractSubPaths<Path extends string> = Path extends `${infer Head}.${infer Tail}`
	? Head | `${Head}.${ExtractSubPaths<Tail>}`
	: Path;

export type LocatorChainPaths<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends LocatorSchemaPathType | undefined,
> = LocatorSubstring extends string
	? Extract<LocatorSchemaPathType, LocatorSubstring | ExtractSubPaths<LocatorSubstring>>
	: never;
