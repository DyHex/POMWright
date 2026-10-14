# Plan: types and exports (analysis item 1.9 a to d, the section 2 type-alias bullet, and the section 4 `stripInternal` bullet)

Working document, kept in `release-3.0.0/` beside the analysis it answers: item 1.9a (replace mode is not in the
builder types), 1.9b (the query builder leaks internals after one call; `stripInternal`), 1.9c (whitespace parity
between the type-level and the runtime path check), 1.9d (missing type exports, including the rename of
`UrlTypeOptions` that plan 1.5 and plan 1.7 deferred here), the section 2 bullet on unused and duplicate type
aliases, `index: IndexSelector | null` and the redundant union member, and the section 4 `stripInternal` bullet that
plan 4 left open. 1.9e was closed by plan 1.6-1.8. File links are relative to this folder. Written and reviewed
2026-10-14: the review dropped `UrlTypeOptions` outright instead of keeping it as a deprecated alias (3.7), added the
`stripInternal` failure mode (P5b) and the history of the four unused aliases (2.9), and corrected where the new
declaration check is wired (`pack-test.sh` calls `tsc` itself, 4.2). Every decision in section 7 was taken with the
user on 2026-10-14 and is mirrored in [DECISIONS.md](DECISIONS.md) and [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md).
Executed 2026-10-14, see below.

