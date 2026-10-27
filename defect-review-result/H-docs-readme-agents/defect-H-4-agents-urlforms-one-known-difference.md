# H-4: AGENTS.md §4, *Tests and checks* and *URL matching* still say the URL sweep has one known difference (Chromium's `|`); since `54cdada` it also lists `^` on Node 20 and 22, for every browser

- **Kind**: documentation
- **Area**: AGENTS.md §4 (inventory §10); one body: `internal/tests-and-checks.md`, `internal/url-matching.md`
- **Severity**: Low (a contributor-facing statement; it could make a contributor treat the `^` entries as unexpected, or
  remove them, on Node 20 or 22. *URL matching* contradicts itself in one sentence)
- **Semver of the fix**: none (AGENTS.md and site only)
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided: fix, with D-2 (2026-10-26, [DECISIONS.md #17](../DECISIONS.md))

## Contract

AGENTS.md describes the repository as it is; AGENTS.md §9: "A change to a message, a rendering or a mechanism greps
`website/` for the old text and updates the pages with it"; one home per fact.

## Reproduction

The spec, `test/tests/testApp/urlForms.spec.ts`, lines 12–19 at `54cdada`:

```ts
const KNOWN: Record<string, string[]> = { chromium: ['"|" in the path: /testpath/a%7Cb'], firefox: [], webkit: [] };
// Node 20 and 22 (ada 2) keep a "^" in a path, which every browser and Node 24 (ada 4) write as "%5E"
const caretKept = new URL("/a^b", BASE).pathname === "/a^b";
if (caretKept) {
	KNOWN.chromium?.unshift('"^" in the path: /testpath/a%5Eb');
	KNOWN.firefox?.push('"^" in the path: /testpath/a%5Eb');
	KNOWN.webkit?.push('"^" in the path: /testpath/a%5Eb');
}
```

The three statements (`grep -n "one known difference" AGENTS.md website/src/content/docs/internal/*.md`;
`sed -n 54,56p website/src/content/docs/internal/url-matching.md`):

- AGENTS.md §4, line 155: "`testApp/urlForms.spec.ts` sweeps the printable ASCII characters through the URL each
  browser reports, with the one known difference (Chromium's `|` in a path) listed."
- `internal/tests-and-checks.md`, lines 24–26: "sweeps every printable ASCII character through the URL each browser
  reports, with the one known difference listed".
- `internal/url-matching.md`, line 54: "The browsers agree with `new URL` on every printable ASCII character in the
  path, the query and the fragment but one: Chromium reports a `|` in the path as `%7C`, and every browser reports a
  `^` in the path as `%5E`, which `new URL` writes too on Node 24 … but keeps on Node 20 and 22." ("but one", then
  two.)

`54cdada` changed the spec, `url-matching.md` (one hunk) and, in AGENTS.md, only the §5 URL rule
(`git show 54cdada --stat`; `git show 54cdada -- AGENTS.md`).

## Observed / expected

Observed: three places say "one" difference; the spec has two kinds, the second (`^`, all three browsers) on Node 20
and 22, which CI's `harness-node-floor` job runs.

Expected, for example:

- AGENTS.md §4: "with the known differences listed: Chromium's `|` in a path, and, on Node 20 and 22, whose
  `new URL` keeps a `^`, every browser's `%5E`."
- *Tests and checks*: "with the known differences listed".
- *URL matching*: "… on every printable ASCII character in the path, the query and the fragment but two: …", or "except
  in the path:".

## Cause

`54cdada` added the `^` entry and updated the explanation in *URL matching* without its first clause, and did not
reach the two sentences that summarise the sweep.

## Fix plan

- **Intended contract**: unchanged.
- **Options**: (recommended) the three rewrites above. No alternative.
- **Implementation steps**: AGENTS.md §4 (line 155); `website/src/content/docs/internal/tests-and-checks.md` (lines
  24–26); `website/src/content/docs/internal/url-matching.md` (line 54).
- **Tests**: none.
- **Docs**: as above.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] update the three sentences, as above; AGENTS.md §4 also says the sweep skips `# ? / % \` (the characters
    that end or escape a part, scope D's note).
- **Execution order**: with the other AGENTS.md findings (H-5).
