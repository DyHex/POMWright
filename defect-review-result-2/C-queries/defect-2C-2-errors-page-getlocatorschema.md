# 2C-2: *Error messages* lists the unregistered-path message under the resolving calls, but `getLocatorSchema` throws it at its own call

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 103 in [DECISIONS.md](../DECISIONS.md); planned in the locators plan (docs); done 2026-10-30 in `a05f533`
- **Area**: `getLocatorSchema(path)`; *Error messages* (`api/errors.md`)
- **Severity**: Low (the message and its fix are right; only the list of calls that throw it leaves out the one a query
  meets first)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: missed by the first review. The same list stood at `54cdada` (`api/errors.md:141`); the first
  review checked that every message is on the page (B-7, H), not which calls the page says throw it, and 429f2c2 kept
  the list.
- **Reviewed**: `d850405`, 2026-10-28 15:43 +0100, Opus 5.5, second review, segment 2C

## Contract

`api/errors.md:6-7`: "Messages are grouped by the call that throws them". The message is listed once, under
*Resolving and verifying* (`api/errors.md:176-192`):

> Thrown by `getNestedLocator`, `getLocator`, a query's resolving methods, and `verify()` …
>
> `No locator schema registered for path "main.list.item".`

`getLocatorSchema`'s own doc comment (`src/locators/locatorRegistry.ts:466-467`) and its API entry
(`api/class-locatorregistry.md`, *getLocatorSchema()*, *Throws*) say it throws this message when the path is not
registered. The *Queries* section of the errors page (`api/errors.md:228-265`) does not list it.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/C/p5-broad-claims.mjs`, part (2):

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/C/p5-broad-claims.mjs
```

Exit 0. Output, part (2):

```text
(2) where the unregistered-path message is thrown:
  getLocatorSchema("main.nothing") throws at the call: No locator schema registered for path "main.nothing".
  a query exists to resolve: false
```

The same, character for character, in `p3-messages.out` ("getLocatorSchema of an unregistered path").

## Observed / expected

Observed: `getLocatorSchema` throws the message at its call, before a query exists; no query method resolves anything.
Expected by the page's grouping: `getLocatorSchema` among the calls that throw it, or the message under *Queries*.

## Cause

`LocatorQueryBuilderInternal`'s constructor (`src/locators/locatorQueryBuilder.ts:87-89`) throws when the path has no
record; the errors page's list of throwing calls was written for resolution.

## Fix plan

- **Intended contract**: unchanged.
- **Steps (docs only)**: `api/errors.md:178`: "Thrown by `getNestedLocator`, `getLocator`, `getLocatorSchema`, a
  query's resolving methods, and `verify()`", or a line under *Queries* pointing to the message. The first keeps one
  entry per message, which `scripts/check-error-messages.mjs` expects.
- **Tests**: `pnpm typecheck` (runs `check-error-messages.mjs`).
- **Changeset**: none.
- **Decisions to tick**: none.
