# Locator Registry (v2)

## Table of contents

1. [Locator Registry overview](#locator-registry-overview)
2. [Mental model](#mental-model)
3. [Path types and validation](#path-types-and-validation)
    1. [Compile-time path constraints](#compile-time-path-constraints)
    2. [Runtime validation rules](#runtime-validation-rules)
    3. [Common path mistakes and errors](#common-path-mistakes-and-errors)
4. [Factory and accessors](#factory-and-accessors)
    1. [`createRegistryWithAccessors`](#createregistrywithaccessors)
    2. [Accessor types](#accessor-types)
    3. [Types you can import](#types-you-can-import)
5. [Registering locators with `add`](#registering-locators-with-add)
    1. [All strategy methods](#all-strategy-methods)
    2. [Post-definition chain methods](#post-definition-chain-methods)
    3. [One-strategy-per-registration rule](#one-strategy-per-registration-rule)
    4. [Duplicate path behavior](#duplicate-path-behavior)
6. [`getById` deep dive](#getbyid-deep-dive)
    1. [String ids (verbatim, exact match)](#string-ids-verbatim-exact-match)
    2. [RegExp ids (pattern match)](#regexp-ids-pattern-match)
    3. [Flags](#flags)
    4. [Validation](#validation)
    5. [Multiple matches](#multiple-matches)
    6. [What the resolved selector looks like](#what-the-resolved-selector-looks-like)
    7. [Why not `locator("#settings.panel")`](#why-not-locatorsettingspanel)
    8. [Migrating from 2.x to 3.0: no more `#` / `id=` prefixes](#migrating-from-2x-to-30-no-more---id-prefixes)
7. [`filter` deep dive](#filter-deep-dive)
    1. [Accepted `has`/`hasNot` reference forms](#accepted-hashasnot-reference-forms)
    2. [Path examples](#path-examples)
    3. [Frames in filters](#frames-in-filters)
8. [Resolution APIs](#resolution-apis)
    1. [`getLocator(path)`](#getlocatorpath)
    2. [`getNestedLocator(path)`](#getnestedlocatorpath)
    3. [Frames: the iframe element, its steps, and entering the frame](#frames-the-iframe-element-its-steps-and-entering-the-frame)
    4. [Any frame: `frameLocator()` without a selector](#any-frame-framelocator-without-a-selector)
    5. [Sparse chain behavior](#sparse-chain-behavior)
9. [Verifying a registry: `verify()`](#verifying-a-registry-verify)
10. [Query builder: `getLocatorSchema(path)`](#query-builder-getlocatorschemapath)
    1. [Clone semantics (registry is not mutated)](#clone-semantics-registry-is-not-mutated)
    2. [Sub-path scope rules](#sub-path-scope-rules)
    3. [Method-by-method reference](#method-by-method-reference)
    4. [Default sub-path behavior table](#default-sub-path-behavior-table)
11. [`update` and `replace` semantics](#update-and-replace-semantics)
    1. [`update`: a PATCH of the registered definition](#update-a-patch-of-the-registered-definition)
    2. [`replace`: a new definition of any strategy](#replace-a-new-definition-of-any-strategy)
    3. [Steps and descriptions are untouched](#steps-and-descriptions-are-untouched)
12. [Skipping a segment: `skip` and `unskip`](#skipping-a-segment-skip-and-unskip)
    1. [What `skip` hides and `unskip` brings back](#what-skip-hides-and-unskip-brings-back)
    2. [What a skipped segment rejects](#what-a-skipped-segment-rejects)
    3. [The terminal path cannot be skipped](#the-terminal-path-cannot-be-skipped)
13. [Reusable locators: `createReusable`](#reusable-locators-createreusable)
    1. [Seed creation](#seed-creation)
    2. [Reuse by object seed](#reuse-by-object-seed)
    3. [Reuse by existing path string](#reuse-by-existing-path-string)
    4. [Reuse patch rules and limitations](#reuse-patch-rules-and-limitations)
    5. [Typing seeds in shared modules](#typing-seeds-in-shared-modules)
    6. [Seed immutability](#seed-immutability)
14. [`describe` semantics](#describe-semantics)
    1. [Default descriptions](#default-descriptions)
    2. [Registry-level descriptions](#registry-level-descriptions)
    3. [Query-level overrides](#query-level-overrides)
15. [Error reference and troubleshooting](#error-reference-and-troubleshooting)
16. [Tested behavioral guarantees](#tested-behavioral-guarantees)
17. [Migrating from 2.x to 3.0: frames, registration, `update`](#migrating-from-2x-to-30-frames-registration-update)
18. [Migration notes from v1](#migration-notes-from-v1)
19. [Best practices](#best-practices)

---

## Locator Registry overview

The v2 Locator Registry is a typed, fluent DSL for defining and resolving Playwright locators.

At a high level it provides:

- **Typed locator paths** (`"root.section.button"`) validated both at compile time and runtime.
- **Fluent registration** (`add(path).getByRole(...).filter(...).nth(...)`).
- **Two resolution modes**:
  - `getLocator(path)` resolves only the terminal segment.
  - `getNestedLocator(path)` resolves the full chain.
- **Clone-based query mutation** (`getLocatorSchema(path)`) for temporary overrides (`update`, `replace`, `skip`, `unskip`, `filter`, `nth`, `clearSteps`, `describe`) without mutating the registry.

You can use it directly via `createRegistryWithAccessors(page)` or through `PageObject` (`this.add`, `this.getLocator`, `this.getNestedLocator`, `this.getLocatorSchema`).

---

## Mental model

Think of the registry as:

1. A map of **path -> locator definition** (`getByRole`, `locator`, `frameLocator`, etc.).
2. A map of **path -> ordered steps** (`filter` / `nth`).
3. An optional explicit **path description** (`describe`).

When resolving:

- `getLocator(path)` applies only the terminal definition + terminal steps.
- `getNestedLocator(path)` traverses the chain (`a`, `a.b`, `a.b.c`) and applies each registered segment in order.
- A `frameLocator(selector)` segment is the `<iframe>` element, steps included; the segments below it resolve inside
  the frame.
- The resolved terminal locator uses its path as its description unless an explicit description overrides it.

When querying with `getLocatorSchema(path)`:

- A mutable clone is created for the chain.
- All updates are local to the clone.
- The underlying registry remains unchanged.

---

## Path types and validation

### Compile-time path constraints

Paths are generic string literal unions that are checked using v2 type utilities.

Rules:

- Path cannot be empty.
- Path cannot start or end with `.`.
- Path cannot contain consecutive dots (`..`).
- Path cannot contain whitespace: the 25 characters with the Unicode `White_Space` property and U+FEFF (the
  byte-order mark), which JavaScript's `\s` also matches. The type-level check and the runtime check use one list.

```ts
type Paths =
    | "main"
    | "main.form@login"
    | "main.form@login.input@username"
    | "main.form@login.input@password"
    | "main.button@login";
```

If invalid literals are included in the union, TypeScript blocks those values at locator accessor argument usage
(`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`) with path-format diagnostics while preserving
valid path autocomplete suggestions. Runtime validation still applies for non-literal strings. The check is
exported as a type, `LocatorSchemaPathFormat<Path>` (see [Types you can import](#types-you-can-import)).

### Runtime validation rules

Runtime validation applies the same structure checks:

- empty string
- leading dot
- trailing dot
- consecutive dots
- whitespace characters (the same 26 as the type-level check)

This means even if a path reaches runtime as a plain string, it is still validated.

### Common path mistakes and errors

Typical runtime errors:

- `LocatorSchemaPath string cannot be empty`
- `LocatorSchemaPath string cannot start with a dot: .foo`
- `LocatorSchemaPath string cannot end with a dot: foo.`
- `LocatorSchemaPath string cannot contain consecutive dots: foo..bar`
- `LocatorSchemaPath string cannot contain whitespace chars: ...` (every whitespace character but the plain space is
  shown as an escape, so a no-break space reads `main\u00A0.form` instead of looking like a space)

---

## Factory and accessors

### `createRegistryWithAccessors`

`createRegistryWithAccessors(page)` creates a registry instance plus bound helpers.

```ts
import { createRegistryWithAccessors } from "pomwright";

type Paths = "main" | "main.button";

const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
    createRegistryWithAccessors<Paths>(page);

add("main").locator("main");
add("main.button").getByRole("button", { name: "Save" });

await getNestedLocator("main.button").click();
```

### Accessor types

The package exports accessor types so you can inject/wire them in custom classes or fixtures:

- `AddAccessor<Paths>`
- `GetLocatorAccessor<Paths>`
- `GetNestedLocatorAccessor<Paths>`
- `GetLocatorSchemaAccessor<Paths>`

```ts
import type {
    AddAccessor,
    GetLocatorAccessor,
    GetNestedLocatorAccessor,
    GetLocatorSchemaAccessor,
    LocatorRegistry,
} from "pomwright";

class MyPage<Paths extends string> {
    constructor(
        public readonly registry: LocatorRegistry<Paths>,
        public readonly add: AddAccessor<Paths>,
        public readonly getLocator: GetLocatorAccessor<Paths>,
        public readonly getNestedLocator: GetNestedLocatorAccessor<Paths>,
        public readonly getLocatorSchema: GetLocatorSchemaAccessor<Paths>,
    ) {}
}
```

### Types you can import

Every type the registry hands out can be named from `"pomwright"` (the package root is the only importable entry):

| type | what it is |
| --- | --- |
| `LocatorRegistry<Paths>` | the registry: `add`, `createReusable`, `getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify`. Internal lifecycle methods (`register`, `replace`, `get`) are not part of it. |
| `AddAccessor`, `GetLocatorAccessor`, `GetNestedLocatorAccessor`, `GetLocatorSchemaAccessor` | the four accessors (above) |
| `LocatorQueryBuilder<Paths, Path>` | what `getLocatorSchema(path)` returns, and every step of its chain |
| `LocatorUpdateBuilder<Paths, Path, SubPath, Mode>` | what `update(subPath?)` (`Mode` `"update"`) and `replace(subPath?)` (`"replace"`) return |
| `ReusableLocator<Paths, Strategy>` | a seed from `createReusable`, what `add(path, { reuse })` accepts (see [Typing seeds in shared modules](#typing-seeds-in-shared-modules)) |
| `FilterDefinition<Paths>` | the argument of `filter`, with `has`/`hasNot` path references |
| `IndexSelector` | the argument of `nth`: a number, `"first"` or `"last"` |
| `LocatorSchemaPathFormat<Path>` | the path rules as a type: `Path` when it is well-formed, otherwise a tuple naming the rule |
| `LocatorSchemaPathArgument<Path>` | the path parameter of `add` and the accessors |

The builders that `add(path)` returns are not exported: they register as a side effect and are not meant to be held.

A shared module can annotate what it returns, and in a project compiled with `declaration: true` (a page-object
package built with declarations, for example) it has to be able to name it:

```ts
// list.locators.ts
import type { LocatorQueryBuilder, LocatorRegistry } from "pomwright";

export type Paths = "list" | "list.item";

export const lastRow = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.item"> =>
    registry.getLocatorSchema("list.item").nth("last");

// a function that registers returns nothing: a block body (or `: void`) keeps the builder out of its type
export function defineLocators(registry: LocatorRegistry<Paths>) {
    registry.add("list").locator("ul");
    registry.add("list.item").getByRole("listitem");
}
```

A helper in a base class that is generic in its path union forwards a path with `LocatorSchemaPathArgument`. A
parameter typed with the bare union does not compile there, because the accessors check each path at the call and
TypeScript cannot check a path that is still a type parameter:

```ts
import type { Locator } from "@playwright/test";
import { type LocatorSchemaPathArgument, PageObject } from "pomwright";

export abstract class ShopApp<Paths extends string> extends PageObject<Paths> {
    nested<Path extends Paths>(path: LocatorSchemaPathArgument<Path>): Locator {
        return this.getNestedLocator(path); // `nested(path: Paths)` would be TS2345 here
    }
}

// a misspelt path is still an error where the helper is called: page.nested("main.buton")
```

---

## Registering locators with `add`

`add(path)` begins a registration chain.

```ts
registry.add("main").locator("main");
registry.add("main.button@login").getByRole("button", { name: "Login" });
registry.add("main.form@login").getByRole("form", { name: "Login" });
registry.add("main.form@login.input@username").getByLabel("Username");
registry.add("main.form@login.input@password").getByLabel("Password");
```

### All strategy methods

Each registration can choose exactly one strategy method:

- `getByRole(role, options?)`
- `getByText(text, options?)`
- `getByLabel(text, options?)`
- `getByPlaceholder(text, options?)`
- `getByAltText(text, options?)`
- `getByTitle(text, options?)`
- `locator(selector, options?)`
- `frameLocator(selector)` and `frameLocator()` (see [Resolution APIs](#resolution-apis) for both forms)
- `getByTestId(testId)`
- `getById(id: string | RegExp)`

The first argument is required on every builder (`add`, a seeded `add`, `createReusable`, `update`, `replace`), as it
is on Playwright's own methods; a missing one throws at the call, naming the method and the path:

```
getByRole requires a role value for "main.button".
```

An empty string is rejected only where Playwright cannot use it: `locator("")` and `frameLocator("")` are css parse
errors at action time, `getByRole("")` is an invalid selector, and `getById("")` would match invalid HTML
inconsistently across engines. These throw `locator requires a non-empty selector for "list".` and so on. The
text-likes and `getByTestId` store an empty string as given, because Playwright matches elements with empty
attributes (`getByTestId("")` finds `data-testid=""`). Which strings are ARIA roles is Playwright's own role type,
checked at compile time with autocompletion; there is no runtime list. The only exceptions to "required" are the
inheriting forms: on a seeded `add` or an `update`, an omitted argument keeps the seeded or registered value, and
`frameLocator()` without a selector is Playwright's any-frame locator.

### Post-definition chain methods

After a strategy is set, you can chain:

- `filter(filterDefinition)`
- `nth(index)` where index is `number | "first" | "last"`; `"first"` and `"last"` become `first()` and `last()`, every
  number goes to Playwright's `nth` as given (`-1` is the last element, as in Playwright)
- `describe(description)` where description is a string; `describe("")` removes the description (see
  [`describe` semantics](#describe-semantics))

```ts
registry
    .add("main.list.item")
    .getByRole("listitem", { name: /Row/ })
    .filter({ hasText: "Row" })
    .nth("last")
    .describe("Last matching row");
```

The builder returned by `add(path)` exposes the ten strategy methods only, so `add("x").filter(…)` is a compile
error; `filter`, `nth` and `describe` appear once a strategy is chosen. A seeded registration has them from the
start, because the seed is the definition. The steps apply to every strategy, `frameLocator(selector)` included,
where they select the `<iframe>` element before the frame is entered. The any-frame `frameLocator()` returns nothing
to chain, since it has no element to step on.

### One-strategy-per-registration rule

Without reuse, calling a second strategy in the same registration throws.

```ts
registry.add("main.button").getByRole("button");
// ❌ Later trying to set .locator(...) for same add-chain is invalid.
```

A call that throws leaves the registry exactly as it was: the path keeps the strategy it had, a seeded path keeps its
seed, and nothing is unregistered. In practice the throw happens inside `defineLocators()`, which a page object runs
right after its construction, so the fixture reports the mistake before the test body, with the page object's label
in the message.

### Duplicate path behavior

A path can only be registered once. Registering it again throws at the second strategy call, before any step chained
after it runs, and shows both records: the existing one and the attempted one (its strategy only). A `Locator` in a
step is shown as Playwright prints it:

```ts
registry.add("item").locator("li").filter({ has: page.locator("b") });
registry.add("item").locator("li");
// A locator schema with the path "item" already exists.
// Existing Schema: {
//   "existing": {
//     "locatorSchemaPath": "item",
//     "definition": { "type": "locator", "selector": "li" },
//     "steps": [{ "kind": "filter", "filter": { "has": "locator('b')" } }]
//   },
//   "attempted": {
//     "locatorSchemaPath": "item",
//     "definition": { "type": "locator", "selector": "li" },
//     "steps": []
//   }
// }
```

(The message is indented over more lines; it is shortened here.)

### Registered locators do not change

A builder keeps a copy of every options and filter object it is given, so changing the object afterwards has no
effect on the registered locator, and every resolution works on its own copy of the record:

```ts
const options = { name: "Save" };
registry.add("form.button").getByRole("button", options);
options.name = "Cancel";
registry.getLocator("form.button"); // getByRole('button', { name: 'Save' })
```

The copy is one level deep: a `Locator` or a RegExp inside an options or filter object is kept as it is, since neither
can change through Playwright's API.

---

## `getById` deep dive

`getById(id: string | RegExp)` targets elements by their `id` attribute. A string is matched verbatim; a RegExp is
evaluated as a pattern. POMWright adds no semantics of its own on top of Playwright.

### String ids (verbatim, exact match)

The string is compared verbatim and case-sensitively to the element's `id` attribute. There are no prefixes and no
normalization: write the id exactly as it appears in the DOM.

```ts
registry.add("settings.panel").getById("settings.panel"); // <section id="settings.panel">
registry.add("form.user").getById("form:user"); // <input id="form:user">
registry.add("items.first").getById("items[0]"); // <li id="items[0]">
registry.add("banner").getById("#literal-hash"); // <p id="#literal-hash">, the "#" is part of the id
```

Ids containing `.`, `:`, `[`, `]`, spaces, quotes, backslashes, `>>`, non-ASCII characters, or a leading digit all
work as written. An empty string throws at registration (see [Validation](#validation)).

### RegExp ids (pattern match)

The regex is evaluated against each element's `id` attribute value, in the browser, with its flags. An unanchored
pattern is a substring match; anchor with `^` and `$` to match a whole id.

```ts
registry.add("button.submit").getById(/^button\.submit\.[a-z0-9]{4}$/); // whole ids of that shape
registry.add("buttons.any").getById(/btn-submit/); // any id containing "btn-submit"
registry.add("settings.any").getById(/settings/i); // case-insensitive
```

This is intended for auto-generated ids with a stable shape, and for "every element whose id contains X" iteration
together with `nth`, `filter`, `count()` or `all()`.

### Flags

Every flag is passed through to Playwright unchanged, so `getById(/x/i)` behaves exactly like `getByTestId(/x/i)`.
Two notes:

- `g` has no effect on matching.
- `y` (sticky) acts as a start anchor, so `/foo/y` behaves as `/^foo/`: Playwright tests each element's id from
  index 0 and resets the regex state between elements. Prefer `^`, which says what it means.

### Validation

- `getById("")` throws at registration with the registry path in the message:
  `getById requires a non-empty id for "main.form@user".` The same check runs in `update()` and `replace()`, where
  the message names the sub-path, and in `createReusable.getById("")`, where it reads
  `createReusable.getById requires a non-empty id.`
- A seeded registration (`add(path, { reuse: seed })`) may call `getById(undefined)` to inherit the seeded id, or
  pass a value to override it.
- RegExp values are never rejected or rewritten.

### Multiple matches

`getById` may match zero, one, or many elements. Playwright strictness applies at action time as usual, and `nth`,
`filter`, `count()` and `all()` work as for any other locator.

```ts
registry.add("buttons").getById(/^button\.submit\./);
registry.add("buttons.second").getById(/^button\.submit\./).nth(1);
```

### What the resolved selector looks like

- A string id resolves to an attribute selector: `getById("settings.panel")` becomes
  `locator('[id="settings.panel"]')`. The characters that are special inside a CSS string (`"`, `\`, and line
  breaks) are escaped for you.
- A RegExp id resolves through Playwright's attribute engine, the same engine `getByTestId(RegExp)` compiles to:
  `getById(/^a\.b$/i)` becomes the selector `internal:attr=[id=/^a\.b$/i]`.

Both forms pierce open shadow roots, like every Playwright locator. Neither reaches closed shadow roots, which no
Playwright locator can.

### Why not `locator("#settings.panel")`

`#settings.panel` is the CSS compound selector "id `settings` and class `panel`", `#form:user` is a pseudo-class
parse error, and `#1st` is invalid because a CSS identifier cannot start with a digit. Matching such ids with a hash
selector requires identifier escaping (`#settings\.panel`), which is easy to get wrong and hard to read in reports.
The attribute form `[id="…"]` accepts any string and needs only string escaping. One deliberate difference: in a
quirks-mode page (no doctype) `#SETTINGS` matches `id="settings"`, while `[id="SETTINGS"]` does not. POMWright is
case-sensitive in every document mode.

### Migrating from 2.x to 3.0: no more `#` / `id=` prefixes

In 2.x, `getById("#login")` and `getById("id=login")` were normalized to `login`, and a RegExp was reduced to a
literal substring match on its source text. In 3.0:

- `getById("#login")` looks for `id="#login"`. Find stale call sites with

  ```sh
  grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts .
  ```

  and drop the prefix.
- Rendered locator strings change from `locator('#x')` to `locator('[id="x"]')`. Update assertions that compare
  them.
- Plain unanchored patterns such as `/btn-submit/` behave the same. Patterns containing regex metacharacters
  (`.`, `[`, `]`, `(`, `)`, `+`, `*`, `?`, `^`, `$`, `|`) or flags were matched as literal text in 2.x and are
  interpreted in 3.0: escape characters meant literally (`/a\.b/`), and expect flags such as `i` to take effect.
- `getById("")` now throws at registration instead of failing at resolution.

---

## `filter` deep dive

### Accepted `has`/`hasNot` reference forms

For `filter({ has })` and `filter({ hasNot })`, v2 accepts:

1. A Playwright `Locator`
2. A registry path string (e.g. `"main.section.heading"`)

Also supports standard Playwright `hasText` / `hasNotText` options.

> **Tip:** Because `filter` accepts Playwright `Locator` instances, you can also pass locators returned from
> `registry.getLocator(path)`, `registry.getNestedLocator(path)`, or
> `registry.getLocatorSchema(path)...getLocator()` / `getNestedLocator()` in addition to `page.locator(...)`
> and `page.getBy...(...)` calls.

When you pass a **path string**, the registry resolves that path directly by building a locator for the terminal
definition and its own recorded steps (`filter(...)`, `nth(...)`) only. Ancestor segments are **not** chained. If you
want ancestor chaining, pass a Playwright `Locator` built from `registry.getNestedLocator(path)` or from a query
builder `registry.getNestedLocator(path)...getNestedLocator()` which also resolves the chain.

Be careful to avoid **cyclic filter references** (for example, when `pathA` uses `filter({ has: "pathB" })` and `pathB`
eventually filters back to `pathA`). Cycles are detected and throw with:
`Detected cyclic filter reference while resolving "${context.rootPath}": "${path}".`

### Path examples

```ts
registry.add("main").locator("main");
registry.add("main.section").locator("section");
registry.add("main.section.heading").getByRole("heading", { level: 2 });

registry
    .add("main.section.warning")
    .locator(".warning")
    .filter({ has: "main.section.heading" })
    .filter({ hasNot: "main.section" })
    .filter({ hasText: /Warning/i });
```

### Frames in filters

A path reference to a `frameLocator(selector)` segment resolves, like any reference, terminal-only: it is the
`<iframe>` element with that segment's own steps, never the frame's content. So `filter({ has: "shell.frame" })` reads
"has that iframe element". The content of a frame cannot be a `has` target at all: Playwright's `has` is evaluated in
the parent document and rejects a locator that enters a frame (`Frame locators are not allowed inside composite
locators`). A reference to an any-frame segment (`frameLocator()` without a selector) throws, because there is no
element to point at.

---

## Resolution APIs

### `getLocator(path)`

Resolves terminal-only:

```ts
registry.add("main.form.username").getByLabel("Username");
const terminal = registry.getLocator("main.form.username");
// Equivalent to direct getByLabel("Username") from page context.
// terminal.description() === "main.form.username"
```

### `getNestedLocator(path)`

Resolves the full registered chain:

```ts
registry.add("main").locator("main");
registry.add("main.form").getByRole("form", { name: "Login" });
registry.add("main.form.username").getByLabel("Username");

const nested = registry.getNestedLocator("main.form.username");
// locator("main").getByRole("form", { name: "Login" }).getByLabel("Username")
// nested.description() === "main.form.username"
```

### Frames: the iframe element, its steps, and entering the frame

A `frameLocator(selector)` segment is resolved the way Playwright recommends for frames since 1.43: the `<iframe>`
element first, `locator(selector)`, then the segment's own `filter` and `nth` steps, and only then the frame is entered.

- **Non-terminal frame segment**: after the steps, `contentFrame()` becomes the target for the descendants, which
  resolve inside the frame.
- **Terminal frame segment** (`getLocator`, a `getNestedLocator` ending on it, a `has`/`hasNot` reference): the
  `<iframe>` element itself, steps applied. Call `.contentFrame()` on it yourself to go in.

```ts
registry.add("shell.frame@login").frameLocator("iframe#login");
registry.add("shell.frame@login.username").getByLabel("Username");

const frameElement = registry.getNestedLocator("shell.frame@login");       // locator('shell').locator('iframe#login')
const insideFrame = registry.getNestedLocator("shell.frame@login.username"); // …locator('iframe#login').contentFrame().getByLabel('Username')
```

A frame segment without steps renders exactly as `page.frameLocator(selector)` does, because Playwright builds the
same selector for both; a stepped one renders `locator('iframe').nth(1).contentFrame()…`.

**Telling frames apart.** Prefer the ancestor chain: register the frame below the segment that distinguishes it
(`locator('section', { hasText: 'Payment' })` then `frameLocator('iframe')`). Content *inside* the frame cannot
disambiguate the iframe: Playwright's strict mode fails on the element before entering it, and a `has` that enters a
frame is rejected. When the parent context is identical, a step on the iframe element is the last resort, as for any
locator: `nth`, `first`, `last`, and `filter({ visible: true })` for a hidden duplicate.

```ts
registry.add("widgets.frame@second").frameLocator("iframe.widget").nth(1);
registry.add("widgets.frame@visible").frameLocator("iframe.widget").filter({ visible: true }).nth("last");
registry.add("widgets.frame@visible.go").getByRole("button", { name: "Go" });
```

What a step means on a frame segment is what it means on any `<iframe>` element in Playwright: `nth`, `first` and
`last` pick among the matching iframes in the parent document; `filter({ visible })`, `has` and `hasNot` are
evaluated against the iframe element there. `filter({ hasText })` never matches, because the frame's document is not
part of the parent document's text. The query builder addresses a frame sub-path like any other
(`nth("widgets.frame@second", 0)`, `clearSteps("widgets.frame@second")`). `frameLocator(selector)` takes no options,
like Playwright's; a filter on the iframe element is a `filter` step. Steps that were chained on a frame in 2.x were
recorded and dropped at resolution; in 3.0.0 they apply.

### Any frame: `frameLocator()` without a selector

`add(path).frameLocator()` with no argument registers Playwright's any-frame locator, `page.frameLocator()`: the
descendants resolve in whichever single frame holds them, the main frame or any iframe at any depth, so you do not
have to locate the iframe first. Playwright throws at action time when elements match in several frames.

```ts
registry.add("anyFrame").frameLocator();
registry.add("anyFrame.consent").getByRole("button", { name: "Accept" });

await registry.getNestedLocator("anyFrame.consent").click();   // frameLocator().getByRole('button', { name: 'Accept' })
```

Rules, each of them Playwright's: the any-frame segment must be the first segment of the chain that resolves (the
engine allows the any-frame part only at the start of a selector, so an any-frame path below a registered ancestor
throws naming the ancestor); it has no element, so it takes no steps, returns nothing to chain from `add`, cannot be
resolved on its own (`getLocator("anyFrame")` throws), and cannot be a `has`/`hasNot` reference; a selector frame may
follow it (`add("anyFrame.inner").frameLocator("#iframeC")`). "Any iframe under this element" is a different
question, answered by `frameLocator("iframe")` registered under that element's segment. `replace().frameLocator()`
makes a sub-path any-frame; on `update` and on a seeded `add`, an omitted selector keeps the existing one instead.

### Sparse chain behavior

During nested resolution, chain parts/sub-paths that are not registered are skipped, except for the terminal chain/path which throws if no locator definition is registered.

This enables partial/sparse registration patterns, but for readability and maintainability you should generally prefer explicit ancestor registration.

---

## Verifying a registry: `verify()`

Forward references are allowed at registration (`filter({ has: "list.heading" })` before `list.heading` exists), so
a mistyped path reference used to surface only at the first action that resolved it. `registry.verify()` checks every
registered path once and reports every failure together:

```
Locator registry verification failed for 2 of 14 paths:
  "list.item": No locator schema registered for path "list.titel".
  "menu.item": Detected cyclic filter reference while resolving "menu.item": "menu.item".
```

A `PageObject` calls it right after `defineLocators()`, which runs right after the page object's construction (or at
its first locator call, if that comes earlier), so a typo fails in the fixture, before the test body, with the page
object's label and the path named and the construction site in the stack (see *Hooks and lifecycle* in
`PageObject.md`); there is no opt-out, because verification fails only where a resolution would fail. A
standalone registry from `createRegistryWithAccessors` calls `registry.verify()` itself once registration is done.
Verification is synchronous, never touches the DOM, and costs about a microsecond per path.

What it checks: each path with a selector is resolved terminal-only, as `getLocator` does, which evaluates its
`has`/`hasNot` path references through the normal resolution: an unregistered target, a cycle (reported under every
path in it), a reference value that is neither a `Locator` nor a path, a reference to an any-frame segment, and a
corrupted definition all fail, attributed to the path that owns them. An any-frame path is checked against its
first-segment rule instead. What it does not check: whether a selector parses (Playwright parses at action time),
whether an element exists, whether a locator is unique, or anything about query-builder clones. Registration-time
errors (a duplicate path, a missing argument, a step before a strategy) throw inside `defineLocators()` before
`verify()` runs.

---

## Query builder: `getLocatorSchema(path)`

### Clone semantics (registry is not mutated)

`getLocatorSchema(path)` creates a mutable clone of the selected chain; every call creates a new one, so several
queries of the same path can be changed independently.

Any `filter`, `nth`, `clearSteps`, `update`, `replace`, `skip`, `unskip`, or `describe` call affects only the builder
instance, and no method can change what is registered for a path. A filter object passed to the query is copied as
well.

```ts
const builder = registry.getLocatorSchema("main.form.username");
const patched = builder.update().getByLabel("Username", { exact: true }).getNestedLocator();

// Registry remains unchanged.
```

### Sub-path scope rules

For a builder rooted at `"a.b.c"`, valid sub-paths are chain segments within that root (`"a"`, `"a.b"`, `"a.b.c"`) **that are registered**.

If a sub-path is not valid in that context, methods throw:

- `"<subPath>" is not a valid sub-path of "<rootPath>".` for a path outside the chain;
- the same sentence followed by `It is a segment of that path, but no locator schema is registered for it.` for a
  segment of the chain that has no registration (a sparse chain).

### Method-by-method reference

On query builder:

- `filter(subPath?, filter)`
- `nth(subPath?, index)`
- `clearSteps(subPath?)`
- `describe(description)` (terminal path only)
- `update(subPath?)` -> returns update builder (PATCH semantics)
- `replace(subPath?)` -> returns update builder in replace mode (POST semantics)
- `skip(subPath)` and `unskip(subPath)` -> leave an ancestor out of the chain and bring it back (see
  [Skipping a segment](#skipping-a-segment-skip-and-unskip))
- `getLocator()`
- `getNestedLocator()`

Examples:

```ts
const locator = registry
    .getLocatorSchema("main.form.button")
    .filter("main.form", { hasText: "Login" })
    .nth("main.form.button", "first")
    .getNestedLocator();

const noSteps = registry
    .getLocatorSchema("main.form.button")
    .clearSteps("main.form.button")
    .getNestedLocator();
```

### Default sub-path behavior table

If `subPath` is omitted, the terminal path passed to `getLocatorSchema(path)` is used.

| Method | Optional subPath? | Omitted behavior |
| --- | --- | --- |
| `filter(subPath?, filter)` | Yes | Uses terminal path |
| `nth(subPath?, index)` | Yes | Uses terminal path |
| `clearSteps(subPath?)` | Yes | Uses terminal path |
| `update(subPath?)` | Yes | Uses terminal path |
| `replace(subPath?)` | Yes | Uses terminal path |
| `skip(subPath)`, `unskip(subPath)` | No | Required: an ancestor, never the terminal path |
| `describe(description)` | N/A | Always terminal path |

---

## `update` and `replace` semantics

### `update`: a PATCH of the registered definition

`update(subPath?)` patches the definition registered for the sub-path and keeps its strategy. It follows JSON Merge
Patch: a provided value replaces, `null` deletes, and an absent or `undefined` value leaves the field alone.

```ts
const button = () => registry.getLocatorSchema("main.button").update();   // registered: getByRole("button", { name: "Login", exact: true })

button().getByRole("link")                        // getByRole('link', { name: 'Login', exact: true })   primary replaced, options kept
button().getByRole({ name: "Sign in" })           // getByRole('button', { name: 'Sign in', exact: true })  one option set
button().getByRole({ name: null })                // getByRole('button', { exact: true })                 one option deleted
button().getByRole("button", null)                // getByRole('button')                                 every option deleted
button().getByRole(null)                          // getByRole('button')                                 same, primary kept
button().getByRole("button", undefined)           // unchanged: undefined is "not provided"
button().getByRole({ name: undefined })           // unchanged
button().getByRole()                              // unchanged
```

Calling another strategy's method on `update()` throws and says what to do:

```
update("main.button") cannot change the strategy from "role" to "locator"; use replace("main.button").locator(…) instead.
```

All ten methods stay available on `update()` for autocompletion; the registry's path type carries no strategy, so the
check is at runtime. The first argument, when given, follows the same rules as on `add` (an empty selector or role is
rejected).

### `replace`: a new definition of any strategy

`replace(subPath?)` installs a complete definition, of any strategy, with Playwright's own arguments: the first
argument is required and the options are Playwright's option types, exactly as on `page.getByRole(…)`,
`page.locator(…)` and the others. In TypeScript a call without the first argument, an options-only call and `null`
options do not compile, with the diagnostics Playwright gives:

```ts
const schema = registry.getLocatorSchema("main.button");

schema.replace().getByRole({ name: "Save" });           // ❌ compile error, as page.getByRole({ name: "Save" })
schema.replace().getByTestId();                         // ❌ Expected 1 arguments, but got 0.
schema.replace().getByRole("button", { name: null });   // ❌ null deletes nothing in replace: omit the key
schema.replace().getByRole("button", { name: "Save" }); // ✅
```

From JavaScript the calls without a first argument throw at the call with the message every builder uses
(`getByRole requires a role value for "main.button".`), and a `null` options argument or option equals omission.

```ts
const replaced = registry
    .getLocatorSchema("main.button")
    .replace()
    .locator("button.primary", { hasText: "Sign in" })
    .getNestedLocator();
```

`replace().frameLocator()` without a selector installs the any-frame locator.

### Steps and descriptions are untouched

`update` and `replace` change the definition only. The recorded `filter`/`nth` steps and the description survive both,
because a step is what Playwright chains after the locator and belongs to the path, not to the strategy. Use
`filter`, `nth` and `clearSteps` for steps, and `describe` for the description:

```ts
registry.add("list.item").locator("li").filter({ hasText: "Row" }).nth(0);

registry.getLocatorSchema("list.item").replace().getByRole("listitem").getNestedLocator();
// getByRole('listitem').filter({ hasText: 'Row' }).first()

registry.getLocatorSchema("list.item").replace().getByRole("listitem").clearSteps().getNestedLocator();
// getByRole('listitem')
```

To take steps or a description away, say so: `clearSteps(subPath?)` removes the steps and `describe("")` the
description. In 2.x `update` could switch strategies and remembered each strategy's last definition inside the
builder; 3.0.0 has one meaning per verb and no hidden state.

---

## Skipping a segment: `skip` and `unskip`

### What `skip` hides and `unskip` brings back

`skip(subPath)` leaves an ancestor out of the chain when the query resolves, as if it were not registered.
`unskip(subPath)` puts it back. Skipping is a flag: nothing is deleted, so the segment comes back exactly as it was,
with its definition, steps and description, including anything the query gave it before the skip.

```ts
registry.add("main").locator("main");
registry.add("main.list").locator("ul").filter({ hasText: "Orders" });
registry.add("main.list.item").locator("li").nth(0);

const query = registry.getLocatorSchema("main.list.item");

query.skip("main.list").getNestedLocator();
// locator('main').locator('li').first()

query.unskip("main.list").getNestedLocator();
// locator('main').locator('ul').filter({ hasText: 'Orders' }).locator('li').first()
```

`getLocator()` resolves the terminal segment only, so skipped ancestors make no difference to it. A skipped ancestor
in front of an any-frame segment makes that segment the first of the chain again.

### What a skipped segment rejects

A change to a skipped segment would have no effect until `unskip`, and would be lost without it, so `update`,
`replace`, `filter`, `nth` and `clearSteps` on a skipped segment throw at the call; nothing changes:

```ts
registry.getLocatorSchema("main.list.item").skip("main.list").filter("main.list", { hasText: "Open" });
// filter() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.
```

Skipping a segment that is already skipped, or unskipping one that is not, throws too
(`skip() cannot skip "main.list": it is already skipped in this query.`,
`unskip() cannot unskip "main.list": it is not skipped in this query.`).

### The terminal path cannot be skipped

A query resolves its terminal path, so `skip` and `unskip` take the ancestors only: in TypeScript the terminal path
is not offered (`skip("main.list.item")` on a `main.list.item` query is a compile error), there is no form without a
sub-path, and on a one-segment query there is nothing to skip. From JavaScript:

```text
skip() cannot skip "main.list.item": it is the path this query resolves; skip one of its ancestors.
```

To give the terminal path a new definition, use `update()` or `replace()`; to take its steps or description away,
`clearSteps()` and `describe("")`.

---

## Reusable locators: `createReusable`

### Seed creation

`createReusable` provides the same strategy entry methods as `add`.

```ts
const h2 = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });
const firstRow = registry.createReusable.locator("tr").nth(0).describe("First row");
```

### Reuse by object seed

Pass a reusable seed to `add` via `{ reuse: seed }`.

```ts
registry.add("card.title", { reuse: h2 });
registry.add("card.title@first", { reuse: h2 }).nth(0);
```

### Reuse by existing path string

Pass a previously registered path to clone that path definition, steps, and explicit description.

```ts
registry.add("errors.invalidPassword").getByText("Invalid password");
registry.add("main.form.error@invalidPassword", { reuse: "errors.invalidPassword" });
```

If the source has no explicit description, the reused locator defaults to its new target path
(`"main.form.error@invalidPassword"` in this example). An explicit source description is preserved.

Note: path-based reuse registers immediately and does not return a chainable builder.

### Reuse patch rules and limitations

With object-seed reuse:

- Seeded definition is persisted first.
- You may provide **one matching-strategy override** (same discriminant/type). Omitting the first argument
  (`getByTestId(undefined)`, `frameLocator()`) inherits the seeded value; an empty string is a value, stored or
  rejected exactly as on `add`.
- Mismatched strategy overrides throw, and the path keeps the seed; a second override throws, and the path keeps the
  first. Nothing is unregistered.
- `filter` / `nth` / `describe` may still be chained, before or after the override.
- A frame seed needs a selector: `createReusable.frameLocator("iframe")`. The any-frame form has no element and no
  steps, so there is nothing a seed could carry.

```ts
const seed = registry.createReusable.getByRole("heading", { level: 2 });

registry.add("heading.summary", { reuse: seed }).getByRole({ name: "Summary" }); // ✅

// ❌ mismatched strategy: a compile error (a role seed offers only getByRole), and a throw from JavaScript
// registry.add("heading.bad", { reuse: seed }).locator("h2");
```

### Typing seeds in shared modules

A seed is a `ReusableLocator<Paths, Strategy>`. A module that hands out seeds can name them:

```ts
// headings.locators.ts
import type { LocatorRegistry, ReusableLocator } from "pomwright";

export type Paths = "card" | "card.title";

export const headingSeed = (registry: LocatorRegistry<Paths>): ReusableLocator<Paths, "role"> =>
    registry.createReusable.getByRole("heading", { level: 2 });

export function defineLocators(registry: LocatorRegistry<Paths>) {
    registry.add("card").locator("article");
    registry.add("card.title", { reuse: headingSeed(registry) }).getByRole({ name: "Summary" });
}
```

`ReusableLocator<Paths, "role">` keeps the strategy, so the seeded builder offers only the `getByRole` override.
`ReusableLocator<Paths>` accepts a seed of any strategy (a narrow seed assigns to it); the seeded builder then offers
all ten overrides and a wrong one throws at runtime, as for a seed whose strategy TypeScript cannot see.

### Seed immutability

Using a seed in multiple `add(..., { reuse: seed })` chains does not mutate the seed object itself.

---

## `describe` semantics

### Default descriptions

Every locator resolved through `getLocator`, `getNestedLocator`, or `getLocatorSchema` receives the terminal locator
path as its default Playwright description:

```ts
registry.add("main").locator("main");
registry.add("main.button@login").getByRole("button", { name: "Login" });

const direct = registry.getLocator("main.button@login");
const nested = registry.getNestedLocator("main.button@login");

direct.description();
// "main.button@login"

nested.description();
// "main.button@login"
```

For nested chains, descriptions on ancestor paths are ignored; only the terminal locator's explicit description or
path default is applied. A terminal `frameLocator` definition follows the same rule on the `<iframe>` element it resolves
to.

### Registry-level descriptions

Calling `.describe(...)` on `add` stores the supplied description with the path definition and overrides the path
default on the resolved terminal locator.

```ts
registry
    .add("main.submit")
    .getByRole("button", { name: "Submit" })
    .describe("Primary submit button");

registry.getLocator("main.submit").description();
// "Primary submit button"
```

### Query-level overrides

Calling `.describe(...)` on a query builder takes precedence over the registered description or path default for that
builder resolution only. It does not mutate the stored registry description.

```ts
const override = registry
    .getLocatorSchema("main.submit")
    .describe("Temporary override")
    .getLocator();
```

### Removing a description

`describe("")` removes the description, as Playwright's own `describe("")` does: the locator then prints as its
chain. It works on `add`, on a seed and on a query. The argument is a string; from JavaScript, `describe(null)` or
`describe(undefined)` throws `describe requires a string for "<path>"; pass "" to remove the description.` A query
starts from the registered description, so a new `getLocatorSchema(path)` call is the way back to it.

```ts
registry.getLocatorSchema("main.submit").describe("").getLocator().toString();
// getByRole('button', { name: 'Submit' })
```

---

## Error reference and troubleshooting

Common errors and what they usually mean:

- `No locator schema registered for path "...".`
  - Path was never registered.
- `"..." is not a valid sub-path of "...".`
  - Query method targeted a path outside the builder’s chain context; followed by `It is a segment of that path, but
    no locator schema is registered for it.` when it targeted an unregistered segment of the chain.
- `<method>() cannot apply to "...": it is skipped in this query; call unskip("...") first.`
  - `update`, `replace`, `filter`, `nth` or `clearSteps` on a segment left out with `skip`.
- `skip() cannot skip "...": it is the path this query resolves; skip one of its ancestors.`,
  `skip() cannot skip "...": it is already skipped in this query.`,
  `unskip() cannot unskip "...": it is not skipped in this query.`
  - `skip`/`unskip` on the terminal path (from JavaScript), twice, or without a matching `skip`.
- `describe requires a string for "..."; pass "" to remove the description.`
  - `describe(null)` or `describe(undefined)` from JavaScript.
- `A locator schema with the path "..." already exists.`
  - Duplicate registration for same path.
- `<method> requires a <field> value for "...".` and `<method> requires a non-empty <field> for "...".`
  - A registration, seed, update or replacement without its first argument, or with an empty string where
    Playwright cannot use one (`locator`, `frameLocator`, `getByRole`, `getById`). Seeds say `createReusable.<method>`.
- `filter() needs a locator strategy first for "..."; call getByRole, … or getById before it.`
  - `filter`/`nth`/`describe` called before a strategy during registration (a compile error in TypeScript).
- `A locator definition for "..." has already been provided; only one locator type can be set for a registration.`
  - Multiple strategy calls on a non-reuse registration.
- `The locator definition for "..." must use the "..." strategy when reusing a locator.`
  - Mismatched strategy override while using `{ reuse: seed }`.
- `A locator definition for "..." was already provided from reuse; only one matching override is allowed.`
  - More than one seeded strategy override attempted.
- `update("...") cannot change the strategy from "..." to "..."; use replace("...").<method>(…) instead.`
  - `update` keeps the registered strategy; `replace` changes it.
- `frameLocator() without a selector must be the first segment of the chain; "..." has the ancestor "...".`
  - An any-frame segment registered below a registered ancestor (Playwright's rule).
- `frameLocator() without a selector does not point to a particular iframe; "..." cannot be resolved on its own, filtered or indexed; resolve a path inside it.`
  - An any-frame segment used as a terminal, as a `has`/`hasNot` reference, or given a step.
- `Locator registry verification failed for N of M paths:` followed by one line per path
  - `verify()` found path references that cannot resolve; fix each listed path.
- `Detected cyclic filter reference while resolving "...": "...".`
  - A `has`/`hasNot` path reference re-entered an active filter resolution; break/fix the loop or pass a resolved locator.

Troubleshooting checklist:

1. Confirm path literal is valid and registered.
2. Confirm query sub-path is in the same chain root.
3. Confirm reuse override strategy matches seed type.
4. Unskip a segment before changing it.
5. For a strategy change on a query builder, use `replace`, not `update`.
6. For an any-frame segment, keep it first in its chain and resolve a path inside it.

---

## Tested behavioral guarantees

The integration suite (`test`) verifies Locator Registry behavior in depth, including:

- path validation (compile-time + runtime)
- sub-path validation
- all registration strategies
- `filter` behavior, including `has`/`hasNot` variants
- `nth` chaining and ordering
- default, registered, reused, and query-level `describe` behavior
- the required first argument per strategy, and which empty strings are rejected
- `update` as a same-strategy Merge Patch, `replace` as a strategy change, steps kept by both
- `skip`/`unskip` and `clearSteps`
- a registered locator does not change when the objects passed to a builder change afterwards
- reusable locators and reuse constraints, including that a failed override changes nothing
- frames: steps on the iframe element against real frames, nested frames, the any-frame segment
- `verify()` through the registry, the accessors and a page object
- the exported types against the published declarations, including declaration emit of a shared module

For implementation-level examples, see the Locator Registry tests under `test/tests/locatorRegistry`.

---

## Migrating from 2.x to 3.0: frames, registration, `update`

- **Frame steps now apply.** In 2.x a `filter`, `nth`, `first` or `last` chained on a `frameLocator(selector)`
  registration was recorded and dropped at resolution. Review every such chain (`grep -rn 'frameLocator(' --include=*.ts .`
  and look at what follows): the step now selects the `<iframe>` element. A terminal frame path still resolves to the
  element, as `owner()` gave; a step-less frame renders as before.
- **`frameLocator()` without a selector is Playwright's any-frame locator** (needs Playwright 1.64, the peer floor),
  with the first-segment and no-element rules above.
- **`update` keeps the strategy.** Rename `update(...).<otherStrategy>(...)` calls to `replace(...)` and state the
  first argument. The builder-local cache that restored an earlier strategy's definition is gone.
- **`update` deletes with `null`.** `update(x, undefined)` no longer wipes the options and `{ key: undefined }` no
  longer removes a key; use `null` for both (`grep -rn 'update(' --include=*.ts . | grep undefined`).
- **The first argument is required on every builder,** and an empty string throws for `locator`, `frameLocator` and
  `getByRole` (as it already did for `getById`). `getByTestId("")` and the text-likes now store the empty string.
- **Steps before a strategy no longer compile** (`add("x").filter(…)`); at runtime the message names the method.
- **A failed seeded override keeps the seed** instead of unregistering the path.
- **Page objects verify after `defineLocators()`:** a mistyped `has`/`hasNot` path reference or a cycle fails right
  after construction, in the fixture. Standalone registries can call `registry.verify()`.
- **`replace` takes Playwright's arguments.** `replace().getByRole({ name })`, `replace().getByTestId()` and other calls
  without a first argument, which always threw, no longer compile, and neither do `null` options, which meant
  omission: pass the first argument and drop `null` from `replace()` calls. From JavaScript the missing argument throws
  `getByRole requires a role value for "…".` instead of `Locator replace for "…" of type "role" requires a "role"
  value.`
- **The builder and seed types are exported** (see [Types you can import](#types-you-can-import)); a `ReturnType<…>`
  workaround can give way to `LocatorQueryBuilder` or `ReusableLocator`.
- **A path literal with U+FEFF is a compile error,** as it always was a runtime error.
- **`remove` is replaced by `skip` and `unskip`.** `remove(subPath)` deleted the segment's definition, steps and
  description from the query; `skip(subPath)` only leaves it out of the chain, and `unskip(subPath)` brings it back.
  Replace `remove("ancestor")` with `skip("ancestor")`. The terminal path cannot be skipped: replace `remove()`
  followed by `update()`/`replace()` with `update()`/`replace()`, plus `clearSteps()` and `describe("")` where the
  old deletion of steps and description was wanted. `update`, `replace`, `filter`, `nth` and `clearSteps` on a
  skipped segment throw.
- **`nth` hands its index to Playwright.** From JavaScript, `nth(null)` and `nth(undefined)` were dropped, so the
  locator matched every element; they now reach Playwright's `nth`, which matches nothing. Call `nth` only when there
  is an index (`if (i !== undefined) query.nth(i)`).
- **`describe` takes a string.** `describe("")` removes a description; `describe(null)` from JavaScript throws.
- **A registered locator no longer changes** when an options or filter object passed to a builder is changed
  afterwards.

## Migration notes from v1

Key v1 -> v2 Locator Registry differences:

- v2 uses fluent registration (`add(...).getBy...`) instead of v1 object schemas.
- `getLocator` / `getNestedLocator` are synchronous in v2.
- v1 index maps for nested lookup are replaced by query-builder `.nth(...)`.
- v1 `addFilter` style maps to v2 `.filter(...)`.
- v2 query builder adds `replace`, `remove`, `clearSteps`, and `describe` (`remove` became `skip`/`unskip` in 3.0.0).
- frame terminal behavior is explicit (a terminal frame resolves to the `<iframe>` element).

See migration docs in `docs/v1-to-v2-migration` for side-by-side mappings and staged migration guidance.

---

## Best practices

1. **Prefer explicit ancestor registration**
    - Sparse chains are supported, but explicit ancestors improve readability.
2. **Use descriptive path names**
    - Favor semantic segments (`form@login.input@username`) over anonymous names.
3. **Use `getLocatorSchema` for temporary overrides**
    - Keep registry definitions stable; mutate clones for scenario-specific behavior.
4. **Use reusable seeds for repeated patterns**
    - Centralize repeated strategy + steps, then reuse with a single matching override.
5. **Keep filters intentional**
    - Be explicit with `has`/`hasNot` references; prefer path-based references for readability.
6. **Patch with `update`, switch with `replace`**
    - `update` says "same locator, different details"; a strategy change reads as `replace` at the call site.
7. **Tell frames apart by their ancestors**
    - Register a frame below the segment that distinguishes it; use `nth` or `filter({ visible })` on the iframe
      element only when the parent context is identical.
