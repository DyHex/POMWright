# Scope D: Page objects, URLs and navigation (summary)

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").

- **Scope**: the area *page objects, URLs and navigation* of the whole repository at `54cdada` (`fix/review-3-0-2`), reviewed in the worktree `/home/magdys/workspace/dyhex/POMWright-final-review`. The in-scope commits since `v3.0.1` were also reviewed as a change set: `54cdada`, `0028097`, `8ccfbd4`, `e579f56`, `6fc3c68`, `24fd838`, `fa424ad`, `d710c12`, `c75ab43`, `2accf34`, `adffd1e`, `c9c8f34`.
- **Reviewer**: Claude (Opus 5.5), 2026-10-23.
- **Probes and notes**: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/`, with outputs in `out/`.
- **Read in full**:
  - Source: `src/pageObject.ts`, `src/helpers/url.ts`, `src/helpers/navigation.ts`, `src/helpers/callSite.ts`.
  - Unit tests: `src/pageObject.test.ts` (names and failure section), `src/helpers/url.test.ts` (names), `src/helpers/navigation.test.ts`.
  - Harness: `test/tests/pageObject/{actions,lifecycle,urls}.spec.ts`, `callSite/`, `testApp/{testNav,urlForms,testPath,color}.spec.ts`, `testApp.base.ts`, the `testnav` and `color` page objects, and the `/testpath` and `/testnav` routes.
  - Docs: `docs/{page-objects,first-page-object,page-objects-in-tests,urls-and-navigation,organising-a-project (base-class section)}.md`, *The URL types* in `docs/typescript.md`, `api/class-pageobject.md`, `api/class-navigation.md`, the in-scope sections of `api/types.md` and `api/errors.md`, `internal/{page-object-lifecycle,url-matching,call-sites}.md`, and the *Page objects* and *URLs and navigation* sections of `docs/upgrading-from-2x.md`.
  - AGENTS.md: §2 to §5 and §8, as far as they concern this area.
  - The diffs and changesets of the commits above.

## Decisions taken without asking

1. **D-4 is a documentation finding, not a defect.** AGENTS.md §5 ("the construction site in the stack") and the user-facing pages hold. Only the internal lifecycle page's "the report points at the line that created the page object" is wrong. The finding offers moving the boundary to `new.target` as a patch option, with a source sketch that works.
2. **The glob reading of a string `fullUrl` in `waitForURL` is folded into D-2's docs part.** It is Playwright's documented semantics, not a separate POMWright defect.
3. **Four small inaccuracies in the navigation docs are one finding (D-3).**
4. **Regression check against v3.0.1 used two Node scripts, not the harness.** One compares constructor validation, the other compares `UrlMatcher.test` over 34 page objects × 19 URLs. Only the intended changes differ. Every finding also predates these commits, so the harness was not installed in the v3.0.1 worktree.
5. **The stale AGENTS.md §4 line is reported below for scope H**, not as a finding file.
6. **summary.md went into the final message** because the Write tool refused it.

## Coverage

| Inventory line | Reviewed | How |
| --- | --- | --- |
| Constructor and URL validation (`assertBaseUrl`, `assertUrlPart`, `assertUrlPath`) | fully | `validation.cjs` on Node 20, 22 and 24, and against v3.0.1 |
| Lifecycle (scheduled check, first call, sticky labelled failures, construction site) | fully | unit and harness tests read; table, worker, base-class and async probes |
| Actions hook, `runPostNavigationActions` | fully | nav probe test E, `hooktypes/` |
| `fullUrl`, `UrlMatcher` (`test`, `toString`, `base`, `path`) | fully | sweep, `matcher-table.cjs`, `matcher-compare.cjs`, `fullurl/` |
| URL comparison (`\|`, `^`, empty `?`/`#`, normalisation) | fully | chromium, firefox and webkit × Node 20, 22 and 24 |
| `goto`, `expectThisPage`, `expectAnotherPage`, options and defaults | fully | nav, defaults, `goto-throws`, steps probes |
| Credentials in a base (`8ccfbd4`) | partly | the browsers keep credentials in `page.url()` for route-fulfilled pages; no real HTTP-auth flow was run |
| Types (`PageObject` generics, `*TypeFromOptions`, `NavigationFor`) | fully | `zz-probe-D-types.typecheck.ts`, `navfor/` |
| `errors.md` *Page objects* and *Navigation* | fully | probe output compared with the pages |
| Session storage through a page object [A, D] | partly | only that every accepted base form constructs its `SessionStorage` origin; storage behaviour is scope A |
| Step locations of the navigation helper [E, A, D] | fully, navigation part | `steps/zz-probe-D-steploc.spec.ts` |

