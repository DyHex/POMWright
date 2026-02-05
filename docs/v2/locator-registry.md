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
    3. [Public `LocatorRegistry` vs internal registry](#public-locatorregistry-vs-internal-registry)
5. [Registering locators with `add`](#registering-locators-with-add)
    1. [All strategy methods](#all-strategy-methods)
    2. [Post-definition chain methods](#post-definition-chain-methods)
    3. [One-strategy-per-registration rule](#one-strategy-per-registration-rule)
    4. [Duplicate path behavior](#duplicate-path-behavior)
6. [`getById` deep dive](#getbyid-deep-dive)
    1. [String normalization](#string-normalization)
    2. [RegExp behavior and escaping](#regexp-behavior-and-escaping)
    3. [Examples](#examples)
7. [`filter` deep dive](#filter-deep-dive)
    1. [Accepted `has`/`hasNot` reference forms](#accepted-hashasnot-reference-forms)
    2. [Path and inline-locator examples](#path-and-inline-locator-examples)
    3. [Frame-locator restrictions in filters](#frame-locator-restrictions-in-filters)
8. [Resolution APIs](#resolution-apis)
    1. [`getLocator(path)`](#getlocatorpath)
    2. [`getNestedLocator(path)`](#getnestedlocatorpath)
    3. [Frame behavior: terminal vs non-terminal](#frame-behavior-terminal-vs-non-terminal)
    4. [Sparse chain behavior](#sparse-chain-behavior)
9. [Query builder: `getLocatorSchema(path)`](#query-builder-getlocatorschemapath)
    1. [Clone semantics (registry is not mutated)](#clone-semantics-registry-is-not-mutated)
    2. [Sub-path scope rules](#sub-path-scope-rules)
    3. [Method-by-method reference](#method-by-method-reference)
    4. [Default sub-path behavior table](#default-sub-path-behavior-table)
10. [`update` and `replace` semantics](#update-and-replace-semantics)
    1. [`update`: PATCH-style merge](#update-patch-style-merge)
    2. [`replace`: POST-style overwrite](#replace-post-style-overwrite)
    3. [Required fields and type switching](#required-fields-and-type-switching)
11. [`remove` and tombstones](#remove-and-tombstones)
    1. [Non-terminal removal](#non-terminal-removal)
    2. [Terminal removal behavior](#terminal-removal-behavior)
    3. [Rehydrating removed segments](#rehydrating-removed-segments)
12. [Reusable locators: `createReusable`](#reusable-locators-createreusable)
    1. [Seed creation](#seed-creation)
    2. [Reuse by object seed](#reuse-by-object-seed)
    3. [Reuse by existing path string](#reuse-by-existing-path-string)
    4. [Reuse patch rules and limitations](#reuse-patch-rules-and-limitations)
    5. [Seed immutability](#seed-immutability)
13. [`describe` semantics](#describe-semantics)
    1. [Registry-level descriptions](#registry-level-descriptions)
    2. [Query-level overrides](#query-level-overrides)
14. [Error reference and troubleshooting](#error-reference-and-troubleshooting)
15. [Tested behavioral guarantees](#tested-behavioral-guarantees)
16. [Migration notes from v1](#migration-notes-from-v1)
17. [Best practices](#best-practices)

---

## Locator Registry overview

The v2 Locator Registry is a typed, fluent DSL for defining and resolving Playwright locators.

At a high level it provides:

- **Typed locator paths** (`"root.section.button"`) validated both at compile time and runtime.
- **Fluent registration** (`add(path).getByRole(...).filter(...).nth(...)`).
- **Two resolution modes**:
  - `getLocator(path)` resolves only the terminal segment.
  - `getNestedLocator(path)` resolves the full chain.
- **Clone-based query mutation** (`getLocatorSchema(path)`) for temporary overrides (`update`, `replace`, `remove`, `filter`, `nth`, `clearSteps`, `describe`) without mutating the registry.

You can use it directly via `createRegistryWithAccessors(page)` or through `PageObject` (`this.add`, `this.getLocator`, `this.getNestedLocator`, `this.getLocatorSchema`).

---

## Mental model

Think of the registry as:

1. A map of **path -> locator definition** (`getByRole`, `locator`, `frameLocator`, etc.).
2. A map of **path -> ordered steps** (`filter` / `nth`).
3. An optional **path description** (`describe`).

When resolving:

- `getLocator(path)` applies only the terminal definition + terminal steps.
- `getNestedLocator(path)` traverses the chain (`a`, `a.b`, `a.b.c`) and applies each registered segment in order.

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
- Path cannot contain Unicode whitespace characters.

```ts
type Paths =
    | "main"
    | "main.form@login"
    | "main.form@login.input@username"
    | "main.form@login.input@password"
    | "main.button@login";
```

If invalid literals are included in the union, type errors are surfaced where the registry factory is instantiated.

### Runtime validation rules

Runtime validation applies the same structure checks:

- empty string
- leading dot
- trailing dot
- consecutive dots
- whitespace characters

This means even if a path reaches runtime as a plain string, it is still validated.

### Common path mistakes and errors

Typical runtime errors:

- `LocatorSchemaPath string cannot be empty`
- `LocatorSchemaPath string cannot start with a dot: .foo`
- `LocatorSchemaPath string cannot end with a dot: foo.`
- `LocatorSchemaPath string cannot contain consecutive dots: foo..bar`
- `LocatorSchemaPath string cannot contain whitespace chars: ...`

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

### Public `LocatorRegistry` vs internal registry

The **public** `LocatorRegistry` intentionally exposes only:

- `add`
- `createReusable`
- `getLocator`
- `getNestedLocator`
- `getLocatorSchema`

Internal lifecycle methods (`register`, `replace`, `get`, `unregister`) exist on the internal implementation and are intentionally not part of the public API.

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
- `frameLocator(selector)`
- `getByTestId(testId)`
- `getById(id)`

### Post-definition chain methods

After a strategy is set, you can chain:

- `filter(filterDefinition)`
- `nth(index)` where index is `number | "first" | "last"`
- `describe(description)`

```ts
registry
    .add("main.list.item")
    .getByRole("listitem", { name: /Row/ })
    .filter({ hasText: "Row" })
    .nth("last")
    .describe("Last matching row");
```

### One-strategy-per-registration rule

Without reuse, calling a second strategy in the same registration throws.

```ts
registry.add("main.button").getByRole("button");
// ❌ Later trying to set .locator(...) for same add-chain is invalid.
```

### Duplicate path behavior

A path can only be registered once. Attempting to register the same path again throws with details about existing vs attempted schema.

---

## `getById` deep dive

### String normalization

For string IDs, v2 normalizes:

- `"#login"` -> `"login"`
- `"id=login"` -> `"login"`

Then resolves as `locator('#login')` with CSS escaping.

### RegExp behavior and escaping

For RegExp IDs, v2 uses the regex source and resolves as a substring selector:

- `getById(/panel-/)` -> `locator('[id*="panel-"]')` (escaped)

This is **substring** matching of the regex source string in the `id` attribute, not runtime regex evaluation in the browser selector engine.

### Examples

```ts
registry.add("modal.close").getById("close-modal");
registry.add("modal.close2").getById("#close-modal");
registry.add("modal.dynamic").getById(/modal-/);
```

---

## `filter` deep dive

### Accepted `has`/`hasNot` reference forms

For `filter({ has })` and `filter({ hasNot })`, v2 accepts:

1. A Playwright `Locator`
2. A registry path string (e.g. `"main.section.heading"`)
3. `{ locatorPath: "main.section.heading" }`
4. An inline strategy definition (`{ type: "locator", selector: "..." }`, etc.)
5. `{ locator: <inline strategy definition> }`

Also supports standard Playwright `hasText` / `hasNotText` options.

### Path and inline-locator examples

```ts
registry.add("main").locator("main");
registry.add("main.section").locator("section");
registry.add("main.section.heading").getByRole("heading", { level: 2 });

registry
    .add("main.section.warning")
    .locator(".warning")
    .filter({ has: "main.section.heading" })
    .filter({ hasNot: { locator: { type: "locator", selector: ".dismissed" } } })
    .filter({ hasText: /Warning/i });
```

### Frame-locator restrictions in filters

Frame locator definitions are not valid filter locators. Attempting to use a frame definition in `has`/`hasNot` throws:

- `Frame locators cannot be used as filter locators.`

---

## Resolution APIs

### `getLocator(path)`

Resolves terminal-only:

```ts
registry.add("main.form.username").getByLabel("Username");
const terminal = registry.getLocator("main.form.username");
// Equivalent to direct getByLabel("Username") from page context.
```

### `getNestedLocator(path)`

Resolves the full registered chain:

```ts
registry.add("main").locator("main");
registry.add("main.form").getByRole("form", { name: "Login" });
registry.add("main.form.username").getByLabel("Username");

const nested = registry.getNestedLocator("main.form.username");
// locator("main").getByRole("form", { name: "Login" }).getByLabel("Username")
```

### Frame behavior: terminal vs non-terminal

If a segment is `frameLocator`:

- **Non-terminal frame segment**: resolution context enters frame for descendants.
- **Terminal frame segment**: resolves to the iframe **owner locator**, not the frame target.

```ts
registry.add("shell.frame@login").frameLocator("iframe#login");
registry.add("shell.frame@login.username").getByLabel("Username");

const frameOwner = registry.getNestedLocator("shell.frame@login");
const insideFrame = registry.getNestedLocator("shell.frame@login.username");
```

### Sparse chain behavior

During nested resolution, chain parts/sub-paths that are not registered are skipped, except for the terminal chain/path which throws if no locator definition is registered.

This enables partial/sparse registration patterns, but for readability and maintainability you should generally prefer explicit ancestor registration.

---

## Query builder: `getLocatorSchema(path)`

### Clone semantics (registry is not mutated)

`getLocatorSchema(path)` creates a mutable clone of the selected chain.

Any `filter`, `nth`, `clearSteps`, `update`, `replace`, `remove`, or `describe` call affects only the builder instance.

```ts
const builder = registry.getLocatorSchema("main.form.username");
const patched = builder.update().getByLabel("Username", { exact: true }).getNestedLocator();

// Registry remains unchanged.
```

### Sub-path scope rules

For a builder rooted at `"a.b.c"`, valid sub-paths are chain segments within that root (`"a"`, `"a.b"`, `"a.b.c"`) **if they exist in the builder clone**.

If a sub-path is not valid in that context, methods throw:

- `"<subPath>" is not a valid sub-path of "<rootPath>".`

### Method-by-method reference

On query builder:

- `filter(subPath?, filter)`
- `nth(subPath?, index)`
- `clearSteps(subPath?)`
- `describe(description)` (terminal path only)
- `update(subPath?)` -> returns update builder (PATCH semantics)
- `replace(subPath?)` -> returns update builder in replace mode (POST semantics)
- `remove(subPath?)`
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
| `remove(subPath?)` | Yes | Uses terminal path |
| `describe(description)` | N/A | Always terminal path |

---

## `update` and `replace` semantics

### `update`: PATCH-style merge

`update(subPath?)` merges fields into the existing definition for that sub-path.

- Omitted required fields may be inherited from current/baseline definitions.
- Options are merged where applicable.

```ts
const updated = registry
    .getLocatorSchema("main.button")
    .update()
    .getByRole({ name: "Sign in" })
    .getNestedLocator();
```

### `replace`: POST-style overwrite

`replace(subPath?)` requires enough data to build a complete definition for the chosen strategy.

```ts
const replaced = registry
    .getLocatorSchema("main.button")
    .replace()
    .locator("button.primary", { hasText: "Sign in" })
    .getNestedLocator();
```

### Required fields and type switching

Important behavior:

- `update` can switch strategy type, but the target strategy must have required fields resolved via provided values or available baselines.
- `replace` requires the required field for the target strategy in the replacement call chain.
- `update` / `replace` only change definitions, not steps. Use `filter` / `nth` / `clearSteps` for steps.

---

## `remove` and tombstones

### Non-terminal removal

Removing an ancestor sub-path soft-deletes that segment in the builder clone. During nested resolution, removed non-terminal segments are skipped.

### Terminal removal behavior

If terminal segment is removed and not restored, resolving throws (no schema for terminal path).

```ts
const builder = registry.getLocatorSchema("main.form.username").remove();
// builder.getNestedLocator() => throws
```

### Rehydrating removed segments

A removed segment can be repopulated within the same builder chain via `update` or `replace`, then resolved successfully.

```ts
const locator = registry
    .getLocatorSchema("main.form.username")
    .remove()
    .replace()
    .getByLabel("Email")
    .getNestedLocator();
```

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

Pass a previously registered path to clone that path definition/steps/description as-is.

```ts
registry.add("errors.invalidPassword").getByText("Invalid password");
registry.add("main.form.error@invalidPassword", { reuse: "errors.invalidPassword" });
```

Note: path-based reuse registers immediately and does not return a chainable builder.

### Reuse patch rules and limitations

With object-seed reuse:

- Seeded definition is persisted first.
- You may provide **one matching-strategy override** (same discriminant/type).
- Mismatched strategy overrides throw.
- More than one strategy override in that chain throws.
- `filter` / `nth` / `describe` may still be chained.

```ts
const seed = registry.createReusable.getByRole("heading", { level: 2 });

registry.add("heading.summary", { reuse: seed }).getByRole({ name: "Summary" }); // ✅

// ❌ mismatched strategy, throws at runtime and compile-time should also guide against this
// registry.add("heading.bad", { reuse: seed }).locator("h2");
```

### Seed immutability

Using a seed in multiple `add(..., { reuse: seed })` chains does not mutate the seed object itself.

---

## `describe` semantics

### Registry-level descriptions

Calling `.describe(...)` on `add` stores description with the path definition and applies it to resolved terminal locator.

```ts
registry
    .add("main.submit")
    .getByRole("button", { name: "Submit" })
    .describe("Primary submit button");
```

### Query-level overrides

Calling `.describe(...)` on query builder overrides description only for that builder resolution and does not mutate the stored registry description.

```ts
const override = registry
    .getLocatorSchema("main.submit")
    .describe("Temporary override")
    .getLocator();
```

---

## Error reference and troubleshooting

Common errors and what they usually mean:

- `No locator schema registered for path "...".`
  - Path was never registered, was removed on builder, or is terminal tombstone.
- `"..." is not a valid sub-path of "...".`
  - Query method targeted a path outside the builder’s chain context.
- `A locator schema with the path "..." already exists.`
  - Duplicate registration for same path.
- `A locator definition must be provided before applying filters or indices for "...".`
  - `filter`/`nth` called before strategy during registration.
- `A locator definition for "..." has already been provided; only one locator type can be set for a registration.`
  - Multiple strategy calls on a non-reuse registration.
- `The locator definition for "..." must use the "..." strategy when reusing a locator.`
  - Mismatched strategy override while using `{ reuse: seed }`.
- `A locator definition for "..." was already provided from reuse; only one matching override is allowed.`
  - More than one seeded strategy override attempted.
- `Frame locators cannot be used as filter locators.`
  - Inline filter `has`/`hasNot` passed a frame locator definition.

Troubleshooting checklist:

1. Confirm path literal is valid and registered.
2. Confirm query sub-path is in the same chain root.
3. Confirm reuse override strategy matches seed type.
4. Confirm terminal path still exists if `remove()` was called.

---

## Tested behavioral guarantees

The v2 integration suite (`intTestV2`) verifies Locator Registry behavior in depth, including:

- path validation (compile-time + runtime)
- sub-path validation
- all registration strategies
- `filter` behavior, including `has`/`hasNot` variants
- `nth` chaining and ordering
- `describe` behavior
- `update` / `replace` / `remove`
- `clearSteps`
- reusable locators and reuse constraints
- frame locator behavior

For implementation-level examples, see the Locator Registry tests under `intTestV2/tests/locatorRegistry`.

---

## Migration notes from v1

Key v1 -> v2 Locator Registry differences:

- v2 uses fluent registration (`add(...).getBy...`) instead of v1 object schemas.
- `getLocator` / `getNestedLocator` are synchronous in v2.
- v1 index maps for nested lookup are replaced by query-builder `.nth(...)`.
- v1 `addFilter` style maps to v2 `.filter(...)`.
- v2 query builder adds `replace`, `remove`, `clearSteps`, and `describe`.
- frame terminal behavior is explicit (terminal frame resolves to owner locator).

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
6. **Document intentional strategy switching in query updates**
    - Type switches are powerful; use them deliberately and clearly in test code.
