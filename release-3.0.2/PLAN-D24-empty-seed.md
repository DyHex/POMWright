# PLAN-D24 — a seed with no entries

Finding T7 of [PLAN-T](PLAN-T-candidates-triage.md). One commit.

## Intended contract

`seed({})` does nothing, as `get([])` and `clear([])` with a list that is empty at run time already do: it validates its
origin and resolves, without registering a script, writing or waiting for an arrival.

## Verified current behaviour

`seed` hands the encoded entries to the registry whatever their number
([../src/helpers/sessionStorage.ts#L473-L477](../src/helpers/sessionStorage.ts#L473-L477)). `seed({})` for an origin the
test never visits made a test that had nothing else wrong fail at close, every browser:
`SessionStorage.seed: the seed for http://127.0.0.1:9000 (keys: ) was never applied: the page closed without navigating
there; …` (PLAN-T). An empty object reaches `seed` from code such as `seed(Object.fromEntries(list))` with an empty list.
The doc comments of `get` and `clear` already say an empty list at run time reads or removes nothing
([#L336-L337](../src/helpers/sessionStorage.ts#L336-L337), [#L402](../src/helpers/sessionStorage.ts#L402)).

## Options

- **A. Do nothing for no entries (recommended),** after the origin checks, so `seed({}, { origin: "not an origin" })`
  still throws.
- B. Throw `seed() needs at least one entry`. It would fail the same computed code loudly instead of quietly, unlike
  `get` and `clear`.

## Implementation steps

1. In `seed`, after `encodeEntries`: return when it produced no key.

## Tests

- Unit (`sessionStorage.test.ts`): `seed({})` calls nothing on the page.
- Harness: `seed({})` for the second origin in a test that never goes there passes, every browser.

## Docs

The API page and doc comment of `seed`: "No entries: nothing to do."

## Changeset

`patch`: `seed({})` does nothing; before, it failed the test at close with "(keys: )".

## Decisions

- [x] Option A (2026-10-23).
