# Segment 2D: inventory, reconciled

The union of this review's blind map (`inventory-blind.md`, pass 1) and the first review's lines for this area
(`defect-review-result/inventory.md`, the lines tagged `[D]`, and D's coverage table in its `summary.md`). Each line is
marked **both**, **blind only** or **first only**, with how deeply each review probed it: *first* at `54cdada`
(2026-10-23), *second* at `d850405` (pass 1 probes p01 to p10, pass 2 re-runs in `run1/`, pass 4 probes p11 on). "Read"
means source, docs and tests compared, without a probe of that review's own.

## Public surface and construction

| Line | Mark | First review | Second review |
| --- | --- | --- | --- |
| `PageObject` constructor `(page, baseUrl, urlPath, options?)`; URL parts validated at construction | both | probed: `validation.cjs` (27 `urlPath` forms, the `baseUrl` rejections) on Node 20, 22, 24 and against v3.0.1 | probed: p06 (messages, character for character), p07 (where the report locates a constructor error), `validation.cjs` re-run identical on 3 Node lines |
| `PageObjectOptions` (`label`, `navOptions`, `sessionStorage`, `locators`) | both | read | read; JavaScript values the types reject were not probed beyond p03's `waitUntil` (decided in pass 4: no contract says POMWright validates them; `navOptions` reach Playwright, which checks `waitUntil` itself) |
| `PageObjectTypeOptions` and the four `*TypeFromOptions` against the runtime | both | probed: `zz-probe-D-types.typecheck.ts`, all four string/RegExp combinations | read; `publicTypes.typecheck.ts`; D-1's probe re-run |
| A generic project base class forwarding `PageObjectOptions` and `UrlPathTypeFromOptions` (*Organizing a project*) | both | read (the base-class section) | read; covered by `publicTypes.typecheck.ts` (*GenericShop*) |
| Session storage through a page object (the `sessionStorage` option and property) [A, D] | both | partly: every accepted base form constructs its `SessionStorage` origin | read: the origin passed is `new URL(baseUrl).origin`, always accepted by `normaliseOrigin`; behavior is 2A's |
| `page`, `label`, `baseUrl`, `urlPath`, `locatorRegistry` and the four accessors | both | read | read; the accessors detached: bound (p08) |

## URLs

| Line | Mark | First review | Second review |
| --- | --- | --- | --- |
| `fullUrl`: a string for two strings (`^` as `%5E` since `3bf7a19`), a `UrlMatcher` otherwise | both | probed: sweep, `fullurl/` (D-2) | probed: p02 (29 forms × 3 browsers × 3 Node lines), D-2 re-run on 9 cells |
| URL comparison as Playwright's: exact rest of the URL, empty `?`/`#`, `\|`/`%7C`, `^`/`%5E` | both | probed: every printable ASCII character (`#?/%\` included), 13 non-ASCII, 15 percent-encoded, path, query, fragment, 9 cells | probed: p02 (non-ASCII in query and fragment, `%` that is not an escape, lower-case escapes, astral, NBSP, quotes in the fragment); the ASCII sweep through `urlForms.spec.ts` only |
| String `baseUrl` host forms (case, ports, IDN, IPv6, IPv4 forms, credentials) | both | probed: `zz-probe-D-hosts.spec.ts`, 9 cells | read: `urlHosts.spec.ts` (from the first review's probe), green in the baseline |
| A base with credentials: accepted and works; credentials in every URL shown; `toHaveURL(fullUrl)` never matches | both | partly: `page.url()` keeps them on route-fulfilled pages; no real HTTP auth | probed: p09, a Basic-auth server, the browser answers the challenge, 3 browsers |
| `UrlMatcher`: base against the origin, path against the rest, flags as written, `lastIndex` reset; `test`, `toString`, `base`, `path` | both | probed: `matcher-table.cjs`, `matcher-compare.cjs` against v3.0.1, `g`/`y` across `test`, `expectThisPage` and `toHaveURL` on 3 browsers | probed: p10 (the docs' table through `fullUrl.test`); `matcher-table.cjs` re-run; matcher logic unchanged since `54cdada` (diff) |
| `UrlMatcher.test()` with a relative string throws `TypeError` | first only | observation | re-run in pass 2 (`run1/sound/`); agreed, not filed |
| The matcher keeps the caller's RegExp objects | first only | observation | agreed, not filed |
| A `UrlMatcher` where Playwright takes a URL predicate: `page.route`, `waitForURL`, `toHaveURL` | blind only (pass 4) | — (its `g`/`y` probe used `toHaveURL`) | probed: p13, a `g`-flagged path, two pages, 3 browsers; `page.route` had no test or probe before |
| *Internal → URL matching*'s rationale for a `UrlMatcher` over a `RegExp` subclass | blind only (pass 4) | — | probed: p12, which Playwright calls run a subclass's own `test()`: 2D-5 |
| `ws:`, `wss:`, `ftp:` origins and forms that normalize (`https:shop.example`, `/.`, a trailing `\` or tab, spaces) accepted as `baseUrl` | first only | probed (observation) | read: `isOrigin` accepts any scheme with a URL origin; each resolves to a valid origin |
| `page.url()` always equals `new URL(page.url()).href` | first only | probed | not re-probed; the predicate Playwright passes is `new URL(page.url())` (Playwright 1.64 `urlMatches`, read) |
| Regression of the URL checks and the matcher against v3.0.1 | first only | probed: two Node scripts against a v3.0.1 build | not run against v3.0.1; the 54cdada outputs re-run identical, and the code since differs as D-2's fix intends |

## Navigation

| Line | Mark | First review | Second review |
| --- | --- | --- | --- |
| `goto()` / `goto(options)` / `goto(target, options?)`: resolution as Playwright's, a URL object and other non-options rejected | both | probed: `goto-throws.cjs`, nav probe | probed: p05, p06; Playwright 1.64's `constructURLBasedOnBaseURL` and `completeUserURL` read; D-3 re-run |
| `goto(target)`'s type on a RegExp base (`${string}:${string}`) | both | observation (a relative target with a colon compiles) | probed: p05, filed as 2D-2 |
| `expectThisPage` / `expectAnotherPage`: one `waitForURL`, exact opposites, the bounce check | both | probed: 4 × 4 empty-`?`/`#` matrix on 3 browsers | read; harness |
| What a navigation wait reports when it fails | both | probed for a wrong URL (D-3's lists) | probed: p03, the right URL with a late load state: 2D-1 |
| Options from the call, then `navOptions`, then Playwright; no POMWright default | both | probed: defaults probe on 3 browsers | read; harness (`testNav.spec.ts`, added by decision #60) |
| Step titles and the step locations of the three methods [E, A, D] | both | probed: titles and locations from a test and a method | titles re-run (D-3); locations are 2E's |
| The methods called detached from the helper | blind only | — | probed: p08, design question 2D-4 |
| Overlapping and un-awaited navigation calls (`Promise.all` with the action that navigates) | blind only (pass 4) | — | probed in pass 4 (p11) |
| The post-navigation actions: per run, in order, inside the step, a rejecting one | both | probed: nav probe test E, `hooktypes/` (a hook as a property, an async hook a compile error) | read; harness (`actions.spec.ts`) |

## Lifecycle and call sites

| Line | Mark | First review | Second review |
| --- | --- | --- | --- |
| `defineLocators()` and `verify()` once, at the scheduled check or the first locator call; the facade; sticky labeled failures | both | probed: table, worker, base-class and async probes; unit and harness tests read | read; unit tests run on Node 20 and 22 |
| A Promise from `defineLocators()` (D-5, `80cb5ea`) | both | probed (D-5) | D-5 re-run: fixed |
| The check's call site, cut at `new.target` (`445fc71`) | both | probed: the base-class case (D-4) | probed: p01 (a class without a constructor of its own, Node 20, 22, 24), p04 (the runner path), D-4 re-run |
| The outcomes table on *Page objects* | both | probed: its rows on chromium | probed: p04, a page object built in the test body, a `test.step` and a fixture that navigates first: 2D-3 |
| Where the report locates an error the constructor throws (a URL check) | blind only | — | probed: p07, the subclass's `super(…)` line |
| A subclass constructor that throws after `super(…)` (documented second error) | both | probed | read; unit and harness tests |

## Messages, docs, tests, change set

| Line | Mark | First review | Second review |
| --- | --- | --- | --- |
| `errors.md` *Page objects* and *Navigation*, the API pages' **Throws**, the `@throws` | both | probed: probe output compared with the pages | probed: p06 (every URL and `goto` message) |
| The docs pages of the area, *Upgrading from 2.x*'s sections, *The URL types*, the README's page object | both | read | read |
| Unit tests of the area | both | read (names) | read; run on Node 20 and 22 |
| Harness specs of the area | both | read | read |
| The changesets of the area | both | read (12 commits to `54cdada`) | read (all 10 of the area, including the 5 after `54cdada`) |
| The commits after `54cdada` | blind only (the first review predates them) | — | read and probed (p01, p02, p04, p05, p06, p08, p09); D's five reproductions re-run |
| Known issues #58 (storage schema once, 2A's), #59 (an option for an empty `?`/`#`) | both | listed | listed; #59 matches the decided exact-URL rule |
| The contributor guide's lines for this area (`src/AGENTS.md` *The page object*, `src/helpers/AGENTS.md` *URLs and navigation*, `test/AGENTS.md`'s harness lines) | both | §4, §5, §8 of the old AGENTS.md | read against the code and the specs: they describe them (pass 4) |

## What the reconciliation shows

- **Blind spots of this pass**: none of the first review's five findings would have gone unseen here in the sense that
  matters (all are fixed at `d850405`, and pass 1 probed the fixed paths: p01, p02, p05, p06). The first review's
  deeper ASCII sweep (`#?/%\`) and its v3.0.1 comparison are not repeated; pass 1 relied on the harness for the first.
- **Found here, not by the first review**: 2D-1 (missed: present at `54cdada`), 2D-3 (missed: the table has had the
  same rows since v3.0.1), 2D-4 (missed; its type side is new with `8c8d8fb`, D-1's fix). 2D-2 was met and not filed.
- **Disagreement**: 2D-2's classification (the first review: no broken contract; here: a type that contradicts the
  docs' "from JavaScript"). Pass 4 re-reads the pages that make the promise.
- **Neither probed deeply**: overlapping and un-awaited navigation calls (pass 4: p11, sound); a `UrlMatcher` in
  `page.route` (pass 4: p13, sound); the Internal pages' runtime claims (pass 4: p12, 2D-5). Left unprobed, with the
  reason in `summary.md`: JavaScript values for the options, the `label` option's edge values, and `expectAnotherPage`'s
  bounce check with `waitUntil: "commit"` (one `waitForURL` and then one check, as documented).
