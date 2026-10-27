# Scope A: Session storage

Segment A of the final whole-project review at `54cdada`. First read [../scopes.md](../scopes.md) (where things are,
probing, the finding format, finishing), [../inventory.md](../inventory.md) (lines tagged A) and
[../baseline.md](../baseline.md). Probes go to `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/`.

Review it as an *area* in the skill's terms. Also treat the commits since `v3.0.1` listed below as a *change set*: for
each one, list every path its promise applies to, including the paths it did not touch, and probe them through the
public API. Where a regression is possible, run the same probe on `v3.0.1` too. For that, use a second worktree in your
probes folder (`git -C /home/magdys/workspace/dyhex/POMWright-final-review worktree add --detach <probes>/A/v3.0.1 v3.0.1`,
then install and build there), and remove it with `git worktree remove` at the end. It uses port 9000 too, so never run
the two at the same time.

## What is in scope

- **Source**: `src/helpers/sessionStorage.ts`, `src/helpers/sessionStorageSeed.ts`, `src/helpers/storageTurns.ts`,
  `src/helpers/callSite.ts`, and the session storage parts of `src/pageObject.ts` (the `sessionStorage` option, the
  property, the schema in the type options). Read all of it, with its doc comments.
- **Unit tests**: `src/helpers/sessionStorage.test.ts`, `sessionStorageSeed.test.ts`, `storageTurns.test.ts`,
  `callSite.test.ts`.
- **Harness**: `test/tests/testApp/sessionStorage.spec.ts`, `sessionStorageOverlay.spec.ts`,
  `test/tests/pageObject/callSite/` (the `seed` part), `test/page-object-models/testApp/pages/teststorage/`,
  `test/fixtures/testApp.fixtures.ts`, the `/teststorage*` routes of `test/server.js`, and the storage parts of
  `test/tests/packaging/publicTypes.typecheck.ts`.
- **Docs**: `docs/session-storage.md`, `docs/seeding-session-storage.md`, `api/class-sessionstorage.md`, the
  *Session storage* and *seed* sections of `api/errors.md`, `internal/seed-registry.md`, the *Errors raised later*
  section of `internal/call-sites.md`, the *Session storage* section of `docs/upgrading-from-2x.md`, and the storage
  lines of AGENTS.md §5 and §8.

## Changes since v3.0.1 in this scope

`git log --format='%h %s' v3.0.1..54cdada -- <the files above>`; read each diff and its changeset.

```
c7db10b docs: list the encoding errors seed throws
3045656 docs: say what seed does once the page has committed on the origin
64cd0b7 fix: a session storage key typed string is typed as any of the schema's values
7447754 fix: export the session storage types the public signatures use
819c477 fix: a seed's failure no longer stops the page's other listeners
b583c1b test: the failed-navigation specs wait for the error page
d4cffbb fix: the origin check applies on an about:blank page that inherited an origin
a23aa0d fix: a seed is never skipped silently
5ceb13c fix: seed reads the page and watches for a commit from the call on
d12966a fix: a page closing while seed registers fails with the label and call site
17426a5 fix: a sandboxed document's refusal of sessionStorage is explained
e8831b8 fix: a navigation during a batch fails with the label and the keys done
ea330ef fix: a decode error gives the reason, the length and the quoted value
a6ecacf fix: seed with no entries does nothing
bfbc00f fix: the Navigation API check tests the interface, not the global
0028097 fix: reject origins whose scheme has no URL origin
333a928 fix: a boxed @step is reported at the line that called the method
adffd1e fix: say where codecs are declared when a value has none
34c2ec0 fix: session storage calls for one origin take turns
7131d3d fix: a __proto__ storage key is stored, not dropped
```

## Known and decided (not findings unless the code no longer does what was decided)

- Issue 05 (filed): a browser-context-wide `seed` option. Issue 06 (filed, breaking): the schema written once.
- Decided: no retry is made to apply a seed after a failed navigation. That is issue draft 08, deliberately not filed
  (AGENTS.md §5, last bullet but one).
- AGENTS.md §8: no route, proxy, POMWright-owned document or exposed binding for `seed`; no JSON-encoding of every
  value; no write from a `framenavigated` listener.

## Questions to answer

These come on top of the skill's checklist. They are questions, not suspicions.

- **Turns.** Does every path take its turn in call order? Cover `set`, `get`, `clear` and `seed`, each with and without
  `origin`, from two `SessionStorage` instances on one page (a page object's and a standalone one), on two origins, in
  a `Promise.all`, without an `await`, and with a navigation in flight. What happens to the chain when a call throws in
  validation, before or after it joined?
- **seed at the call.** Is the decision right for every page state at the call: on the origin, away from it,
  `about:blank`, in the middle of a navigation, closing or closed? Combine each with the commit coming before, during
  and after registration. Check several seeds for one origin, seeds for two origins, a `set` between a `seed` and the
  arrival, and two pages of one context.
- **Lifetimes.** Are the init scripts and the four listeners removed after a success, after each kind of failure,
  after page close and over many seeds? Count them.
- **Values.** Check a codec that throws in `stringify` or `parse`, a codec that returns a non-string, and `json` with
  `undefined`, `NaN`, `BigInt`, `Date` and cyclic values. Check `get()` of all entries with keys outside the schema,
  empty-string keys, unicode, very long values, and `__proto__`, `constructor` and `hasOwnProperty` in every method
  and in a schema object.
- **Frames and documents.** Check every claim the pages make about iframes, `srcdoc`, `about:blank`, `data:`, sandboxed
  documents, COOP and COEP, on all three browsers where the page says so.
- **Messages.** Check every message of `api/errors.md` *Session storage* and *seed*, and every `@throws` in the doc
  comments, character for character against the code and what a probe prints.
- **Types.** Do `Decoded`, `AllEntries`, `EntriesFor`, `KeyOnly` and `NonEmpty` accept what the runtime accepts and
  reject what it rejects, with `string`-typed keys, keys outside the schema, and `[]`?

## Neighbours

The step mechanism of `@step` and the boxing rule belong to scope E, URL validation of a page object's `baseUrl` to
scope D, and packaging and the export list to scope F. Report what you meet there under *outside the scope* in
`summary.md`.
