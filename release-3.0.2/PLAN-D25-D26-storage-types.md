# PLAN-D25-D26 — session storage types for keys that are not literals, and the types a consumer can import

Findings T8 and T9 of [PLAN-T](PLAN-T-candidates-triage.md). Two commits, D26 first (it exports the type D25 changes).

## Intended contract

- **D25.** As the API page says, "values are typed by the schema: a declared key as its codec's type, any other key as a
  string". A key whose type is `string`, not a literal, may be any key, so its value is typed `string` or any declared
  codec's type: `get` returns that or `null`, and `set` and `seed` accept it. Literal keys, unions of literals, `get()`
  and a schema without codecs (or with string codecs only) keep their types. Decided as a patch
  ([DECISIONS.md](DECISIONS.md) 30).
- **D26.** The types in the public signatures of `SessionStorage` that a consumer may need to name are exported from the
  root, as `AGENTS.md` section 5 promises: `Decoded` and `AllEntries` (return types), `SessionStorageOptions` and
  `SeedOptions` (option types, as `PageObjectOptions` already is). `EntriesFor` and `NonEmpty`, which only shape
  parameters, stay internal ([DECISIONS.md](DECISIONS.md) 28).

## Verified current behaviour

**D25.** `Decoded<S, K>` is `K extends keyof S ? <the codec's type> : string`
([../src/helpers/sessionStorage.ts#L85-L89](../src/helpers/sessionStorage.ts#L85-L89)); for `K = string` the question
is "is every string a declared key", which is false, so the answer is `string`. `tsc` 6.0.3 against the packed
declarations, with `schema: { user: json<{ name: string }>() }` and `const key: string = "user"`: `get(key)` is
`string | null`, `get([key])` is `{ [x: string]: string | null }`, `set(key, "x")` compiles. At run time `get(key)`
returned the object `{"name":"Ada"}` and `set(key, "x")` stored `"x"` with its quotes, every browser (PLAN-T). `get()`
already types unknown keys as `string | <any declared type>` ([#L103-L105](../src/helpers/sessionStorage.ts#L103-L105)),
and the unit test pins the wrong type for computed keys
([../src/helpers/sessionStorage.test.ts#L223-L224](../src/helpers/sessionStorage.test.ts#L223-L224)).

The correction, compiled with `tsc` 6.0.3 on a copy of the types: `string extends K ? string | AnyDecoded<S> :
<today's Decoded>`, where `AnyDecoded<S>` is the union of the codecs' types. For a schema `{ user: json<{ name: string }>(),
cart: json<number[]>() }` a `string` key gives `string | { name: string } | number[]`; a literal, a union of literals and a
schema without codecs give what they give today. `getNow(key)?.toUpperCase()` compiles today and fails with TS2339 after;
that is the change decision 30 accepts.

**D26.** Importing `AllEntries`, `Decoded`, `EntriesFor`, `NonEmpty` and `SeedOptions` from `pomwright` fails with
TS2459 ("declares … locally, but it is not exported"), `SessionStorageOptions` with TS2724; [../index.ts#L4](../index.ts#L4)
exports `Codec`, `json`, `SessionStorage` and `SessionStorageSchema` from the module.

## Implementation steps

1. **D26.** `index.ts` exports `type AllEntries`, `type Decoded`, `type SeedOptions`, `type SessionStorageOptions`. Each
   gets a doc comment with a summary and `@see` (`SessionStorageOptions` and `SeedOptions` already have field comments),
   and a `## Name` section on the `SessionStorage` API page; `AGENTS.md` section 1's list of the public API.
2. **D25.** `Decoded` with the `string extends K` case and an internal `AnyDecoded<S>`; `EntriesFor` follows, since it
   is built on `Decoded`. The doc comments of `get`, `set` and `seed` say how a key typed `string` is typed.

## Tests

- Unit type tests (`sessionStorage.test.ts`): the two assertions at L223-L224 become the union; new ones for `get(key)`,
  `get([key])`, `set(key, …)` and `seed(key, …)` with `key: string`, a literal and a literal union unchanged, a schema
  without codecs unchanged, and `// @ts-expect-error` on `(await get(key))?.toUpperCase()` with a codec in the schema.
- `test/tests/packaging/publicTypes.typecheck.ts`: the four new exports by name, and the widened `get(key)`;
  `publicTypes.emit.ts`: a function returning `get(key)` emits declarations without annotations.

## Docs

*Session storage*, where values are typed: a key typed `string` is typed `string` or any declared codec's type; pass the
literal, or type the variable as the schema's keys (`keyof typeof accountStorage`), to get the codec's type; `set` with
such a key still runs that key's codec. The API page: the four types' sections, and the typing sentence. `AGENTS.md`
section 1 (the public API).

## Changesets

Two, `patch`. D26: the four types are exported. D25, with the migration hint decision 30 requires:

> A session storage key typed `string`, rather than a literal, is now typed as `string` or any declared codec's type,
> as the docs say; before, it was typed `string` although a declared key returned its decoded value. Code that used
> such a value as a string with a schema that has codecs stops compiling: pass the literal key, type the variable as
> the schema's keys (`keyof typeof schema`), or narrow the value (`typeof value === "string"`).

## Before the release

Your team checks its code for `get`, `set` or `seed` calls whose key is a variable typed `string` on a helper with
codecs (decision 30).

## Decisions

- [x] D26: export `AllEntries`, `Decoded`, `SeedOptions` and `SessionStorageOptions`; `EntriesFor` and `NonEmpty` stay
  internal (2026-10-23).
- [x] D25 as described (2026-10-23).
