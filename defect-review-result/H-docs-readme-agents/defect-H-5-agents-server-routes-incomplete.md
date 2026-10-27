# H-5: AGENTS.md §4's list of the session storage fixture's routes leaves out `/teststorage/sandboxed` and `/teststorage/shadowed-navigation`, added in 3.0.2

- **Kind**: documentation
- **Area**: AGENTS.md §4, `test/server.js` (inventory §10)
- **Severity**: Low (a contributor-facing list; it reads as complete, and a contributor looking for a sandboxed or a
  shadowed-`navigation` fixture would not find them there)
- **Semver of the fix**: none (AGENTS.md only)
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided (2026-10-27, [DECISIONS.md #47](../DECISIONS.md))
- **Merged with**: A-8 (see report.md)

## Contract

AGENTS.md describes the repository as it is. §4, lines 132–141 at `54cdada`, lists the server's routes, and for the
session storage fixture: "`/teststorage` (GET and POST, …, with `/teststorage/frame` (…), `/redirect`, `/chain`,
`/login`, `/login307`, `/login308`, `/api`, `/race` (…), `/bounce`, `/204`, `/download`, `/sw.js` and
`/sw-passthrough.js`: the session storage fixture, …)". §4 also says: "New fixture pages go in as new routes".

## Reproduction

```sh
grep -nE "app\.(get|post)\(\"/teststorage" test/server.js
```

prints, besides the routes AGENTS.md names:

```text
474:app.get("/teststorage/sandboxed", (_req, res) => {
485:app.get("/teststorage/shadowed-navigation", (_req, res) => {
```

`git log --format='%h %s' v3.0.1..54cdada -- test/server.js`:

```text
17426a5 fix: a sandboxed document's refusal of sessionStorage is explained
bfbc00f fix: the Navigation API check tests the interface, not the global
```

Both routes are used by `test/tests/testApp/sessionStorage.spec.ts` (lines 69 and 1173). Neither name appears in
AGENTS.md (`grep -c "sandboxed\|shadowed" AGENTS.md` prints `0`).

## Observed / expected

Observed: the list stops at the routes that existed before 3.0.2's session storage fixes.

Expected: the list names `/sandboxed` (a document sandboxed by its Content-Security-Policy, on the origin by URL with
an opaque origin) and `/shadowed-navigation` (an app whose global `navigation` shadows `window.navigation`).

## Cause

`f7e3776` (AGENTS.md after the 3.0.2 session storage fixes) did not add the two routes.

## Fix plan

- **Intended contract**: unchanged.
- **Options**: (recommended) add the two routes to the §4 list, with a few words each, as the other routes have.
- **Implementation steps**: AGENTS.md §4.
- **Tests**: none.
- **Docs**: AGENTS.md only.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] add the two routes
- **Execution order**: with H-4.

Decided in [DECISIONS.md #47](../DECISIONS.md): both routes added to AGENTS.md §4, with any route this branch adds.
