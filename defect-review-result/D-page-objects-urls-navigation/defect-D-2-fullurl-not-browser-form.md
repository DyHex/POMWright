# D-2: A string `fullUrl` with `^` (Node 20 and 22, every browser) or `|` (Chromium) is not the URL the browser reports, so the documented `toHaveURL(fullUrl)` fails where `expectThisPage()` passes

- **Kind**: defect
- **Area**: `fullUrl` for two strings; the `^` fix (`54cdada`) and the `|` fix (`d710c12`) as a change set
- **Severity**: Low (two characters, one browser or the two older Node versions; the navigation helper itself works, the
  documented assertion with `fullUrl` does not)
- **Semver of the fix**: patch for `^` (`fullUrl` brought in line with "the form the browser reports", which the doc
  comment and three pages promise); none for `|` (docs only, since no single string is right on every browser)
- **Reviewed**: `54cdada`, 2026-10-23, Claude (scope D)
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #17](../DECISIONS.md)); H-4 decided with it

## Contract

- `src/pageObject.ts:162-170`, doc comment of `fullUrl`: "For a string `baseUrl` and `urlPath` it is
  `new URL(urlPath, baseUrl).href`, the form the browser reports … @example `await expect(page).toHaveURL(loginPage.fullUrl);`".
- `website/src/content/docs/api/class-pageobject.md`, *fullUrl*, **Usage**: `await expect(page).toHaveURL(loginPage.fullUrl);`.
- `website/src/content/docs/docs/urls-and-navigation.md`, *fullUrl*: "For two strings, `fullUrl` is
  `new URL(urlPath, baseUrl).href`, the URL in the form the browser reports it", then: "A string `urlPath` with `|` or
  `^` matches both forms, so its page object works the same on every browser and Node version."
- `website/src/content/docs/internal/url-matching.md`, *`fullUrl`*: "the form the browser reports";
  `docs/upgrading-from-2x.md`, *URLs are checked when a page object is constructed*: "`fullUrl` is
  `new URL(urlPath, baseUrl).href`, the form the browser reports … A test that compares `fullUrl` with a literal
  follows."
- The changesets `.changeset/caret-in-url-path.md` and `pipe-in-url-path.md` promise that such a page object "matches
  the page"; the fixes changed only the matcher (`comparable` in `src/helpers/url.ts:163-167`), not the sibling path a
  user takes with the same value, `fullUrl` handed to Playwright.

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/fullurl/zz-probe-D-fullurl.spec.ts`:

```ts
class SearchPage extends PageObject<"body"> {
	constructor(page: Page, urlPath: string) {
		super(page, "http://localhost:9000", urlPath, { label: "SearchPage" });
	}
	protected defineLocators() {
		this.add("body").locator("body");
	}
}
for (const urlPath of ["/filter/a|b", "/filter/a^b"]) {
	test(`${urlPath}: expectThisPage and toHaveURL(fullUrl)`, async ({ page }) => {
		await page.route("**/*", (route) => route.fulfill({ contentType: "text/html", body: "<p>x</p>" }));
		const searchPage = new SearchPage(page, urlPath);
		await searchPage.navigation.goto();
		console.log(`node ${process.version} fullUrl ${searchPage.fullUrl} reported ${page.url()}`);
		await searchPage.navigation.expectThisPage({ timeout: 1_000 });
		await expect(page).toHaveURL(searchPage.fullUrl, { timeout: 1_000 });
	});
}
```

From the worktree root, once per Node version (Node 20 at `/home/magdys/.nvm/versions/node/v20.20.2/bin`, Node 22 at
`v22.18.0`, Node 24 by default):

```sh
cp ../POMWright-final-review-probes/D/fullurl/zz-probe-D-fullurl.spec.ts test/tests/
PATH=/home/magdys/.nvm/versions/node/v20.20.2/bin:$PATH pnpm -C test exec playwright test tests/zz-probe-D-fullurl.spec.ts --reporter=line --workers=1
rm test/tests/zz-probe-D-fullurl.spec.ts
```

Exit code 1 on every Node version. The wider probe `../POMWright-final-review-probes/D/zz-probe-D-nav.spec.ts` (test A)
shows `page.waitForURL(fullUrl)` failing in the same cells; its output is in `out/nav-*.json`.

## Observed / expected

Node 24: 1 failed, 5 passed (`/filter/a|b` on chromium). Node 22 and Node 20: 4 failed, 2 passed (`/filter/a|b` on
chromium, `/filter/a^b` on chromium, firefox and webkit). In every failing test `expectThisPage()` passed and
`toHaveURL` failed:

```text
node v20.20.2 fullUrl http://localhost:9000/filter/a^b reported http://localhost:9000/filter/a%5Eb
node v20.20.2 fullUrl http://localhost:9000/filter/a|b reported http://localhost:9000/filter/a%7Cb
    Error: expect(page).toHaveURL(expected) failed
```

| | chromium | firefox | webkit |
| --- | --- | --- | --- |
| the pipe, any Node | fails | passes | passes |
| the caret, Node 20 and 22 | fails | fails | fails |
| the caret, Node 24 | passes | passes | passes |

Expected, per the contract: `fullUrl` is the URL the browser reports, so `expect(page).toHaveURL(fullUrl)` passes
wherever `expectThisPage()` does. For `^` that is achievable (every browser reports `%5E`); for `|` it is not, since
Chromium reports `%7C` and Firefox and WebKit report `|`.

A related case on the same path (a string `fullUrl` handed to Playwright), for the docs part of the fix:
`docs/upgrading-from-2x.md`, *The `fullUrl` of a RegExp page is a `UrlMatcher`*, shows
`waitForPage(page: Page, url: string | UrlMatcher) { await page.waitForURL(url); }` for code that receives `fullUrl`.
Playwright reads a string there as a glob (`*`, `{…,…}`, `\`), not as a URL, so a string `fullUrl` with `{`, `}` or `,`
in its query does not wait for its own page. Probe:
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/glob/zz-probe-D-glob.spec.ts` (chromium, exit 0, results
logged):

