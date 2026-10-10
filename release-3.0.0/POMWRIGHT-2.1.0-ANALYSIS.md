# POMWright 2.1.0 — source-verified critical analysis

Working document for the 3.0.0 release, kept in `release-3.0.0/`. File links are relative to that folder. Plans
answering these items sit beside it as `PLAN-<item numbers>-<slug>.md`; decisions and consumer-facing outcomes are
tracked in `DECISIONS.md` and `RELEASE-NOTES-3.0.0.md`.

**How to use this file.** Every finding has a decision row (`Fix / Skip / Discuss`) and a `Notes:` quote block.
Tick a box and write under `Notes:` to record the decision. File references are clickable in VS Code and point at
the exact lines in this repository.

## Method

- Read all 14 runtime files under `src/` (3,774 lines), the root `index.ts`, the integration harness under `test/`,
  the CI workflows, packaging, and all of `docs/v2`.
- Executed the published bundle (`dist/index.mjs`, in sync with `src`) against a stub `Page` that records the locator
  call chain, to prove every runtime claim.
- Type-checked probe snippets against `dist/index.d.ts` with the TypeScript compiler API to prove every type-level claim.
- Checked Playwright behaviour in the installed `@playwright/test@1.62.1` source. Items marked *(Playwright semantics)*
  depend on Playwright rather than POMWright code.

## Corrections to the previous bundle-based analysis

