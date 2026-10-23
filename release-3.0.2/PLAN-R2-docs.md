# PLAN-R2 — site corrections, and D12

Every item was checked against the page and, where it states behaviour, against a probe (2026-10-22). Pages are under
`website/src/content/docs/`. No changeset; no bump. D12 is its own commit, the rest one commit.

## Items

1. **A duplicate with `{ reuse }` throws at `add`** (opus-DOC3). `add(path, { reuse })` registers at once
   (`src/locators/locatorRegistry.ts`, `add`), so `add` itself throws `A locator schema with the path "dup" already
   exists.` (probe: `add("dup", { reuse: "other" })`). The pages place it at the locator method:
   `docs/registering-locators.md` "Registering it again throws at the second method call"; `api/errors.md` "Thrown by the
   locator method of a second `add(path)`"; `api/class-locatorregistry.md` (`add`, **Throws**); the `add` doc comment.
   Fix: "or, with `{ reuse }`, by `add` itself" in each.
2. **A message missing from *Error messages*** (opus-DOC4): `Invalid reuse path configuration for "…": …`
   (`src/locators/locatorRegistry.ts#L230`, thrown from JavaScript when `reuse` is an array). Fix: add it under
   *Reusing*.
3. **"every rule its types state is also checked at runtime"** (opus-DOC5), `docs/installation.md`. `nth` hands its
   index to Playwright as given (decided), and D10 is a counterexample until fixed. Fix: name what is checked (paths,
   first arguments, URLs, session storage values) and link the decided exception for `nth`.
4. **TypeScript 6 and `types`** (codex-M1), `docs/installation.md` "POMWright needs no `tsconfig.json` setting: with
   TypeScript's defaults everything in these docs compiles". Probe: TypeScript 6.0.3 with no `types` gives 100 errors,
   all in Playwright's own declarations (`Cannot find name 'child_process'`, `Buffer`, …); `"types": ["node"]`
   compiles. Fix: say that TypeScript 6 includes only the `@types` packages a tsconfig lists, so a Playwright project
   lists `node`, with or without POMWright, and that Playwright's runner does not type-check.
5. **"A page's identity is its exact URL"** (codex-M2). See *Item 5 in detail* below; it may become a code change
   of its own (D17).
6. **"A seeded registration keeps its optional override as the first call"** (codex-M3),
   `docs/upgrading-from-2x.md`. `docs/reusing-locators.md` allows the override after `filter`, `nth` and `describe` on a
   registration kept in a variable. Fix: "in one fluent chain, the override comes first; on a registration kept in a
   variable it may come later", with the link.
7. **The performance conclusion** (codex-M5), `internal/performance.md`: "a page object of a few hundred paths is
   ready in less time than one such round trip takes" (about 950 µs), while the same page gives about 1 ms for
   100 paths, and 2.4 ms as a fixture. "Everything grows linearly" holds for the measured shape (fixed-depth chains,
   plain and text filters). Fix: state the measured range against the round trip, and qualify "linearly" with the
   shape measured.
8. **D12: a subclass constructor that throws after `super()`** (opus-D8). The check scheduled by `PageObject`'s
   constructor still runs on the abandoned instance. Probe: `expect(() => new Fragile(page, undefined)).toThrow(…)`
   passes, then the test fails with
   `Fragile: defineLocators() failed: Cannot read properties of undefined (reading 'label')`. The microtask cannot tell an
   abandoned instance from a live one. Fix: `docs/page-objects.md`, *What the definition cannot see*: validate the
   constructor's arguments before `super(…)` (TypeScript allows statements that do not touch `this` before it, also with
   parameter properties; checked by a snippet), and why. `internal/page-object-lifecycle.md`: the same in one
   sentence.

## Item 5 in detail: an empty `?` or `#`

### What the docs say

`docs/urls-and-navigation.md`: "A page's identity is its exact URL". `internal/url-matching.md`: "One rule, identical
to Playwright's `toHaveURL`, keeps `expectThisPage` and `expectAnotherPage` exact opposites". Both promise Playwright's
behaviour.

### What happens

Probe, 2026-10-22, chromium, a page object with `fullUrl` `http://localhost:9000/testnav` (codex saw
`expectThisPage()` pass on all three browsers; the Playwright columns are chromium only):

