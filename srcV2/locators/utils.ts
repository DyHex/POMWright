const PATH_SEGMENT_REGEX = /^([a-zA-Z0-9_-]+)(@[a-zA-Z0-9_-]+)?$/;

export const validateLocatorSchemaPath = (path: string) => {
	if (!path) {
		throw new Error("Locator schema path cannot be empty.");
	}
	if (path.startsWith(".") || path.endsWith(".")) {
		throw new Error(`Locator schema path cannot start or end with a dot: "${path}".`);
	}
	if (path.includes("..")) {
		throw new Error(`Locator schema path cannot contain consecutive dots: "${path}".`);
	}
	const segments = path.split(".");
	for (const segment of segments) {
		if (!PATH_SEGMENT_REGEX.test(segment)) {
			throw new Error(`Invalid locator schema path segment: "${segment}" in path "${path}".`);
		}
	}
};

export type LocatorSchemaPathValid<Path extends string> = Path extends ""
	? never
	: Path extends `.${string}` | `${string}.`
		? never
		: Path extends `${string}..${string}`
			? never
			: Path;

export type ValidLocatorPath<LocatorSchemaPathType extends string> = LocatorSchemaPathType &
	LocatorSchemaPathValid<LocatorSchemaPathType>;

export const expandSchemaPath = (path: string): string[] => {
	validateLocatorSchemaPath(path);
	const parts = path.split(".");
	return parts.map((_part, index) => parts.slice(0, index + 1).join("."));
};

export const cssEscape = (value: string) => {
	// Simple CSS escape implementation covering common cases.
	return value.replace(/([\\"'#.:;,?*+<>{}[\]()])/g, "\\$1");
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