1. **`getById` "double normalisation" is not observable.** `createLocator` normalises a third time at resolution in
   [utils.ts:150](../src/locators/utils.ts#L150), so `add`, seeded `add`, `update` and `replace` all resolve `"##x"` to
   `#x`. Only the stored definitions differ. Downgraded to redundancy (see 1.10).
2. **"Undeclared Playwright devDependency makes `.d.ts` non-reproducible" was wrong.**
   [pnpm-lock.yaml:356](../pnpm-lock.yaml#L356) pins the auto-installed peer to 1.62.1 and CI uses `--frozen-lockfile`.
   The remaining issue is smaller: it floats on lockfile regeneration, and the declared floor `>=1.57.0` is never
   built or tested against.
3. **`getById("#")`** yields id `""` and selector `#` (a Playwright invalid-selector error), not a missing field.
   `getById("")` is the case that yields a missing field and a `TypeError` at resolution.
4. **The `test/` type-check gap is confirmed, not suspected.** No `tsc` runs anywhere, and
   `validation.locatorSchemaPath.typecheck.ts` is not matched by Playwright's `testMatch`, so nothing ever loads it.
5. **`isTerminalStep2`** in the bundle is a real shadowed `const` at
   [locatorRegistry.ts:474](../src/locators/locatorRegistry.ts#L474).

Everything else was confirmed against source. New findings are marked **NEW**.

---

## Second-pass review, reconciled 2026-10-06

An independent second-pass review of this document (ChatGPT, 2026-10-05) was checked claim by claim against the
source, a fresh `dist/index.d.ts` build, and Chromium probes, then folded in here and deleted. It found no factual
errors. Changes it caused:

- 1.1: the CSS string escape must also cover CR and FF, not only LF (probe: a raw CR or FF is a `BADSTRING` error).
- 1.5e: `clear([])` reclassified from bug to contract ambiguity, consistent with `get([])`.
- 1.7: the lazy-initialisation fix must also cover direct use of the protected registry.
- 1.10: the logger bullet split into one defect and two enhancements.
- Section 2: the "rollback is dead" bullet withdrawn, since the registry is public and the rollback is live. The
  four unused type aliases are confirmed absent from the published declarations, so their removal is non-breaking.
- Section 4: `--no-frozen-lockfile` is required by the `file:` tarball approach; the bullet now says so.

Its remaining qualifications were already covered (1.2 cites the docs, 1.4 and 1.9 re-verified, 3.2 names the 1.43
floor) or are design opinions for the individual plans. Its patch/minor/major release split is superseded by the
decision to ship everything as 3.0.0. Test expectations it asked for, carried over for the plans:

- ids containing punctuation, whitespace, quotes, backslashes, LF, CR, FF, leading digits, and literal `#` / `id=`;
- every string/RegExp URL composition quadrant, anchors, flags, slash boundaries, origin normalisation, query, hash;
- positive and negated URL expectations under Playwright assertion timeouts;
- terminal and ancestor frames with `filter`, `first`, `last`, and numeric `nth`;
- session storage: raw strings, empty strings, structured values, queue calls racing a write, handler failures,
  timeout cleanup;
- invalid unseeded registrations, `undefined` update options, replace-mode type failures, the public builder surface;
- compile-only path validation probes under the exact CI command;
- the packed-consumer suite in addition to unit and type tests.

---

## 1. Bugs (verified)

### 1.1 `cssEscape` is a no-op, so `getById(string)` breaks on real-world ids

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Fixed 2026-10-06 by plan 1.1-1.2 (commits 2dca747, 7d4ce93, 53ce672). String ids resolve as `[id="…"]` with
> a CSS string escape for `"`, `\`, LF, CR, FF; `#`/`id=` prefix stripping removed; `cssEscape` and `normalizeIdValue`
> deleted; empty ids throw at registration. Covered by unit tests and the `/testids` integration page.

**Context.** `getById` is the one non-Playwright strategy. A string id is normalised (`#x` → `x`, `id=x` → `x`) and
turned into `locator('#' + cssEscape(id))`. Real ids routinely contain `.`, `:`, `/`, `[`, `]`, spaces, or start with
a digit.

**Intent.** Escape CSS metacharacters so any id works in a `#id` selector.

**Actual.** The character class in the regex closes early. `\\]` is an escaped backslash followed by `]`, so the
pattern means "one metacharacter followed by a literal `]`". `(` and `)` are never in the class. Proof with the stub
page:

| input | resolved selector |
|---|---|
| `settings.panel` | `#settings.panel` (id `settings` **and class** `panel`) |
| `form:user` | `#form:user` (pseudo-class parse error) |
| `items[0]` | `#items[0]` |
| `a.]` | `#a\.]` (the only shape that escapes) |
| `#` | `#` (invalid selector) |

**Where.** [utils.ts:64-67](../src/locators/utils.ts#L64-L67), consumed at
[utils.ts:148-156](../src/locators/utils.ts#L148-L156). Tests cover only three benign inputs:
[add.getById.spec.ts:18-38](../test/tests/locatorRegistry/add/add.getById.spec.ts#L18-L38). Docs claim escaping at
[locator-registry.md:283](../docs/v2/locator-registry.md#L283).

**Example.**

```ts
// page: <section id="settings.panel">…</section>  <div id="settings" class="panel">decoy</div>
this.add("main.panel@settings").getById("settings.panel");
await expect(this.getLocator("main.panel@settings")).toBeVisible();
// resolves locator('#settings.panel') → matches the decoy <div id="settings" class="panel">
```

**Fix.** Use an attribute selector. Inside a double-quoted CSS string five characters need escaping: `"`, `\`, and
the three CSS newline characters LF, CR and FF. A raw occurrence of any of them is a `BADSTRING` parse error
(verified in Chromium 2026-10-06, including a CR that reached the id from markup via `&#13;`). NUL needs nothing:
the DOM accepts it in an id, but no CSS selector can express it, so such an id is unmatchable either way.

```ts
const cssString = (v: string) =>
	v.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ").replace(/\r/g, "\\d ").replace(/\f/g, "\\c ");
return target.locator(`[id="${cssString(id)}"]`);
```

Add unit tests for `.`, `:`, `[`, space, leading digit, `"`, `\`, LF, CR, FF.

### 1.2 `getById(RegExp)` ignores regex semantics

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Fixed 2026-10-06 by plan 1.1-1.2 (same commits). RegExp ids resolve through Playwright's
> `internal:attr=[id=/source/flags]` engine; all flags pass through unchanged (sticky `y` documented as
> version-dependent, see the plan). Ships as a breaking change in 3.0.0.

**Context.** The signature `getById(id: string | RegExp)` mirrors `getByTestId(string | RegExp)`, where Playwright
really does regex-match the attribute.

**Intent.** A reader expects `getById(/^panel-\d+$/)` to match ids like `panel-12`.

**Actual.** The regex *source text* becomes a CSS substring match on the `id` attribute. Anchors, classes,
quantifiers and flags are inert. Proof: `/^panel-\d+$/` → `[id*="^panel-\d+$"]`; `/x/i` → `[id*="x"]`.

**Where.** [utils.ts:153-155](../src/locators/utils.ts#L153-L155); type at
[types.ts:145-148](../src/locators/types.ts#L145-L148); docs at
[locator-registry.md:287-291](../docs/v2/locator-registry.md#L287-L291) describe substring-of-source, but the signature
invites regex use.

**Fix options.** (a) Drop the `RegExp` overload in a major. (b) Throw at registration when the source contains any of
`^$.*+?()[]{}|\` or has flags. (c) `getById(id: string, { match?: "exact" | "contains" | "starts" })` mapping to
`[id=…]`, `[id*=…]`, `[id^=…]`.

### 1.3 `composeFullUrl` has three independent problems

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Fixed 2026-10-08 by plan 1.3-1.4 (commits bc8d980, 4bdc347, 6c225b9). String parts are validated at
> construction (non-empty origin, "" or single-slash path) and resolved with `new URL`, like Playwright's `baseURL`;
> RegExp parts produce a structured `UrlMatcher` (base against the origin, path against the rest, each regex as
> written), so anchors, flags, substring bases, and the seam all behave. Covered by `src/helpers/url.test.ts` and the
> `/testnav` integration page.

**Context.** `PageObject` accepts `baseUrl` and `urlPath` as `string | RegExp` and composes `fullUrl`, which
`expectThisPage`/`expectAnotherPage` match against.

**Intent.** Compose a `fullUrl` that matches exactly this page and preserves the user's regex intent.

**Actual.** Verified through a `PageObject` subclass with a stub page:

| input | result |
|---|---|
| `"https://x.com"` + `/\/user$/i` | `/^https:\/\/x\.com\/user$/` (flag dropped) |
| `"https://x.com"` + `/^\/user\/\d+$/` | `/^https:\/\/x\.com^\/user\/\d+$/` (never matches: `.test("https://x.com/user/12") === false`) |
| `"https://x.com"` + `/\/user\/\d+/` | no trailing `$`; `/user/12/evil` matches |
| `/https:\/\/(a\|b)\.com/` + `"/login"` | no leading `^`; `http://evil?u=https://a.com/login` matches |
| `RegExp` + `RegExp` | no anchors at all |
| `"https://x.com/"` + `"/login"` | `https://x.com//login` |

Anchoring policy differs per branch, flags are lost in every RegExp branch, and the most natural input, a fully
anchored path regex, becomes unmatchable.

**Where.** [pageObject.ts:85-104](../src/pageObject.ts#L85-L104). The same slash-join issue exists in
[navigation.ts:70](../src/helpers/navigation.ts#L70). The harness only exercises the one shape that works, `$` present and
`^` absent: [color.page.ts:7](../test/page-object-models/testApp/pages/testPath/%5Bcolor%5D/color.page.ts#L7).

**Example.**

```ts
class AccountPage extends PageObject<"main", { baseUrlType: string; urlPathType: RegExp }> {
  constructor(page: Page) { super(page, "https://app.example.com", /^\/account\/\d+$/); }
}
await accountPage.navigation.expectThisPage(); // waitForURL never matches → navigation timeout
```

**Fix.** Strip user anchors, re-anchor `^...$`, merge flags from both parts, join strings with `new URL`.

### 1.4 `expectThisPage` exact-compares and retries forever; **NEW** `expectAnotherPage` has the inverse false-pass *(Playwright semantics)*

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Fixed 2026-10-08 by plan 1.3-1.4 (commits 4bdc347, 6c225b9). `expectThisPage` and `expectAnotherPage` are each
> one `page.waitForURL` call under `use.navigationTimeout`, with Playwright's timeout error rethrown naming the
> expected URL and the URL found; `expectAnotherPage` re-checks at once for a bounce. `gotoThisPage` is replaced by
> `goto()`; the `waitForLoadState` option is removed. Covered by `tests/testApp/testNav.spec.ts`.

**Intent.** Wait until the browser is on this page, then give a readable `expected 'X', found 'Y'` failure.

**Actual.** Verified in Playwright 1.62.1 source: a string passed to `waitForURL` goes through
`resolveGlobBase → resolveBaseURL → new URL()`, so `"https://example.com"` matches `https://example.com/`. The
following `toBe(this.fullUrl)` then compares against the normalised `page.url()` and fails. `toPass()` uses
`options.timeout ?? expectConfig().toPass?.timeout ?? 0`, meaning no timeout, so the test dies on the global timeout
with a stack into `toPass`. Any query or hash the app appends triggers the same path. **NEW:** in the same origin-only
case `expectAnotherPage` does `.not.toBe(fullUrl)` and passes immediately while still on the page.

**Where.** [navigation.ts:96-111](../src/helpers/navigation.ts#L96-L111) (`waitForURL` L99, `toPass` L101-107, `toBe`
L105); [navigation.ts:129-133](../src/helpers/navigation.ts#L129-L133). `expectAnotherPage` has no tests at all.

**Example.**

```ts
class Home extends PageObject<"main"> {
  constructor(page: Page) { super(page, "https://example.com", ""); } // "" is allowed by the types
}
await home.navigation.gotoThisPage();   // fine
await home.navigation.expectThisPage(); // waitForURL passes; toBe("https://example.com") vs "https://example.com/" → spins
await home.navigation.expectAnotherPage(); // passes immediately although still on Home
```

**Fix.** `await expect(this.page).toHaveURL(this.fullUrl)` handles normalisation, RegExp, the configured expect
timeout and prints a real diff. Use the negated form for `expectAnotherPage`.

### 1.5 `SessionStorage` contract and ordering problems

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Fixed 2026-10-10 by [PLAN-1.5-SESSION-STORAGE.md](PLAN-1.5-SESSION-STORAGE.md), commits a05e8fd (1, the runtime: sessionStorage.ts, sessionStorageSeed.ts, PageObject, exports, peer floor, unit tests), 06c705f (2, the /teststorage fixture, page objects and the spec), 41f7478 (3, docs/v3), ab76175 (4, changeset).
> The helper is rebuilt on `page.sessionStorage` (peer floor `>=1.61.0`): (a) values are strings stored verbatim, with
> per-key codecs declared once for structured values; (b) `setOnNextNavigation` is replaced by `seed`, which answers
> the next main-frame navigation to the origin with a document that stores the entries before the app's first script,
> for `goto`, links, script and meta redirects, form POSTs and server redirects (seen through a proxy active only while
> a seed is pending); `addInitScript` was rejected because it cannot be removed and overwrites what the app wrote;
> (c) seeds merge per origin in one registry per page; (d) nothing is queued or left registered once a seed is
> applied, a bypassed or never-applied seed fails the test; (e) a literal `[]` is a compile-time error and a computed
> empty list means no keys; (f) `""` reads back as `""`; (g) `waitForContext` is gone, a page without an origin
> fails at once. 38 integration tests against real DOM on chromium, firefox and webkit; 78 unit tests.

All in [sessionStorage.ts](../src/helpers/sessionStorage.ts).

- [x] **a) Values are JSON-encoded, undocumented.** Write at [L96](../src/helpers/sessionStorage.ts#L96), decode at
  [L110](../src/helpers/sessionStorage.ts#L110). `set({ token: "abc" })` stores `"abc"` *with quotes*; the app reads a
  corrupted bearer token. Tests only round-trip through the helper
  ([testPage.spec.ts:138-141](../test/tests/testApp/testPage.spec.ts#L138-L141)), so this is invisible. Docs at
  [session-storage.md:37-51](../docs/v2/session-storage.md#L37-L51) never mention it.
- [x] **b) `setOnNextNavigation` writes after commit** *(Playwright semantics)*. The `framenavigated` listener at
  [L164-172](../src/helpers/sessionStorage.ts#L164-L172) fires once the new document exists, so a SPA that reads storage
  in its first script wins the race. The idiomatic pre-seed is `page.addInitScript`.
- [x] **c) Queue race.** `populateStorage` awaits the write at [L157](../src/helpers/sessionStorage.ts#L157) and clears
  `queuedStates` at [L159](../src/helpers/sessionStorage.ts#L159). A call landing in between is merged and then wiped.
- [x] **d) Handler leak.** No `try/finally` around `populateStorage()` at
  [L164-171](../src/helpers/sessionStorage.ts#L164-L171). One throw leaves `isInitiated = true` forever; later queues
  never flush, and the rejection is unhandled inside an event listener.
- [x] **e) `clear([])` clears everything** at [L240](../src/helpers/sessionStorage.ts#L240). Reclassified 2026-10-06:
  `get([])` returns everything too ([L197](../src/helpers/sessionStorage.ts#L197)), so this is a consistent but
  undocumented empty-array contract rather than a bug. Decide the semantics for both methods together and document
  them.
- [x] **f) Empty string reads as `null`** at [L110](../src/helpers/sessionStorage.ts#L110).
- [x] **g) `waitForContextAvailability` never times out** at [L45-73](../src/helpers/sessionStorage.ts#L45-L73).

**Example (a).**

```ts
await loginPage.sessionStorage.set({ token: "eyJhbGci…" }, { reload: true });
// app: sessionStorage.getItem("token") → '"eyJhbGci…"' → Authorization: Bearer "eyJ…" → 401
```

### 1.6 `filter`/`nth` steps on a `frameLocator` segment are silently dropped

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Intent.** Steps recorded on a segment are applied to that segment in chain order.

**Actual.** The frame branch never reads `steps.get(part)`. Proof:
`add("w.frame").frameLocator("iframe.widget").nth(1)` resolves to
`page.locator("section").frameLocator("iframe.widget").getByRole(...)`, targeting the **first** iframe.

**Where.** [locatorRegistry.ts:472-487](../src/locators/locatorRegistry.ts#L472-L487); steps are read only at
[L490](../src/locators/locatorRegistry.ts#L490) for non-frames. The type allows it because
[locatorRegistrationBuilder.ts:354-363](../src/locators/locatorRegistrationBuilder.ts#L354-L363) returns the
post-definition view; the probe compiled.
[add.frameLocator.spec.ts](../test/tests/locatorRegistry/add/add.frameLocator.spec.ts) has no `nth`/`filter` case.

**Example.**

```ts
this.add("widgets.frame@second").frameLocator("iframe.widget").nth(1);
this.add("widgets.frame@second.button").getByRole("button", { name: "Go" });
await this.getNestedLocator("widgets.frame@second.button").click(); // clicks inside the FIRST iframe
```

**Fix.** Throw at registration, or implement frames as `locator(sel)` → steps → `.contentFrame()` (see 3.2), which
makes `nth` and `filter` work on frames for free.

### 1.7 `PageObject` calls abstract methods from its constructor

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Intent.** A subclass declares locators declaratively and the instance is ready after `new`.

**Actual.** Subclass field initialisers and TypeScript parameter properties are assigned after `super()` returns, so
anything `defineLocators()` reads from subclass state is `undefined`. The failure is silent:
`getByRole("button", { name: undefined })` registers fine and fails later with a locator timeout.

**Where.** [pageObject.ts:70](../src/pageObject.ts#L70) and [pageObject.ts:77](../src/pageObject.ts#L77). Docs mention the
constructor call at [PageObject.md:70](../docs/v2/PageObject.md#L70) with no warning.

**Example.**

```ts
class LoginPage extends PageObject<Paths> {
  constructor(page: Page, private readonly locale: "en" | "nb") { super(page, "https://example.com", "/login"); }
  protected defineLocators() {
    // runs inside super(): this.locale is undefined here
    this.add("main.button@login").getByRole("button", { name: labels[this.locale].login });
  }
}
```

**Fix.** Lazy `ensureDefined()` inside the already-bound accessors, and evaluate
`pageActionsToPerformAfterNavigation()` inside `Navigation.executeActions()` instead of at construction. The lazy
design must also cover direct use of the `protected` `locatorRegistry` by subclasses, which bypasses the accessors;
an explicit initialiser is the alternative if that proves awkward.

### 1.8 Registration accepts incomplete definitions; `update(x, undefined)` clears options

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Intent.** Reject a malformed registration at `add()` time so the stack trace points at the definition.

**Actual, registration side.** Truthiness checks at
[locatorRegistrationBuilder.ts:359](../src/locators/locatorRegistrationBuilder.ts#L359) (`frameLocator`),
[L377](../src/locators/locatorRegistrationBuilder.ts#L377) (`getByTestId`),
[L393](../src/locators/locatorRegistrationBuilder.ts#L393) (`getById`), and the options-only runtime path at
[L134-142](../src/locators/locatorRegistrationBuilder.ts#L134-L142) (`getByRole` and siblings) commit without a primary
field, because `commit` at [L399-412](../src/locators/locatorRegistrationBuilder.ts#L399-L412) never checks. Proof:

| call | registered as |
|---|---|
| `getByRole({ name: "x" })` (via `any`/JS) | `page.getByRole(undefined, { name: "x" })` |
| `getByTestId("")` | `page.getByTestId(undefined)` |
| `frameLocator("")` | `page.frameLocator(undefined)` |
| `getById("")` | `TypeError: Cannot read properties of undefined (reading 'source')` at resolution |

**Actual, update side.** `parseUpdateArguments` at
[locatorUpdateBuilder.ts:19-24](../src/locators/locatorUpdateBuilder.ts#L19-L24) forces `hasOptions` when callers pass
`args.length >= 2` ([L330](../src/locators/locatorUpdateBuilder.ts#L330)), and `mergeOptions` at
[L44-60](../src/locators/locatorUpdateBuilder.ts#L44-L60) returns `undefined` when `"options" in updates` holds
`undefined`. Proof: registered `getByRole("button", { name: "Login" })`, then
`update().getByRole("button", undefined)` resolves to `page.getByRole("button")`.

**Example.**

```ts
const opts = process.env.EXACT ? { exact: true } : undefined;
loginPage.getLocatorSchema("main.button@login").update().getByRole("button", opts).getNestedLocator();
// EXACT unset → the registered { name: "Login" } is wiped, not preserved
```

**Fix.** `commit()` requires the primary field unless seeded; treat an explicit `undefined` second argument as
"not provided", or document that `undefined` clears. The `getById` row is resolved by plan 1.1-1.2 (2026-10-06):
an empty or missing id throws at registration in all three builders. The other strategies remain open.

### 1.9 Type-level gaps (each proven with `tsc` against `dist/index.d.ts`)

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

- [ ] **a) Replace mode is not in the types.** `mode` is a runtime constructor value at
  [locatorUpdateBuilder.ts:305](../src/locators/locatorUpdateBuilder.ts#L305); the argument tuple at
  [L62](../src/locators/locatorUpdateBuilder.ts#L62) is mode-agnostic. `replace().getByRole()` compiles and throws
  `Locator replace for "…" of type "role" requires a "role" value.` Fix: add a `Mode` type parameter and select the
  tuple from it.
- [ ] **b) `LocatorQueryBuilderPublic` leaks internals after one call.**
  [locatorQueryBuilder.ts:16-22](../src/locators/locatorQueryBuilder.ts#L16-L22) uses `Pick`, under which
  `filter(): this` ([L119-123](../src/locators/locatorQueryBuilder.ts#L119-L123)) resolves to the full class.
  `LocatorUpdateBuilder.commit` ([locatorUpdateBuilder.ts:595-599](../src/locators/locatorUpdateBuilder.ts#L595-L599))
  returns the class too. `@internal` on `applyUpdate` ([L225](../src/locators/locatorQueryBuilder.ts#L225)) and
  `applyReplacement` ([L289](../src/locators/locatorQueryBuilder.ts#L289)) is inert because
  [tsconfig.json](../tsconfig.json) lacks `stripInternal`. Proof:
  `getLocatorSchema("a").filter({ hasText: "x" }).applyReplacement("a", { type: "locator", selector: "div" })`
  compiles.
- [ ] **c) Whitespace parity.** [types.ts:4-29](../src/locators/types.ts#L4-L29) lists 25 characters without `\uFEFF`;
  [utils.ts:32](../src/locators/utils.ts#L32) uses `\s`, which includes it. `add("main\uFEFF.form")` compiles and throws
  `cannot contain whitespace chars`.
- [ ] **d) Missing exports.** [index.ts](../index.ts) omits `ReusableLocator`, `ReusableLocatorBuilder`,
  `LocatorQueryBuilderPublic`, `FilterDefinition`, `IndexSelector`, `LocatorDescription`, `LocatorSchemaPathFormat`,
  `SessionStorageState`. The `export *` at [locators/index.ts:14-15](../src/locators/index.ts#L14-L15) is not re-exported
  by root. A user cannot name the type of `registry.createReusable.getByRole(...)` in a shared locators file.
  `SessionStorageState` resolved 2026-10-10 by plan 1.5: the type is gone, and `Codec`, `SessionStorageSchema`, `json`
  and `StorageTypeFromOptions` are exported instead; the locator types remain for plan 7.
- [ ] **e) NEW: the pre-definition builder allows `filter`/`nth`/`describe` before a strategy.**
  [locatorRegistrationBuilder.ts:512-529](../src/locators/locatorRegistrationBuilder.ts#L512-L529) intersects the
  post-definition type. `add("a").filter({...})` and `add("a.b").describe("d")` compile and throw at
  [L455](../src/locators/locatorRegistrationBuilder.ts#L455) and [L461](../src/locators/locatorRegistrationBuilder.ts#L461).
  The describe-first message, "No locator schema definition provided for path", does not say what went wrong.

### 1.10 Smaller correctness issues

> Notes:

- [ ] `isLocatorInstance` accepts arrays ([utils.ts:307-309](../src/locators/utils.ts#L307-L309)); `filter({ has: [] })`
  passes straight through to Playwright. Also check `nth`/`locator` are functions.
- [ ] The duplicate-registration error serialises the whole record, including any `Locator` in a `has:` step
  ([locatorRegistry.ts:220-224](../src/locators/locatorRegistry.ts#L220-L224),
  [utils.ts:92-110](../src/locators/utils.ts#L92-L110)). A tiny fake produced 5.7k characters. Fix: render locators as
  `String(locator)` in the replacer.
- [x] Resolved 2026-10-06 by removal: plan 1.1-1.2 deleted `normalizeIdValue` (commit 7d4ce93), so ids are stored
  and matched verbatim and the line references below are historical. `normalizeIdValue` was applied one to three times depending on path
  ([locatorRegistrationBuilder.ts:394](../src/locators/locatorRegistrationBuilder.ts#L394),
  [utils.ts:294](../src/locators/utils.ts#L294), [locatorUpdateBuilder.ts:585](../src/locators/locatorUpdateBuilder.ts#L585),
  [L187](../src/locators/locatorUpdateBuilder.ts#L187), [L285](../src/locators/locatorUpdateBuilder.ts#L285),
  [utils.ts:150](../src/locators/utils.ts#L150)). Redundant rather than wrong, but an id literally starting with `#` can
  never be targeted. Normalise once, at registration.
- [ ] Asymmetric seeded recovery: a wrong-type override rolls back and throws, a second same-type override throws and
  leaves the first override registered
  ([locatorRegistrationBuilder.ts:428-451](../src/locators/locatorRegistrationBuilder.ts#L428-L451)).
- [ ] `remove()` then `update()` rehydrates the definition only. Steps become `[]` and the description is dropped
  ([locatorQueryBuilder.ts:230-236](../src/locators/locatorQueryBuilder.ts#L230-L236)). Proof:
  `locator("li").nth(0).describe("first item")` → `locator("li", { hasText })` described by its path. Undocumented.
- [ ] **NEW:** `filter`/`nth` on a removed sub-path are accepted, since `ensureSubPath` at
  [L399-403](../src/locators/locatorQueryBuilder.ts#L399-L403) admits tombstones, then silently discarded at resolution.
  `applyUpdate` at [L234](../src/locators/locatorQueryBuilder.ts#L234) also wipes them.
- [ ] `ensureSubPath` conflates "not a sub-path" with "sub-path not registered"
  ([L401](../src/locators/locatorQueryBuilder.ts#L401)); `getLocator()` after `remove()` says "No locator schema
  registered" ([L351](../src/locators/locatorQueryBuilder.ts#L351)).
- [x] `goto` is disabled by the `urlPath` type ([navigation.ts:65](../src/helpers/navigation.ts#L65),
  [L26](../src/helpers/navigation.ts#L26)) although it only needs a string `baseUrl`. A string-base plus RegExp-path page
  cannot call `goto("/settings")`; probe confirmed the type error. Fixed 2026-10-08 by plan 1.3-1.4: `goto(target)` is
  always available, typed by the `baseUrl` type.
- [ ] `@step`: sync methods become async while the type says `Return`
  ([stepDecorator.ts:52](../src/helpers/stepDecorator.ts#L52)); no `context.kind === "method"` check
  ([L62-65](../src/helpers/stepDecorator.ts#L62-L65)); legacy static methods fall through to the factory branch because
  `typeof target === "function"` ([L29-30](../src/helpers/stepDecorator.ts#L29-L30)).
- [ ] Logger defect: `${message}\n\n${args.join("\n\n")}` renders objects as `[object Object]`
  ([playwrightReportLogger.ts:75](../src/helpers/playwrightReportLogger.ts#L75)).
- [ ] Logger enhancements, not defects: `nb-NO` is hard-coded
  ([L166-175](../src/helpers/playwrightReportLogger.ts#L166-L175)); one attachment per entry
  ([L190-193](../src/helpers/playwrightReportLogger.ts#L190-L193)).

---

## 2. Dead, redundant, or unnecessary code

> Notes:

- [ ] [locatorRegistry.ts:461-470](../src/locators/locatorRegistry.ts#L461-L470) is unreachable. `definitions` and
  `tombstones` are disjoint by construction (`remove` deletes then tombstones; `applyUpdate`/`applyReplacement`
  un-tombstone then set), and `registeredChain` is already filtered by `definitions.has`. The tombstone half of
  [L442](../src/locators/locatorRegistry.ts#L442) is redundant for the same reason.
- [ ] [locatorRegistry.ts:474](../src/locators/locatorRegistry.ts#L474) shadows `isTerminalStep` from
  [L459](../src/locators/locatorRegistry.ts#L459).
- [ ] `debugSteps` is built at [L448-454](../src/locators/locatorRegistry.ts#L448-L454),
  [L485](../src/locators/locatorRegistry.ts#L485), [L511-517](../src/locators/locatorRegistry.ts#L511-L517) and returned at
  [L524](../src/locators/locatorRegistry.ts#L524). All three callers destructure only `locator`
  ([L322](../src/locators/locatorRegistry.ts#L322), [locatorQueryBuilder.ts:367](../src/locators/locatorQueryBuilder.ts#L367),
  [L392](../src/locators/locatorQueryBuilder.ts#L392)). Delete, or promote to `registry.explain(path)` (3.3).
- [ ] [locatorRegistry.ts:216-219](../src/locators/locatorRegistry.ts#L216-L219) unreachable `if (!existing)`;
  [L264](../src/locators/locatorRegistry.ts#L264) `undefined as never`.
- [ ] [locatorRegistry.ts:410](../src/locators/locatorRegistry.ts#L410): `getLocator` constructs a full
  `LocatorQueryBuilder`, cloning every ancestor, to use one node.
- [ ] [locatorRegistry.ts:498](../src/locators/locatorRegistry.ts#L498) array-generic helper for a single element;
  [L180-183](../src/locators/locatorRegistry.ts#L180-L183) only reachable via `any`.
- [ ] Triple cloning per segment: [locatorQueryBuilder.ts:47-57](../src/locators/locatorQueryBuilder.ts#L47-L57),
  [locatorRegistry.ts:267-272](../src/locators/locatorRegistry.ts#L267-L272),
  [locatorQueryBuilder.ts:420](../src/locators/locatorQueryBuilder.ts#L420).
- [ ] [types.ts:183](../src/locators/types.ts#L183) `index: IndexSelector | null` has no producer.
  [L73-77](../src/locators/types.ts#L73-L77) and [L90-91](../src/locators/types.ts#L90-L91) are three identical aliases.
  [L201-209](../src/locators/types.ts#L201-L209): the first union member is a subset of the second.
  `LocatorSchemaPathErrors`, `ValidLocatorPath`, `FilterPatch`, `PathIndexMap` ([L65](../src/locators/types.ts#L65),
  [L76](../src/locators/types.ts#L76), [L211-224](../src/locators/types.ts#L211-L224), [L256](../src/locators/types.ts#L256))
  are referenced nowhere. None of the four appears in the published `dist/index.d.ts` (checked 2026-10-06 on a
  fresh build), so removing them is not a consumer-facing change.
- [x] [pageObject.ts:25](../src/pageObject.ts#L25) `"" | string`: written as `string` by plan 1.3-1.4 (2026-10-08).
- [ ] [pageObject.ts:83](../src/pageObject.ts#L83) plus [navigation.ts:41](../src/helpers/navigation.ts#L41) make
  `null` and `[]` identical, and the abstract method forces `return [];` boilerplate in every page object.
- [x] Withdrawn 2026-10-06. [locatorRegistrationBuilder.ts:479-484](../src/locators/locatorRegistrationBuilder.ts#L479-L484)
  was listed here as dead because the `PageObject` path discards the registry when the constructor throws. But
  `createRegistryWithAccessors` is public, so a standalone registry survives a builder error and the rollback is
  live. Keep it. The asymmetric recovery is tracked in 1.10.
- [ ] [playwright.base.ts:16](../playwright.base.ts#L16) `retries: process.env.CI ? 1 : 1`.
- [ ] `.npmignore` is redundant with `package.json#files`.
- [ ] Local only: a stray `src/dist/` build output from January, gitignored. Delete it.

---

## 3. Structural improvements

### 3.1 Eight parallel per-strategy switches

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Where.** [utils.ts:125-162](../src/locators/utils.ts#L125-L162), [L164-219](../src/locators/utils.ts#L164-L219),
[L221-302](../src/locators/utils.ts#L221-L302); [locatorUpdateBuilder.ts:66-198](../src/locators/locatorUpdateBuilder.ts#L66-L198),
[L200-296](../src/locators/locatorUpdateBuilder.ts#L200-L296), [L321-593](../src/locators/locatorUpdateBuilder.ts#L321-L593);
[locatorRegistrationBuilder.ts:126-397](../src/locators/locatorRegistrationBuilder.ts#L126-L397);
[reusableLocatorBuilder.ts:71-193](../src/locators/reusableLocatorBuilder.ts#L71-L193).

**Problem.** Ten strategy types × eight places. The five text-like strategies are byte-identical apart from the
literal. Adding or fixing a strategy means touching about eight places, which is how `getById` diverged. Roughly 300
lines are mechanical.

**Suggestion.** A strategy table (`{ key, hasOptions, pw }` per type, `as const satisfies Record<Type, …>`) collapses
clone, patch, merge, replace and create into one generic helper each, and makes the mode-aware argument tuples in
1.9a derivable from `hasOptions`.

### 3.2 Modernise frame handling

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Where.** [locatorRegistry.ts:472-487](../src/locators/locatorRegistry.ts#L472-L487).

**Suggestion.** Playwright ≥1.43 (inside the peer range) allows
`locator(sel)` → apply steps → `.contentFrame()` for descendants, and the owner locator for the terminal case. One
code path for all strategies, `nth`/`filter` work on frames, and 1.6 disappears.

### 3.3 The 2.1.0 default `describe(path)` should be an option

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Where.** [locatorRegistry.ts:520-522](../src/locators/locatorRegistry.ts#L520-L522).

**Problem.** `describe()` changes `toString()`. The repo's own test has to strip it with `.describe("")` before
comparing ([getLocatorSchema.remove.spec.ts:31](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.remove.spec.ts#L31)).
Terminal failures now print the path (already visible at the call site) instead of the chain that was tried, and
`getLocator` and `getNestedLocator` describe identically for different locators. A minor release changed observable
behaviour for anyone logging or comparing locator strings.

**Suggestion.** Registry/PageObject option `describe: "path" | "chain" | "path+chain" | "off"`. Skip describing `has:`
sub-locators. The dead `debugSteps` data is most of a `registry.explain(path)` that could render `"chain"`.

### 3.4 Sparse chains are a silent failure mode

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Where.** [locatorRegistry.ts:440](../src/locators/locatorRegistry.ts#L440); documented as supported-but-discouraged at
[locator-registry.md:393-397](../docs/v2/locator-registry.md#L393-L397).

**Problem.** A forgotten ancestor silently loosens scope, and the looser locator often still passes, the opposite of
the README's "implicit DOM structure validation".

**Suggestion.** `createRegistryWithAccessors(page, { strictChains: true })`, or a one-time warning per sparse path.

### 3.5 Path reuse returns `void`

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Where.** [locatorRegistry.ts:168-178](../src/locators/locatorRegistry.ts#L168-L178); documented at
[locator-registry.md:570](../docs/v2/locator-registry.md#L570).

**Problem.** `add(p, { reuse: "other" }).describe("…")` is a type error, while `add(p, { reuse: seed })` returns a
seeded builder. A registered record is a seed; the two forms differ for no structural reason.

### 3.6 Fail fast at registration

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

In `LocatorRegistrationBuilder.commit`: require the primary field when not seeded (1.8), reject steps on frames until
3.2 lands (1.6), and optionally add `registry.verify()` that resolves every `has:`/`hasNot:` path reference once after
`defineLocators()`, so forward references stay allowed but typos are caught before any test action.

### 3.7 Registry per instance

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Where.** [pageObject.ts:61-70](../src/pageObject.ts#L61-L70). Each `new SomePage(page)` re-runs `defineLocators()`.
No measurable cost today; only worth a per-class definition cache if profiling ever shows it. Low priority.

### 3.8 NEW: seed builders mutate in place

- [ ] Fix  - [ ] Skip  - [ ] Discuss

> Notes:

**Where.** [reusableLocatorBuilder.ts:42-55](../src/locators/reusableLocatorBuilder.ts#L42-L55) push onto the shared
list and return `this`, so `base.filter(...) === base` and `base.steps` now contains the filter. The docs' "Seed
immutability" section at [locator-registry.md:591-593](../docs/v2/locator-registry.md#L591-L593) covers a different
property (that `add` clones the seed). Either return a new builder per call or document the mutation.

---

## 4. Packaging, tooling, CI

> Notes:

- [ ] [package.json:16](../package.json#L16) `"Apache 2.0"` is not an SPDX id. Use `"Apache-2.0"`; npm and licence
  scanners warn otherwise.
- [ ] No `exports` map, `engines`, or `sideEffects`. `index.d.mts` is emitted but never selected by TypeScript.
- [ ] `@playwright/test` is undeclared at root and pinned only by the lockfile
  ([pnpm-lock.yaml:356](../pnpm-lock.yaml#L356)). The floor `>=1.57.0` is never exercised. Raised to `>=1.61.0` by plan 1.5 on 2026-10-10 (`page.sessionStorage`); the floor matrix remains for plan 6.
  [test/package.json:12](../test/package.json#L12) hard-pins 1.62.1. Declare it, and consider a CI matrix on the floor.
- [ ] [pack-test.sh:18](../pack-test.sh#L18) `--no-frozen-lockfile` leaves `test/pnpm-lock.yaml` decorative for the
  harness's own dependencies. The flag itself is required, not a defect (corrected 2026-10-06): the lockfile pins
  `pomwright` by tarball integrity hash and still records 2.0.0, and every fresh pack changes the hash, so a frozen
  install can never pass with a `file:` tarball. The fix is a harness design choice, for example a frozen install of
  the fixture followed by adding the tarball in a separate step, or a temporary consumer project.
  **Two more findings from executing plan 1.1-1.2 (2026-10-06):** (a) `pnpm install --no-frozen-lockfile` does *not*
  refresh a `file:` tarball whose specifier is unchanged. The local harness was still running a 2.0.0 install while
  the package was at 2.1.0, and it kept running pre-fix code after a fresh pack; only
  `pnpm add -D pomwright@file:../pomwright-test-build.tgz` re-resolved it. Locally, pack-test can silently test a
  stale build. (b) `pack-test.sh` cannot run non-interactively: `playwright install --with-deps` and the harness
  postinstall `playwright install-deps` both shell out to `sudo`, which needs a TTY or passwordless sudo. The
  equivalent that works anywhere browsers are already installed is `./pack-build.sh`, then in `test/`
  `pnpm add -D pomwright@file:../pomwright-test-build.tgz --ignore-scripts` and
  `pnpm exec playwright test --project=chromium`.
  [L20](../pack-test.sh#L20) runs chromium only. Firefox/WebKit never run (relevant for `SessionStorage` on `about:blank`).
- [ ] **NEW: publishing is not gated on tests.** [publish.yaml:4](../.github/workflows/publish.yaml#L4) triggers on the
  `CI` workflow (lint plus build). The test workflow is separate, so a release can publish with a red suite on `main`.
- [ ] **NEW: compile-time guarantees are untested.** No `tsc` step exists anywhere, and
  [validation.locatorSchemaPath.typecheck.ts](../test/tests/locatorRegistry/validation/validation.locatorSchemaPath.typecheck.ts)
  is not a `*.spec.ts`, so Playwright never loads it either. Add `tsc --noEmit -p test` to CI.
- [ ] [package.json:29](../package.json#L29) lints `./src` only. Root `index.ts`, `playwright.base.ts` and `test/` are
  unlinted although `biome.json` already includes them.
- [ ] No `stripInternal` in [tsconfig.json](../tsconfig.json) (1.9b).
- [ ] No unit-test layer. `utils.ts`, `locatorUpdateBuilder.ts` and `composeFullUrl` are pure; a `node:test` file with
  zero dependencies would have caught 1.1 to 1.3 in milliseconds.
- [ ] [CHANGELOG.md:26](../CHANGELOG.md#L26) says `pack-test.sh` was removed in 2.0.0; it exists.

---

## 5. Documentation errors

> Notes:

### README.md

- [ ] [L12](../README.md#L12) "approachs", "the provided the", "POMS".
- [ ] [L163](../README.md#L163) "Simmilarily".
- [ ] [L168](../README.md#L168) vs [L190](../README.md#L190): import with and without the `.ts` extension.
- [ ] [L257](../README.md#L257) "Hellow".
- [ ] [L286](../README.md#L286) "POCs" (v1 term).
- [ ] Missing: which decorator flavour `@step` needs; minimum Node version.

### docs/v2/overview.md

- [ ] [L1](../docs/v2/overview.md#L1) titled v2.0.0 while describing 2.1.0 behaviour.
- [ ] [L70](../docs/v2/overview.md#L70), [L99](../docs/v2/overview.md#L99) "POC".
- [ ] [L111-112](../docs/v2/overview.md#L111-L112) missing comma in the import list.
- [ ] [L124](../docs/v2/overview.md#L124) `class LoginPage<Paths>` declares a type parameter that shadows the union and
  fails the `string` constraint.
- [ ] [L302](../docs/v2/overview.md#L302) comment text outside the comment.
- [ ] [L327-330](../docs/v2/overview.md#L327-L330) `data.theme` is never re-read after `reload()`, so the final assertion
  cannot pass.
- [ ] [L386](../docs/v2/overview.md#L386) imports `expect` from `pomwright`; it is not exported.
- [ ] [L429-433](../docs/v2/overview.md#L429-L433) stale type-export list (omits `LogEntry`, `LogLevel`, accessors).
- [ ] [L509](../docs/v2/overview.md#L509), [L511-513](../docs/v2/overview.md#L511-L513) "differances", "Indepth",
  "SessiosStorage".

### docs/v2/locator-registry.md

- [ ] [L26](../docs/v2/locator-registry.md#L26) TOC entries merged; numbering restarts.
- [ ] [L283](../docs/v2/locator-registry.md#L283) claims CSS escaping (1.1).
- [ ] [L287-291](../docs/v2/locator-registry.md#L287-L291) RegExp example hides 1.2.
- [ ] [L320-322](../docs/v2/locator-registry.md#L320-L322) `getNestedLocator(path)...getNestedLocator()` should be
  `getLocatorSchema`. Also, recommending a page-rooted nested chain for `has` is rarely right, because `has` is
  evaluated relative to the outer element *(Playwright semantics)*.
- [ ] [L345](../docs/v2/locator-registry.md#L345) v1 "inline frame locator" wording.
- [ ] [L668](../docs/v2/locator-registry.md#L668) lists an error string that does not exist in `src`.
- [ ] [L727](../docs/v2/locator-registry.md#L727) best practice 5 recommends terminal-only resolution without saying so.
- [ ] Missing: 1.6 (frame steps ignored), 1.8 (`undefined` clears options), 1.10 (`remove`→`update` drops steps).

### docs/v2/PageObject.md

- [ ] [L70](../docs/v2/PageObject.md#L70) needs the 1.7 warning.
- [ ] [L77](../docs/v2/PageObject.md#L77) implies `null` differs from `[]`.
- [ ] [L279](../docs/v2/PageObject.md#L279) `page as Page` is noise.

### docs/v2/session-storage.md

- [x] [L37-51](../docs/v2/session-storage.md#L37-L51) no JSON contract (1.5a). Closed 2026-10-10: `docs/v3/session-storage.md` is
  rewritten around strings-by-default and per-key codecs.
- [x] [L66](../docs/v2/session-storage.md#L66) accurate but contradicts the method's implied use; add the
  `addInitScript` alternative. Closed 2026-10-10: `setOnNextNavigation` is replaced by `seed`, and `addInitScript` is
  documented as rejected (it cannot be removed and overwrites what the app wrote).

### docs/v2/logging.md

- [ ] [L18](../docs/v2/logging.md#L18) `expect` import.
- [ ] [L98-104](../docs/v2/logging.md#L98-L104) uses undeclared `sharedLogLevel`/`sharedLogEntry`.

### docs/v2/composing-locator-modules.md

- [ ] [L317](../docs/v2/composing-locator-modules.md#L317) "diviate".

### AGENTS.md

- [ ] [L14](../AGENTS.md#L14) "thenable query builders". There is no `then` anywhere in `src`; v2 builders are
  synchronous. An agent following this will try to add thenables back.

---

## 6. Suggested fix order

1. `getById` escaping and RegExp handling (1.1, 1.2) with unit tests.
2. `composeFullUrl` anchoring, flags, slash join (1.3).
3. `expectThisPage`/`expectAnotherPage` → `toHaveURL` (1.4).
4. Lazy `defineLocators()` (1.7).
5. Frame steps: throw or `contentFrame()` (1.6, 3.2).
6. SessionStorage: document JSON, fix `clear([])`, handler leak, add `addInitScript` variant (1.5).
7. Packaging and CI: SPDX id, `exports`, gate publish on tests, `tsc` step, unit layer, `stripInternal` (§4).
8. Docs (§5), about an hour.
9. Structural items (§3, 1.9) as a planned 2.2 or 3.0.

## 7. What is sound

The registry model, path typing and its diagnostics (the invalid-path control probe failed exactly as designed),
sub-path narrowing, clone-on-read semantics, cycle detection, and the terminal-only resolution of `has:` path
references (the correct reading of Playwright's relative `has`). The pack-then-test harness design is good hygiene.
Every real defect sits in the thin adapters around Playwright and in the docs, which is also where test coverage is
thinnest.
