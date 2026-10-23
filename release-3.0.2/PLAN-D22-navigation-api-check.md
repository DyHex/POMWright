# PLAN-D22 — the Navigation API check reads the app's own `navigation`

Finding T4 of [PLAN-T](PLAN-T-candidates-triage.md). One commit.

## Intended contract

`seed` throws "this browser has none" only in a browser without the Navigation API, whatever the app on the current
document declares.

## Verified current behaviour

The check evaluates `typeof globalThis.navigation?.activation === "object"` in the current document's main world
([../src/helpers/sessionStorageSeed.ts#L250-L254](../src/helpers/sessionStorageSeed.ts#L250-L254)). On a page that
declares `var navigation = 1;`, `function navigation() {}` or `window.navigation = 1;`, the first `seed` rejected with
`SessionStorage.seed: seed() needs the Navigation API (navigation.activation) to write only on the first arrival at
http://127.0.0.1:9000, and this browser has none (…)`, every browser (PLAN-T). The init script is not affected: it runs
before the document's first script.

A planning probe on the same three browsers: on `about:blank`, on a plain page and on the page with `var navigation = 1`,
`typeof NavigationActivation` is `"function"` and `"from" in NavigationActivation.prototype` is `true`; only
`globalThis.navigation?.activation` turns `undefined` under the app's declaration.

## Options

- **A. Test the interface (recommended):** `typeof NavigationActivation === "function" && "from" in
  NavigationActivation.prototype`. An app would have to shadow a constructor few apps know.
- B. Evaluate in an isolated world. Playwright has no public API for it.
- C. Probe in a fresh `about:blank` frame. It adds a frame to the app's document, which the seed must never do.

## Implementation steps

1. The evaluated function in `assertNavigationApi`; the comment says why the interface and not the global.

## Tests

- Unit: unchanged (the fake page answers for the evaluated function).
- Harness: a fixture route `/teststorage/shadowed-navigation` in `server.js`, a page that declares `var navigation = 1`;
  from it, `seed` for the second origin and a hop there, every browser: the app's first script sees the entries.

## Docs

*Internal → The seed registry*, the Navigation API check: what it tests and why.

## Changeset

`patch`: an app that declares its own global `navigation` no longer makes `seed` report that the browser lacks the
Navigation API.

## Decisions

- [x] Option A (2026-10-23).
