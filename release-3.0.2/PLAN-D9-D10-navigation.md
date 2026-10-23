# PLAN-D9, D10 — navigation

## D9 — `|` in a string `urlPath` on Chromium (opus-D3)

### Intended contract

[../src/helpers/url.ts#L1-L10](../src/helpers/url.ts#L1-L10): "a string part is compared in the form the browser
reports, as `new URL` writes it"; `internal/url-matching.md`: "a page is matched in the form the browser reports".

### Verified current behaviour

`new URL` keeps `|` in a pathname; Chromium reports it as `%7C`. Probe, 2026-10-22, the packed build, a page object
with `urlPath` `"/testpath/a|b"`, `goto({ waitUntil: "commit" })`, then both expectations with a 1.5 s timeout:

| Browser | `page.url()` | `expectAnotherPage` | `expectThisPage` |
| --- | --- | --- | --- |
| chromium | `…/testpath/a%7Cb` | **passes while on the page** | times out: `expected URL "…/a\|b"; found "…/a%7Cb"` |
| firefox | `…/testpath/a\|b` | times out | passes |
| webkit | `…/testpath/a\|b` | times out | passes |

opus's sweep of every printable ASCII character in path, query and fragment found this one difference only.
Playwright's own `toHaveURL(fullUrl)` has the same mismatch on Chromium. POMWright's `expectAnotherPage` passing
while the browser is on the page, though, is its own.

### Options

Both apply to the comparison of a string `urlPath` only. A RegExp path keeps seeing the URL as the browser reports it,
as documented.

- **A. Treat `|` and `%7C` as the same character**: before comparing a string path, write `|` as `%7C` in the pathname
  of both sides, the expected rest and the browser's
  ([../src/helpers/url.ts#L117-L127](../src/helpers/url.ts#L117-L127)). A harness spec sweeps the printable ASCII
  characters in path, query and fragment on all three browsers, so a new difference in a later browser shows up as a
  failing test, and gets its own entry.
  - Pro: changes exactly the one observed difference; every other URL compares as Playwright compares it (D17).
  - Pro: easy to state and to test.
  - Con: a list of special cases (one entry today) that a browser change can lengthen; the sweep catches it, someone
    has to add the entry.
- **B. Compare percent-decoded forms**: run `decodeURI` on both sides before comparing. (Correction: an earlier draft
  said this would decode `%2F` and `%3F`; `decodeURI` leaves the reserved characters `/ ? # & = + $ , ; : @` encoded.
  Node 24, 2026-10-22: `decodeURI("/a%2Fb")` is `/a%2Fb`, `decodeURI("/a%7Cb")` is `/a|b`.)
  - Pro: general: any character a browser reports encoded and `new URL` does not, or the other way round, compares
    equal, with no list.
  - Con: it equates much more than the observed difference: `/a%41` and `/aA`, `%7c` and `%7C`, every encoded
    unreserved character. Playwright compares raw strings, so `expectThisPage()` would pass on URLs where
    `toHaveURL(fullUrl)` fails, the divergence D17 removes for `?` and `#`.
  - Con: `decodeURI` throws on a malformed sequence (`decodeURI("/a%E0%A4%A")` is a `URIError`), so the comparison
    needs a fallback to raw strings.

**Recommendation: A.** With D17 the rule is "as Playwright compares URLs", and A keeps the one exception as small as
the browser difference that forces it. B trades a short list for a wide, silent equivalence. (Agreed 2026-10-22.)

### Tests

Unit: the matcher equates `/a|b` and `/a%7Cb` in both directions. Harness: the `|` page object on all three browsers,
and the sweep.

### Changeset

`patch`: "On Chromium, a page object whose string `urlPath` contains `|` matched no URL, so `expectThisPage()` timed
out and `expectAnotherPage()` passed on the page. Both now compare `|` and `%7C` as the same character."

## D10 — `goto(new URL(…))` from JavaScript (opus-D6)

### D10: Verified current behaviour

`goto` treats every non-string first argument as the options of the this-page form
([../src/helpers/navigation.ts#L206](../src/helpers/navigation.ts#L206)). Probe, 2026-10-22, the packed build:
`goto(new URL("http://127.0.0.1:9000/testpath/fff"))` lands on the page object's own `http://localhost:9000/testpath`
and runs its actions. Playwright's `page.goto(new URL(…))` throws `page.goto: url: expected string, got object`.
TypeScript rejects the call, so this affects JavaScript callers only.

### D10: Fix

Mirror Playwright, whose `page.goto` takes a string only (its type is `url: string`, and at runtime it throws
`url: expected string, got object` for a `URL`): the first argument of `navigation.goto` is `undefined`, a string, or a
plain object (the options). Anything else throws
`<label>: goto() takes a URL string or options; received a URL object` (wording from a probe at execution).

### D10: Tests

Unit (`src/helpers/navigation.test.ts`): a `URL`, a number, `null` throw; `undefined`, `{}` and a string still work.

### D10: Changeset

`patch`: "From JavaScript, `goto()` with a `URL` object, or any other value that is neither a string nor options,
throws instead of navigating to the page object's own URL."

## Execution notes (2026-10-22)

- D9: the sweep ran first on all three browsers (Playwright 1.64.0): one difference, `|` in the path on Chromium,
  reported as `%7C`; the query and fragment agree. Option A covers exactly that, and the sweep stays in the harness
  (`test/tests/testApp/urlForms.spec.ts`) with the known difference listed.
- D10: Playwright's `page.goto` accepts any object as its options, so `goto` rejects a `URL` object and non-objects
  (`null`, a number, …) rather than every object that is not plain: a class instance as options works today from
  JavaScript, and rejecting it would break that.

## Decisions

- [x] D9: option A, with the sweep spec (2026-10-22). Before the fix, the sweep runs on all three browsers, and A
  covers every difference it finds, not only `|` (2026-10-22)
- [x] D10: throw, as Playwright does (2026-10-22)
