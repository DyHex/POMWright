# A-4: A storage key typed as a template literal or a branded string is typed as a plain string, although it may be a declared key whose value comes back decoded

- **Kind**: defect
- **Area**: Session storage types: `Decoded`, and through it `get`, `set` and `seed` (`64cd0b7`)
- **Severity**: Low (needs a key whose type is a string pattern such as `` `user:${string}` `` or a branded string, and a
  schema with codecs; the compiler then promises a string where the runtime returns the decoded value)
- **Semver of the fix**: patch (AGENTS.md §7: "a type corrected to what the docs promise and the runtime does, even when
  code that relied on the wrong type stops compiling"; the changeset gives the migration, as `64cd0b7`'s did)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer A (Claude Opus 5.5)
- **Status**: decided: fix, option 3 (2026-10-26, [DECISIONS.md #18](../DECISIONS.md)), added in the walkthrough

## Contract

- `website/src/content/docs/api/class-sessionstorage.md`, `get()`, *Returns*: "Values are typed by the schema: a declared
  key as its codec's type, any other key as a string, and a key typed `string` rather than a literal as a string or any
  declared codec's type". *Decoded*: "A key typed `string` may be any key, so its value is a string or any declared
  codec's type."
- `docs/session-storage.md`, *Codecs for structured values*: "A key typed `string` rather than a literal may be any
  key, so its value is typed as a string or any declared codec's type".
- The doc comment of `Decoded` (`src/helpers/sessionStorage.ts:92-99`): "A key typed `string`, not a literal, may be any
  key".
- `.changeset/storage-string-key-types.md`: the rule exists because "a declared key returned its decoded value at run
  time" while its type said string.

The reason the docs give ("may be any key") holds for every non-literal key type, not only for `string`: a pattern
`` `u${string}` `` may be `"user"`, and so may a branded `string & { __brand: … }`.

## Reproduction

Type probe `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/types/keys.typecheck.ts` (each `SHOULD-FAIL`
line carries a `@ts-expect-error` that is unused, so reported, when the narrow type compiles):

```ts
declare const storage: SessionStorage<{ user: Codec<{ name: string }> }>;
declare const prefixed: `u${string}`;
// @ts-expect-error SHOULD-FAIL: the value may be a User, so it is not known to be a string
const fromTemplate: Promise<string | null> = storage.get(prefixed);
type Key = string & { readonly __brand: "Key" };
declare const branded: Key;
// @ts-expect-error SHOULD-FAIL: same for a branded key
const fromBranded: Promise<string | null> = storage.get(branded);
type T1 = Decoded<{ user: Codec<User> }, `u${string}`>;
// @ts-expect-error SHOULD-FAIL: Decoded of a template key should include User
const t1: T1 = "only a string";
declare const anyKey: string;
// @ts-expect-error control: a string key is widened, so this must fail
const fromString: Promise<string | null> = storage.get(anyKey);
```

```sh
# from the worktree root
cp /home/magdys/workspace/dyhex/POMWright-final-review-probes/A/types/keys.typecheck.ts test/tests/zz-probe-keys.typecheck.ts
pnpm exec tsc --noEmit -p test
rm test/tests/zz-probe-keys.typecheck.ts
```

Exit code 2. Log: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/out/types-keys.log`.

Runtime, from `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/values.spec.ts` (chromium, log
`…/out/values.100931.log`, exit 0):

```ts
const prefixed = "user" as `u${string}`;
await s.set("user", { name: "Ada" });
await s.get(prefixed); // typed Promise<string | null>
```

## Observed / expected

```text
test/tests/zz-probe-keys.typecheck.ts(12,1): error TS2578: Unused '@ts-expect-error' directive.
test/tests/zz-probe-keys.typecheck.ts(18,1): error TS2578: Unused '@ts-expect-error' directive.
test/tests/zz-probe-keys.typecheck.ts(23,1): error TS2578: Unused '@ts-expect-error' directive.
```

and at run time:

```text
get(template key typed string|null): resolved {"name":"Ada"} (object)
```

So `get` with a pattern or branded key is typed `string | null` and returns an object; the control (`string`) is
widened as documented. Expected: `string | { name: string } | null` for both, as for `string`. (`set(prefixed, { name:
"Ada" })` is rejected, line 5 of the probe, although the runtime would encode it through the codec when the key is
`"user"`.)

## Cause

`src/helpers/sessionStorage.ts:100-106`: `Decoded` widens only when `string extends K`. A pattern literal or a branded
string is not a supertype of `string`, so it falls to `K extends keyof S ? … : string` and gets `string`.

## Fix plan

- **Intended contract**: every key type that is not a literal (or a union of literals) may be any key: its value is a
  string or any declared codec's type.
- **Options**:
  1. **Widen when `K` is not a literal union**: replace `string extends K` with a literal test such as
     `{} extends Record<K, unknown>` (true for `string`, for patterns and for branded strings; false for `"user"` and
     unions of literals). **Recommended**: one condition, the documented rule applied to what it argues about. The
     test itself was checked: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/types/literal-test.ts`
     (`string`, `` `u${string}` ``, a branded string and `Uppercase<string>` give `true`; `"user"` and
     `"user" | "token"` give `false`), `pnpm exec tsc --noEmit --strict --ignoreConfig <that file>` from the worktree
     root, exit 0.
  2. Narrower for patterns: `string | Decoded<S, Extract<keyof S, K>>` (a pattern `` `u${string}` `` gets only the
     codecs of declared keys it matches). More precise, more type machinery, and a branded key still needs option 1.
- **Implementation steps**: `Decoded` in `src/helpers/sessionStorage.ts`; check `KeyOnly`, `EntriesFor`, the `get`
  overloads and `AllEntries` still give today's types for literals, unions of literals, `string` and `get()`.
- **Tests**: `expectTypeOf` cases in `src/helpers/sessionStorage.test.ts` (pattern key, branded key, a union of a
  literal and a pattern); a line in `test/tests/packaging/publicTypes.typecheck.ts` against the published declarations.
- **Docs**: the *Decoded* section and `get()`'s *Returns* on `api/class-sessionstorage.md`, the paragraph in
  `docs/session-storage.md`, and `Decoded`'s doc comment: "a key typed `string`" becomes "a key whose type is not a
  literal (`string`, a template literal type, a branded string)".
- **Changeset**: patch. "A session storage key typed as a template literal type or a branded string is now typed like a
  key typed `string`: its value is a string or any declared codec's type. Code that used such a value as a string, with
  a schema that has codecs, stops compiling: narrow it, or pass the literal key."
- **Decisions to tick**:
  - [x] Option 1 or option 2: neither as written. **Option 3** (added in the walkthrough, checked with TypeScript 6.0.3
    in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/R/walkthrough/a4/`): per member of `K` (a distributive
    conditional type, which the union `"cart" | `u${string}`` needs and the finding's option 1 missed), a literal gets
    its own type, a branded string (`K extends object`) and `string` get a string or any declared codec's type, and a
    pattern gets a string or the codecs of the declared keys it can match (`Extract<keyof S, K>`). Right for every key
    kind probed; option 1 is over-wide for namespaced patterns such as `` `form:${string}` ``, option 2 wrong for branded
    keys.
  - [x] (added) Tests: an `expectTypeOf` case per key kind (literal, undeclared literal, union of literals, `string`,
    a matching pattern, a namespaced pattern, a branded string, a literal-and-pattern union, `Uppercase<string>`); a line
    in `test/tests/packaging/publicTypes.typecheck.ts`.
  - [x] (added) Docs: "a key whose type is not a literal: `string`, a branded string, or a pattern, which may be any
    declared key it matches", in the places listed above.
  - [x] (added) The pending `.changeset/storage-string-key-types.md` is amended (these key types and the migration)
    instead of a new changeset.
- **Execution order**: independent.