```text
fullUrl http://localhost:9000/search?q={a} reported http://localhost:9000/search?q={a} | expectThisPage ok | toHaveURL ok | waitForPage ERR page.waitForURL: Timeout 500ms exceeded.
fullUrl http://localhost:9000/search?q=a,b} reported http://localhost:9000/search?q=a,b} | expectThisPage ok | toHaveURL ok | waitForPage ERR Invalid glob pattern "http://localhost:9000/search?q=a,b}": unmatched '}'
```

This is Playwright's documented reading of a string, not a POMWright defect; the docs should not hand a string
`fullUrl` to `waitForURL` or `route` without saying so.

## Cause

`src/helpers/url.ts:213-219`: `composeFullUrl` returns `resolveUrl(path, base)`, `new URL(path, base).href`, whose
path encoding depends on the Node version (Node 20 and 22 keep `^`, Node 24 writes `%5E`). The matcher compares through
`comparable` (`url.ts:163-167`), which `fullUrl` never goes through.

## Fix plan

- **Intended contract**: on every Node version, a string `fullUrl` writes `^` in its path part as `%5E`, the form every
  browser reports, so `toHaveURL(fullUrl)` passes on the page. For `|` the docs say that Chromium reports `%7C`, so a
  string `fullUrl` with `|` in its path matches Firefox and WebKit only in `toHaveURL`, and `expectThisPage()` is the
  assertion that matches on every browser.
- **Options**:
  1. **Recommended**: write `^` as `%5E` in the path part of a string `fullUrl` (the same rewrite `comparable` already
     applies, path part only), and document the `|` exception. `fullUrl` changes only on Node 20 and 22 and only for a
     path with `^`; `goto()` still lands on the same page, since the browser encodes `^` anyway. Patch.
  2. Docs only: drop "the form the browser reports" for these two characters and recommend `expectThisPage()` over
     `toHaveURL(fullUrl)` when a path contains `|` or `^`. None.
  3. Make a string page's `fullUrl` a `UrlMatcher` too. It fixes both characters, but code that uses `fullUrl` as a
     string stops compiling: major, and out of proportion to the case.
- **Implementation steps**: `src/helpers/url.ts` (`composeFullUrl`, reusing the path-part rewrite of `comparable` for
  `^` only); the doc comment of `fullUrl` in `src/pageObject.ts`.
- **Tests**: `src/helpers/url.test.ts` (a `^` path gives `%5E` in `fullUrl` on every Node; the unit run is Node 24
  locally, so assert the string directly); `test/tests/testApp/urlForms.spec.ts` (the `^` and `|` page objects:
  `toHaveURL(fullUrl)` passes for `^` on every browser, and for `|` on firefox and webkit); CI's `harness-node-floor` job
  runs it on Node 20.
- **Docs**: `docs/urls-and-navigation.md` *fullUrl* (the `^` sentence and the `|` exception for `toHaveURL`; a string
  `fullUrl` is exact in `toHaveURL` and a glob in `waitForURL` and `route`, so `expectThisPage()` or `toHaveURL` is the
  way to wait for or assert a string page), `api/class-pageobject.md` *fullUrl*, `internal/url-matching.md` *`fullUrl`*
  and its last section, `docs/upgrading-from-2x.md` (the `waitForPage` example: `toHaveURL`, or a `UrlMatcher` only).
- **Changeset**: patch. "On Node 20 and 22, a string `fullUrl` writes a `^` in its path as `%5E`, as every browser
  reports it, so `expect(page).toHaveURL(page.fullUrl)` passes there as it does on Node 24." The `|` note is docs only.
- **Decisions to tick**:
  - [x] Rewrite `^` in `fullUrl` (option 1), or document both characters (option 2): **option 1**, `^` written as `%5E`
    in the path part of a string `fullUrl` (the URL Standard's path percent-encode set includes U+005E; the query and
    fragment keep `^`), and the `|` exception documented (the standard keeps `|` in a path, as Firefox and WebKit do;
    Chromium reports `%7C`). A browser-dependent `fullUrl` was considered and rejected: a page object cannot learn its
    browser reliably (`browserName` is a fixture; `test.info().project.use.browserName` is usually unset with
    `devices[...]`; `page.context().browser()` is `null` for a persistent context), and `fullUrl` would differ between
    test projects.
  - [x] (added) Docs: the `fullUrl` sections (*URLs and navigation*, `api/class-pageobject.md`, *Internal → URL matching*);
    a string `fullUrl` is exact in `toHaveURL` and a glob in `waitForURL` and `route`; `expectThisPage()` for a path
    with `|` on Chromium; the `waitForPage` example on *Upgrading from 2.x* corrected.
  - [x] (added) Tests as above (the D-2 part of test gap #11).
  - [x] (added) The pending `.changeset/caret-in-url-path.md` is amended (`fullUrl` writes `^` as `%5E` too) instead of
    a new changeset; `pipe-in-url-path.md` unchanged.
- **Execution order**: after any change to `comparable` (none planned); independent of D-1.