**Not run:**
- The harness at the latest Playwright 1.x.
- The full `pnpm pack-test`; targeted specs were run instead.
- The lifecycle and navigation probes on firefox and webkit, and the navigation probe on Node 22. Lifecycle behaviour does not depend on the browser, and the URL probes did run on all nine browser and Node cells.
- A real HTTP-auth server for credentials.

## Test gaps (most important first)

1. No test passes a string `fullUrl` containing `|` or `^` to `toHaveURL` (D-2). `urlForms.spec.ts` checks only `expectThisPage` and `expectAnotherPage`.
2. No type test checks that a RegExp page's `navigation` is rejected where a `NavigationFor<string, string>` is expected (D-1). `navigation.test.ts` checks direct calls only.
3. Node 22 never runs the harness, and Node 20 runs only chromium in CI (`harness-node-floor`). The Node-dependent `^` handling on firefox and webkit is covered only by the unit logic and this review's sweep.
4. No call-site test uses a consumer base class (D-4). The harness's own `testApp.base.ts` would show the base line.
5. No test covers an `async defineLocators()` (D-5).
6. No test covers an action that rejects. The probe showed the error propagates and later actions do not run.
7. The *How a mistake is reported* table's `beforeAll` rows (serial and not) and its worker-scoped fixture row are untested. `lifecycle.spec.ts` covers only test-scoped fixtures and `beforeEach`. Probes confirmed all rows on chromium.
8. The project's `navigationTimeout` as the fallback timeout is untested; only `navOptions` and per-call timeouts are. A probe confirmed it.
9. `test/step-locations` covers only `goto`. A probe confirmed `expectThisPage` and `expectAnotherPage` report the caller's line.
10. Host forms (IDN, IPv6, default ports, credentials, upper case) are never checked in a browser by the harness; the unit tests cover only `new URL`. A probe confirmed them.

## What is sound

