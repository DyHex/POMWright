<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged. -->

# Segment 2D: Page objects, URLs and navigation (summary)

- **Scope**: the area *page objects, URLs and navigation* of the repository at `d850405` (`fix/review-3-0-2`), read in
  the worktree `/home/magdys/workspace/dyhex/POMWright-second-review`, with the commits since `v3.0.1` that touch it as a
  change set (the five after `54cdada` first: `445fc71`, `80cb5ea`, `3bf7a19`, `8c8d8fb`, `27f8d12`, and the docs
  commits `55e7149`, `a74d10e`, `429f2c2`).
- **Reviewer**: Opus 5.5, second review, segment 2D; 2026-10-28, 15:57 to 16:31 (+01:00).
- **Probes**: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/` (p01 to p13; `run1/` for the first
  review's reproductions; `sketch/` for the proposed fixes).
- **Passes**: blind (`inventory-blind.md`), the first review (`first-review.md`), reconcile (`inventory-reconciled.md`),
  hunt again; markers and every step in `log.md`.
- **Port 9000**: nothing was listening before the first harness run.

## What was read

- The method (`skills/defect-review/SKILL.md` in the worktree), `segments.md`, `baseline.md`, the brief.
- The guide: `AGENTS.md`, `src/AGENTS.md`, `src/helpers/AGENTS.md`, `src/locators/AGENTS.md`, `test/AGENTS.md`, in full.
- Source, in full with doc comments: `src/pageObject.ts`, `src/helpers/url.ts`, `navigation.ts`, `callSite.ts`,
  `thenable.ts`, `index.ts`.
- Unit tests: `src/pageObject.test.ts` in full; the test names of `url.test.ts`, `navigation.test.ts`,
  `callSite.test.ts`.
- Harness: `test/tests/pageObject/` (lifecycle, lifecycle.outcomes with `test/lifecycle-outcomes/`, urls, verify,
  actions, `callSite/`), `test/tests/testApp/` (testNav, testPath, color, urlForms, urlHosts), `testApp.base.ts`, the
  `testnav/` and `testPath/` page objects, the page object and navigation parts of `publicTypes.typecheck.ts`.
- Docs: `docs/page-objects.md`, `first-page-object.md`, `page-objects-in-tests.md`, `urls-and-navigation.md`;
  `api/class-pageobject.md`, `class-navigation.md`, `types.md` (page object part), `errors.md` (*Page objects*,
  *Navigation*); `internal/page-object-lifecycle.md`, `url-matching.md`, `call-sites.md`; the page object and URL
  sections of `docs/upgrading-from-2x.md`, `docs/organizing-a-project.md`'s base classes, *The URL types* in
  `docs/typescript.md`, the README's page object.
- The ten changesets of the area; the parts of Playwright 1.64.0 the contracts lean on (`waitForURL`, `urlMatches`,
  `constructURLBasedOnBaseURL`, `completeUserURL`, `globToRegexPattern`, `toHaveURL`'s predicate form).
- Pass 2: the first review's D folder (brief, summary, D-1 to D-5), `report.md`'s D rows, test gaps 11 and 16, §9 and
  §10, DECISIONS.md #8, #16, #17, #19, #36, #37, #60, #68, #69, the plans 16, 17, 25, 26 and their execution notes,
  the release-gates plan's items for the second review, `inventory.md`'s `[D]` lines.

## Coverage

| Inventory group | Reviewed | How |
| --- | --- | --- |
| Constructor, URL validation, messages | fully | p06 (every URL and `goto` message), p07 (where a constructor error is located), the first review's `validation.cjs` re-run on Node 20, 22, 24 (identical to `54cdada`) |
| `fullUrl` and string-path matching | fully | p02: 29 forms × chromium, firefox, webkit × Node 20, 22, 24; D-2 re-run on the same 9 cells |
| `UrlMatcher` (RegExp parts, table, `toString`, use in Playwright) | fully | p10, p13 (`route`, `waitForURL`, `toHaveURL`, a `g` flag, 3 browsers), `matcher-table.cjs` re-run |
| Credentials in a base | fully | p09: a real Basic-auth challenge on 3 browsers |
| `goto`, `expectThisPage`, `expectAnotherPage`, options | fully | p03 (failure messages: 2D-1), p05 (types: 2D-2), p08 (detached: 2D-4), p11 (overlapping calls, 3 browsers), D-3 re-run |
| Lifecycle, sticky failures, the Promise check | fully | unit tests read and run on Node 20, 22; D-5 re-run |
| The check's call site (`new.target`) | fully | p01 (a class without a constructor of its own, Node 20, 22, 24), p04 (the runner path), D-4 re-run |
| The outcomes table | fully | p04 (test body, step, fixture that navigates): 2D-3 |
| Types (`NavigationFor`, `*TypeFromOptions`) | fully | p05, D-1 re-run, `publicTypes.typecheck.ts` read |
| Internal pages' runtime claims | partly | p12 (the `RegExp` subclass rationale: 2D-5); the TS2610 and `undefined`-return rationales on *Page object lifecycle* read, not compiled |
| Session storage through a page object | partly | only that the origin passed (`new URL(baseUrl).origin`) always passes `normaliseOrigin`; behavior is 2A's |
| Step locations of the navigation methods | not | 2E's; the markers exist in `test/step-locations/` |

**Not run**: the full `pnpm pack-test` (targeted specs only); the harness at the latest Playwright 1.x; firefox and webkit
for p03 and p04 (the message and the outcomes are POMWright's composition and Playwright's runner, not browser
behavior; the 2D-1 sketch check did run on all three); a comparison against a `v3.0.1` build (the matcher's logic is
unchanged since `54cdada`, whose comparison the first review made); JavaScript values of `PageObjectOptions` beyond an
invalid `waitUntil`, empty or non-string labels, and `expectAnotherPage`'s bounce check with `waitUntil: "commit"`
(each does what the code reads as; no contract states more).

**Known issues met**: #59 (an option to treat an empty `?` or `#` as the same page): the exact-URL rule holds as
documented; no finding. #58 is 2A's.

