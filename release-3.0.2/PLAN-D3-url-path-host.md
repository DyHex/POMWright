# PLAN-D3 — a `urlPath` that changes the host

## Intended contract

A string `urlPath` is `""` or a path on the page object's own origin (`AGENTS.md` section 5). `assertUrlPath` rejects a
leading `//` for exactly this reason: "a leading "//" would change host"
([../src/helpers/url.ts#L79-L84](../src/helpers/url.ts#L79-L84)).

## Verified current behaviour

- `assertUrlPath` checks the raw string: it starts with `/` and does not start with `//`.
- The URL standard reads `\` as `/` in the special schemes (`http`, `https`, …), and drops every tab and newline. So
  `"/\\other.example/account"`, `"/\t/other.example/account"` and `"/\n/other.example/account"` pass the check and
  resolve to `https://other.example/account` against `https://shop.example` (Node 24 probe, 2026-10-22).
- `fullUrl` is the resolved string ([../src/helpers/url.ts#L144-L151](../src/helpers/url.ts#L144-L151)), but the
  navigation helper's matcher compares the origin of the original base
  ([../src/helpers/navigation.ts#L148](../src/helpers/navigation.ts#L148),
  [../src/helpers/url.ts#L117-L127](../src/helpers/url.ts#L117-L127)).

Probe, 2026-10-22, chromium, the packed 3.0.1 build: a page object with base `http://localhost:9000` and urlPath
`"/\\127.0.0.1:9000/teststorage"` has `fullUrl` `http://127.0.0.1:9000/teststorage`. `goto()` lands there, and
`expectThisPage()` then fails with a message that contradicts itself:

```text
Hop: expected URL "http://127.0.0.1:9000/teststorage"; found "http://127.0.0.1:9000/teststorage" (page.waitForURL: Timeout 2000ms exceeded.)
```

### The base, too (opus-D5)

`isOrigin` ([../src/helpers/url.ts#L56-L67](../src/helpers/url.ts#L56-L67)) checks `pathname === "/"` and empty
`search` and `hash`. A bare `?` or `#` leaves both empty, so `http://localhost:9000?` passes as an origin. Probe,
2026-10-22: `new Probe(page, "http://localhost:9000?", "")` is accepted with `fullUrl` `http://localhost:9000/?`.
The rule that holds is that `new URL(base).href` is the origin plus `/`.

## Options

- **A. Validate by resolution.** Keep the current rules, and also require that `new URL(urlPath, base)` keeps the base's
  origin. For a RegExp base, use the placeholder origin the matcher already uses (`http://h`,
  [../src/helpers/url.ts#L120](../src/helpers/url.ts#L120)). This follows the URL standard rather than restating it.
- **B. Reject `\`, tab, CR and LF characters by hand**: rejected. It is a copy of part of the URL standard that can fall
  out of date.

**Decided: A** (2026-10-22), with a message that names the known causes.

### Which paths change the host

A sweep of every ASCII character placed after the first `/` (Node 24, 2026-10-22, against `https`, `http` and `file`
bases) found exactly these, once tabs and line breaks are removed as the URL standard removes them anywhere in a URL:

| `urlPath` starts with | Example (as typed in TypeScript) | Resolves against `https://shop.example` to |
| --- | --- | --- |
| `//` (rejected today) | `"//evil.example/x"` | `https://evil.example/x` |
| `/\` | `"/\\evil.example/x"` | `https://evil.example/x` |
| `/`, a tab, CR or LF, then `/` or `\` | `"/\t/evil.example/x"`, `"/\n\\evil.example/x"` | `https://evil.example/x` |

`\` counts as `/` in the special schemes (`http`, `https`, `ws`, `wss`, `ftp`, `file`), and every page object URL is
one. The check itself stays the resolution, so it also covers anything the sweep did not try. The message lists these
causes and shows where the path resolves. Draft (exact text from a probe at execution):

```text
LoginPage: urlPath must be "" or a path on the base's origin; received "/\\evil.example/x", which resolves to https://evil.example/x. A path whose first "/" is followed by another "/" or a "\" (also with a tab or line break between them) names a host instead.
```

`goto(target)` with a relative target is out of scope. It resolves as Playwright resolves against `baseURL`, and it
claims no page identity.

## Implementation steps

1. `assertUrlPath` takes the base (string or RegExp) and checks the origin after resolution. `PageObject`'s constructor
   passes it ([../src/pageObject.ts#L277-L281](../src/pageObject.ts#L277-L281)).
2. `isOrigin` also requires `new URL(value).href === new URL(value).origin + "/"`, which rejects a bare `?` or `#`.
3. Grep `website/` for the current messages and update every page that shows them.

## Tests

- Unit (`src/helpers/url.test.ts`): `\`, tab and newline variants are rejected with a string base and with a RegExp
  base; `""`, `/`, `/a/b?q#h` and `/søk` still pass. Bases `https://shop.example?` and `https://shop.example#` are
  rejected; `https://shop.example` and `https://shop.example/` still pass.
- Harness (`test/tests/pageObject/`): construction throws with the message.

## Docs

- `website/src/content/docs/docs/urls-and-navigation.md` (the urlPath rule).
- `website/src/content/docs/api/class-pageobject.md` (constructor **Throws**) and the errors page.

## Changeset

`patch`: "A `urlPath` that resolves to another host, such as one with a backslash, a tab or a newline after its first
`/`, is rejected at construction. Before, `goto()` went to that host and `expectThisPage()` failed there. A `baseUrl`
that ends in a bare `?` or `#` is rejected as well."

## Bump

Patch: construction now rejects a value whose page object could never pass its own `expectThisPage()` after `goto()`.

## Decisions

- [x] Option A, the message naming the known causes (2026-10-22)