- **String `urlPath` matching.** Every printable ASCII character (`#?/%\` included), 13 non-ASCII samples and 15 percent-encoded forms, in the path, query and fragment, navigated raw and by `goto()`, matches in `expectThisPage` on all 3 browsers × 3 Node versions (`zz-probe-D-sweep.spec.ts`, `out/sweep-*.json`).
  - `fullUrl` differs from the reported URL only for `|` (chromium) and `^` (Node 20 and 22), and the matcher handles both. The known list in `urlForms.spec.ts` is still complete.
  - `page.url()` always equals `new URL(page.url()).href`.
- **String `baseUrl` host forms** match the browser on all 3 × 3 cells (`zz-probe-D-hosts.spec.ts`). Forms checked: upper case, default ports (and `:00443`), IDN (Unicode, upper case, punycode, Cyrillic, `faß`, full-width), a trailing dot, IPv6 (short, expanded, v4-mapped), IPv4 short, hex and decimal forms, credentials, a trailing slash, surrounding spaces, a tab.
- **Validation.** None of 27 `urlPath` forms leaves the origin: `//`, `/\`, tab, CR or LF followed by `/` or `\`, `%2F`, `%5C`, `/..//host`, NUL. The `baseUrl` checks reject a bare `?` or `#`, paths, schemes without a URL origin and bad ports. Results are identical on Node 20, 22 and 24, and differ from v3.0.1 only as `c9c8f34` and `0028097` intend.
- **`UrlMatcher` against v3.0.1** differs only as `c75ab43` and `d710c12` intend.
- **RegExp `g` and `y` flags** give stable results across repeated `test()`, `expectThisPage` and `toHaveURL` calls on 3 browsers. The docs' five-row table, the note that `$` includes the port, and the `toString` example are exact.
- **Empty `?` and `#`.** `expectThisPage` and `expectAnotherPage` are exact opposites over a 4 × 4 matrix on 3 browsers.
- **No POMWright default.** With no option given, the project's `navigationTimeout` bounds `expectThisPage` and `goto()` on 3 browsers.
- **`goto()` arguments.** A URL object, `null` and a number throw the documented message before any navigation.
- **Navigation steps.** All four step titles and their locations are right, from a test, from a page object method, and when the step throws.
- **Actions hook.** It is called per run. A hook defined as a property compiles and works. A rejecting action rejects with its own error and stops later actions. An async hook and a list of promises are compile errors.
- **Lifecycle table.** Test-scoped and worker-scoped fixtures, `beforeEach`, `beforeAll` and serial `beforeAll` all behave as the page says (chromium).
- **Types.** `fullUrl`, `baseUrl`, `urlPath` and the `*TypeFromOptions` helpers follow the runtime for all four string/RegExp combinations, apart from D-1.
- **`errors.md` *Page objects → URLs*** matches the throw sites character for character.

## Outside the scope

- **Defects in other scopes' code:** none met.
- **For scope H (AGENTS.md lines of this area):** §4 says `testApp/urlForms.spec.ts` lists "the one known difference (Chromium's `|` in a path)". Since `54cdada` it also lists `^` in the path on Node 20 and 22 for every browser, and the sweep skips `# ? / % \`.
- **For the consolidation:** D-4 applies to the harness's own page objects, through `testApp.base.ts`.

**Observations, not findings:**
- The type of a RegExp base's `goto(target)`, `${string}:${string}`, admits a relative URL with a colon (`"/search?at=10:30"`). The runtime then throws the documented "needs an absolute URL".
- `ws:`, `wss:` and `ftp:` origins, and forms that normalise (`https:shop.example`, `https://shop.example/.`, a trailing `\` or tab, surrounding spaces), are accepted as `baseUrl`, as the parse-then-check rule says. Each resolves to a valid origin.
- `UrlMatcher.test()` with a relative string throws `TypeError: Invalid URL`.
- The matcher keeps the caller's RegExp objects and leaves their `lastIndex` set after a test (it is reset before each test). AGENTS.md §5's copy rule covers locators, not URL parts.

## Findings index

| ID | Kind | Severity | Semver | Summary |
| --- | --- | --- | --- | --- |
| [D-1](defect-D-1-navigationfor-accepts-regexp-helper.md) | defect | Low | patch | A RegExp page object's `navigation` compiles as `NavigationFor<string, string>`, so `goto()` without a target type-checks and throws at runtime |
| [D-2](defect-D-2-fullurl-not-browser-form.md) | defect | Low | patch for `^`, none for the pipe docs | A string `fullUrl` with `^` (Node 20 and 22) or a pipe (Chromium) is not the URL the browser reports, so the documented `toHaveURL(fullUrl)` fails where `expectThisPage()` passes |
| [D-3](defect-D-3-navigation-messages-docs.md) | documentation | Low | none | `errors.md` lacks `goto()`'s URL-object message; `goto()`'s Throws lack `Cannot resolve …`; `toString()` is said to appear in step titles; `runPostNavigationActions` is given a `navOptions` default |
| [D-4](defect-D-4-check-points-at-base-super.md) | documentation | Low | none (patch if the boundary moves) | A failed check points the report at the first `super(...)` of the class chain (with a site base class, the same base line for every page object), not "the line that created the page object" |
| [D-5](defect-D-5-async-definelocators.md) | defect | Low | patch | An `async defineLocators()` compiles; the page object then verifies a half-finished definition, giving misleading verification failures or an unlabelled error that is not kept |