**Executed 2026-10-14** on `chore/bugfixes-quality-improvements-and-docs`, one commit per execution step: 46a04e9 (1,
the types and the runtime with the unit tests, red then green), 5cca796 (2, the harness: the public-types probe, the
declaration-emit check wired into `pnpm typecheck` and `pack-test.sh`, the spec edits), 6ca76cd (3, `docs/v3`), 4220bfa
(4, the changeset), and the ledger commit for step 6 that carries this note. Step 5 found nothing to fix: `pnpm lint`
clean, 276 unit tests with no type errors, `pnpm build`, `pnpm pack-test` 1122 passed (374 per browser) with both type
checks, and the probes of 5.3 against the final tarball as planned. The three details left to execution (per-method
argument names, `FilterDefinition` exported as it is, the plain space unescaped) and the folding of `PathArgument`
into `LocatorSchemaPathArgument` are in [DECISIONS.md](DECISIONS.md). The CI follow-up raised in review was
implemented ahead of this plan as 95975cf (plan 4's section of DECISIONS.md).

Every claim below was verified on 2026-10-14 against HEAD 9d95a78, never in the working tree: a fresh clone in the
session scratchpad, `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm pack`; temporary consumer projects that
install the packed tarball with `@playwright/test` 1.64.0, TypeScript 5.9.3 and `@types/node`, compiled under
`strict`, `noUncheckedIndexedAccess` and `verbatimModuleSyntax` with `moduleResolution` `bundler`, `node16` and
`nodenext` (each from a `.cts` and an `.mts` file) and `node10`, every negative case a consumed `@ts-expect-error` and
every probe file carrying at least one to prove that the real declarations were loaded (`--listFiles` shows
`dist/index.d.ts`, plus `dist/index.d.mts` for `import`); runtime behaviour through the installed package with
chromium from the same consumer (its only `@playwright/test`); `@arethetypeswrong/cli` 0.18.5 through `npx` in the
scratchpad, not added to the repository; Node 24.19.0. The designs of section 3 were checked on a prototype built on
a branch of the scratch clone (P9): `pnpm test:unit`, `pnpm typecheck` and the chromium harness ran against it.
API usage facts come from one 2.1.0 consumer project, counts only. Example hosts are generic (`*.example`).

Probes cited below: **P1** the published declarations of a fresh HEAD build: which names are exported, which
declarations are bundled without an export, the `@internal` members, which section 2 aliases survive bundling;
**P2** replace mode and the query builder's internals at the type level, HEAD, in the four resolution modes;
**P3** the same calls at runtime against `dist`; **P4** what a consumer can name: (a) an import of each candidate
type from `"pomwright"`, (b) derivations through `ReturnType` and `Parameters`, (c) a generic domain base class that
forwards a path, (d) declaration emit (`declaration: true`) of a shared locator module, (e) a class re-exported as a
type; **P5** `stripInternal`: the declaration diff, the ESM entry, attw, P2 and P4d against that build, and (b, review)
a type tagged `@internal` that a public type still uses, in its own file and across files, with a consumer under
`skipLibCheck` `true` and `false`; **P6** whitespace: every code point against the runtime check and the type list, a `tsc` probe per character, and what the
error message prints; **P7** the section 2 aliases: references in `src`, presence in the bundle, the producers of
index steps; **P8** the consumer survey; **P9** the prototype: unit tests, `pnpm typecheck` over `test/`, the chromium
suite, attw, and P2, P3, P4 and P6 re-run against it; **P10** the diagnostics of three replace-mode argument shapes
next to Playwright's own; **P11** `UrlTypeOptions` renamed: a deprecated alias (`tsc` and the language service's
suggestion diagnostics) and, in review, no alias (the consumer's diagnostic); **P12** the misspelt `has` diagnostic
before and after the `FilterDefinition` simplification; **P13** the other internal members (`register`, `buildLocatorChain`, `persistSeededDefinition`)
through the public types; **P14** (review) the history of the four unused aliases (`git log -S` over the repository,
release tags).

Out of scope, left to the plans listed in [PLANS.md](PLANS.md): the remaining 1.10 bullets and the section 2 code
bullets (plan 8), including the dead `?? null` in the debug-step record of `buildLocatorChain`
([locatorRegistry.ts:552](../src/locators/locatorRegistry.ts#L552)), which goes with `debugSteps`; the strategy
table, `describe` options or `explain`, strict chains, path reuse returning a builder and seed immutability (plan 9);
the documentation sweep beyond the pages this plan changes (plan 10); the Starlight site (release work). Not planned:
a runtime check that `nth()` receives an `IndexSelector` (from JavaScript `nth(null)` is a silent no-op today,
[utils.ts:162-165](../src/locators/utils.ts#L162-L165)); it is not in the analysis.

---

## 1. Intended contract

### 1.1 In short, for consumers

Nothing changes at runtime except one error message (replace without its first argument). What changes is what
TypeScript accepts and what a consumer can name.

**`replace()` takes Playwright's own arguments.** It installs a complete definition, so its first argument is
required, as on `page.getByRole(...)`. Today the types are the ones of `update()`, where every argument is optional:

```ts
// 2.1.0 and HEAD: all three compile
schema.replace().getByRole({ name: "Save" });        // throws: Locator replace for "form.button" of type "role" requires a "role" value.
schema.replace().getByTestId();                      // throws: Locator replace for "form.button" of type "testId" requires a "testId" value.
schema.replace().getByRole("button", { name: null }); // works: null means "no name" here

// 3.0.0: compile errors, with the diagnostics Playwright gives for page.getByRole({ name: "Save" })
schema.replace().getByRole({ name: "Save" });        // TS2345 … not assignable to parameter of type '"search" | "link" | …'
schema.replace().getByTestId();                      // TS2554 Expected 1 arguments, but got 0.
schema.replace().getByRole("button", { name: null }); // TS2322 Type 'null' is not assignable to type 'string | RegExp | undefined'.
schema.replace().getByRole("button");                // what was meant
// from JavaScript the first two throw at the call, now with the message every other builder uses:
//   getByRole requires a role value for "form.button".
```

**The builder chain no longer exposes internals.** Today one call is enough to reach two internal methods that skip
the argument checks:

```ts
// 2.1.0 and HEAD: compiles, and registers an empty selector that fails only at the first action
getLocatorSchema("form.button").filter({ hasText: "Save" }).applyReplacement("form.button", { type: "locator", selector: "" });
// 3.0.0: TS2341 Property 'applyReplacement' is private and only accessible within class 'LocatorQueryBuilderInternal<…>'.
```

**Shared locator modules can name what they return.** Today none of these types can be imported, and since plan 4's
`exports` map there is no deep path either:

```ts
// locators/shared.ts, 3.0.0
import type { LocatorQueryBuilder, LocatorRegistry, ReusableLocator } from "pomwright";

export type Paths = "main" | "main.heading" | "list" | "list.item";

export const headingSeed = (registry: LocatorRegistry<Paths>): ReusableLocator<Paths, "role"> =>
  registry.createReusable.getByRole("heading", { level: 2 });

export const lastRow = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.item"> =>
  registry.getLocatorSchema("list.item").nth("last");
```

The annotations are optional; what matters most is a project compiled with `declaration: true` (a page-object package
in a monorepo, or a test project that sets it, as the surveyed one does): the same module without annotations fails
to compile today with 35 errors (TS4094, TS2742, TS7056) and compiles in 3.0.0, where TypeScript writes
`import("pomwright").ReusableLocator<Paths, "role">` into the emitted declarations (P4d, P9).

**A domain base class can forward a path.** Today a helper in a base class that is generic in its path union cannot
pass a path on without a cast (P4c):

```ts
import type { Locator } from "@playwright/test";
import { type LocatorSchemaPathArgument, PageObject } from "pomwright";

export abstract class ShopApp<Paths extends string> extends PageObject<Paths> {
  // 2.1.0 and HEAD: `nested(path: Paths)` fails with TS2345 at this.getNestedLocator(path)
  async clickOn<Path extends Paths>(path: LocatorSchemaPathArgument<Path>): Promise<void> {
    await this.getNestedLocator(path).click(); // 3.0.0: compiles; a misspelt path is still an error at the caller
  }
}
```

**Smaller items.** `UrlTypeOptions`, which also carries the `storage` schema since plan 1.5, is renamed
`PageObjectTypeOptions`; the old name is gone, so a domain base class that imports it gets one TS2305 at the import
and needs a search-and-replace (P11). A path literal containing U+FEFF (the byte-order mark) is a compile error, as it has always been a runtime error. The
whitespace error message shows the character as `\u00A0` instead of printing it raw.

What a consumer can notice:

| where | 2.1.0 and HEAD | 3.0.0 |
| --- | --- | --- |
| `replace().<method>()` without the first argument, or with only options | compiles, throws at the call | compile error; from JavaScript it still throws at the call, with the shared message template (7.1, 7.2) |
| `replace().<method>(primary, null)` or `{ key: null }` | compiles; `null` means omission | compile error; from JavaScript unchanged (7.1) |
| `replace().<method>(primary, undefined)`, `replace().frameLocator()` | compile | compile (Playwright's own forms; the any-frame form) |
| `update()` in every form | as decided by plan 1.6-1.8 | unchanged |
| `getLocatorSchema(p).filter(…).applyUpdate(…)` and the eight other back-door calls | compile | compile errors; JavaScript can still call them (not supported) (7.3) |
| `import type { LocatorQueryBuilder, LocatorUpdateBuilder, ReusableLocator, FilterDefinition, IndexSelector, LocatorSchemaPathFormat, LocatorSchemaPathArgument, PageObjectTypeOptions } from "pomwright"` | TS2305 for each (P4a) | compiles (7.5, 7.7) |
| the same names used as values (`new LocatorUpdateBuilder(…)`) | TS2305 | TS1484 and TS2693: type-only (7.4) |
| a shared module with `declaration: true` that returns a seed, a query builder or an update builder | TS4094, TS2742, TS7056 | compiles (7.4, 7.5) |
| the same module returning `registry.add(…).locator(…)` from an expression-bodied arrow | TS4023 | TS4023, unchanged: give the function a block body or `: void` (7.6) |
| a generic base class forwarding `path: P` | TS2345 | TS2345, unchanged; `path: LocatorSchemaPathArgument<Path>` compiles (7.5) |
| `UrlTypeOptions` | the name | removed: TS2305 `Module '"pomwright"' has no exported member 'UrlTypeOptions'.`; rename to `PageObjectTypeOptions` (7.7) |
| a path literal with U+FEFF | compiles, throws at registration | compile error, throws at registration (7.8) |
| the whitespace error for U+00A0 | `… whitespace chars: main .form`, the U+00A0 printed raw, indistinguishable from a space | `… whitespace chars: main\u00A0.form` (7.9) |
| hover and error texts | `LocatorQueryBuilderPublic<…>` for the first call, `LocatorQueryBuilder<…>` (the class) after it | `LocatorQueryBuilder<…>` throughout (7.4) |

### 1.2 Principles for this plan

- **Mirror Playwright's signatures.** Where a builder method stands for a Playwright method with its arguments
  required, it has Playwright's parameter list and gives Playwright's diagnostics. `update()` is POMWright's own
  patch semantics and keeps its own shapes (plan 1.6-1.8).
- **A compile-time check only where it costs nothing.** Every new compile error in this plan is a call that throws at
  runtime today, with two exceptions: `null` options in `replace()`, which mean omission and are written differently
  in Playwright (7.1), and the `UrlTypeOptions` rename, a one-line migration (7.7).
- **The public surface is what the root exports, and every type it hands out can be named.** A value that a public
  method returns has a type a consumer can import, so that annotations and declaration emit work. Exception: the
  transient registration builders (7.6).
- **Public names are type aliases, never class re-exports.** A class exported as a type becomes a value in the
  bundled declarations (P4e).
- **Internals are private in the type system, not hidden by a build flag.** The compiler enforces `private`; a
  JSDoc tag with `stripInternal` is enforced by nothing (P5).
- **One source for the path rules.** The characters the type rejects and the characters the runtime rejects come
  from one list.
- **No new runtime dependency, no new dev dependency, no change to `index.mjs`.** Every addition is a type; the ESM
  entry is generated from runtime keys and stays at seven names (P9).

### 1.3 The public type surface after this plan

| exported name | what it is | where a consumer meets it | new? |
| --- | --- | --- | --- |
| `LocatorRegistry<Paths>` | the registry: `add`, `createReusable`, `getLocator`, `getLocatorSchema`, `getNestedLocator`, `verify` | `PageObject#locatorRegistry`, locator modules | no |
| `AddAccessor<Paths>`, `GetLocatorAccessor<Paths>`, `GetLocatorSchemaAccessor<Paths>`, `GetNestedLocatorAccessor<Paths>` | the four accessors | `PageObject` members, custom page objects | no |
| `LocatorQueryBuilder<Paths, Path>` | what `getLocatorSchema(path)` returns, and every step of its chain | helpers that take or return a query | yes |
| `LocatorUpdateBuilder<Paths, Path, SubPath, Mode>` | what `update(subPath?)` (`Mode` `"update"`) and `replace(subPath?)` (`"replace"`) return | rarely named; it makes emit work | yes |
| `ReusableLocator<Paths, Strategy>` | a seed from `createReusable`, the type of `add(path, { reuse })`; `Strategy` defaults to any of the ten | shared seed modules | yes |
| `FilterDefinition<Paths>` | the argument of `filter`, Playwright's filter with `has`/`hasNot` path references | helpers that build filters | yes |
| `IndexSelector` | `number \| "first" \| "last"`, the argument of `nth` | helpers that pass an index | yes |
| `LocatorSchemaPathFormat<Path>` | the path check: `Path` itself, or an error tuple naming the rule | custom generic wrappers | yes |
| `LocatorSchemaPathArgument<Path>` | the type of every accessor's path parameter, built on the format | forwarding helpers (1.1) | yes |
| `PageObjectTypeOptions` | `PageObject`'s second type argument: `baseUrlType`, `urlPathType`, `storage` | domain base classes | renamed from `UrlTypeOptions`, which is removed |
| the `*FromOptions` helpers, `NavigationFor`, `NavigationOptions`, `ThisPageOptions`, `UrlMatcher`, `Codec`, `SessionStorageSchema`, `LogEntry`, `LogLevel` | unchanged | | no |

Not exported, by decision: `LocatorDescription` (it is `string`, Playwright's `describe` parameter), the ten
strategy definition types, `LocatorStep`, `OptionsPatch`, `RegistryPath`, the registration builder views (7.6), the
seed factory, and the internal classes.

### 1.4 Replace mode: the contract

`Mode` is a type parameter of the update builder; `update()` passes `"update"`, `replace()` passes `"replace"`.

| method | `update()` arguments (unchanged) | `replace()` arguments (3.0.0) | Playwright |
| --- | --- | --- | --- |
| `getByRole` | `()`, `(role)`, `(optionsPatch \| null)`, `(role, optionsPatch \| null \| undefined)` | `(role, options?)` | `getByRole(role, options?)` |
| `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle` | the same shapes with `text` | `(text, options?)` | the same |
| `locator` | the same shapes with `selector` | `(selector, options?)` | `locator(selector, options?)` |
| `frameLocator` | `()`, `(selector)` | `()`, `(selector)`: no selector is the any-frame form | `page.frameLocator(selector?)` |
| `getByTestId` | `()`, `(testId)` | `(testId)` | `getByTestId(testId)` |
| `getById` | `()`, `(id)` | `(id)` | n/a |

`options` in replace mode is Playwright's own option type, so a `null` key or a `null` options argument is a type
error, as in Playwright. At runtime nothing about `null` changes: a JavaScript caller's `null` still equals omission
(the `replace` section of [locator-registry.md:693-706](../docs/v3/locator-registry.md#L693-L706) says so today and
moves to a JavaScript note). A missing first argument throws at the call with `<method> requires a <field> value for
"<path>".` (`getById requires a non-empty id for "<path>".`), the template that
[locator-registry.md:254-258](../docs/v3/locator-registry.md#L254-L258) and
[L886-888](../docs/v3/locator-registry.md#L886-L888) and the unreleased
[registration-guards-and-frames.md:27-28](../.changeset/registration-guards-and-frames.md#L27-L28) already promise for
`replace` (2.2).

### 1.5 Path whitespace: the contract

A path may not contain any of 26 characters: the 25 with the Unicode `White_Space` property and U+FEFF. The type
`UnicodeWhitespaceChar` and the runtime check are both built from one `as const` list, so they cannot drift. The
runtime set is unchanged (it is JavaScript's `\s`, which includes U+FEFF, plus U+0085); the type gains U+FEFF.
Characters that are not whitespace (U+180E, U+200B, U+2060) stay allowed by both. The error message escapes each of the
26 as `\uXXXX` where `JSON.stringify` leaves it raw.

### 1.6 Edge cases, with the decided answer

| case | today (verified) | 3.0.0 |
| --- | --- | --- |
| `replace().getByRole("button", undefined)` | compiles | compiles: Playwright's own form (P9) |
| `replace().frameLocator()` | compiles; installs the any-frame form | the same |
| `replace()` from JavaScript with `null` options | `null` equals omission (P3) | the same (P9) |
| `replace().getByRole()` from JavaScript | `Locator replace for "a" of type "role" requires a "role" value.` | `getByRole requires a role value for "a".` (P9) |
| a back-door call from JavaScript (`q.applyReplacement(…)`) | runs and skips the argument checks: an empty selector is registered and fails at the action, `Unexpected token "" while parsing css selector ""` (P3) | still runs: TypeScript `private` is compile-time only; not supported, not documented (3.2) |
| `import { LocatorQueryBuilder } from "pomwright"` as a value | TS2305 | TS1484 and TS2693 (P9) |
| a seed typed with the wide `ReusableLocator<Paths>` passed to `add` | n/a | the seeded builder offers all ten overrides; a wrong one throws `must use the "locator" strategy when reusing a locator`, as for an untyped seed (P9) |
| a narrow seed (`ReusableLocator<Paths, "locator">`) assigned to the wide type | n/a | compiles: the seed type is covariant in its strategy (3.5, P9) |
| `LocatorQueryBuilder<Paths, "list.item">` then `update("main")` | n/a | compile error: the sub-path check holds through the name (P9) |
| `ReturnType<GetLocatorSchemaAccessor<Paths>>`, the workaround today | compiles, but `Path` collapses to the whole union and `update(anyPath)` is accepted (P4b) | still compiles; the docs point to `LocatorQueryBuilder` |
| a generic base class with `path: P` | TS2345 (P4c) | TS2345; documented with the `LocatorSchemaPathArgument` form, which keeps the check at the helper's call site (P9) |
| an expression-bodied arrow returning `registry.add(…).locator(…)` under `declaration: true` | TS4023 and TS2742 (P4d) | TS4023 (P9); documented: block body or `: void` |
| `UrlTypeOptions` in an existing base class | compiles | one TS2305 at the import, none at the constraints that use it (P11); rename to `PageObjectTypeOptions` |
| a `has: "list.itme"` typo | TS2820 `Did you mean '"list.item"'?` | identical (P12) |
| a path literal with U+FEFF in the union | compiles, throws at registration (P6) | compile error at the accessor (P9) |
| U+200B, U+180E, U+2060 in a path | accepted by both | accepted by both (P6, P9) |
| `index.mjs` and the ESM spec | seven runtime names | seven runtime names; `esmEntry.spec.mts` unchanged (P9) |

### 1.7 2.1.0 and 3.0.0 side by side

| aspect | 2.1.0 (and HEAD) | 3.0.0 |
| --- | --- | --- |
| `replace()` argument types | `update()`'s, all optional, [locatorUpdateBuilder.ts:64-70](../src/locators/locatorUpdateBuilder.ts#L64-L70) | Playwright's parameter lists, through a `Mode` type parameter (7.1) |
| `replace()` without its first argument | old template, [L154-L193](../src/locators/locatorUpdateBuilder.ts#L154-L193) | the shared template, at the DSL call (7.2) |
| `applyUpdate`, `applyReplacement` | public with an inert `@internal`, [locatorQueryBuilder.ts:226-297](../src/locators/locatorQueryBuilder.ts#L226-L297) | `private`; the update builder gets a commit callback (7.3) |
| `stripInternal` | absent | absent; the analysis bullet ticked *Skip* (7.3) |
| query builder type | `LocatorQueryBuilderPublic` (a `Pick`) for the first call, the class after it (`this`), [L22-28](../src/locators/locatorQueryBuilder.ts#L22-L28) | one exported alias, `LocatorQueryBuilder`, returned by every step (7.4) |
| internal class names | `LocatorQueryBuilder`, `LocatorUpdateBuilder` | `LocatorQueryBuilderInternal`, `LocatorUpdateBuilderInternal`, as `LocatorRegistryInternal` (7.4) |
| exported types | 18, [index.ts](../index.ts) | 25: seven new, `UrlTypeOptions` renamed `PageObjectTypeOptions` (7.5, 7.7) |
| seed type | `ReusableLocatorBuilder` (class) out of the factory, `ReusableLocator` (structural) into `add`, neither exported, invariant in the strategy | one exported `ReusableLocator<Paths, Strategy>`, covariant (7.5) |
| registration builder types | not exported | not exported (7.6) |
| `UrlTypeOptions` | the name | `PageObjectTypeOptions`; the old name removed (7.7) |
| type whitespace list | 25 characters, [types.ts:4-29](../src/locators/types.ts#L4-L29) | the runtime's 26, one list (7.8) |
| runtime whitespace check | `/[\s\u0085]/u`, [utils.ts:32](../src/locators/utils.ts#L32) | the same 26, built from the list (7.8) |
| whitespace error message | raw for 21 of 26 characters (one is the space) | escaped (7.9) |
| unused aliases | four, [types.ts:65](../src/locators/types.ts#L65), [L76](../src/locators/types.ts#L76), [L218-231](../src/locators/types.ts#L218-L231), [L272](../src/locators/types.ts#L272) | deleted (7.10) |
| identical aliases | `RegistryPath`, `ValidLocatorPath`, `LocatorSchemaPathAlias` ([L73-77](../src/locators/types.ts#L73-L77), [L90-91](../src/locators/types.ts#L90-L91)); `ResolvedFilterDefinition` = `PlaywrightFilterDefinition` ([L181-182](../src/locators/types.ts#L181-L182)) | `RegistryPath` and `PlaywrightFilterDefinition` only (7.10) |
| `LocatorStep` index | `IndexSelector \| null`, [L190](../src/locators/types.ts#L190) | `IndexSelector` (7.10) |
| `FilterDefinition` | a two-member union whose first member is assignable to the second, [L208-216](../src/locators/types.ts#L208-L216) | the second member alone (7.10) |

---

## 2. How it works today (verified)

### 2.1 The published declarations

P1, a fresh build of HEAD: `dist/index.d.ts` is 66,004 bytes; its export statement lists 25 names, 18 of them types.
87 names are declared, 62 of them without an export, bundled because exported signatures reference them, among them
`LocatorQueryBuilder` (class), `LocatorQueryBuilderPublic`, `LocatorUpdateBuilder`, `ReusableLocatorBuilder`,
`ReusableLocatorFactory`, `LocatorRegistryInternal`, `LocatorRegistrationBuilder` and its three views,
`FilterDefinition`, `IndexSelector`, `LocatorDescription`, `LocatorSchemaPathFormat`, `RegistryPath` and
`LocatorSchemaPathAlias`. The two `@internal` members are emitted with their tag: `applyUpdate` and
`applyReplacement` on the `LocatorQueryBuilder` class. `dist/index.d.mts` is `export * from "./index.js";` and
`dist/index.mjs` re-exports the seven runtime names. Since plan 4's `exports` map a type that the root does not export
cannot be reached by any path: `import type { ReusableLocatorBuilder } from "pomwright/dist/index"` fails under
`bundler` (P4a).

### 2.2 Replace mode (1.9a)

Plan 1.6-1.8 split `update` (same strategy, JSON Merge Patch) from `replace` (any strategy, primary required) at
runtime, but both verbs still return one builder class whose argument tuples are mode-agnostic:
`UpdateArgsWithOptions` and `UpdateArgsWithoutOptions` ([locatorUpdateBuilder.ts:64-70](../src/locators/locatorUpdateBuilder.ts#L64-L70))
make every argument optional and accept `OptionsPatch` with `null`; `mode` is a constructor value
([L212](../src/locators/locatorUpdateBuilder.ts#L212)) that only `commit` reads ([L431-435](../src/locators/locatorUpdateBuilder.ts#L431-L435)).
The DSL checks the primary only when one is given (for example [L233-235](../src/locators/locatorUpdateBuilder.ts#L233-L235)),
so a missing primary in replace mode reaches `buildReplacementDefinition`, which throws its own template
([L154](../src/locators/locatorUpdateBuilder.ts#L154), [L166](../src/locators/locatorUpdateBuilder.ts#L166),
[L174](../src/locators/locatorUpdateBuilder.ts#L174), [L186](../src/locators/locatorUpdateBuilder.ts#L186),
[L193](../src/locators/locatorUpdateBuilder.ts#L193)).

P2 (all four resolution modes, no error reported): `replace().getByRole()`, `getByRole({ name: "x" })`,
`getByRole(null)`, `getByText()`, `getByLabel({ exact: true })`, `getByPlaceholder()`, `getByAltText()`,
`getByTitle()`, `locator()`, `locator({ hasText: "x" })`, `getByTestId()`, `getById()`, `getByRole("button", null)`
and `getByRole("button", { name: null })` all compile.

P3, the same calls against `dist` with a real page:

| call | result |
| --- | --- |
| the twelve calls without a primary | throw at the call: `Locator replace for "a" of type "role" requires a "role" value.`, `… of type "label" requires a "text" value.`, `… of type "locator" requires a "selector" value.`, `… of type "testId" requires a "testId" value.`, `… of type "id" requires an "id" value.` |
| `replace().getByRole("button", null)`, `({ name: null })`, `({ name: "One", exact: null })` | resolve; `null` equals omission |
| `add("x").getByRole()` from JavaScript, for comparison | `getByRole requires a role value for "x".` |

So the documented contract (1.4) holds for `add`, seeded `add`, `createReusable` and `update`, but not for
`replace`. The harness pins the old text at
[getLocatorSchema.update.spec.ts:230-232](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L230-L232);
the unit tests at [locatorUpdateBuilder.test.ts:169-186](../src/locators/locatorUpdateBuilder.test.ts#L169-L186) call
`buildReplacementDefinition` directly. [RELEASE-NOTES-3.0.0.md:185](RELEASE-NOTES-3.0.0.md#L185) quotes the template
without "value" (`getByRole requires a role for "main.button"`), which is a typo in the notes.

### 2.3 Internals after one call (1.9b)

`getLocatorSchema(path)` returns `LocatorQueryBuilderPublic`, a `Pick` of nine methods of the class
([locatorQueryBuilder.ts:22-28](../src/locators/locatorQueryBuilder.ts#L22-L28),
[locatorRegistry.ts:389-396](../src/locators/locatorRegistry.ts#L389-L396)). `filter`, `nth`, `clearSteps` and
`remove` are declared to return `this` ([L119-123](../src/locators/locatorQueryBuilder.ts#L119-L123),
[L158-161](../src/locators/locatorQueryBuilder.ts#L158-L161), [L185-189](../src/locators/locatorQueryBuilder.ts#L185-L189),
[L312-315](../src/locators/locatorQueryBuilder.ts#L312-L315)) and `describe` returns it implicitly
([L220](../src/locators/locatorQueryBuilder.ts#L220)); `this` resolves to the class, and the update builder's
strategy methods return what `applyUpdate`/`applyReplacement` return, which is the class too. P2, all four modes:
the first-level `q.applyUpdate(…)` is an error, and these compile:

```ts
q.filter({ hasText: "x" }).applyReplacement("a", { type: "locator", selector: "div" });
q.nth(0).applyUpdate("a", { type: "role", role: "button" });
q.clearSteps().applyUpdate("a", { type: "role" });
q.describe("d").applyReplacement("a", { type: "testId", testId: "t" });
q.remove().applyUpdate("a", { type: "locator" });
q.update().getByRole("button").applyReplacement("a", { type: "id", id: "x" });
q.replace().getByRole("button").applyUpdate("a", { type: "role" });
registry.getLocatorSchema("list.item").filter("list", { hasText: "x" }).applyUpdate("list", { type: "locator", selector: "ul" });
```

TypeScript-private members (`definitions`, `commit`) stay unreachable. P3: the back door skips the boundary checks:
`applyReplacement("a", { type: "locator", selector: "" })` registers an empty selector, which fails at the first
action with `Unexpected token "" while parsing css selector ""`, while `replace().locator("")` throws at the call.

P13: nothing else leaks. `register`, `buildLocatorChain` and `getIfExists` are not on `LocatorRegistry` (a `Pick` of
six members, [locatorRegistry.ts:592-595](../src/locators/locatorRegistry.ts#L592-L595)) nor on the page object's
protected registry; `persistSeededDefinition` is on none of the three registration builder views; a seed's
`stepsList` is private. All eight directives were consumed.

Only `LocatorUpdateBuilder.commit` calls the two methods (a grep over the repository).

### 2.4 `stripInternal` (section 4 bullet)

P5, `"stripInternal": true` added to the clone's [tsconfig.json](../tsconfig.json): tsup's declaration build honours
it. The diff against HEAD's declarations removes exactly `applyUpdate`, `applyReplacement` and the two `LocatorUpdate`
types that only they referenced (66,004 to 64,975 bytes); `index.js`, `index.mjs` and `index.d.mts` are
byte-identical; attw: "No problems found" in all four rows. Against that build, the eight back-door lines of 2.3 are
errors in all four resolution modes, the replace-mode calls of 2.2 still compile, and the shared module of 2.7 still
fails with 31 TS4094 and 3 TS2742. The methods stay public in the source and at runtime: the flag changes the `.d.ts`
only.

TypeScript's own reference (the TSConfig reference, `stripInternal`): "Do not emit declarations for code that has an
`@internal` annotation in its JSDoc comment. This is an internal compiler option; use at your own risk, because the
compiler does not check that the result is valid. If you are searching for a tool to handle additional levels of
visibility within your `d.ts` files, look at api-extractor." P5b shows what "does not check" means here:

| `@internal` placed on | build | consumer, `skipLibCheck: true` | consumer, `skipLibCheck: false` |
| --- | --- | --- | --- |
| `IndexSelector`, imported by other source files | fails: `RollupError: "IndexSelector" is not exported by "src/locators/types.ts"` | n/a | n/a |
| `LocatorSchemaPathError`, used only inside `types.ts` by the public path-format type | succeeds; the `.d.ts` still references the stripped name, on two lines | compiles `add("bad..path")` and `getNestedLocator("trailing.")` without error: the compile-time path checks are silently gone (on HEAD both are TS2345 naming the rule) | `TS2552 Cannot find name 'LocatorSchemaPathError'` errors inside pomwright's declarations |

`skipLibCheck: true` is the common setting (the root [tsconfig.json](../tsconfig.json) and the harness use it).

### 2.5 What a consumer can name (1.9d)

P4a: each of `ReusableLocator`, `ReusableLocatorBuilder`, `ReusableLocatorFactory`, `LocatorQueryBuilderPublic`,
`LocatorQueryBuilder`, `LocatorUpdateBuilder`, `LocatorRegistrationPreDefinitionBuilder`,
`LocatorRegistrationPostDefinitionBuilder`, `LocatorRegistrationSeededBuilderForType`, `FilterDefinition`,
`IndexSelector`, `LocatorDescription`, `LocatorSchemaPathFormat`, `RegistryPath`, `LocatorStrategyDefinition`,
`RoleDefinition`, `LocatorRegistryInternal`, `OptionsPatch` and `LocatorStep` fails with TS2305; the 18 exported
types compile.

P4b, derivations a consumer could write today:

| want | derivation | works? |
| --- | --- | --- |
| a role seed | `ReturnType<LocatorRegistry<Paths>["createReusable"]["getByRole"]>` | yes; the seeded builder keeps the strategy |
| a seed of any strategy | `ReturnType<LocatorRegistry<Paths>["createReusable"][keyof …]>` | yes |
| the query builder | `ReturnType<GetLocatorSchemaAccessor<Paths>>` | compiles, but `Path` becomes the whole union, so `update("main")` on a `list.item` query is accepted |
| a filter | `Parameters<ReturnType<GetLocatorSchemaAccessor<Paths>>["filter"]>[1]` (the last overload) | yes; a misspelt `has` path is still caught |
| an index | `Parameters<…["nth"]>[1]` | yes |

### 2.6 Generic domain base classes

P4c: in `abstract class Base<P extends string> extends PageObject<P>`, both `nested(path: P) { return
this.getNestedLocator(path); }` and `schema<Path extends P>(path: Path) { return this.getLocatorSchema(path); }` fail
with TS2345 (`Argument of type 'P' is not assignable to parameter of type 'LocatorSchemaPathFormat<P> extends P ? P :
LocatorSchemaPathFormat<P>'`). The same helper over a concrete union (`extends PageObject<Paths>`, `path: Paths`)
compiles. The accessors' parameter type is a conditional on the path ([locatorRegistry.ts:39-40](../src/locators/locatorRegistry.ts#L39-L40),
[L578-590](../src/locators/locatorRegistry.ts#L578-L590)), which TypeScript cannot resolve for an unresolved type
parameter; any per-call path check has this property. What compiles is a parameter of the identical conditional
type, which no consumer can write today because `LocatorSchemaPathFormat` is not exported (P9 shows both spellings
compile once it is).

### 2.7 Declaration emit

P4d, a shared module compiled with `declaration: true` (`bundler`; `nodenext` from an `.mts` gives the same):

```ts
export const headingSeed = (registry: LocatorRegistry<Paths>) => registry.createReusable.getByRole("heading", { level: 2 });
export const listQuery = (registry: LocatorRegistry<Paths>) => registry.getLocatorSchema("list.item").nth("last");
export const listUpdate = (registry: LocatorRegistry<Paths>) => registry.getLocatorSchema("list.item").update();
export const addMain = (registry: LocatorRegistry<Paths>) => registry.add("main");
export const rowFilter = (text: string) => ({ hasText: text, has: "list.item" as const });
export function defineLocators(registry: LocatorRegistry<Paths>) { … }
```

`headingSeed`, `listQuery` and `listUpdate` fail with TS2742 (`cannot be named without a reference to
'.pnpm/playwright-core@1.64.0/…'`) and TS4094 for every private member of the unexported classes (`Property
'definitions' of exported anonymous class type may not be private or protected`), `listUpdate` also with TS7056
(`exceeds the maximum length the compiler will serialize`); `addMain` fails with TS2742 and TS4023 (`has or is using
name 'LocatorRegistrationPostDefinitionBuilder' … but cannot be named`). `rowFilter` and `defineLocators` emit.
Without `addMain` the file still gives 35 error lines. `tsc --noEmit` with
`declaration: true` reports the same errors, so a project that only type-checks sees them too.

### 2.8 Whitespace (1.9c)

The type list `UnicodeWhitespaceChar` has 25 characters ([types.ts:4-29](../src/locators/types.ts#L4-L29)); the runtime
check is `/[\s\u0085]/u` ([utils.ts:31-32](../src/locators/utils.ts#L31-L32), used at
[L40-43](../src/locators/utils.ts#L40-L43)). P6, over every code point from U+0000 to U+10FFFF:

- the runtime regex matches 26 code points; the type list has 25; the only difference is U+FEFF (runtime only);
- the type list equals `\p{White_Space}` exactly (25 code points), so the comment "All Unicode characters with
  White_Space=Yes" is accurate; JavaScript's `\s` is that set minus U+0085 plus U+FEFF, which is why the regex adds
  U+0085;
- U+FEFF has the general category `Cf` (format), not whitespace; U+180E, U+200B and U+2060 are matched by neither.

The `tsc` probe, one registry per character with `"main<char>.form"` in its path union and a `@ts-expect-error` on
`add("main<char>.form")`: the directive is consumed for the 25 type-list characters and unused for U+FEFF, U+180E,
U+200B and U+2060. At runtime `add("main\uFEFF.form")` throws `LocatorSchemaPath string cannot contain whitespace
chars`, and the three non-whitespace characters are accepted.

The message: `formatLocatorSchemaPathForError` ([utils.ts:22-29](../src/locators/utils.ts#L22-L29)) relies on
`JSON.stringify`, which escapes only the five C0 controls of the list (U+0009 to U+000D). The other 21 appear raw:
U+0020 is the space itself; U+00A0, U+1680, U+2000 to U+200A, U+202F, U+205F and U+3000 look like one; U+0085,
U+2028, U+2029 and U+FEFF are invisible. The comment's example (`"a\u00A0b" -> "a\\u00a0b"`, [L26](../src/locators/utils.ts#L26)) is false.
[validation.locatorSchemaPath.spec.ts:76-114](../test/tests/locatorRegistry/validation/validation.locatorSchemaPath.spec.ts#L76-L114)
builds its expected message with the same function, so it cannot notice; its single `@ts-expect-error` covers a call
whose argument is the union of all 25 literals, so it proves that one of them fails to compile, not each.

### 2.9 The section 2 aliases

P7:

| alias | references in `src` | in the bundle |
| --- | --- | --- |
| `LocatorSchemaPathErrors` ([types.ts:65](../src/locators/types.ts#L65)) | its declaration only | no |
| `ValidLocatorPath` ([L76-77](../src/locators/types.ts#L76-L77)) | its declaration only | no |
| `FilterPatch` ([L218-231](../src/locators/types.ts#L218-L231)) | its declaration only | no |
| `PathIndexMap` ([L272](../src/locators/types.ts#L272)) | its declaration only | no |
| `RegistryPath` ([L73-74](../src/locators/types.ts#L73-L74)) | 131 lines in six files | yes, 56 times |
| `LocatorSchemaPathAlias` ([L90-91](../src/locators/types.ts#L90-L91)), identical to `RegistryPath` | 8 lines, `types.ts` only (generic defaults) | yes, 7 times |
| `ResolvedFilterDefinition` ([L182](../src/locators/types.ts#L182)), identical to `PlaywrightFilterDefinition` | 9 lines (8 in `locatorRegistry.ts`) | yes |

Of the analysis's four unused aliases all still exist and none is in the bundle, so deleting them changes no
published declaration. P14, what they were for: all four belong to the development of the v2 registry, their uses were
removed before 2.0.0 (2026-03-06), and none was used in 2.0.0 or 2.1.0.

| alias | what it was for | what replaced it |
| --- | --- | --- |
| `LocatorSchemaPathErrors` | added 2025-12-06 (d500f78): a check on the whole path union, a dummy rest parameter of the registry factory that failed when any member was invalid | the per-argument check `PathArgument` of e54f4c6 (2026-02-25), which reports the error where the bad path is used and names the rule; the compile-only path probe tests it |
| `ValidLocatorPath` | added 2025-11-26 (e4a6c4d): the constraint on the path generics of the then `PageObject` accessors | 0a925ac (2025-12-03) moved the accessors onto the registry with `RegistryPath`, whose definition is identical |
| `FilterPatch` | added 2025-11-21 (f0f2179) and never referenced: an unbuilt API to edit a query's filters with `append`, `replace` and `clear` | partly `filter()` (append) and `clearSteps()` (clear); since filters and `nth` are one ordered list of steps, a filter-only patch does not fit; replacing a single step would be a feature of its own |
| `PathIndexMap` | added 2025-11-18 (f3056d5): the v1-style index overrides, `getNestedLocator(path, { "list.item": 2 })` | `getLocatorSchema(path).nth(subPath, index)` (0a925ac), as the [v1-to-v2 comparison](../docs/v1-to-v2-migration/v1-to-v2-comparison.md) documents |

The three identical path aliases still exist. `LocatorStep`'s `index: IndexSelector | null`
([L190](../src/locators/types.ts#L190)) has no producer: the three `nth` implementations push an `IndexSelector`
([locatorRegistrationBuilder.ts:450-452](../src/locators/locatorRegistrationBuilder.ts#L450-L452),
[locatorQueryBuilder.ts:185-205](../src/locators/locatorQueryBuilder.ts#L185-L205),
[reusableLocatorBuilder.ts:46-49](../src/locators/reusableLocatorBuilder.ts#L46-L49)); only a hand-built seed object
could carry `null`, and `applyIndexSelector` ([utils.ts:162-165](../src/locators/utils.ts#L162-L165)) treats it as no
step. `FilterDefinition`'s first member, Playwright's filter, is assignable to its second, whose `has` already
includes `Locator` ([L208-216](../src/locators/types.ts#L208-L216)).

### 2.10 Harness and survey

- Harness: no spec, page object or fixture calls `replace()` without its primary except the throw assertion at
  [getLocatorSchema.update.spec.ts:230-232](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L230-L232);
  none passes `null` to `replace()`; nothing names a builder or seed type; the non-literal accessor arguments in
  specs are concrete unions; `UrlTypeOptions` appears three times in
  [testApp.base.ts:7-18](../test/page-object-models/testApp/testApp.base.ts#L7-L18). `pnpm typecheck` is clean and
  the chromium project passes 374 tests on HEAD.
- P8, one 2.1.0 consumer project (124 TypeScript files, the project of the earlier surveys): 13 `createReusable` seeds,
  all `const`s inside locator functions, none exported; 53 `{ reuse }` registrations; 100 `getLocatorSchema` calls;
  75 `update` calls (72 with a sub-path; 9 continue with `getByRole`, 66 with `locator`); no `replace` on a query
  builder; no `applyUpdate` or `applyReplacement`; no `ReturnType` or `Parameters`; no import of any type of 2.5 and
  no deep import; `UrlTypeOptions` three times in its one domain base class (an import and two constraints) and the
  `*FromOptions` helpers seven times; `LocatorRegistry<` 39 times; 31 exported locator functions taking a
  `LocatorRegistry`, all function declarations; 8 exported arrow functions, none returning a registration chain; no
  non-literal path passed to an accessor; one U+FEFF literal, a string constant that is not a path. Its test
  `tsconfig.json` sets `declaration: true` and `emitDeclarationOnly: true`; it emits today because nothing it exports
  has an inferred builder type. The only edit it needs under this plan is the `UrlTypeOptions` rename in its base
  class (one import, two constraints).

### 2.11 What is sound

The registry and accessor types and their compile-time path checks; the update-mode argument shapes of plan
1.6-1.8 (their unit contract at [locatorUpdateBuilder.test.ts:224-248](../src/locators/locatorUpdateBuilder.test.ts#L224-L248));
the registration builder types of plan 1.6-1.8 ([locatorRegistrationBuilder.test.ts:246-286](../src/locators/locatorRegistrationBuilder.test.ts#L246-L286)),
which leak nothing (P13); the `has` path diagnostics with TS2820 suggestions; the bundled single `index.d.ts` with
the generated `index.d.mts`, clean in attw.

---

## 3. Design

### 3.1 Replace mode in the types (1.9a)

The update builder gets a `Mode extends "update" | "replace"` type parameter (default `"update"`); `update()` returns
it with `"update"`, `replace()` with `"replace"`, and each method's rest parameter is selected from the mode:

```ts
type ReplaceArgs<Primary, Options> = [primary: Primary, options?: Options];   // Playwright's own parameter list
type ArgsWithOptions<Mode, Primary, Options> =
	Mode extends "replace" ? ReplaceArgs<Primary, Options> : UpdateArgsWithOptions<Primary, Options>;  // unchanged for update
type ArgsWithoutOptions<Mode, Primary> = Mode extends "replace" ? [primary: Primary] : UpdateArgsWithoutOptions<Primary>;

getByRole(...args: ArgsWithOptions<Mode, RoleDefinition["role"], RoleDefinition["options"]>) { … }
frameLocator(...args: UpdateArgsWithoutOptions<string>) { … }   // both modes: no selector is the any-frame form in replace
```

`Options` is Playwright's option type (`Parameters<Page["getByRole"]>[1]`), not `OptionsPatch`, so `null` is not
accepted in replace mode. The labels are settled at execution (one generic `primary`, or the field name per method).

P10, the three shapes for a missing role, side by side:

| shape | `x()` | `x({ name: "x" })` |
| --- | --- | --- |
| `[P] \| [P, O]` (a union of tuples, the analysis's suggestion) | TS2345 `Argument of type '[]' is not assignable to parameter of type '["search" \| "link" \| …` (the whole role union) | TS2345 with the same dump |
| **`[primary: P, options?: O]`** (chosen) | TS2554 `Expected 1-2 arguments, but got 0.` | TS2345 at the argument |
| Playwright's `page.getByRole` | TS2554 `Expected 1-2 arguments, but got 0.` | TS2345 at the argument |

Alternatives: two builder classes or two sets of overloads, one per mode (ten methods written twice for the same
result); leaving the types alone and documenting the runtime error (the analysis's defect stays).

### 3.2 Closing the internals (1.9b and the `stripInternal` bullet)

| option | back door closed in the types | emit of a query or update builder (2.7) | enforced by | cost |
| --- | --- | --- | --- | --- |
| A. `stripInternal: true` | yes (P5) | still fails | a JSDoc tag and an unchecked flag; the methods stay public in `src` and at runtime | one line |
| **B. `applyUpdate`/`applyReplacement` become `private`; `update()`/`replace()` hand the update builder a commit callback** (chosen, 7.3) | yes (P9) | fixed together with 3.3 | the compiler | the constructor of the update builder changes (internal) |
| C. ECMAScript `#private` methods | yes | as B | the runtime as well | no gain over B: every other builder internal is TypeScript-`private` |
| D. hand-written public interfaces for both builders, the classes implementing them | yes | fixed | the compiler | every method signature written twice, the update builder's twenty overloads included |

B in shape:

```ts
update(subPath?) {
	const resolved = subPath ?? this.path;
	this.ensureSubPath(resolved);
	return new LocatorUpdateBuilderInternal<…, "update">(resolved, "update", (definition) => this.applyUpdate(resolved, definition));
}
private applyUpdate(subPath, updates: LocatorUpdate): LocatorQueryBuilder<Paths, Path> { … }   // body unchanged
```

`stripInternal` is not added: with B there is nothing tagged `@internal` left; it does not fix the emit failures; and a
future tag on a type that a public type still uses would silently delete part of the published API, with the
compile-time path checks as the probed example (P5b). Members such as `register` or `buildLocatorChain` are already
unreachable through every public type (P13); stripping them would only shorten the `.d.ts`. If a layer between
private and public is ever needed, TypeScript points to api-extractor, a dev dependency that needs its own decision.
The section 4 bullet is ticked *Skip* with this reason (7.3).

### 3.3 Public names (1.9b and 1.9d)

Three rules, each from a probe:

1. **A public name is a type alias, never a re-exported class.** P4e: `export type { LocatorQueryBuilder } from
   "./src/locators/locatorQueryBuilder"` with the class itself makes tsup's bundle write the class into the export
   list without `type`, and `new LocatorUpdateBuilder(…)` then compiles against the published declarations while the
   runtime export is `undefined`. With an alias, the same lines fail with TS1484 and TS2693 (P9).
2. **The alias is declared under its public name.** Hovers and error messages print an alias by its declared name
   (the prototype's `ReusableLocatorOf` showed up as such in an error, P9), so the classes take the `Internal` suffix
   `LocatorRegistryInternal` already has, and the alias carries the public name:

   ```ts
   /** What `getLocatorSchema(path)` returns: a clone of the path's chain that `filter`, `nth`, `update`, … modify. */
   export type LocatorQueryBuilder<Paths extends string, Path extends RegistryPath<Paths>> = LocatorQueryBuilderInternal<Paths, Path>;
   ```

3. **Every step returns the alias, not `this`.** `filter`, `nth`, `clearSteps`, `remove`, `describe` and the update
   builder's strategy methods declare `LocatorQueryBuilder<Paths, Path>`, so the name is the same after any number of
   calls, and `LocatorQueryBuilderPublic` and its `Pick` go. `getLocatorSchema` and `GetLocatorSchemaAccessor` return
   the alias.

P9: with these rules the shared module of 2.7 (without the registration one-liner) emits, and TypeScript writes
`import("pomwright").ReusableLocator<Paths, "role">`, `import("pomwright").LocatorQueryBuilder<Paths, "list.item">` and
`import("pomwright").LocatorUpdateBuilder<Paths, "list.item", "list" | "list.item", "update">` into the declarations.

### 3.4 What to export (1.9d)

| candidate | export? | why |
| --- | --- | --- |
| `LocatorQueryBuilder<Paths, Path>` | yes | what `getLocatorSchema` returns; keeps the sub-path check that the `ReturnType` workaround loses (2.5) |
| `LocatorUpdateBuilder<Paths, Path, SubPath, Mode>` | yes | what `update()`/`replace()` return; rarely written by hand, needed for emit (2.7) |
| `ReusableLocator<Paths, Strategy>` | yes | the seed, what a shared seed module returns (3.5) |
| `FilterDefinition<Paths>` | yes | POMWright's own shape (path references in `has`/`hasNot`); a helper that builds filters needs it |
| `IndexSelector` | yes | POMWright's own shape (`"first"`, `"last"`); trivial to write but part of every `nth` signature |
| `LocatorSchemaPathFormat<Path>` | yes | the path rules as a type, for consumers' own generic wrappers (the analysis's candidate) |
| `LocatorSchemaPathArgument<Path>` | yes | the accessors' parameter type, the short form for forwarding helpers (2.6); today the internal `PathArgument` ([locatorRegistry.ts:39-40](../src/locators/locatorRegistry.ts#L39-L40)), whose first parameter is unused |
| `LocatorDescription` | no | it is `string` (`Parameters<Locator["describe"]>[0]`) |
| the registration builder views | no | 7.6 |
| the strategy definitions, `LocatorStep`, `OptionsPatch`, `RegistryPath`, `LocatorUpdate` | no | they describe stored data, not anything a consumer passes or holds by name; reachable through `ReusableLocator["definition"]` and `["steps"]` if ever needed |
| the seed factory (`createReusable`'s type) | no | always reached through `registry.createReusable` |

`FilterDefinition`'s second type parameter (the allowed reference paths, defaulting to the valid paths) is internal;
whether the public alias drops it is settled at execution (P9 used `FilterDefinition<Paths>` with the default).

### 3.5 The seed type

Today a seed has two types: the factory returns the class `ReusableLocatorBuilder<Paths, AllowedPaths, Type>` and `add`
accepts the structural `ReusableLocator<Paths, AllowedPaths, Type>` ([types.ts:192-201](../src/locators/types.ts#L192-L201),
[locatorRegistry.ts:110-149](../src/locators/locatorRegistry.ts#L110-L149)). Both type the definition as
`Extract<LocatorStrategyDefinition, { type: Type }>`, a conditional whose `extends` clause contains `Type`, which
TypeScript measures as invariant: in the first prototype round a narrow seed (`"locator"`) was not assignable to the
wide one (TS2322, `Type '"id" | "label" | …' is not assignable to type '"locator"'`, P9).

The design: one exported `ReusableLocator<Paths, Strategy = any of the ten>`, an object type with `type`, `definition`,
`steps`, `description` (read-only) and `filter`, `nth`, `describe` returning `ReusableLocator<Paths, Strategy>`; the
definition is looked up in a map from strategy to definition type (an indexed access, covariant); the
`AllowedPaths` parameter goes (always the valid paths). The class implements it, the factory methods declare it as
their return type, and `add`'s `reuse` option accepts `ReusableLocator<Paths>`. P9: a narrow seed is assignable to
the wide type; `add(path, { reuse: narrow })` still offers only that strategy's override; a wide one offers all ten.

### 3.6 Registration builders

`add(path)`, a strategy after it, and `add(path, { reuse })` return three builder views
([locatorRegistrationBuilder.ts:16-25](../src/locators/locatorRegistrationBuilder.ts#L16-L25),
[L542-557](../src/locators/locatorRegistrationBuilder.ts#L542-L557),
[L581-586](../src/locators/locatorRegistrationBuilder.ts#L581-L586)) that register as a side effect; nothing reads
them afterwards. The only emit failure left after 3.3 is a function whose body is an expression that registers
(`(registry) => registry.add("header").locator("header")`), whose inferred return type is the post-definition view
(TS4023, P9); a block body or `: void` fixes it, and the function never meant to return the builder. Options:
**leave them unexported and document the `void` form** (chosen, 7.6); export three more names
(`LocatorRegistrationBuilder`, a post-definition and a seeded variant) so even that one-liner emits.

### 3.7 `UrlTypeOptions` (1.9d)

The type has carried `storage` since plan 1.5 ([pageObject.ts:14-30](../src/pageObject.ts#L14-L30)), so its name
describes two of its three members.

| option | existing base classes | new code | cost |
| --- | --- | --- | --- |
| **A. rename to `PageObjectTypeOptions`, no alias** (chosen in review, 7.7) | one TS2305 at the import per file (P11); a search-and-replace (one file in the surveyed project, one in the harness) | the new name | one upgrade checklist item |
| B. rename, keep `UrlTypeOptions` as a `@deprecated` alias for 3.x | compile; the editor strikes the name through (P11: three 6385 suggestions for three uses, `tsc` exit 0) | the new name | an extra exported name until a later major; a deprecation introduced in the major that could simply rename |
| C. keep `UrlTypeOptions`, document that it carries `storage` | unchanged | the old name | a name that describes two of three members |

3.0.0 is breaking anyway, and the migration is mechanical, so the rename is done outright. `PageObjectTypeOptions`
reads with the `*TypeFromOptions` helpers and stays clear of the constructor's runtime `options` argument (`label`,
`navOptions`, `sessionStorage`).

### 3.8 Whitespace (1.9c)

| option | runtime | types | drift |
| --- | --- | --- | --- |
| **A. one `as const` list in `utils.ts`; the regex is built from it, `UnicodeWhitespaceChar` is `(typeof LIST)[number]`** (chosen, 7.8) | unchanged (26) | 26: gains U+FEFF | impossible |
| B. add U+FEFF to the type union by hand and pin parity in a unit test | unchanged | 26 | caught by the test |
| C. drop U+FEFF from the runtime (Unicode `White_Space` only) | relaxed: a path with an invisible BOM registers | unchanged (25) | none; a behaviour change that only lets a copy-paste accident through |

P9: with A the per-character probe consumes the U+FEFF directive and leaves only U+180E, U+200B and U+2060 unused, and
the bundle gains a `declare const` with the 26 characters beside the derived type (not exported). The message fix
(7.9): `formatLocatorSchemaPathForError` replaces each listed character that `JSON.stringify` left raw with `\uXXXX`
(P9: `main\uFEFF.form`, `main\u00A0.form`, `main\u2028.form`, `main\t.form` as before); whether the plain space is
escaped too (`a\u0020b`, as the prototype does) is settled at execution. Alternative: leave the message
to plan 8.

### 3.9 Section 2 type aliases

- Delete `LocatorSchemaPathErrors`, `ValidLocatorPath`, `FilterPatch`, `PathIndexMap`.
- `RegistryPath` is the one name for "the valid members of the path union"; `LocatorSchemaPathAlias` and
  `ValidLocatorPath` go. `ResolvedFilterDefinition` goes in favour of `PlaywrightFilterDefinition` (the same kind of
  duplicate, not listed in the analysis; proposed here because it is a one-line alias in the same file).
- `LocatorStep`'s index is `IndexSelector`. `applyIndexSelector` keeps accepting `null` and `undefined`; the debug-step
  record of `buildLocatorChain` keeps its `IndexSelector | null | undefined` until plan 9 decides `debugSteps`.
- `FilterDefinition` is the second member alone. P12: the misspelt-`has` diagnostic is byte-identical before and after
  (`TS2820 … Did you mean '"list.item"'?`).

P9: with all four changes the unit tests, `pnpm typecheck` and the chromium suite behave as stated in 5.

### 3.10 `index.ts` after this plan

```ts
export { test } from "./src/fixture/base.fixtures";
export type { NavigationFor, NavigationOptions, ThisPageOptions } from "./src/helpers/navigation";
export { type LogEntry, type LogLevel, PlaywrightReportLogger } from "./src/helpers/playwrightReportLogger";
export { type Codec, json, SessionStorage, type SessionStorageSchema } from "./src/helpers/sessionStorage";
export { step } from "./src/helpers/stepDecorator";
export type { UrlMatcher } from "./src/helpers/url";
export {
	type AddAccessor,
	createRegistryWithAccessors,
	type FilterDefinition,
	type GetLocatorAccessor,
	type GetLocatorSchemaAccessor,
	type GetNestedLocatorAccessor,
	type IndexSelector,
	type LocatorQueryBuilder,
	type LocatorRegistry,
	type LocatorSchemaPathArgument,
	type LocatorSchemaPathFormat,
	type LocatorUpdateBuilder,
	type ReusableLocator,
} from "./src/locators";
export {
	type BaseUrlTypeFromOptions,
	type FullUrlTypeFromOptions,
	PageObject,
	type PageObjectTypeOptions,
	type StorageTypeFromOptions,
	type UrlPathTypeFromOptions,
} from "./src/pageObject";
```

The seven runtime names, and so `index.mjs` and `esmEntry.spec.mts`, are unchanged.

---

## 4. Implementation steps

### 4.1 Runtime and types (`src/`, `index.ts`)

1. [locatorUpdateBuilder.ts](../src/locators/locatorUpdateBuilder.ts): the `Mode` parameter and the argument types of
   3.1 (L64-70, every method signature L227-400); in replace mode the DSL calls `assertPrimaryValue` /
   `assertIdValue` for a missing primary as well (L233, L328, L381, L402, L421), so the shared template is thrown at
   the call; the constructor takes the sub-path, the mode and the commit callback instead of the parent (L209-213),
   and `commit` calls it (L431-435); the class is renamed `LocatorUpdateBuilderInternal` and the exported alias
   `LocatorUpdateBuilder` is declared beside it. `buildReplacementDefinition` keeps its guard and messages (L145-202)
   as an internal check.
2. [locatorQueryBuilder.ts](../src/locators/locatorQueryBuilder.ts): `LocatorQueryBuilderPublic` deleted (L22-28);
   the class renamed `LocatorQueryBuilderInternal` with the alias `LocatorQueryBuilder`; every `this` return type
   becomes the alias (L119-123, L158-161, L185-189, L220, L312-315); `update()`/`replace()` pass the callback and
   return `LocatorUpdateBuilder<…, "update" | "replace">` (L87-105, L263-282); `applyUpdate` and `applyReplacement`
   become `private` and lose `@internal` (L226, L284). The doc comments of `update` and `replace` (L70-86,
   L248-262) say which arguments each mode requires.
3. [locatorRegistry.ts](../src/locators/locatorRegistry.ts): `PathArgument` (L39-40) becomes the exported
   `LocatorSchemaPathArgument<Path>`, used by `add`, the accessors and the accessor types (L117, L390, L456, L470,
   L578-590); `getLocatorSchema` and `GetLocatorSchemaAccessor` return `LocatorQueryBuilder` (L389-396, L584-586);
   `add`'s `reuse` option is `ReusableLocator<Paths>` (L110-160); `ResolvedFilterDefinition` becomes
   `PlaywrightFilterDefinition` (its 8 lines here, 3.9).
4. [types.ts](../src/locators/types.ts): `ReusableLocator<Paths, Strategy>` of 3.5 with the strategy-to-definition map
   (replacing L192-201); the section 2 changes of 3.9 (L65, L76-77, L90-91, L182, L190, L208-231, L272, and the
   `LocatorSchemaPathAlias` defaults); `UnicodeWhitespaceChar` derived from the list (L2-29).
5. [reusableLocatorBuilder.ts](../src/locators/reusableLocatorBuilder.ts): the class implements `ReusableLocator`, drops
   `AllowedPaths` and `Extract` (L20-39), its `filter`/`nth`/`describe` return `ReusableLocator`; every factory method
   declares `ReusableLocator<Paths, "<strategy>">` (L70-210, including the three without a declared return type at
   L193, L198, L207); `create` (L212-216) as in the prototype.
6. [utils.ts](../src/locators/utils.ts): the exported list and the regex built from it (L31-32); the message escape and
   a correct comment (L20-29).
7. [pageObject.ts](../src/pageObject.ts): `UrlTypeOptions` renamed `PageObjectTypeOptions` (L26-30) with the doc
   comment of L14-25 updated, every constraint on the new name (L32-43, L70); no alias.
8. [locators/index.ts](../src/locators/index.ts) and [index.ts](../index.ts) per 3.10. No runtime export changes.

### 4.2 Harness (`test/`)

- [getLocatorSchema.update.spec.ts:230-232](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L230-L232):
  a `@ts-expect-error` on the call and the shared template as the expected message (the old-contract expectation; P9
  shows this is the only harness line that changes, both for `pnpm typecheck` and for the chromium run, 373 passed and
  this 1 failed against the prototype before the edit).
- [validation.locatorSchemaPath.spec.ts:78-106](../test/tests/locatorRegistry/validation/validation.locatorSchemaPath.spec.ts#L78-L106):
  U+FEFF added to the list (add, do not replace).
- [testApp.base.ts](../test/page-object-models/testApp/testApp.base.ts): `PageObjectTypeOptions` (L7, L10, L18).
- New compile-only probe `test/tests/packaging/publicTypes.typecheck.ts` (not a spec; Playwright does not match it),
  against the installed package, run by `pnpm typecheck` (5.2).
- New `test/tsconfig.declarations.json` (extends `test/tsconfig.json`, `declaration: true`, `noEmit: true`, `files`:
  `tests/packaging/publicTypes.emit.ts` only; P4d showed that `noEmit` with `declaration: true` still reports emit errors). It runs
  after `tsc --noEmit -p test` in both places that type-check the harness: the `typecheck` script
  ([package.json:44](../package.json#L44)) and [pack-test.sh:34](../pack-test.sh#L34), which calls `tsc` itself, so CI
  runs it too.

### 4.3 Docs (`docs/v3` only)

- [locator-registry.md](../docs/v3/locator-registry.md): *Compile-time path constraints* (L114-136) names the 26
  characters and U+FEFF; *Common path mistakes* (L150-160) shows an escaped character; *Accessor types* (L182-209)
  and *Public `LocatorRegistry` vs internal registry* (L211-223) become *Types you can import*: the table of 1.3,
  and the forwarding helper of 1.1 with `LocatorSchemaPathArgument`; *`replace`* (L693-706): Playwright's argument
  lists, the compile errors, `null` and missing primaries from JavaScript; *Reusable locators* (L759-820): a shared
  seed module typed with `ReusableLocator`; the error reference (L886-888) unchanged in wording, now true for
  `replace`; the migration section (L940-958) gains the replace and seed items.
- [composing-locator-modules.md](../docs/v3/composing-locator-modules.md): a short section on what a module may return
  and how it is typed (`ReusableLocator`, `LocatorQueryBuilder`), `declaration: true`, and why a registering function
  returns `void`.
- [PageObject.md](../docs/v3/PageObject.md): `PageObjectTypeOptions` (L20, L49-65, L265) and, in its *Migration from
  2.x* section, the rename; the forwarding helper in a domain base class.
- [overview.md](../docs/v3/overview.md): *Type exports* (L466-470) lists the new names; *Internal API* (L472-512) uses
  the `…Internal` class names and drops `LocatorQueryBuilderPublic`.

### 4.4 Changeset

`.changeset/types-and-exports.md`, `"pomwright": major`, under *Breaking changes*:

- `replace()` takes Playwright's parameter lists: the first argument is required and the options are Playwright's own
  types, so `replace().getByRole({ name })`, `replace().getByTestId()` and `null` options no longer compile (the first
  two always threw; `null` meant omission). From JavaScript a missing first argument throws `<method> requires a
  <field> value for "<path>".` like every other builder, instead of `Locator replace for "<path>" of type "<type>"
  requires a "<field>" value.` Migration: pass the primary; drop `null` options in
  `replace()`.
- A path literal containing U+FEFF is a compile error (it always threw at registration).
- `UrlTypeOptions` is renamed `PageObjectTypeOptions`. Migration: rename it in imports and constraints.

Under *Features*: the exported types of 1.3 and what each is for; a shared module with `declaration: true` can return
seeds and query builders. Under *Fixes*: analysis 1.9a to 1.9d; the internal methods of the query builder are no
longer reachable through its types; the whitespace error shows the character escaped.

### 4.5 Analysis, release notes, decisions, AGENTS.md, PLANS.md

At agreement: [DECISIONS.md](DECISIONS.md) gets this plan's section; [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md)
gets, marked *planned*: a breaking item for `replace()` and U+FEFF, an item for the exported types and the rename,
bug-fix lines for 1.9a to 1.9c, a cleanup line for the aliases and the private methods, docs and tests lines, two
upgrade checklist items (`replace()` arguments; rename `UrlTypeOptions`), and the typo at L185 fixed (`requires a role value
for`); [PLANS.md](PLANS.md) row 7 reads "written 2026-10-14, decisions taken, awaiting implementation".

At execution (last step): tick *Fix* on 1.9 a to d with notes, the section 2 type-alias bullet with the
`ResolvedFilterDefinition` addition and the debug-step remainder left to plan 9, *Skip* on the section 4
`stripInternal` bullet (3.2, P5b); flip the release-note items to *done*; append execution-time decisions.
[AGENTS.md](../AGENTS.md): the revision line; section 1, the public API list (the new types, `PageObjectTypeOptions`,
and the existing `ThisPageOptions`, `LogEntry`, `LogLevel`, which the list omits today); section 2 (the new unit-test file, the two probe files
and the tsconfig); section 3 (`pnpm typecheck` and `pack-test.sh` also run the declaration check); section 4 (the probe
file beside the path probe); section 5, a rule: public types are aliases declared
under their public name, never a re-exported class; every public method's return type is exported except the
registration builders; internals are `private`, not `@internal`; section 7 (the seventh pending changeset).
[PLANS.md](PLANS.md) row 7 to executed.

---

## 5. Tests

### 5.1 Unit tests (vitest, typecheck mode)

- [locatorUpdateBuilder.test.ts](../src/locators/locatorUpdateBuilder.test.ts): the type contract (L224-248) gains the
  replace-mode negatives (`replace().getByRole()`, `({ name })`, `(null)`, `("button", null)`,
  `("button", { name: null })`, `getByTestId()`, `getById()`, `locator({ hasText })`) and positives
  (`("button", undefined)`, `frameLocator()`); a runtime block: each replace method without its primary throws the
  shared template at the call, `getById` the id wording, a JavaScript `null` options argument still equals omission.
  The `buildReplacementDefinition` tests (L169-186) stay.
- New `src/locators/locatorQueryBuilder.test.ts`: `@ts-expect-error` on the back-door calls of 2.3;
  `expectTypeOf` that every step of the chain is `LocatorQueryBuilder<Paths, Path>`; `update("main")` on a
  `list.item` query is an error.
- [reusableLocatorBuilder](../src/locators/reusableLocatorBuilder.ts) types (in
  [locatorRegistrationBuilder.test.ts](../src/locators/locatorRegistrationBuilder.test.ts), which already holds the
  seed contract, L284-286): a narrow seed assigns to `ReusableLocator<Paths>`; `ReusableLocator<Paths, "role">`
  rejects a locator seed; a seeded builder from a narrow seed offers one override.
- [utils.test.ts](../src/locators/utils.test.ts): every code point from U+0000 to U+10FFFF is rejected by
  `validateLocatorSchemaPath` if and only if it is in the list, and the list is `\p{White_Space}` plus U+FEFF;
  `expectTypeOf<UnicodeWhitespaceChar>()` equals the list's element type; the message escapes each listed character.

### 5.2 Harness

- `publicTypes.typecheck.ts` (compile-only, against the published declarations): an import of every name of 3.10
  with one annotation each; the replace-mode negatives; the back-door negatives; value use of a type-only name is an
  error (TS1484/TS2693); importing `UrlTypeOptions` is an error (TS2305); the forwarding base class of 1.1, with a misspelt path at its
  call site as an error; `ReusableLocator` narrow and wide; a U+FEFF path literal is an error.
- Its emit part, `test/tests/packaging/publicTypes.emit.ts`, compiled by `tsconfig.declarations.json`: a module
  exporting an un-annotated seed function, query builder function and update builder function, which must emit
  without error. Neither file matches Playwright's spec pattern.
- The existing specs stay green on all three browsers with the one change of 4.2; `esmEntry.spec.mts` unchanged.

### 5.3 Probes at execution

Re-run against the final tarball, in the scratchpad: P2 and P4 in the four resolution modes, P4d's emit, P5's attw,
P6's per-character probe. Recorded in the execution note, not added to CI.

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking by the book: `replace()` calls that compiled stop compiling, among them
`null` options that worked (none in the survey or the harness); the `replace()` missing-primary message changes (a
test asserting the old text changes, as the harness's one does); a U+FEFF path literal stops compiling (it always threw);
`UrlTypeOptions` no longer exists (renamed). Everything else is additive or internal: seven new type exports, private
methods that no supported code called, the internal class renames, deleted aliases that were never published.

---

## 7. Decisions

Taken with the user on 2026-10-14; the chosen option is stated first in each. 7.7 was amended in review (no
deprecated alias); 7.3 gained the P5b evidence.

- [x] 7.1 1.9a: the update builder gets a `Mode` type parameter; replace mode takes Playwright's parameter lists as
  labelled tuples (`[primary, options?]`, `[primary]`, and `[selector?]` for `frameLocator`), with Playwright's own
  option types, so a missing primary, an options-only call and `null` options are compile errors with Playwright's
  diagnostics; update mode unchanged. Alternatives: a union of tuples (dumps the role union, P10); two classes or two
  overload sets.
- [x] 7.2 The runtime half of 1.9a: in replace mode the DSL asserts the primary, so a missing one throws the shared
  template (`getByRole requires a role value for "<path>".`) that the docs and the unreleased changeset already
  promise; `buildReplacementDefinition` keeps its guard; the harness expectation at
  `getLocatorSchema.update.spec.ts:230-232` changes. Alternative: leave the message, correct the docs and the
  changeset instead, or move it to plan 8.
- [x] 7.3 1.9b: `applyUpdate` and `applyReplacement` become TypeScript-`private`, reached by the update builder through
  a commit callback; no `stripInternal`; the section 4 bullet ticked *Skip*. Alternatives: `stripInternal` (P5:
  works with tsup, leaves the emit failures, and a misplaced tag silently deletes published types, P5b); `#private`;
  hand-written public interfaces.
- [x] 7.4 Public names are type aliases declared under their public name; the two builder classes become
  `LocatorQueryBuilderInternal` and `LocatorUpdateBuilderInternal`; every step returns `LocatorQueryBuilder<Paths,
  Path>` instead of `this`; `LocatorQueryBuilderPublic` is deleted. Rejected: re-exporting the classes as types (a
  value in the bundled declarations, P4e).
- [x] 7.5 1.9d: export `LocatorQueryBuilder`, `LocatorUpdateBuilder`, `ReusableLocator` (one covariant seed type, 3.5),
  `FilterDefinition`, `IndexSelector`, `LocatorSchemaPathFormat` and `LocatorSchemaPathArgument`; not
  `LocatorDescription`, the strategy definitions, `LocatorStep`, `OptionsPatch`, `RegistryPath` or the factory.
  Alternative: export the analysis's list as it stands (`ReusableLocator` and `ReusableLocatorBuilder` with their
  internal generics, `LocatorQueryBuilderPublic`, `LocatorDescription`).
- [x] 7.6 The registration builder views stay unexported; the docs say a registering function returns `void`.
  Alternative: export them under three public names.
- [x] 7.7 `UrlTypeOptions` is renamed `PageObjectTypeOptions`, with no alias: 3.0.0 is breaking and the migration is a
  rename. Rejected: a `@deprecated` alias for 3.x; keeping the name.
- [x] 7.8 1.9c: one `as const` list drives the runtime regex and `UnicodeWhitespaceChar`; the type gains U+FEFF, the
  runtime is unchanged. Alternatives: U+FEFF added by hand plus a parity test; U+FEFF dropped from the runtime.
- [x] 7.9 The whitespace error escapes every listed character as `\uXXXX`, and the false comment goes. Alternative:
  plan 8.
- [x] 7.10 Section 2: the four unused aliases deleted; `RegistryPath` the one valid-path alias (`ValidLocatorPath`,
  `LocatorSchemaPathAlias` deleted) and `ResolvedFilterDefinition` deleted; `LocatorStep`'s index non-null;
  `FilterDefinition` a single member; the debug-step type left to plan 9.
- [x] 7.11 Tests: unit per 5.1; the harness's compile-only `publicTypes.typecheck.ts` and an emit check through
  `test/tsconfig.declarations.json`, run by `pnpm typecheck` and `pack-test.sh`; the one harness expectation of 7.2
  changes with a `@ts-expect-error`. Rejected: the emit check at execution only.
- [x] 7.12 Docs per 4.3; one `major` changeset, `types-and-exports`, per 4.4.

> Notes:

---

## 8. Execution order

1. Types and runtime (4.1 steps 1 to 8) with the unit tests of 5.1 first (red, then green); `pnpm format`,
   `pnpm lint`, `pnpm test:unit`, `pnpm build`.
2. Harness (4.2): the probe file, the declarations tsconfig and its wiring in `package.json` and `pack-test.sh`, the spec
   edits; `pnpm harness:install`, `pnpm typecheck`, the chromium project. The probe's negatives are the P2 and P4
   cases, which compile on HEAD, so no separate red run is needed: P2 and P4 are the red evidence.
3. Docs in `docs/v3`.
4. Changeset.
5. Full run: `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm pack-test --reporter=line` (three
   browsers), the probes of 5.3 against the final tarball; fix anything red.
6. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md`, `AGENTS.md`, `PLANS.md`, this plan's
   execution note.