**Excluded**: none in the area.

## Test gaps, most important first

1. A navigation wait that times out on the load state of the URL it reached (2D-1): no test; the sketch's spec would be
   one.
2. `goto(target)`'s type on a RegExp base for a relative target with a colon (2D-2): `publicTypes.typecheck.ts`
   asserts only `"/orders"`.
3. A broken page object built in the test body (2D-3): the outcomes run covers fixtures and hooks only.
4. A string `urlPath` with non-ASCII in its query or fragment, a `%` that is not an escape, or lower-case escapes:
   `urlForms.spec.ts` sweeps printable ASCII only, `testNav.spec.ts` has `/søk` in the path (p02 probed them).
5. Firefox and webkit on Node 20 and 22: CI runs chromium only there, so the `^` handling of those browsers on the older
   Node lines is covered by p02 and the first review's sweep, not by CI (decision #8 accepted it).
6. A `UrlMatcher` passed to `page.route()`: documented as a use, never tested (p13 probed it); `toHaveURL` and
   `waitForURL` are tested only for string `fullUrl`s and through `color.page.ts`.
7. A base with credentials answering a real HTTP authentication challenge: `urlHosts.spec.ts` fulfills every request
   by `page.route` (p09 probed it).
8. Overlapping navigation calls (`Promise.all` with the navigating action, two methods at once): no test (p11 probed
   them).
9. The check's call site for a class without a constructor of its own (a subclass of a concrete page object):
   `checkSite.spec.ts` covers a project base class, not this chain (p01 probed it on Node only).

## What is sound

- **String `urlPath` forms beyond ASCII**: 29 forms (non-ASCII in query and fragment, `%` not an escape, lower-case
  escapes, astral, NBSP, quotes, `|` and `^` outside the path) through `fullUrl`, `goto()`, `expectThisPage`,
  `expectAnotherPage` and `toHaveURL(fullUrl)`, 3 browsers × Node 20, 22, 24 (p02).
- **URL checks**: the first review's 27 `urlPath` forms and `baseUrl` cases give the same results at `d850405` on
  Node 20, 22, 24 (`run1/sound/validation.cjs`).
- **Messages**: every URL and `goto` message the four pages show is produced character for character (p06).
- **Credentials**: a base with credentials works through a real Basic-auth challenge on 3 browsers (p09).
- **`UrlMatcher`**: the docs' five-row table and the port note through `fullUrl.test` (p10); a `UrlMatcher` with a `g`
  flag in `page.route`, `waitForURL`, `toHaveURL` and `expectThisPage`, 3 browsers (p13).
