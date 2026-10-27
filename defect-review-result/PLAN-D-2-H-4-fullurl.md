# Plan 25: a string `fullUrl` writes `^` as `%5E`; `|` documented

- **Decisions**: [DECISIONS.md](DECISIONS.md) #17
- **Findings**: [D-2](D-page-objects-urls-navigation/defect-D-2-fullurl-not-browser-form.md),
  [H-4](H-docs-readme-agents/defect-H-4-agents-urlforms-one-known-difference.md); test gap #11's D-2 part
- **Bump**: patch (the pending `caret-in-url-path.md` amended)
- **Stop**: no
- **Depends on**: nothing in order (after plan 16, which edits `navigation.ts`)

## Contract

A string page's `fullUrl` writes `^` as `%5E` in its path part (the rewrite the matcher's `comparable` already applies,
path only), so it is the same on every Node version from 20 and matches every browser in `toHaveURL(fullUrl)`. The
`|` exception is documented: Chromium reports `%7C`, Firefox and WebKit `|`, so for a path with `|` the docs point to
`expectThisPage()`, which matches on every browser. A string `fullUrl` is exact in `toHaveURL` but a glob in
`page.waitForURL` and `page.route` (Playwright's reading of a string).

## Current behaviour

- `src/helpers/url.ts:213-217` `composeFullUrl` returns `resolveUrl(path, base)`, `new URL`'s form: Node 24's parser
  writes `%5E`, Node 20 and 22's keeps `^`, so `toHaveURL(fullUrl)` fails for `^` on Node 20 and 22 (every browser) and
  for `|` on Chromium; the matcher itself is right (`comparable`, `url.ts:158-166`).
- AGENTS.md §4 (line 155), *Internal → Tests and checks* (line 25) and *Internal → URL matching* (line 54) say the sweep
  has "one known difference".

## Steps

1. `url.ts`: `composeFullUrl`'s string case writes the path part's `^` as `%5E` (the same split `comparable` uses:
   before the first `?` or `#`); a short comment says why (Node 20 and 22's `new URL` keeps `^`, browsers report `%5E`).
   `fullUrl`'s doc comment on `PageObject`: the form the browser reports, `|` excepted on Chromium.
2. **Tests**: `src/helpers/url.test.ts` asserts `%5E` in a `^` path's `fullUrl` (as a string, since the unit tests run on
   Node 24, where `new URL` already writes it: assert the function's output for an input built to keep `^`, or assert
   the rewrite directly); `test/tests/testApp/urlForms.spec.ts` asserts `toHaveURL(fullUrl)` for `^` on every browser
   and for `|` on Firefox and WebKit (Chromium's `|` listed as the known difference); CI's Node 20 floor job runs it.
3. **Docs**:
   - the `fullUrl` sections of *URLs and navigation*, `api/class-pageobject.md` and *Internal → URL matching*: the
     browser's form, the `|` exception and `expectThisPage()` for it; exact in `toHaveURL`, a glob in `waitForURL` and
     `page.route`;
   - the `waitForPage` example on *Upgrading from 2.x* uses `toHaveURL`, or takes a `UrlMatcher` only;
   - H-4: AGENTS.md §4 ("with the known differences listed: Chromium's `|` in a path, and, on Node 20 and 22, whose `new
     URL` keeps a `^`, every browser's `%5E`", and the sweep skips `# ? / % \`), *Internal → Tests and checks* ("with the
     known differences listed"), *Internal → URL matching* ("except in the path:" instead of "but one:");
   - AGENTS.md §5, the URL bullet: a string `fullUrl` writes `^` as `%5E` in its path part.
4. **Changeset**: amend `.changeset/caret-in-url-path.md`: `fullUrl` writes `^` as `%5E` too, so `toHaveURL(fullUrl)`
   matches on Node 20 and 22. `pipe-in-url-path.md` unchanged (its claim is about the matcher).

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`. Run `urlForms.spec.ts` once on Node 20 locally (`nvm`), as
the floor job does, recorded in *Execution notes*.

## Commit

```text
fix: a string fullUrl writes "^" as "%5E", the form every browser reports

fullUrl was new URL's form, which keeps "^" on Node 20 and 22, so
toHaveURL(fullUrl) failed there on every browser. The path part now writes
"%5E". Chromium's "%7C" for "|" is documented, with expectThisPage() as the
check that matches on every browser.

Plan: defect-review-result/PLAN-D-2-H-4-fullurl.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27. As planned.

- `url.ts`: `inPathPart(text, rewrite)`, the split at the first `?` or `#` that `comparable` used inline, now shared;
  `composeFullUrl`'s string case writes the path part's `^` as `%5E` (a comment says why; a `|` stays). `fullUrl`'s doc
  comment on `PageObject`: the `%5E`, Chromium's `%7C` with `expectThisPage()`, exact in `toHaveURL` and a glob in
  `waitForURL` and `route`.
- Playwright 1.64 read for the glob claim (`playwright-core/lib/coreBundle.js` `urlMatches`, `globToRegexPattern`;
  `playwright/lib/matchers/expect.js` `toHaveURL`): `toHaveURL(string)` is an exact text match; `waitForURL` and
  `route` turn a string into a glob, where `*`, `**` and a `{a,b}` group are patterns and `?` is literal. A first draft
  of the sentence also named `?`; corrected before the build.
- Node 20.20.2 (nvm): `new URL("/a^b", …)` keeps `^`; the packed `PageObject`'s `fullUrl` for `/a^b?q=a^b#a^b` is
  `http://localhost:9000/a%5Eb?q=a^b#a^b`, and `/a|b` stays. `urlForms.spec.ts` on Node 20, all three browsers: 9
  passed. With the old `composeFullUrl` the new caret assertion fails there (`Received: …/testpath/a^b`; checked, then
  restored).
- Tests: unit (`url.test.ts`): the `^` in the path written `%5E`, the query and fragment and a `|` kept, the matcher
  accepting it. `urlForms.spec.ts`: the caret page's `fullUrl` is `…/a%5Eb` and `toHaveURL(fullUrl)` matches on every
  browser; the pipe page's `toHaveURL(fullUrl)` matches on Firefox and WebKit and not on Chromium (the known
  difference), and `expectThisPage()` matches on all three.
- Docs: *URLs and navigation*, *fullUrl* (the `%5E`, the `|` exception and `expectThisPage()`, exact versus glob);
  `api/class-pageobject.md`, `fullUrl`; *Internal → URL matching* (`fullUrl`'s two strings, the rejected alternatives,
  "except in the path:"); *Upgrading from 2.x*, `waitForPage` with `toHaveURL`; *Internal → Tests and checks* ("the
  known differences"); AGENTS.md §4 (both differences, the skipped characters) and §5 (`fullUrl`'s `%5E`).
  `.changeset/caret-in-url-path.md` amended.
- Checks: `pnpm lint` 0; `pnpm test:unit` 898 passed; `pnpm pack-test --reporter=line` exit 0 (1,602 passed, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 29); `pnpm docs:build` 0.
