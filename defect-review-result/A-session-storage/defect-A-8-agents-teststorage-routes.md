# A-8: AGENTS.md's list of the `/teststorage` fixture routes leaves out `/teststorage/sandboxed` and `/teststorage/shadowed-navigation`

- **Kind**: documentation
- **Area**: The contributor guide (inventory §10), the session storage fixture of `test/server.js` (inventory §9)
- **Severity**: Low (a contributor's map that is incomplete; no behaviour)
- **Semver of the fix**: none (AGENTS.md only)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer A (Claude Opus 5.5)
- **Status**: decided (2026-10-27, [DECISIONS.md #47](../DECISIONS.md))
- **Merged with**: H-5 (see report.md)

## Contract

AGENTS.md §4 lists the routes of the harness server, for the session storage fixture: "`/teststorage` (GET and POST,
urlencoded, multipart or `text/plain`, with `/teststorage/frame` (…), `/redirect`, `/chain`, `/login`, `/login307`,
`/login308`, `/api`, `/race` …, `/bounce`, `/204`, `/download`, `/sw.js` and `/sw-passthrough.js`: …". The guide's own
header says it describes the repository as of the 3.0.2 fixes, and inventory §10 asks each scope to report a line of its
area that is wrong.

## Reproduction

```sh
# from the worktree root
grep -oE 'app\.(get|post|use)\("/teststorage[^"]*"' test/server.js | sort -u
```

Exit code 0. Output includes `app.get("/teststorage/sandboxed"` (added by `17426a5`, used by
`test/tests/testApp/sessionStorage.spec.ts:69`) and `app.get("/teststorage/shadowed-navigation"` (added by `bfbc00f`,
used at `:1173`), neither of which AGENTS.md §4 names.

## Observed / expected

Observed: two routes of the fixture, each the subject of a spec, are missing from the list. Expected: the list names
them, for example "…, `/sandboxed` (served with `Content-Security-Policy: sandbox`), `/shadowed-navigation` (an app that
declares its own global `navigation`), …".

## Cause

The two 3.0.2 commits added the routes and their specs without touching AGENTS.md §4.

## Fix plan

- **Intended contract**: AGENTS.md §4 lists every fixture route.
- **Options**: 1. add the two routes to the sentence. **Recommended.**
- **Implementation steps**: AGENTS.md §4.
- **Tests**: none.
- **Docs**: AGENTS.md only.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] Add the two routes
- **Execution order**: with scope H's AGENTS.md findings.

Decided in [DECISIONS.md #47](../DECISIONS.md): both routes added to AGENTS.md §4, with any route this branch adds.
