# Plan 23: storage values typed per key member

- **Decisions**: [DECISIONS.md](DECISIONS.md) #18
- **Findings**: [A-4](A-session-storage/defect-A-4-non-literal-key-types.md); test gap #5's storage key part
- **Bump**: patch (the pending `storage-string-key-types.md` amended)
- **Stop**: no
- **Depends on**: nothing in order

## Contract

`Decoded<S, K>` is computed per member of `K` (distributive):

- a literal gets its codec's type, or `string` when it is not declared (unchanged);
- `string` and a branded string (`K extends object`, as `string & {…}` is) get `string` or any declared codec's type;
- a pattern (a template literal type, `Uppercase<string>` …) gets `string` or the codecs of the declared keys it can
  match (`Extract<keyof S, K>`).

`KeyOnly`, `EntriesFor`, the `get` overloads and `AllEntries` keep today's types for literals, unions of literals,
`string` and `get()`. Users pay nothing for the extra branch.

## Current behaviour

`src/helpers/sessionStorage.ts:100-106`: only `string extends K` is widened (`64cd0b7`); a pattern or a branded key may be
a declared key too, and is typed `string` where the runtime returns a decoded object; not distributive, so a union of a
literal and a pattern is typed as neither. Compared with TypeScript 6.0.3 in `…-probes/R/walkthrough/a4/variants.ts`
(option 3 right for every kind).

## Steps

1. `Decoded`: the per-member form from `variants.ts`'s option 3 (`K extends unknown ? …`; `string extends K` or `K extends
   object` → `string | AnyDecoded<S>`; `{} extends Record<K, unknown>` (a pattern) → `string | DecodedOf<S,
   Extract<keyof S, K>>`; a literal as today). Its doc comment: "a key whose type is not a literal: `string`, a branded
   string, or a pattern, which may be any declared key it matches".
2. **Tests**: an `expectTypeOf` case in `src/helpers/sessionStorage.test.ts` for each key kind: a literal, an undeclared
   literal, a union of literals, `string`, a matching pattern (`` `u${string}` ``), a namespaced pattern
   (`` `form:${string}` ``, matching no declared key), a branded string, `"cart" | `u${string}``, `Uppercase<string>`;
   a line in `test/tests/packaging/publicTypes.typecheck.ts` against the published declarations.
3. **Docs**: `api/class-sessionstorage.md` (*Decoded*, `get()` **Returns**); *Session storage*, *Codecs for structured
   values*.
4. **Changeset**: amend `.changeset/storage-string-key-types.md` to cover patterns and branded keys, with the migration:
   code that used such a value as a string stops compiling only where the key can match a declared key; narrow it, or
   pass the literal key.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
fix: storage values typed per key member, patterns and branded keys included

A key typed as a template pattern or a branded string may be a declared key
too, and was typed string where get returns the decoded value. Decoded is
now computed per member: a literal exactly, a pattern by the declared keys
it can match, string and branded strings as any declared codec's type.

Plan: defect-review-result/PLAN-A-4-key-types.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27. As planned.

- `sessionStorage.ts`: `Decoded<S, K>` is the walkthrough's option 3: `string extends K` as before; otherwise per member,
  a branded string (`K extends object`) as `string | AnyDecoded<S>`, a pattern (`{} extends Record<K, unknown>`, behind
  the same `biome-ignore` as the locator types) as `string | DecodedLiteral<S, Extract<keyof S, K>>`, a literal as
  `DecodedLiteral<S, K>`, a new internal alias for the old literal branch. Its doc comment names the three kinds.
- Tests: `src/helpers/sessionStorage.test.ts`, *Decoded, per member of the key's type*: a declared and an undeclared
  literal and their union, `string`, a branded string, `` `u${string}` ``, `` `form:${string}` ``, `Uppercase<string>` and
  `"attempts" | `u${string}``; `get` with a pattern-typed key. With the old `Decoded`, the brand and pattern cases fail
  (checked, then restored). `test/tests/packaging/publicTypes.typecheck.ts`: a pattern's value takes the matching key's
  codec type, and an `@ts-expect-error` that it does not take a key it cannot match.
- Docs: *Session storage*, *Codecs for structured values*; `api/class-sessionstorage.md`, `get()` **Returns** and
  *Decoded* (two more examples, compiled by the snippet check). `.changeset/storage-string-key-types.md` rewritten for
  every key kind, with the narrowed migration.
- Checks: `pnpm lint` 0; `pnpm test:unit` 896 passed; `pnpm pack-test --reporter=line` exit 0 (1,602 passed, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 29); `consumer-check.sh` 18 `ok`; `pnpm docs:build`
  0.