| Browser on | `expectThisPage()` | `toHaveURL(fullUrl)` | `waitForURL(fullUrl)` | `toHaveURL(/\/testnav$/)` |
| --- | --- | --- | --- | --- |
| `/testnav?` | passes | no match | no match | no match |
| `/testnav#` | passes | no match | no match | no match |

Playwright compares against the full `href`, which keeps an empty `?` or `#` (`new URL("http://x/a?").href` is
`http://x/a?`). POMWright's matcher compares `pathname + search + hash`
([../src/helpers/url.ts#L101](../src/helpers/url.ts#L101)), and the URL API reports an empty query and an empty
fragment as `""` (`new URL("http://x/a?").search === ""`). So the `?` is gone before the comparison. This is a side
effect of building the "rest" from those three parts, not a decision: both pages that describe the rule promise
Playwright's.

### Why changing only the string comparison would split string and RegExp page objects

A RegExp `urlPath` is tested against the same `pathname + search + hash`. If only a string `fullUrl` were compared with
the full `href`, the two kinds would disagree on the same URL:

```ts
// browser on https://shop.example/orders?
new OrdersPage(page);      // urlPath "/orders"         -> exact href: no match
new OrderListPage(page);   // urlPath /^\/orders$/      -> tested against "/orders": match
```

Both stay consistent if the "rest" keeps an empty `?` or `#`: the part of `href` after the host (`/orders?`), for the
string and the RegExp alike. That is what Playwright tests a RegExp against too.

### Options

- **A. Keep the behaviour, fix the docs.** State that an empty `?` or `#` counts as the same page.
  - Pro: no behaviour change. From a page object's point of view it is the same page: an empty query or fragment
    carries nothing.
  - Con: a divergence from Playwright, in a library whose principle is to mirror it, and `expectThisPage()` would
    then pass where `expect(page).toHaveURL(page.fullUrl)` fails.
- **B. Mirror Playwright.** The rest is the part of `href` after the host, keeping an empty `?` or `#`, for string and
  RegExp paths. The docs stay as they are (they already say this).
  - Pro: one rule, Playwright's. `expectThisPage()` and `toHaveURL(fullUrl)` always agree.
  - Pro: by our rules a patch, since both pages promise it.
  - Con: a test that lands on `/search?` and calls `expectThisPage()` on a `/search` page object starts failing. The
    fix there is a RegExp path that allows it: `/^\/search\??$/`.
- **C. B, plus an option to treat an empty `?` or `#` as absent** (your idea). It would be a page object option, not a
  per-call one, so that `expectThisPage` and `expectAnotherPage` stay exact opposites; for example
  `navOptions: { ignoreEmptyQueryAndHash: true }`.
  - Pro: the page-object view is available to whoever wants it, without writing a RegExp.
  - Con: a new option is a minor (3.1.0), for a case a RegExp already expresses. It can be added later, as a minor, if
    someone asks for it.

### Recommendation

**B.** Both pages that describe the rule promise Playwright's behaviour, and mirroring Playwright is the project's
principle. The divergence came from how the URL is taken apart, not from a decision. Your point that a page object can
reasonably see `/orders?` as the same page is right; it is a definition, and Playwright's is the one POMWright's docs
chose. C adds API for a rare case that a RegExp already covers. D9 (`|` on Chromium) stays a deliberate exception,
since there the browser and `new URL` disagree about the same URL.

Under B, item 5 leaves this plan and becomes **D17**, a code change of its own:
`src/helpers/url.ts` (the rest from `href`, which must cope with a URL carrying a user name, since `href` then has
`user@` before the host), unit tests for both kinds of path, a harness spec on all three browsers, and a `patch`
changeset: "`expectThisPage()` and `expectAnotherPage()` treat a URL with an empty query or fragment (`/orders?`,
`/orders#`) as a different URL from `/orders`, as Playwright's `toHaveURL` and `waitForURL` do. Before, they treated
it as the same page."

## Steps

Each change through the snippet check (`pnpm typecheck`), every shown message copied from a probe, and `pnpm docs:build`.

## Decisions

- [x] Item 5: B, mirror Playwright, as D17 (2026-10-22); C as a GitHub issue (see [ISSUES.md](ISSUES.md))
- [x] Items 1–4, 6–8 as above (2026-10-22)
