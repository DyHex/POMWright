# A-6: The error lists of `seed` leave out the two failures of a seed that writes at once, and those of `get` and `clear` leave out the sandboxed document

- **Kind**: documentation
- **Area**: Session storage: errors of `seed` on the origin, `get`, `clear` (doc comments, API page, `errors.md`, the
  *Seeding session storage* page)
- **Severity**: Low (two real messages a user can meet from `seed`, and one from `get`/`clear`, are missing from the
  lists that present themselves as complete)
- **Semver of the fix**: none (docs and doc comments only)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer A (Claude Opus 5.5)
- **Status**: decided (2026-10-26, [DECISIONS.md #36](../DECISIONS.md))
- **Merged with**: B-7, C-4, D-3, H-2 (see report.md)

## Contract

- AGENTS.md §9: "say what fails and how (… API pages and doc comments every one per member, *Error messages* all of
  them)"; "`@throws` with the real message".
- `docs/seeding-session-storage.md`, *Errors*: eleven messages, then "The first seven are thrown by the `seed` call; the
  last four fail the test later".
- `api/errors.md` opens with "Every message POMWright throws, by the call that throws it".

## Reproduction

Pages and comments:

- `seed`'s doc comment (`src/helpers/sessionStorage.ts:545-574`), `api/class-sessionstorage.md` `seed()` *Throws*,
  `api/errors.md` *seed*, and `docs/seeding-session-storage.md` *Errors* list the origin, encoding, in-flight,
  Navigation API, closed-page, refused-write, never-applied and not-applied messages. None lists the two errors of a
  seed made on the origin, which writes key by key through the same path as `set` (`write` → `eachKey` → `access`).
- `get`'s doc comment (`:443-462`) and `clear`'s (`:506-523`) list neither the sandboxed-document message; the API page
  says it only under `set()` ("the fourth on a sandboxed document, whose origin is opaque, as from `get`, `clear` and
  `seed` there"), and `api/errors.md` shows it for `set` only.

The messages, as probes printed them:

- On-origin `seed`, the page navigating during the write
  (`/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/clearall.spec.ts`, log
  `…/out/clearall.100123.log`, chromium, exit 0):
  `OnA.SessionStorage.seed: the page navigated while seed() was writing to http://localhost:9000; 2 of 150 keys were written (…)`.
- On-origin `seed` on a sandboxed document: the harness asserts it,
  `test/tests/testApp/sessionStorage.spec.ts:67-76` ("set, get and an on-origin seed say the document's origin is
  opaque"), `TestStorage.SessionStorage.seed: the document at http://localhost:9000/teststorage/sandboxed cannot use sessionStorage: its origin is opaque, as in a sandboxed document (Content-Security-Policy: sandbox without allow-same-origin)`;
  `.changeset/sandboxed-document-message.md` names `seed` too.
- `get` on a sandboxed document: the same spec, line 73.

## Observed / expected

Observed: the lists for `seed` read as complete ("The first seven are thrown by the `seed` call") but do not contain
`… the page navigated while seed() was writing to …` or `… the document at … cannot use sessionStorage: its origin is
opaque, …`; `get`'s and `clear`'s doc comments and API sections do not contain the latter.

Expected: each member's comment and API section lists the messages it can throw, as AGENTS.md §9 asks.

## Cause

The on-origin write path of `seed` (`SeedRegistry.add` → `writeOnOrigin`, `src/helpers/sessionStorageSeed.ts:256-262`)
reuses `set`'s machinery, and the docs describe `seed` only as the registry's.

## Fix plan

- **Intended contract**: every message a member can throw is in its doc comment, its API section, and `api/errors.md`.
- **Options**:
  1. **Add the two on-origin messages to `seed`'s lists** (doc comment, API page, `api/errors.md` *seed*, and the
     *Errors* block of *Seeding session storage*, with the count sentence updated: "the first nine are thrown by the
     call"), and the sandboxed message to `get`'s and `clear`'s doc comments and API sections. **Recommended.**
  2. Say once, in `seed`'s sections, that a seed on the origin can also fail as `set` does, with a link to `set()`.
     Shorter; less exact for a reader who searches for a message.
- **Implementation steps**: the files above; if A-1 or A-5 change these messages, write the new text.
- **Tests**: none (`scripts/check-api-coverage.mjs` checks headings and tags, not message lists).
- **Docs**: as above.
- **Changeset**: none (docs only).
- **Decisions to tick**:
  - [x] Option 1 or option 2: **option 1**, written against the final texts of A-1 and A-5 ([DECISIONS.md #36](../DECISIONS.md)).
- **Execution order**: after A-1 and A-5, which change the wording of these messages.
