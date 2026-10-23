# PLAN-D20-D29 — two statements of the seed docs

Two documentation findings of [PLAN-T](PLAN-T-candidates-triage.md) (T2, T12). Docs and doc comments only; two commits.

## Intended contract

- **D20.** The docs say what `seed` does when the page has already committed a document on the origin: it is on the
  origin, so `seed` writes at once (as *How it works* says), after the app's first script has run.
- **D29.** Every page that lists `seed`'s errors lists the three encoding errors `seed` throws, as `set`'s lists do.

## Verified current behaviour

**D20.** The row of *What `seed` cannot do*
([../website/src/content/docs/docs/seeding-session-storage.md#L142](../website/src/content/docs/docs/seeding-session-storage.md#L142))
reads: "`seed` is called while the page is already loading a document on the origin, or is not awaited before the hop |
`seed` fails when that document may have loaded without the entries". PLAN-T's T2 probe, every browser, both builds,
5/5: after `await page.click()` on a link to B, or `goto(B, { waitUntil: "commit" })`, `await seed()` resolved; the app's
first script saw `{}`; the entries were in storage afterwards. The code is as decided: on the origin `seed` writes at once
([../src/helpers/sessionStorageSeed.ts#L198-L203](../src/helpers/sessionStorageSeed.ts#L198-L203)), and *How it works*
says so (same page, "When the page is already on the origin, `seed` writes at once…"). Only the row is wrong. The row's
second case, an un-awaited `seed` before the hop, is right.

**D29.** `seed` encodes its entries with `encodeEntries` and the title `…seed`
([../src/helpers/sessionStorage.ts#L473](../src/helpers/sessionStorage.ts#L473)), which throws three errors
([#L143-L158](../src/helpers/sessionStorage.ts#L143-L158)). They are listed for `set` (doc comment
[#L308-L313](../src/helpers/sessionStorage.ts#L308-L313), API page, *Error messages*), but not in `seed`'s `@throws`
([#L443-L446](../src/helpers/sessionStorage.ts#L443-L446)), its API page's **Throws**, *Error messages*' `seed` section,
or the *Errors* block of *Seeding session storage*.

## Options

- **D20.** (a) Docs: split the row in two, the committed-document case with what happens and what to do instead (seed
  before the action that starts the navigation), and the un-awaited case as it is. (b) Code: fail `seed` on the origin
  while the document is still loading. Rejected: `seed` on the origin writing at once is decided and documented, the
  registry cannot know whether the app has read storage yet, and a reader seeding on the origin before a reload would
  break. **Recommendation: (a).**
- **D29.** One option: add the three messages, with the `seed` title, everywhere `seed`'s errors are listed.

## Implementation steps

1. D20: the two rows on *Seeding session storage*; the sentence in *Several seeds* that this case belongs to stays.
2. D29: the `@throws` of `seed`; **Throws** under `seed` on the API page; `seed` in *Error messages*; the *Errors*
   block of *Seeding session storage*, and its count ("The first three are thrown by the `seed` call" becomes six).
   Every message is copied from a probe of the build (`seed({ orderId: 7 })` on a helper without a codec, a codec that
   throws, a codec that returns `undefined`).

## Tests

No code changes. `pnpm typecheck` (snippets and API coverage) and `pnpm docs:build`.

## Changeset

None: docs and doc comments only, as D12 and R2.

## Decisions

- [x] D20 option (a); D29 as described (2026-10-23).
