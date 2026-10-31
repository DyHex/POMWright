import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

declare const page: Page;

type ValidPaths = "valid" | "validReuse";

const validRegistryFactoryResult = createRegistryWithAccessors<ValidPaths>(page);

validRegistryFactoryResult.add("valid").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
validRegistryFactoryResult.add("does.not.exist").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
validRegistryFactoryResult.add("valid", { reuse: "does.not.exist" });
// @ts-expect-error reuse path cannot be the same as registration path
validRegistryFactoryResult.add("validReuse", { reuse: "validReuse" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
validRegistryFactoryResult.getLocator("does.not.exist");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
validRegistryFactoryResult.getLocatorSchema("does.not.exist");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
validRegistryFactoryResult.getNestedLocator("does.not.exist");

type InvalidPaths = ValidPaths | "" | ".leading" | "trailing." | "double..dot" | "contains whitespace";

const invalidRegistryFactoryResult = createRegistryWithAccessors<InvalidPaths>(page);

invalidRegistryFactoryResult.add("valid").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add(".leading").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("trailing.").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("double..dot").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("contains whitespace").locator("body");

invalidRegistryFactoryResult.add("validReuse", { reuse: "valid" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: "" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: ".leading" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: "trailing." });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: "double..dot" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: "contains whitespace" });

invalidRegistryFactoryResult.getLocator("valid");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator("");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator(".leading");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator("trailing.");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator("double..dot");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator("contains whitespace");

invalidRegistryFactoryResult.getLocatorSchema("valid");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema("");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema(".leading");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema("trailing.");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema("double..dot");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema("contains whitespace");

invalidRegistryFactoryResult.getNestedLocator("valid");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator("");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator(".leading");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator("trailing.");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator("double..dot");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator("contains whitespace");

// reuse by path: a self-reuse is a compile error only for one and the same literal; variables are checked at run time
const toolbarButtons = ["save", "publish", "cancel"] as const;
type ToolbarButton = (typeof toolbarButtons)[number];
type ReusePaths =
	| "shared.button"
	| "main"
	| `main.toolbar.button@${ToolbarButton}`
	| `dialog.button@${ToolbarButton}`
	| "main.heading"
	| "dialog.heading";
const reuseRegistry = createRegistryWithAccessors<ReusePaths>(page).registry;
reuseRegistry.add("main.toolbar.button@save", { reuse: "shared.button" });
// @ts-expect-error a literal path that reuses itself
reuseRegistry.add("main.heading", { reuse: "main.heading" });
for (const button of toolbarButtons) reuseRegistry.add(`main.toolbar.button@${button}`, { reuse: "shared.button" });
for (const button of toolbarButtons) {
	reuseRegistry.add(`dialog.button@${button}`, { reuse: `main.toolbar.button@${button}` });
}
const headingCopies: ReadonlyArray<{ target: ReusePaths; source: ReusePaths }> = [
	{ target: "dialog.heading", source: "main.heading" },
];
for (const { target, source } of headingCopies) reuseRegistry.add(target, { reuse: source });
declare const eitherHeading: "main.heading" | "dialog.heading";
reuseRegistry.add(eitherHeading, { reuse: eitherHeading });
reuseRegistry.add("main.toolbar.button@cancel", { reuse: "shared.button" }).filter({ hasText: "Cancel" });
const untypedReuse = createRegistryWithAccessors<string>(page).registry;
declare const anyTarget: string;
declare const anySource: string;
untypedReuse.add(anyTarget, { reuse: anySource });
// @ts-expect-error a literal path that reuses itself, on a registry typed <string> too
untypedReuse.add("main.heading", { reuse: "main.heading" });
// @ts-expect-error a literal path that breaks a rule of a path, on a registry typed <string> too
untypedReuse.add("main..list").locator("ul");
const listRegistry = createRegistryWithAccessors<"list" | "list.item@first" | `list.item@${string}`>(page).registry;
declare const itemId: string;
listRegistry.add(`list.item@${itemId}`, { reuse: "list.item@first" });
// @ts-expect-error a literal matching a template member, reusing itself
listRegistry.add("list.item@first", { reuse: "list.item@first" });

// path rules as patterns: a literal of any length compiles, and every listed whitespace character is rejected
type TenCharacters = "abcdefghij";
type HundredCharacters =
	`${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}`;
type LongSegment =
	`${HundredCharacters}${HundredCharacters}${HundredCharacters}${HundredCharacters}${HundredCharacters}${HundredCharacters}${HundredCharacters}${HundredCharacters}${HundredCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}${TenCharacters}abcdefghi`;
declare const longPath: LongSegment;
const longRegistry = createRegistryWithAccessors<LongSegment>(page);
longRegistry.add(longPath).locator("body");
longRegistry.getNestedLocator(longPath);
const whitespaceRegistry = createRegistryWithAccessors<"main form" | "main form" | "main﻿form">(page);
// @ts-expect-error a no-break space is whitespace
whitespaceRegistry.add("main form");
// @ts-expect-error a line separator is whitespace
whitespaceRegistry.add("main form");
// @ts-expect-error U+FEFF is rejected too
whitespaceRegistry.add("main﻿form");