- **Overlapping calls**: navigation methods in a `Promise.all` with the navigating click, `goto()` and
  `expectThisPage()` at once, an un-awaited `goto()`, two page objects waiting at once, 3 browsers (p11).
- **The check's call site**: the `new` line for a class without a constructor of its own on Node 20, 22, 24 (p01); the
  `new` line through the runner in a fixture, the body, a step and a fixture that navigates first (p04); with a project
  base class (D-4 re-run).
- **A constructor error** (a URL check) is located at the subclass's `super(…)` line in a fixture and in the body (p07).
- **The first review's five findings**: all fixed at `d850405` (`first-review.md`).
- **The changesets of the area**: each matches its change.
- **The contributor guide's lines for the area** (`src/AGENTS.md` *The page object* and *Files*,
  `src/helpers/AGENTS.md` *Files* and *URLs and navigation*, `test/AGENTS.md`'s harness lines): they describe the code
  and the specs at `d850405`.

## Outside the segment

None met in another segment's code. One note for the consolidation: `internal/call-sites.md` and the step-location
check are 2E's; nothing here contradicts them.

## Pass 2 outcomes

5 first-review findings: **fixed 5** (D-1, D-2, D-3, D-4, D-5; D-2's `|` part fixed differently, documented, as
decision #17 chose); still present 0; not fixed 0; fixed incompletely 0; regressed 0; cannot re-run 0. Of the three
items the first review considered and did not file, one is filed here (2D-2) and two are agreed. All ten of D's test
gaps are closed or partly closed (gap 3: Node 22 and 20 run chromium only). Every *what is sound* line still holds;
D-2's fix narrowed one (`fullUrl` now differs from the reported URL only for `|` on chromium).

## What passes 3 and 4 changed

- Pass 3 found no blind spot of pass 1 that a first-review finding would have exposed (all five are fixed and their
  paths were probed in pass 1), and one disagreement: 2D-2's classification, kept as a defect because the docs say the
  message comes only from JavaScript.
- Pass 4 probed what neither review had (p11 overlapping calls, p13 a `UrlMatcher` in `page.route`, p12 the Internal
  page's `RegExp`-subclass rationale), found 2D-5, and proposed source sketches for 2D-1 and 2D-2.

## Sketches proposed

- `sketch/2D-1.diff` + `2D-1.run.sh` (`2D-1.spec.ts`): `waitForUrl` says the load state was late when the URL found is
  the one waited for and Playwright timed out. At `d850405`: exit 1 (6 failed, 3 passed, 3 browsers).
- `sketch/2D-2.diff` + `2D-2.run.sh` (`2D-2.typecheck.ts`, `2D-2.type-alone.ts`): `AbsoluteUrl` starts with a letter.
  At `d850405`: exit 2 (four unused directives).

## Findings

| ID | Kind | Severity | Semver | Pass | First review | One line |
| --- | --- | --- | --- | --- | --- | --- |
| [2D-1](defect-2D-1-load-state-timeout-message.md) | defect | Low | patch | 1 | missed | On the right URL with a late load state, `expectThisPage()` fails with "expected URL X; found X" (and `expectAnotherPage()` with "expected to have left X; found Y") |
| [2D-2](defect-2D-2-absolute-url-type.md) | defect | Low | patch | 1 | considered, not filed | On a RegExp `baseUrl`, `goto(target)` compiles for a relative target with a colon, which the runtime always rejects, while the docs say that message comes only from JavaScript |
| [2D-3](defect-2D-3-outcomes-table-test-body.md) | documentation | Low | none | 1 | missed | The outcomes table on *Page objects* has no row for the test body, where the docs' first example builds the page object, and where the body runs on past the failure |
| [2D-4](defect-2D-4-detached-navigation-methods.md) | design question | Low | patch if adopted | 1 | missed | The navigation helper's methods fail with an internal `TypeError` when called detached, while `goto` is typed as a property |
| [2D-5](defect-2D-5-regexp-subclass-rationale.md) | documentation | Low | none | 4 | missed | *Internal → URL matching* says Playwright never runs a `RegExp` subclass's own matching; `page.waitForURL` does |
