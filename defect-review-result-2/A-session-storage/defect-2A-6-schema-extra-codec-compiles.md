# 2A-6: The docs say one schema mismatch still compiles; a schema variable with a codec the type does not declare compiles too, and `get` then returns that codec's value typed as a string

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 102 in [DECISIONS.md](../DECISIONS.md); planned in the session storage plan (docs)
- **Area**: types: a page object's or helper's storage schema, type and value (`SchemaOptionFor`, the constructor's rest tuple)
- **Severity**: Low (it needs the type and the value to come from two declarations, which the docs advise against; the result is `get` typed `string | null` returning another type, the very disagreement the change set says is gone)
- **Semver of the fix**: none (docs; the code cannot reject it, see *Fix plan*)
- **Pass**: 1
- **First review**: new since 54cdada (e05b84d, A-7's fix, which added the compile errors, the note and the guide line); decision 38 item 7 and plan 24's notes know the case ("a variable with an extra key until #58"), the docs' note does not
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

- `website/src/content/docs/docs/session-storage.md`, *Through a page object*: "TypeScript then holds the two together: a value without its type, and a value missing a codec for a declared key, are compile errors …", then the note: "**One case still compiles**: a page object that declares `storage` but passes no `sessionStorage.schema`."
- `src/helpers/AGENTS.md`, *Session storage*: "a schema's type and value must agree, which the compiler checks (…), except a page object's type without its value (issue #58)".
- `.changeset/schema-type-and-value.md`: "Before, each compiled, and the helper's types and codecs disagreed: `get` could be typed `string | null` and return an object, or the reverse."
- The harness's type probe knows the second case and accepts it: `test/tests/packaging/publicTypes.typecheck.ts:531-537` ("a variable with an extra key still compiles, as TypeScript's excess property check covers literals only"), and `:567-568` for a standalone helper with an explicit type.

## Reproduction

Type: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/t01-types.typecheck.ts` (class `VariableExtra` and `standaloneExtra`), copied to `test/tests/zz-probe-A-t01.typecheck.ts`, then `pnpm exec tsc --noEmit -p test` from the worktree root (output `t01-types.out`): no error on those lines, and `get("count")` is asserted to be `string | null`.

Run time: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p06-batch3.spec.ts`, test "T1":

```ts
const accountStorage = { user: json<{ name: string }>() };
const withCount = { user: json<{ name: string }>(), count: json<number>() };
class VariableExtra extends PageObject<"main", { storage: typeof accountStorage }> {
  constructor(page: Page) {
    super(page, "http://localhost:9000", "/teststorage", { sessionStorage: { schema: withCount } }); // compiles
  }
  protected defineLocators(): void { this.add("main").locator("body"); }
}
// on the page: sessionStorage.setItem("count", "42")
const count: string | null = await extra.sessionStorage.get("count");
```

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p06-batch3.spec.ts test/tests/zz-probe-A-p06-batch3.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p06-batch3.spec.ts --project=chromium --reporter=line -g T1
rm test/tests/zz-probe-A-p06-batch3.spec.ts
```

Exit code 0.

## Observed / expected

```text
T1 get("count") typed string | null returned number: 42
T1 set("count", "7"): resolved undefined, stored "7"
```

`count` is a number at run time, typed `string | null`. The docs and the guide name one case that still compiles; this is a second. Expected: the docs say that the compiler checks the value against the type only when it is written inline or is the value the type was taken from, and that a schema value with a key the type does not declare, passed through a variable, compiles and decodes that key.

## Cause

TypeScript's excess property check applies to object literals only; `SchemaOptionFor` (`src/pageObject.ts:88-90`) and the constructor's `{ schema: Required<S> }` (`src/helpers/sessionStorage.ts:291-293`) accept any value with at least the declared keys. The runtime takes every codec in the value (`hasCodec`, `src/helpers/sessionStorage.ts:185`).

## Fix plan

- **Intended contract**: unchanged; the docs say where the compiler's check stops.
- **Options**:
  1. *(recommended)* Docs: the note in `docs/session-storage.md` names both cases ("Two cases still compile: …; and a schema value with a key the type does not declare, passed through a variable rather than written inline: that key is decoded by its codec but typed as a string"), and the guide's line in `src/helpers/AGENTS.md` lists it. The changeset's "Before, …" sentence keeps its claim to the cases it fixed.
  2. Code: reject the extra key at the type level. A constructor cannot have type parameters of its own, and `super(…)` infers nothing, so the value's type cannot be compared with the declared one; not available.
  3. Code, at run time: ignore codecs for keys the type does not declare. The runtime does not know the type; not available.
- **Tests**: none new; `publicTypes.typecheck.ts` already holds the case as compiling.
- **Docs**: `docs/session-storage.md` (*Through a page object*, the note), `src/helpers/AGENTS.md` (*Session storage*), `.changeset/schema-type-and-value.md` (if it is still pending when this is fixed: it is).
- **Changeset**: none (docs).
- **Decisions**: none.
- **Relative to other findings**: issue #58 (a declared type without its value) is the other case; a fix there that makes the schema written once would close this one too.
