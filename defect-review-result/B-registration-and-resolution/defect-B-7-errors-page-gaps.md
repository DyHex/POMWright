# B-7: *Error messages* leaves out the hand-made seed's `reuse requires …` messages and the registration's any-frame step message, though it lists "every message"

- **Kind**: documentation
- **Area**: Errors and messages: `api/errors.md` sections *Registering* and *Reusing* (inventory §3); the `add` doc comment and `api/class-locatorregistry.md` *add*
- **Severity**: Low (rare inputs: a seed object made by hand, a step on a copy of an any-frame path; the messages themselves are clear)
- **Semver of the fix**: none (docs only)
- **Reviewed**: `54cdada`, 2026-10-23, scope B reviewer
- **Status**: decided (2026-10-26, [DECISIONS.md #36](../DECISIONS.md))
- **Merged with**: A-6, C-4, D-3, H-2 (see report.md)

## Contract

- `website/src/content/docs/api/errors.md:1-9`: "Every message POMWright throws, by the call that throws it, with what it
  means and what to change." "Messages are grouped by the call that throws them".
- AGENTS.md §9: "say what fails and how (concept pages show the common errors, API pages and doc comments every one per
  member, *Error messages* all of them)".

## Reproduction

The page, *A first argument that is missing or empty* (`errors.md:52-68`): "Thrown by a locator method of `add`,
`createReusable` (…) and `replace` when the first argument is missing (from JavaScript), and by those and by `update`
and a seeded `add` when it is not a string or RegExp where one is needed, or is an empty string …". The `reuse` form is
not among them, and *Reusing* (`errors.md:104-135`) does not list it either.

The page, *Queries* (`errors.md:217-224`): `filter() cannot apply to "anyFrame": frameLocator() without a selector has no
element to filter, index or describe; resolve a path inside it.`, under "Thrown at the call by the methods of a query".
*Reusing* lists only the `reuse cannot apply to …` form (a seed with steps). The same message thrown by `filter`, `nth`
or `describe` after `add(path, { reuse: "anyFramePath" })` is not listed under a registration call.

Probe `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/f7-errors-gaps.mjs` (with `lib.mjs`), command from
the worktree root: `node ../POMWright-final-review-probes/B/f7-errors-gaps.mjs`, exit code 0:

```text
reuse requires a role value for "main.button".
reuse requires a non-empty selector for "main.list".
reuse requires a non-empty id for "main.panel".
nth() cannot apply to "bannerFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
describe() cannot apply to "bannerFrame2": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

`grep` over `website/src/content/docs` finds `reuse requires a non-empty selector` only on `docs/reusing-locators.md`
(*Frames and odd seeds*) and the `nth()` form only there; `reuse requires a role value` and `reuse requires a non-empty
id` appear nowhere on the site (they are pinned by `src/locators/locatorRegistry.test.ts:678-681`). The `add` doc
comment (`src/locators/locatorRegistry.ts:175-180`) and `api/class-locatorregistry.md` *add* (Throws) do not mention
the hand-made seed check either.

## Observed / expected

Observed: the messages above are thrown by `add(path, { reuse })` and by the registration it returns, and *Error
messages* does not list them under those calls. Expected: *Reusing* lists `reuse requires a role value for "…".` /
`reuse requires a non-empty selector for "…".` ("a seed object made by hand whose first argument is missing, of the
wrong type or empty") and the any-frame step message for a copy of an any-frame path; or the *first argument* section
names the `reuse` form beside `add`, `createReusable` and `replace`.

## Cause

The hand-made seed check (`locatorRegistry.ts:251-256`, `assertStrategyPrimary(…, { method: "reuse", … })`) and the
step check on a copy (`locatorRegistrationBuilder.ts:838-847`, `ensureDefinition`) reuse messages documented for other
calls; the page lists each text once, under one call.

## Fix plan

- **Intended contract**: *Error messages* lists every message under each call that throws it.
- **Options**:
  1. *(recommended)* Add to *Reusing*: the `reuse requires …` form with one line on when it is thrown, and the
     `nth() cannot apply to "…": frameLocator() without a selector …` form for a step on a copy of an any-frame path.
     Add one sentence to the `add` doc comment's `@throws` and to `api/class-locatorregistry.md` *add* (Throws).
  2. Change the *A first argument that is missing or empty* sentence to include "a seed object passed to
     `add(path, { reuse })` (named `reuse` in the message)".
- **Implementation steps**: `website/src/content/docs/api/errors.md`; `website/src/content/docs/api/class-locatorregistry.md`;
  `src/locators/locatorRegistry.ts` (the `add` doc comment).
- **Tests**: none; `pnpm typecheck` runs the API coverage check over the doc comment.
- **Docs**: the pages above.
- **Changeset**: none (docs; a doc comment change ships in the declarations but changes no behaviour or type).
- **Decisions to tick**:
  - [x] Where the messages go (option 1 or 2): **option 1**, in one late docs pass with A-6, C-4, D-3 and H-2, plus a
    message-coverage check and a labelled `Cannot resolve` message ([DECISIONS.md #36](../DECISIONS.md)).
- **Execution order**: after B-5 if its message changes, so *A registration that has ended* is edited once.
