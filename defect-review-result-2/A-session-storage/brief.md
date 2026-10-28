# Segment 2A: Session storage

Segment 2A of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set.

## The guide, read first

`AGENTS.md`, `src/AGENTS.md`, `src/helpers/AGENTS.md` and `test/AGENTS.md`, in full, in the worktree.

## In scope

- **Source**: `src/helpers/sessionStorage.ts`, `sessionStorageSeed.ts`, `storageTurns.ts`, `callSite.ts` (as storage
  uses it), and the session storage parts of `src/pageObject.ts` (the `sessionStorage` option, the property, the schema
  in the type options). Read all of it, with its doc comments.
- **Unit tests**: `src/helpers/sessionStorage.test.ts`, `sessionStorageSeed.test.ts`, `storageTurns.test.ts`,
  `callSite.test.ts`.
- **Harness**: `test/tests/testApp/sessionStorage.spec.ts`, `sessionStorageOverlay.spec.ts`, the storage parts of
  `test/tests/pageObject/callSite/`, `test/page-object-models/testApp/pages/teststorage/`, the `/teststorage*` routes of
  `test/server.js`, and the storage parts of `test/tests/packaging/publicTypes.typecheck.ts` and `publicTypes.emit.ts`.
- **Docs** (under `website/src/content/docs/`): `docs/session-storage.md`, `docs/seeding-session-storage.md`,
  `api/class-sessionstorage.md`, the session storage and `seed` sections of `api/errors.md`, `internal/seed-registry.md`,
  what `internal/call-sites.md` says about storage errors, the session storage section of `docs/upgrading-from-2x.md`,
  the storage rows of `docs/typescript.md`'s type table, and the storage lines of the guide.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- src/helpers/sessionStorage.ts src/helpers/sessionStorageSeed.ts src/helpers/storageTurns.ts src/helpers/callSite.ts src/pageObject.ts test/tests/testApp test/page-object-models/testApp/pages/teststorage website/src/content/docs .changeset ':!defect-review-result'`,
narrowed to what touches storage. Read each diff and its changeset; the commits after `54cdada` first.

## Questions for pass 1

They come on top of the skill's checklist, and they are questions, not suspicions.

- **Turns**: does every call (`set`, `get`, `clear`, `seed`, with and without `origin`) take its turn in call order,
  from several `SessionStorage` instances on one page, on two origins, in a `Promise.all`, without an `await`, with a
  navigation in flight, and when a call throws before or after it joined?
- **`seed` at the call**: is the decision right for every page state at the call (on the origin, away from it,
  `about:blank`, mid-navigation, closing, closed, a popup), combined with the commit arriving before, during and after
  registration, several seeds, and two pages of one context?
- **Lifetimes**: are init scripts and listeners removed after a success, after each kind of failure, on close, and over
  many seeds? Count them.
- **Values and keys**: codecs that throw or return a non-string; `json` with values JSON cannot represent; keys outside
  the schema, empty, unicode, very long, and prototype names, in every method and in a schema object.
- **Documents**: every claim the pages make about frames, `srcdoc`, `about:blank`, `data:`, sandboxed documents, COOP
  and COEP, on the browsers the page names.
- **Messages**: every message the pages and the `@throws` show, character for character, against the code and what a
  probe prints.
- **Types**: do the storage types accept what the runtime accepts and reject what it rejects?

## Pass 2: the first review

Its scope A: `defect-review-result/A-session-storage/`; the ledger rows of `defect-review-result/report.md` whose area is
session storage, their `DECISIONS.md` entries and their plans; the items `PLAN-release-gates-and-audit.md` leaves for the
second review in this area; the first `inventory.md`'s lines tagged `[A]`. Probes:
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/`.

## Neighbours

The step mechanism belongs to 2E, a page object's URLs to 2D, packaging and the export list to 2F, the harness's
mechanics (server, configs) to 2T. Report what you meet there under *outside the segment*.
