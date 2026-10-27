# Plan 24: a schema's type and value must agree

- **Decisions**: [DECISIONS.md](DECISIONS.md) #38
- **Findings**: [A-7](A-session-storage/defect-A-7-schema-value-without-type.md) (the code option, chosen in the
  walkthrough), widened to the standalone helper (C9) and to optional keys; test gap #5's schema part
- **Bump**: patch (one new changeset; the pending `storage-schema-hint.md` amended)
- **Stop**: no
- **Depends on**: plan 23 (the same file's types); after plan 18 for *Principles* (decision 40 names this pairing)

## Contract

- A page object's `sessionStorage.schema` option is keyed by the declared schema type's keys: with no declared keys,
  `Record<string, SchemaNeedsStorageType>`, a message type, so a codec is rejected (`Type 'Codec<…>' is not assignable to
  type '"declare the schema's type in the page object's type options: PageObject<Paths, { storage: typeof schema }>"'`,
  final wording at implementation); with keys, `Required<S>`, so the value holds a codec for every declared key,
  optional ones included. Keyed by keys, not by whether `storage` is declared (the documented generic base class always
  declares `storage`).
- A standalone `SessionStorage` with an explicit schema type requires the value: `new SessionStorage<typeof schema>(page)`
  and `{ label }` without `schema` fail; `new SessionStorage(page, { schema })` infers its type as today.
- `PageObject`'s own construction stays allowed without a value (a page object's type without its value stays with
  issue #58); the runtime hint of the earlier 3.0.2 work stays.

## Current behaviour

`src/pageObject.ts:99-100`: `sessionStorage?: { schema?: StorageTypeFromOptions<Options> }`; `SessionStorage`'s
constructor (`src/helpers/sessionStorage.ts:273`) takes an optional schema. A value without its type, an explicit type
without its value, and an optional key without its codec compile, and the helper then decodes with codecs its types do
not know, or the reverse (`get` typed `string | null` returned an object; `…-probes/A/out/schemanotype.101958.log`).

## Steps

1. Apply `…-probes/R/walkthrough/a7/keys-c9-required.diff`: `SchemaOptionFor<S>` in `pageObject.ts` (no keys → the message
   record; keys → `Required<S>`), used by `PageObjectOptions["sessionStorage"]["schema"]`; the constructor's hand-off to
   `SessionStorage` through an assertion function, or a cast with its one-line reason beside it; `SessionStorage`'s
   constructor `options` with `schema: Required<S>` when `S` has keys.
2. Doc comments: `PageObjectOptions`'s `sessionStorage`, `SessionStorage`'s constructor (the value is required with an
   explicit type, and holds a codec for every key).
3. **Tests**:
   - `test/tests/packaging/publicTypes.typecheck.ts`: every case of `…/a7/cases.ts`, `@ts-expect-error` on P4, B1, G2
     (value without type), S4, S5 (explicit type without value), P10, S7 (optional key without its codec) and the
     existing P6, P7, P9; the rest compile (type and value, neither, an empty schema, inference, both documented base
     classes, a site-wide schema, and P5, G4, P8, S6 until #58);
   - `…/a7/corrected.ts`'s forms compile (the fixed version of each rejected case);
   - a unit test beside "the schema value must match the declared storage type" (`src/helpers/sessionStorage.test.ts`);
   - the docs' examples kept compiling by the snippet check;
   - at implementation, the external consumer project with a site-wide schema type-checks against the packed build in
     a scratch copy with the same errors as before (5, none from this).
4. **Docs**: correct examples only (no gallery of mistakes, AGENTS.md §9); *Session storage*, *Through a page object*:
   one sentence of the rule (take the schema type from the value, `storage: typeof schema`, and pass that value); the
   note kept for the one remaining trap (a type without its value compiles, the helper has no codecs, only a non-string
   write fails; issue #58 linked); the new compile error once on `api/errors.md` (as `@step`'s compile error is), and in
   `api/types.md` (`PageObjectOptions`) and `api/class-sessionstorage.md` (constructor); AGENTS.md §5, the session
   storage bullet (a schema's type and value must agree, checked by the compiler).
5. **Changesets**: `schema-type-and-value.md` (`patch`): "A page object that passes `sessionStorage.schema` must declare
   its type, a `SessionStorage` given an explicit schema type must be given the schema value, and the value must hold a
   codec for every declared key, as the docs say. Before, each compiled and the helper's types and codecs disagreed.
   Take the type from the value: `{ storage: typeof schema }`." Amend `.changeset/storage-schema-hint.md`: "Nothing
   checks that both are there" becomes what remains unchecked (a page object's type without its value).

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
fix: a storage schema's type and value must agree

The schema is written twice, as a type and a value, and only partly
checked: a value without its type, an explicit type without its value and
an optional key without its codec compiled, and the helper then decoded
with codecs its types did not know. Each is now a compile error, keyed by
the declared type's keys so the documented generic base class is unaffected.

Plan: defect-review-result/PLAN-A-7-schema-agreement.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27. As planned.

- `pageObject.ts`: `SchemaNeedsStorageType` and `SchemaOptionFor<S>` (no declared keys → `Record<string,
  SchemaNeedsStorageType>`; keys → `Required<S>`), used by `PageObjectOptions["sessionStorage"]["schema"]`, whose doc
  comment says to take the type from the value. The constructor's hand-off: `SessionStorage` as an untyped constructor
  and the schema as `StorageTypeFromOptions<Options> | undefined`, with the reason beside it (checked where the options
  were written; generic here). `sessionStorage.ts`: the constructor's options are a conditional rest tuple, optional
  without declared keys, `SessionStorageOptions<S> & { schema: Required<S> }` with them; `@param options.schema` says so.
- The compile error, from the build: `Type '{ user: Codec<{ name: string; }>; }' is not assignable to type
  'Record<string, "declare the schema's type in the page object's type options: PageObject<Paths, { storage: typeof
  schema }>">'.`
- Tests: `test/tests/packaging/publicTypes.typecheck.ts`, every case of the walkthrough's `cases.ts` under readable
  names (value without type, a forwarding base class's subclass with a value, the generic base class's subclass with a
  value, an explicit type without its value and with options without it, an optional key without its codec in a page
  object and a standalone helper, and the existing missing key, inline extra key and other-codec cases) with
  `@ts-expect-error`; the rest compile (type and value, neither, an empty value, inference, both documented base
  classes, a site-wide base class, an optional key with its codec, and a type without its value and a variable with an
  extra key until #58), and `corrected.ts`'s forms are among them, with the reads they type. Unit
  (`src/helpers/sessionStorage.test.ts`, beside *the schema value must match*): a value without its type, an optional
  key without its codec, an empty value; the standalone helper's four forms in an uncalled function.
- The external consumer project with a site-wide schema, in a scratch copy (its dependencies linked, the packed build
  copied in, so its own Playwright types are used): with its own build, 5 errors; with this branch's packed build
  (plans 13 to 24), the same 5, none from this.
- Docs: *Session storage*, *Through a page object* (the rule in one paragraph; the note kept for the type without its
  value, linking #58); `api/errors.md`, *Session storage* (the compile error once); `api/types.md`,
  `PageObjectOptions.sessionStorage`; `api/class-sessionstorage.md`, the constructor's `schema`; AGENTS.md §5. Changeset
  `schema-type-and-value.md`; `storage-schema-hint.md` amended (what the compiler checks now, and what it does not).
- Checks: `pnpm lint` 0; `pnpm test:unit` 896 passed; `pnpm pack-test --reporter=line` exit 0 (1,602 passed, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 29); `consumer-check.sh` 18 `ok`; `pnpm docs:build`
  0.
