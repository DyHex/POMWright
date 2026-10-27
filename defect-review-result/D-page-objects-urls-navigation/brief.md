# Scope D: Page objects, URLs and navigation

Segment D of the final whole-project review at `54cdada`. First read [../scopes.md](../scopes.md) (where things are,
probing, the finding format, finishing), [../inventory.md](../inventory.md) (lines tagged D) and
[../baseline.md](../baseline.md). Probes go to `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/`.

Review it as an *area* in the skill's terms. Also treat the commits since `v3.0.1` listed below as a *change set*: for
each one, list every path its promise applies to, including the paths it did not touch, and probe them through the
public API. Where a regression is possible, run the same probe on `v3.0.1` too, in a second worktree in your probes
folder: `git -C /home/magdys/workspace/dyhex/POMWright-final-review worktree add --detach <probes>/<scope>/v3.0.1 v3.0.1`,
then `pnpm install --frozen-lockfile` and `pnpm build` there (add `pnpm harness:install` only if you need its harness), and
`git worktree remove` at the end. It uses port 9000 too, so never run the two at the same time.

URL handling depends on the browser and on Node's `new URL`. The `^` fix in `54cdada` exists because Node 20 and 22
differ from Node 24. So run every URL probe on chromium, firefox and webkit, and through Node 20, 22 and 24.

## What is in scope

- **Source**: `src/pageObject.ts`, `src/helpers/url.ts`, `src/helpers/navigation.ts`, and `src/helpers/callSite.ts`
  as the page-object check uses it. Read all of it, with its doc comments.
- **Unit tests**: `src/pageObject.test.ts`, `src/helpers/url.test.ts`, `src/helpers/navigation.test.ts`.
- **Harness**: `test/tests/pageObject/` (`actions`, `lifecycle`, `urls`, `verify`, `callSite/`),
  `test/tests/testApp/testNav.spec.ts`, `urlForms.spec.ts`, `testPath.spec.ts`, `color.spec.ts`; the page objects
  `testnav/`, `testPath/` and the base class `testApp.base.ts`; the `/testnav*` and `/testpath*` routes.
- **Docs**: `docs/page-objects.md`, `first-page-object.md`, `page-objects-in-tests.md`, `urls-and-navigation.md`, and
  *The URL types* in `docs/typescript.md`; `api/class-pageobject.md`, `class-navigation.md`, and in `api/types.md` the
  sections `PageObjectTypeOptions`, the four `*TypeFromOptions` and `PageObjectOptions`; the *Page objects* and
  *Navigation* sections of `api/errors.md`; `internal/page-object-lifecycle.md`, `url-matching.md`; the *Page objects*
  and *URLs and navigation* sections of `docs/upgrading-from-2x.md`; the page object and URL lines of AGENTS.md §5 and
  §8.

## Changes since v3.0.1 in this scope

```
54cdada fix: a string urlPath with "^" matches the page on Node 20 and 22
0028097 fix: reject origins whose scheme has no URL origin
8ccfbd4 docs: warn that a base with credentials puts them in reports
e579f56 docs: say why goto still takes any object as its options
6fc3c68 test: call goto as a method in the URL-object spec
24fd838 docs: check a page object's arguments before super()
fa424ad fix: goto() with a URL object throws, as page.goto does
d710c12 fix: a "|" in a string urlPath matches on Chromium
c75ab43 fix: an empty query or fragment is another URL, as for Playwright
2accf34 fix: an ended registration's error names the call that ended it
adffd1e fix: say where codecs are declared when a value has none
c9c8f34 fix: a urlPath must stay on its base's origin
```

## Known and decided

- Issue 06 (filed, breaking): a page object's storage schema written once. Issue 07 (filed): an option to treat an
  empty `?` or `#` as the same page.
- AGENTS.md §8: no `defineLocators()` or `pageActionsToPerformAfterNavigation()` from the constructor; no
  `UrlTypeOptions` name; no navigation step without `box: true`. POMWright sets no timeout or `waitUntil` default of
  its own (§5).

## Questions to answer

- **Normalisation.** Does a string `urlPath` or `baseUrl` match the page the browser reports for every printable ASCII
  character and a sample of non-ASCII ones? Cover percent-encoded against raw, IDN hosts, default ports (`:80`,
  `:443`), a trailing slash on the base, credentials, IPv6 hosts, upper-case schemes and hosts, backslashes, tabs and
  newlines. Check each on the three browsers and on Node 20, 22 and 24. `urlForms.spec.ts` lists one known difference.
  Is it still the only one?
- **Validation at construction.** Is every input the docs reject rejected, with the documented message, and nothing
  else? Does a `urlPath` stay on its base's origin for every form that could leave it (`//host`, `\\host`,
  `/\host`, encoded slashes)?
- **RegExp parts.** Check the `g` and `y` flags (`lastIndex` across `test()` calls and across `expectThisPage` calls),
  anchors, a RegExp base with a string path and the reverse, and `UrlMatcher.toString()` against what the docs show.
- **Navigation.** Check every `goto` target form (relative, absolute, another origin, a URL object, an options object,
  nothing) and `runPostNavigationActions`. Are `expectThisPage` and `expectAnotherPage` exact opposites for every URL
  form, empty `?` and `#` included? Does any POMWright default leak into `page.waitForURL` or `page.goto`?
- **Lifecycle.** Check a constructor that throws before or after `super()`, `defineLocators()` that throws, a failing
  `verify()`, a first locator call before the microtask, subclass fields that `defineLocators()` reads, two instances,
  and a page object built in a fixture and never used. Are the failures labelled and sticky, with the original as
  `cause` and the construction site in the stack?
- **Actions hook.** Is it evaluated per run when defined as a method, as a property, and as an async function that
  rejects?
- **Types.** Do `fullUrl`'s type (string or `UrlMatcher`) and the `*TypeFromOptions` helpers follow the runtime for
  every combination of string and RegExp parts? Does `NavigationFor`'s `goto` accept exactly what the runtime accepts?

## Neighbours

The session storage helper reached through a page object is scope A. The registry behind the facade is scopes B and C.
The `log` fixture and `@step` are scope E. Report what you meet there under *outside the scope* in `summary.md`.
