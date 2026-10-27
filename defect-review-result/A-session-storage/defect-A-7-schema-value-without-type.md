# A-7: A page object that passes `sessionStorage.schema` without declaring `storage` compiles, and its helper then decodes values that its types call strings; the docs describe only the opposite mismatch

- **Kind**: documentation
- **Area**: Session storage through a page object: the `sessionStorage` option, `PageObjectTypeOptions["storage"]`,
  `StorageTypeFromOptions` (`src/pageObject.ts`); related to the filed issue 06 (the schema written once)
- **Severity**: Low (the mirror image of a documented trap: no error at compile time or at run time, and the value
  `get` returns is not the type it is declared as)
- **Semver of the fix**: none for the docs; patch for the narrow type fix (option 2), by AGENTS.md §7 ("a type corrected
  to what the docs promise and the runtime does, even when code that relied on the wrong type stops compiling")
- **Reviewed**: `54cdada`, 2026-10-23, reviewer A (Claude Opus 5.5)
- **Status**: decided: fix, option 2 keyed by the schema type's keys (2026-10-26, [DECISIONS.md #38](../DECISIONS.md))

## Contract

- `website/src/content/docs/docs/session-storage.md`, *Through a page object*: the helper "is typed by the schema the
  page object declares: the type goes in the second type argument, under `storage`, and the value in the constructor's
  options", then the note: "The type and the value go together, and nothing checks that both are there. A page object
  that declares `storage` but passes no `sessionStorage.schema` compiles, and its helper has no codecs … Only writing a
  value that is not a string fails".
- Issue 06 (filed, breaking; draft `git show 2f06702:release-3.0.2/issues/06-storage-schema-once.md`) describes the same
  direction only ("With the type and without the value, the declared keys are stored and read without their codecs").
- `PageObjectOptions["sessionStorage"]`'s doc comment (`src/pageObject.ts:99`): "`{ schema }`: the codecs of the session
  storage keys that hold structured values, typed by `Options["storage"]`".

## Reproduction

Types: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/types/schema-without-type.typecheck.ts`:

```ts
const accountStorage = { user: json<{ name: string }>() };
export class NoTypePage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account", { sessionStorage: { schema: accountStorage } }); // compiles
  }
  protected defineLocators(): void { this.add("main").locator("main"); }
}
// the same with the schema written inline also compiles
const user: string | null = await noType.sessionStorage.get("user");   // compiles
// @ts-expect-error rejected: the value the codec would encode does not compile
await noType.sessionStorage.set("user", { name: "Ada" });
```

```sh
# from the worktree root
cp /home/magdys/workspace/dyhex/POMWright-final-review-probes/A/types/schema-without-type.typecheck.ts test/tests/zz-probe-schema.typecheck.ts
pnpm exec tsc --noEmit -p test
rm test/tests/zz-probe-schema.typecheck.ts
```

Exit code 0 (everything marked as compiling compiles; the `@ts-expect-error` is used). Log (empty):
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/out/types-schema.log`.

Run time: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/schemanotype.spec.ts` (the same page object
on `http://localhost:9000/testpath`, `user` stored as `{"name":"Ada"}`), run with `--project=chromium`, exit 0, log
`…/out/schemanotype.101958.log`.

## Observed / expected

```text
chromium typed string | null, got object {"name":"Ada"}
chromium user?.toUpperCase: undefined
```

The helper decodes `user` through the codec it was given, while its type, without `storage`, says every value is a
string; `set("user", { name: "Ada" })`, which the helper would encode, does not compile. The docs' note warns only of the
opposite case (type without value).

Expected: either the docs name both directions (a value without the type: the helper decodes, the types do not), or the
compiler rejects a schema value that the declared type options do not describe, as it already does for a value that
does not match a declared `storage` (`src/helpers/sessionStorage.test.ts:345-348`, "the schema value must match the
declared storage type").

## Cause

`src/pageObject.ts:73-77` and `:99-100`: without `storage`, `StorageTypeFromOptions<Options>` is `Record<never, never>`,
an empty object type, which accepts any schema value, inline literals included; the value then reaches
`new SessionStorage(page, { schema })` at `:312-316` and is used at run time.

## Fix plan

- **Intended contract**: the helper's types describe the codecs it uses.
- **Options**:
  1. **Docs only**: extend the note in *Through a page object* to the other direction ("…and a page object that passes
     `sessionStorage.schema` without declaring `storage` decodes those keys while its types say string"), and add this
     direction to issue 06. Semver none.
  2. **Reject a schema value without the type**: make the no-`storage` branch of the `schema` option a type that no
     codec satisfies (for example `Record<string, never>`), so passing a schema without declaring `storage` stops
     compiling, as a mismatched schema already does. Patch by §7. Check first that the documented generic base class
     (*Organising a project*), which forwards `PageObjectOptions<Options>`, still compiles (issue 06 records that a
     related change broke it). **Recommended**, with the note extended either way.
- **Implementation steps**: option 2: the `sessionStorage` member of `PageObjectOptions` in `src/pageObject.ts` (leave
  `StorageTypeFromOptions` as it is, since the helper's type uses it).
- **Tests**: a `@ts-expect-error` case beside "the schema value must match the declared storage type" in
  `src/helpers/sessionStorage.test.ts`, and in `test/tests/packaging/publicTypes.typecheck.ts`; the doc snippet checker
  over the docs' base-class examples.
- **Docs**: the note in `docs/session-storage.md`; `api/types.md` (`PageObjectOptions`) if option 2.
- **Changeset**: option 2: patch. "A page object that passes `sessionStorage.schema` must declare `storage` in its type
  options, as the docs say: without it the helper decoded values its types called strings. Add `{ storage: typeof
  schema }` to the page object's type options."
- **Decisions to tick** (walkthrough probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/a7/`):
  - [x] Option 1 or option 2: **option 2**, keyed by the schema type's keys (not by a declared `storage`, which the
    generic base class always has); both documented base classes still compile; a readable message
  - [x] Add this direction to issue 06 (#58): as a comment by the maintainer after 3.0.2 ([DECISIONS.md #38](../DECISIONS.md))
  - [x] (added) C9: a standalone `SessionStorage` with an explicit schema type requires its value; and every declared
    key, optional ones included, needs its codec in the value (`Required<S>`)
  - [x] (added) Docs: correct examples and the rule only, no gallery of mistakes; the note kept for the remaining trap
- **Execution order**: independent; check against issue 06 if that is designed first.
