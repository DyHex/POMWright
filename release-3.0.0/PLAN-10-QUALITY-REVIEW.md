# Plan 10: quality review of the 3.0.0 code

Working document, kept in `release-3.0.0/` beside the plans it follows. Plan 10 is an objective review of POMWright as it
stands on `chore/bugfixes-quality-improvements-and-docs`, the code that will ship as 3.0.0, with fresh eyes: missing
items, new bugs (including interactions between plans 1 to 9), unintended behaviour, inconsistencies, things that should
have been done better, and tests. It is not a re-run of the 2.1.0 analysis; analysis items are cited by number. File
links are relative to this folder.

Written 2026-10-16. Part 1 holds the findings; they were triaged on 2026-10-16: every finding R1 to R21 is *Fix*, each
as recommended (R16 as option A, R7 with a message that names `clearSteps`); R22, found while verifying R5's fix, was
added and decided *Fix* the same day, and R5's fix was widened with it. Part 2 is the plan for them, in the shape of
[PLAN-3-STRUCTURE.md](PLAN-3-STRUCTURE.md).

**Executed 2026-10-16** on `chore/bugfixes-quality-improvements-and-docs`, one commit per execution step: 4c6ec60 (1,
locators: R6, R7, R9, R10, R11, R12, R14, R13's locator comments, R21's move, unit tests red first), 92467aa (2, URLs
and `PageObject`: R1, R3, R4), 0acaf87 (3, session storage: R5 and R22), 28f5075 (4, the logger: R18), bfc6c05 (5,
the harness: the fragment, timing, URL and seed specs, red against 3e560d8 on 11 chromium and 8 webkit tests; R19,
R20; the changed expectations; the type probes; R15's `biome-ignore`; R17), e296675 (6, CI and tooling: R2, R15's
flag, R16), 78fcc76 (7, `docs/v3`), 4d9c124 (8, the changesets `quality-review-fixes`, patch, and
`page-object-options`, minor), step 9 (the full run found nothing to fix, so it has no commit), and the ledger commit
for step 10 that carries this note. Final run: `pnpm format` and `pnpm lint` (`--error-on-warnings`) clean, 664 unit
tests with no type errors, `pnpm build`, `pnpm pack-test` 1317 passed (439 per browser) with both type checks; the
re-runs of 10.4 against the final build as planned: Q22, Q23, Q28 and Q29, 45 passed on three browsers; Q24; the eight
surviving mutants of Q14 each killed; Q15, the consumer copy's errors unchanged from the 3e560d8 build. One existing
unit expectation the plan had not listed changed with R7 (`locatorUpdateBuilder.test.ts`, the any-frame replace of a
query's own path); this and the other execution-time decisions are in [DECISIONS.md](DECISIONS.md) (plan 10).

Every claim below was verified against HEAD 3e560d8 (level with `origin`), never in the working tree, in scratchpad
clones: `base` (`pnpm install --frozen-lockfile`, `pnpm build`, `pnpm harness:install`) for runtime, runner and type
probes; `cov` with `@vitest/coverage-v8` 5.0.3 added (clone only, no decision needed) for the unit layer; `mut` for the
mutation probes. Runtime probes are Node scripts against the clone's `dist/index.js` with chromium from the clone's root
`@playwright/test` 1.64.0; helper-level probes bundle the clone's `src` with the repository's esbuild; runner probes are
temporary specs in the clone's `test/` with their own config (routes, or a throwaway server on port 9100, never the
harness server), run on chromium, firefox and webkit; type probes use the repository's TypeScript 5.9.3 under the
harness `tsconfig.json`, every negative a consumed `@ts-expect-error` or a reported error, and TypeScript 6.0.3 where
stated. Node 24.19.0. Usage facts come from one 2.1.0 consumer project (124 TypeScript files), counts only.

Probes cited below:

- **Q1** baseline on the `base` clone: `pnpm lint` (exit 0, one warning), 598 unit tests with no type errors, both
  `tsc` passes of `pnpm typecheck`, and the whole harness on chromium, firefox and webkit: 1281 passed.
- **Q2** `tsc`: the no-argument forms of every seeded override and of `update()`; a seeded builder held in a variable.
- **Q3** runtime: a held seeded builder called twice, and after a step; a held unseeded builder given two strategies.
- **Q4** runtime: the any-frame rule through the query builder (`filter`, `nth`, `replace(sub).frameLocator()` on a
  segment with steps, on a non-root segment and on the terminal, `update(sub).frameLocator("…")`) and the messages of
  each builder for a step on an any-frame definition.
- **Q5** `tsc`: naming the `PageObject` constructor options, the registry options, the `SessionStorage` options and the
  seed options from a consumer project.
- **Q6** URL matching: `composeFullUrl` and `createUrlMatcher` over string paths that `new URL` normalises (helper level),
  then a runner spec on three browsers: `goto()`, `expectThisPage`, `expectAnotherPage` and Playwright's own
  `toHaveURL(fullUrl)` for `/søk`, `/a b`, `/x?q=a b`.
- **Q7** a `PageObject` whose `baseUrl` or `urlPath` is `undefined`, `null` or a number at runtime (a missing
  environment variable typed as `string`): construction, then `goto()`, `expectThisPage`, `expectAnotherPage` and
  `sessionStorage.set` in the runner.
- **Q8** `seed` and URL fragments, runner, three browsers: a seeded `goto` to `…/app#/orders/7`, and a server 302 into a
  seeded origin from a URL with a fragment; each against the same navigation without a seed.
- **Q9** hand-made seed objects (`ReusableLocator`-shaped) with an empty or missing primary, through `add(path, { reuse })`
  and `verify()`.
- **Q10** the duplicate-registration message when a RegExp appears twice.
- **Q11** the registry's entry points with a path that is not a string, from JavaScript.
- **Q12** `applyDefinitionPatch` with a patch of another strategy (helper level).
- **Q13** coverage: the unit layer with `@vitest/coverage-v8`, and what the harness executes of the packed
  `dist/index.js` (`NODE_V8_COVERAGE` over the three-browser run, ranges merged per byte).
- **Q14** mutation: 96 mutants, each breaking one rule from the ledgers in `src/`, each run against the unit tests
  (runtime) and, after a rebuild and a frozen install of the tarball, against the chromium harness; section 9.
- **Q15** the consumer project, copied into the scratchpad (the original untouched; `.env` not copied), type-checked
  with its own compiler (TypeScript 6.0.3, `declaration: true`, `strict: false`) against 2.1.0 with Playwright 1.63.0
  and against the packed 3.0.0 with Playwright 1.64.0; the new errors classified against the upgrade checklist; the
  call sites of changes that compile but behave differently, counted.
- **Q16** TypeScript 6.0.3 over the harness, the public-types probe, the declaration-emit probe and the published
  declarations with `skipLibCheck: false` (and the last also on 5.9.3).
- **Q17** the bundle: what `dist/index.js` requires, JavaScript features newer than Node 20 in `src/`.
- **Q18** the harness on the newest `@playwright/test` in the peer range, 1.64.1, on three browsers.
- **Q19** `biome check --error-on-warnings`.
- **Q20** a static sweep of the harness: sleeps, `toBeDefined`/`toBeTruthy`, tests without an assertion, page objects
  the fixture test covers.

---

## Part 1. Findings

Severity: **bug** (wrong result a consumer can hit), **wrong behaviour** (does what no decision says), **inconsistency**,
**quality**, **test gap**, **docs**. Documentation errors without a code change are assigned to plan 11.

| # | finding | severity | from |
| --- | --- | --- | --- |
| R1 | the `PageObject` constructor options cannot be named; `LocatorRegistryOptions`, `SessionStorageOptions`, `SeedOptions` unexported | quality (types) | 1.3-1.4, 1.5, 9 |
| R2 | CI never runs on Node 20, the declared floor | quality (CI) | 4 |
| R3 | a string `urlPath` that `new URL` normalises (`/søk`, `/a b`) never matches its own page; `expectAnotherPage` passes on it | bug | 1.3-1.4 |
| R4 | an `undefined`/`null`/number `baseUrl` or `urlPath` is accepted and never matches | bug | 1.3-1.4 |
| R5 | a seeded navigation loses the URL fragment (`#/route`), directly and through a redirect | bug | 1.5 |
| R6 | a hand-made seed bypasses the primary checks | inconsistency | 9 |
| R7 | `replace(sub).frameLocator()` on a segment with steps fails only at resolution; those checks untested | inconsistency, test gap | 1.6-1.8, 9 |
| R8 | a held seeded builder takes a second override and an override after a step; docs say neither can happen | docs, inconsistency | 9 |
| R9 | a non-string path fails with `path.startsWith is not a function` | quality | 2.x |
| R10 | the duplicate-registration message prints a repeated RegExp as `"[Circular]"` | quality | 1.10-2 |
| R11 | a step on an any-frame segment gets two different messages | inconsistency | 1.6-1.8, 9 |
| R12 | the no-argument seeded overrides are typed unevenly against 7.16 | inconsistency (types) | 1.6-1.8, 9 |
| R13 | doc comments in hovers contradict the contract; the declarations point at release files | inconsistency | several |
| R14 | `applyDefinitionPatch` builds a definition from another strategy's patch (unreachable) | quality (internal) | 9 |
| R15 | lint warnings pass CI; one is in the tree | quality (tooling) | 4, 9 |
| R16 | the publish workflow runs actions by tag with `NPM_TOKEN`; no provenance | quality (CI) | 4 |
| R17 | the harness `tsconfig.json` uses `baseUrl`, rejected by TypeScript 6 | quality (tooling) | 2.x |
| R18 | the logger's level API and the retry rule have no test | test gap | 2.x, 1.10-2 |
| R19 | the page object's `navOptions` defaults have no test | test gap | 1.3-1.4 |
| R20 | the fixture verification test asserts the label, for 6 of 11 page objects | test gap | 1.6-1.8 |
| R21 | the seed builder's tests live in two other modules' test files | test gap | 1.10-2, 9 |
| R22 | on WebKit, `page.goto()` to a seeded origin returns before the app's document has loaded, every time | bug | 1.5 |
| D1-D5 | documentation, for plan 11 (D5 here) | docs | |

### 1. Missing items

#### R1 The `PageObject` constructor options cannot be named; three option types in public signatures are not exported

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** quality (types). Touches plan 9's execution-time decision "`LocatorRegistryOptions` is a type of the module,
not of the package root" and its 7.8 "no new exported type", with a fact neither knew (below).

**Where.** [pageObject.ts:82-92](../src/pageObject.ts#L82-L92) (the options are an inline type of a `protected`
constructor); [locatorRegistry.ts:68](../src/locators/locatorRegistry.ts#L68) and
[L601](../src/locators/locatorRegistry.ts#L601) (`LocatorRegistryOptions`, the second parameter of
`createRegistryWithAccessors`); [sessionStorage.ts:32-39](../src/helpers/sessionStorage.ts#L32-L39) and
[L54-57](../src/helpers/sessionStorage.ts#L54-L57) (`SessionStorageOptions`, `SeedOptions`); the harness's own domain base
class [testApp.base.ts:22-29](../test/page-object-models/testApp/testApp.base.ts#L22-L29).

**What happens (Q5).** `ConstructorParameters<typeof PageObject>[3]` fails with TS2344 (`Cannot assign a 'protected'
constructor type to a 'public' constructor type`), so a domain base class that forwards options has to restate their
shape by hand. The harness's own `TestApp` does, and its copy lacks `locators`, which plan 9 added: a harness page object
cannot set `strictChains` through its base class. `LocatorRegistryOptions`, `SessionStorageOptions` and `SeedOptions`
appear in the published declarations under those names (hovers show them) but are not exported; the first two can be
reached with `Parameters<…>`/`ConstructorParameters<…>`, `SeedOptions` only through the overloads (TS2493 on the
obvious `Parameters<SessionStorage["seed"]>[2]`).

**Why it matters.** The docs recommend setting `locators: { strictChains }` once in a domain base class
([PageObject.md:181-182](../docs/v3/PageObject.md#L181-L182)); every such class restates the options and drifts when an
option is added, as the harness shows.

**Recommendation.** Export `PageObjectOptions<Options extends PageObjectTypeOptions>` (the constructor's fourth
parameter, declared once in `pageObject.ts` and used by the constructor) and `LocatorRegistryOptions`; the harness's
`TestApp` uses `PageObjectOptions`. Alternatives: only `PageObjectOptions`; also `SessionStorageOptions` and
`SeedOptions`; leave it (consumers restate the shape).

#### R2 CI never runs on Node 20, the declared floor

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** quality (CI). Plan 4's decision (`engines: >=20`, Playwright's own floor) stands; this is about testing it.

**Where.** Every job runs `node-version: 24.x` ([checks.yaml:63](../.github/workflows/checks.yaml#L63),
[L80](../.github/workflows/checks.yaml#L80), [L122](../.github/workflows/checks.yaml#L122),
[publish.yaml:30](../.github/workflows/publish.yaml#L30)); the root `@types/node` is `^24.5.2`.

**What happens (Q17).** Node 20 was verified once, at plan 4's execution. Nothing in CI or in the type check would catch
a later use of an API newer than Node 20: `src/` uses nothing beyond ES2022 today (`Array.prototype.at`, Node 16.6) and
the bundle requires only `@playwright/test` and `util`, but `@types/node` 24 types Node 22 and 24 APIs as available.
Playwright 1.64.1 and `next` still declare `>=20`; Node 20 reached end of life on 2026-04-30.

**Recommendation.** One harness job on Node 20 in `main.yaml` (chromium, the pin row; vitest needs Node 22.12, so the
unit tests stay on 24). Alternatives: a release-time probe in the release checklist, as plan 4 did; nothing.

### 2. New bugs

#### R3 A string `urlPath` that URL parsing normalises never matches its own page

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** bug (plan 1.3-1.4).

**Where.** [url.ts:86-106](../src/helpers/url.ts#L86-L106): `expectedRest` is the raw `urlPath` ([L88](../src/helpers/url.ts#L88)),
compared with the parsed URL's `pathname + search + hash` ([L93](../src/helpers/url.ts#L93)); `fullUrl` is
`new URL(urlPath, baseUrl).href` ([L114-119](../src/helpers/url.ts#L114-L119)); `Navigation` builds its matcher from the
raw parts ([navigation.ts:55](../src/helpers/navigation.ts#L55)).

**What happens (Q6).** For `/søk`, `/a b`, `/a/./b`, `/a/../b`, `/x?q=a b`, `/x#frag ment` and `/café?q=ø` the page
object's matcher rejects its own `fullUrl`. In the runner, on chromium, firefox and webkit: `goto()` lands on `fullUrl`
(`https://shop.example/s%C3%B8k`); `expectThisPage` times out with `Search: expected URL
"https://shop.example/s%C3%B8k"; found "https://shop.example/s%C3%B8k"`; `expectAnotherPage` **passes while the browser
is on the page**; Playwright's own `expect(page).toHaveURL(fullUrl)` passes. The same holds for a string path beside a
RegExp base.

**Why it matters.** Any page whose path has non-ASCII letters (common in Nordic and German apps), spaces, or encoded
query values cannot use the two `expect…Page` methods, and `expectAnotherPage` gives a false pass. The surveyed project's
paths are all ASCII (Q15), so it is unaffected. The docs promise "A string page's identity is its exact URL"
([PageObject.md:439](../docs/v3/PageObject.md#L439)), which is `fullUrl`.

**Recommendation.** Compare against the parsed form: the expected rest of a string path is the `pathname + search + hash`
of `new URL(path || "/", base)` (string base), or of `new URL(path, "http://h")` beside a RegExp base, which is what
Playwright's string URL comparison does. Alternative: reject paths that `new URL` would change, at construction (stricter
than Playwright, and `/søk` is a valid path).

#### R4 A `baseUrl` or `urlPath` that is neither a string nor a RegExp is accepted and builds a matcher that never matches

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** bug; a ledger promise not kept: the release notes say "The constructor checks every value, literal or
variable" ([RELEASE-NOTES-3.0.0.md:86](RELEASE-NOTES-3.0.0.md#L86)).

**Where.** [pageObject.ts:96-101](../src/pageObject.ts#L96-L101) validates only `typeof … === "string"`;
[url.ts:114-119](../src/helpers/url.ts#L114-L119) sends everything else to `createUrlMatcher`.

**What happens (Q7).** `super(page, process.env.BASE_URL, "/login")` with the variable unset (typed `string` by the
project's env schema, `undefined` at runtime) constructs without error, and so do `null` and `9000`, or an `undefined`
`urlPath`; `fullUrl` is a `UrlMatcher` printing `origin undefined + path "/login"`. In the runner: `goto()` throws
`goto() without a URL needs a string fullUrl; this page object has a RegExp URL.`, `expectThisPage` times out,
`expectAnotherPage` **passes** on the page it should recognise, and `sessionStorage.set` writes with no origin check
(the helper got no origin).

**Why it matters.** A missing environment variable is the most common way a base URL goes wrong; plan 1.3-1.4 made the
check a runtime one precisely for environment-driven values.

**Recommendation.** The constructor throws unless each part is a string or a RegExp:
`<label>: baseUrl must be an origin string or a RegExp; received undefined.` (same for `urlPath`). Alternative: reject
`undefined` and `null` only.

#### R5 A seeded navigation loses the URL fragment

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix. The recommended mechanism, `location.replace(url + location.hash)`, was disproved
> at plan time (Q23): the writer document already sits at `url#fragment`, so the replace is a fragment navigation that
> only scrolls, and the test stays on the writer. Part 2 (10.3, R5; decision 10.5) moves the writer document off its URL
> first; same contract, the fragment is kept, verified on three browsers. Widened on 2026-10-16 to every hop, with or
> without a fragment, because the same move fixes R22 (Q29).

**Severity.** bug (plan 1.5).

**Where.** The writer and redirect documents continue with the request URL
([sessionStorageSeed.ts:131-141](../src/helpers/sessionStorageSeed.ts#L131-L141),
[L299-302](../src/helpers/sessionStorageSeed.ts#L299-L302), [L324-328](../src/helpers/sessionStorageSeed.ts#L324-L328)),
and `request.url()` never carries a fragment ([L61](../src/helpers/sessionStorageSeed.ts#L61) says so).

**What happens (Q8).** On chromium, firefox and webkit, `seed({ token }, { origin: B })` then `page.goto(B +
"/app#/orders/7")` ends on `B/app` with the entries applied and no fragment; the same `goto` to an unseeded origin keeps
`#/orders/7`. A server 302 into a seeded origin from `…/start#/orders/7` lands on `…/app` without the fragment, where the
browser itself carries it over the redirect (chromium and webkit printed, firefox the same run). An identity provider's
302 to `…/callback#access_token=abc&state=xyz` (OAuth and OIDC fragment response mode) into a seeded origin lands on
`…/callback` with the entries and without the token; without the seed the app reads it (Q28, three browsers). No spec or
unit test uses a fragment with `seed`; the docs do not mention it.

**Why it matters.** Hash-routed apps (`#/route`) are the apps that read session storage at start-up; after a seeded hop
they open on the wrong route, and an `expectThisPage` for a path with a hash fails. A login callback that receives its
token in the fragment fails, and seeding before an SSO hop is what `seed` is for. Navigations without a fragment, a
`seed` on the current origin (written at once) and path-routed apps are not affected; the entries are written in every
case.

**Recommendation.** The writer document is committed at the requested URL with its fragment, so its script continues
with `location.replace(url + location.hash)` (a form POST: `action` with the hash); the redirect document keeps the
`Location` fragment and otherwise the original one, as the fetch standard does. Alternative: document it as a caveat.

#### R22 On WebKit, `page.goto()` to a seeded origin returns before the app's document has loaded

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Found 2026-10-16 while verifying R5's fix, decided *Fix* the same day: the writer document moves off its URL
> before every continuation (R5's mechanism, widened), which ends it on all three browsers (Q29).

**Severity.** bug (plan 1.5). A new fact for plan 1.5's verification "0 of 20 `waitForURL`/`goto` resolving on the writer
document" ([DECISIONS.md](DECISIONS.md), plan 1.5, the `seed` row), which held on Chromium only.

**Where.** The writer document's continuation, `location.replace(url)` to its own URL
([sessionStorageSeed.ts:131-141](../src/helpers/sessionStorageSeed.ts#L131-L141)).

**What happens (Q29).** `seed(…)` then `page.goto()` to the seeded origin, 20 rounds per browser, the page's title read
right after `goto` returns: on HEAD, chromium and firefox return on the app's document in all 20 rounds; WebKit returns
early in **20 of 20**, with or without a fragment: without one, an empty title every time (the app's document not yet
loaded); with one, an empty title 19 times and the writer document itself once. WebKit seems to treat a replace to the document's own URL as a navigation Playwright
does not attach to the `goto` it is waiting for; with the writer first moved off its URL, WebKit returns on the app's
document 20 of 20 times, with and without a fragment, and chromium and firefox are unchanged.

**Why it matters.** Locator actions and `expect` assertions wait, so most tests pass (the harness does on WebKit); calls
that do not wait, `page.url()`, `page.title()`, `page.evaluate(…)` or `page.content()` right after `goto`, read the
writer document or a document still loading, on WebKit only.

**Recommendation.** R5's move off the URL before every continuation of the writer document, not only with a fragment;
a harness spec that reads `page.title()` right after a seeded `goto` on three browsers. Alternative: documenting it as a
WebKit caveat.

#### R6 A hand-made seed bypasses the primary checks every builder applies

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** inconsistency (plan 9: 7.10 accepts hand-made seeds, 7.15 checks their any-frame steps, 7.14 promises the
primary check "on every builder").

**Where.** [locatorRegistry.ts:212-229](../src/locators/locatorRegistry.ts#L212-L229),
[locatorRegistrationBuilder.ts:94-105](../src/locators/locatorRegistrationBuilder.ts#L94-L105).

**What happens (Q9).** `add(path, { reuse: seed })` with a seed-shaped object registers `{ type: "locator", selector: ""
}`, `{ type: "id", id: "" }`, `{ type: "frameLocator", selector: "" }` (all three compile in TypeScript),
`{ type: "role", role: "" }`, `{ type: "role" }` and `{ type: "role", role: 42 }` as given. `verify()` reports only a
missing `testId`, as `Cannot read properties of undefined (reading 'unicode')`; the others pass and fail at the first
action. `createReusable.locator("")` throws `createReusable.locator requires a non-empty selector.`

**Recommendation.** The seed branch of `add` runs `assertStrategyPrimary` on the seed's primary (any-frame excepted),
named after the call: `reuse requires a selector value for "<path>".`, `reuse requires a non-empty selector for
"<path>".` Alternatives: leave hand-made seeds to `verify()` (which misses most); accept only factory seeds (rejected by
7.10).

#### R7 `replace(sub).frameLocator()` on a segment with steps passes the call and fails only at resolution

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended. The message for a segment with steps names the way out, `clearSteps("<sub>")` first (query methods chain in any order; verified that `clearSteps` before the replace resolves); the terminal case has no such way out and says so.

**Severity.** inconsistency (plan 9 7.15: an any-frame definition takes no steps from any source, "checked when they
are offered"; plan 1.6-1.8: `replace().frameLocator()` makes a sub-path any-frame).

**Where.** [locatorQueryBuilder.ts:282-303](../src/locators/locatorQueryBuilder.ts#L282-L303) (no check),
against [L407-411](../src/locators/locatorQueryBuilder.ts#L407-L411) (`filter`/`nth` on an any-frame segment throw);
resolution [locatorRegistry.ts:538-559](../src/locators/locatorRegistry.ts#L538-L559).

**What happens (Q4).** With `frame` = `frameLocator("iframe").nth(1)`, `getLocatorSchema("frame.btn").replace("frame")
.frameLocator()` returns normally and `getNestedLocator()` throws `"frame" cannot be resolved on its own, filtered or
indexed`; the same steps offered after the replace throw at the call. `replace().frameLocator()` on the query's terminal
always fails at resolution (it has no terminal form), and on a non-root segment with a registered ancestor too (the
first-segment rule). Mutants M24 and M25 (section 9) show that no test exercises the two resolution-time checks that
catch these.

**Recommendation.** `replace(sub).frameLocator()` throws at the call when the segment has steps in the query
(`replace() cannot apply to "<sub>": …`, 7.15's message) or is the query's terminal; the first-segment rule stays at
resolution, where the chain is known; unit tests for the three resolution-time checks. Alternative: tests only.

### 3. Unintended behaviour

#### R8 A seeded builder held in a variable takes a second override and an override after a step

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** docs and inconsistency (plan 9 7.13 corrected the docs from chains only).

**Where.** Seed reuse returns the builder itself ([locatorRegistry.ts:229-246](../src/locators/locatorRegistry.ts#L229-L246)),
typed as the view plus the seed's method ([locatorRegistrationBuilder.ts:643-648](../src/locators/locatorRegistrationBuilder.ts#L643-L648));
the message at [L560-564](../src/locators/locatorRegistrationBuilder.ts#L560-L564);
[locator-registry.md:1017-1019](../docs/v3/locator-registry.md#L1017-L1019).

**What happens (Q2, Q3).** `const b = add("f", { reuse: role }); b.getByRole("link"); b.getByRole("checkbox");` compiles
and the second call throws `… was already provided from reuse; only one matching override is allowed.`, the message
plan 9 called unreachable and removed from the error reference. `b.nth(0); b.getByRole({ name: "x" })` compiles and
applies the override after the step (the record is right: the order does not matter to the definition). The docs say
"The override is the first call, and there is at most one … a strategy method there is a compile error".

**Recommendation.** Docs: the override may be called once on the seeded builder, before or after steps; a second throws
that message, which returns to the error reference; a unit test of the held form. Alternative: make it true at runtime
(the override throws after a step or a first override, one message), which rejects harmless code.

#### R9 A path that is not a string fails with `path.startsWith is not a function`

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** quality (JavaScript callers).

**Where.** [utils.ts:68-90](../src/locators/utils.ts#L68-L90).

**What happens (Q11).** `add(42)`, `getLocator(["a"])`, `getNestedLocator({})` throw `TypeError: path.startsWith is not
a function`; `undefined` and `null` give `LocatorSchemaPath string cannot be empty`.

**Recommendation.** `validateLocatorSchemaPath` first rejects a non-string: `LocatorSchemaPath must be a string;
received 42.` Alternative: leave it (TypeScript rejects all of these).

#### R10 The duplicate-registration message prints a repeated RegExp as `"[Circular]"`

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** quality (message; plan 1.10-2 kept this message, plan 9 7.4 kept its JSON).

**Where.** [utils.ts:196-218](../src/locators/utils.ts#L196-L218) marks every object it has seen, not only the ones on
the current path; [locatorRegistry.ts:254-257](../src/locators/locatorRegistry.ts#L254-L257).

**What happens (Q10).** `const SAVE = /Save/i` used by the existing and the attempted registration prints the attempted
`name` as `"[Circular]"`; a step pair `filter({ hasText: SAVE }).filter({ hasNotText: SAVE })` prints the second as
`"[Circular]"`. RegExps are shared by reference, since the copies are one level deep (plan 1.10-2). The heading
`Existing Schema:` introduces both records.

**Recommendation.** Turn RegExps (and Locators, as now) into their printed form before the seen-check, and track only the
objects on the current path; heading `Existing and attempted schemas:`. Alternative: the RegExp order only.

### 4. Things that do not make sense

#### R11 One rule, two messages: a step on an any-frame segment

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** inconsistency.

**Where.** [locatorRegistrationBuilder.ts:582-584](../src/locators/locatorRegistrationBuilder.ts#L582-L584) uses
`anyFrameStepsMessage`; [locatorQueryBuilder.ts:407-411](../src/locators/locatorQueryBuilder.ts#L407-L411) uses
`anyFrameNoElementMessage` ([utils.ts:475-480](../src/locators/utils.ts#L475-L480)).

**What happens (Q4).** `add("copy", { reuse: "any" }).nth(1)` throws `nth() cannot apply to "copy": frameLocator() without
a selector has no element to filter, index or describe; resolve a path inside it.`;
`getLocatorSchema("any.btn").nth("any", 1)` throws `frameLocator() without a selector does not point to a particular
iframe; "any" cannot be resolved on its own, filtered or indexed; resolve a path inside it.` The error reference lists
both, the second "or given a step in a query" ([locator-registry.md:1196-1201](../docs/v3/locator-registry.md#L1196-L1201));
no decision records why a query step gets the resolution message.

**Recommendation.** The query builder's `filter` and `nth` use `anyFrameStepsMessage` with the method name; the
no-element message stays for resolution (a terminal, a `has` reference). One harness expectation changes
(`add.frameLocator.spec.ts`, the query step test). Alternative: leave both.

#### R12 The no-argument seeded overrides are typed unevenly, against 7.16's "update's argument shapes"

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** inconsistency (types; handover lead 1, widened).

**Where.** Seeded overloads [locatorRegistrationBuilder.ts:155-164](../src/locators/locatorRegistrationBuilder.ts#L155-L164)
(and the text-likes and `locator`), [L410-415](../src/locators/locatorRegistrationBuilder.ts#L410-L415),
[L443-451](../src/locators/locatorRegistrationBuilder.ts#L443-L451),
[L468-476](../src/locators/locatorRegistrationBuilder.ts#L468-L476); `update()`'s
[locatorUpdateBuilder.ts:40-46](../src/locators/locatorUpdateBuilder.ts#L40-L46).

**What happens (Q2).** Seeded: `frameLocator()` compiles; `getByTestId()` and `getById()` are TS2554 (they inherit with
`(undefined)`); `getByRole()` and the other six with options are TS2554. On `update()` all ten compile with no argument.
At runtime every one of them inherits. 7.16 says a seeded override "takes `update`'s argument shapes", and
`UpdateArgsWithOptions` includes `[]`.

**Recommendation.** The seeded overloads accept no argument, as `update()` does (additive: the unseeded types do not
change). Alternative: document the difference.

#### R13 Doc comments the hovers show contradict the contract; the published declarations point at release files

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** inconsistency (hovers are part of the API).

**Where and what.**

- `getNestedLocator`: "Throws if any segment in the chain is missing" ([locatorRegistry.ts:480-482](../src/locators/locatorRegistry.ts#L480-L482));
  an unregistered segment is left out (plan 9), only the terminal is required.
- The query's `update`: "The registry remains unchanged until you resolve" ([locatorQueryBuilder.ts:85-88](../src/locators/locatorQueryBuilder.ts#L85-L88));
  the registry never changes.
- The query's `replace`: "a POST-style replacement" ([L257-258](../src/locators/locatorQueryBuilder.ts#L257-L258));
  plan 1.6-1.8 and [locatorUpdateBuilder.ts:93-97](../src/locators/locatorUpdateBuilder.ts#L93-L97) call it PUT.
- `createRegistryWithAccessors`: "Creates a v2 locator registry" ([locatorRegistry.ts:584](../src/locators/locatorRegistry.ts#L584)).
- The logger's class comment: "independant", "parallell" ([playwrightReportLogger.ts:20](../src/helpers/playwrightReportLogger.ts#L20)).
- The module comments of [url.ts:1-11](../src/helpers/url.ts#L1-L11) and
  [sessionStorage.ts:1-12](../src/helpers/sessionStorage.ts#L1-L12) are emitted into `dist/index.d.ts` (Q17) with
  `See release-3.0.0/PLAN-….md` and `see ./sessionStorageSeed.ts`, files that are not in the package; the folder is
  deleted at release ([sessionStorageSeed.ts:12](../src/helpers/sessionStorageSeed.ts#L12) has a third reference).

**Recommendation.** Correct the five comments; drop the release-folder and source-file references (or keep the module
comments out of the declarations). Alternative: only the contract errors.

#### R14 `applyDefinitionPatch` builds a definition from a patch of another strategy

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** quality (internal; handover lead 5).

**Where.** [utils.ts:450-462](../src/locators/utils.ts#L450-L462) reads the strategy from the patch.

**What happens (Q12).** A role seed patched with `{ type: "text", text: "x" }` gives `{ type: "text", text: "x",
options: { name: "Save", exact: true } }`; with `{ type: "testId" }` a `testId` definition without a value. No DSL call
reaches it: the builder rejects another strategy first
([locatorRegistrationBuilder.ts:553-558](../src/locators/locatorRegistrationBuilder.ts#L553-L558)).

**Recommendation.** Read the strategy from the seed and throw an internal error for another one, as
`mergeLocatorDefinition` does. Alternative: leave it (unreachable).

### 5. Things that are wrong or should have been done better

#### R15 Lint warnings pass CI, and one is in the tree

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** quality (tooling).

**Where.** [package.json:41](../package.json#L41) (`biome check .`);
[publicTypes.typecheck.ts:185](../test/tests/packaging/publicTypes.typecheck.ts#L185) (`noConfusingVoidType`, added by
plan 9).

**What happens (Q1, Q19).** `pnpm lint` exits 0 with the warning; `biome check --error-on-warnings .` exits 1.

**Recommendation.** Fix the warning (the probe asserts that path reuse is not `void`: `// biome-ignore` with that reason,
or `undefined` as biome suggests) and add `--error-on-warnings` to `lint`. Alternative: fix the warning only.

#### R16 The publish workflow runs third-party actions by tag, with `NPM_TOKEN`, and publishes without provenance

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix, option A: the actions of `publish.yaml` and `checks.yaml` pinned to commit SHAs, kept current by Dependabot, and publishing with provenance; `NPM_TOKEN` stays. Trusted publishing (option B) needs a setting on npmjs.com that only the maintainer can make and verify, and is left to the release.

**Severity.** quality (CI, supply chain).

**Where.** [publish.yaml:24-36](../.github/workflows/publish.yaml#L24-L36) (`actions/checkout@v4`, `pnpm/action-setup@v4`,
`actions/setup-node@v4`, `changesets/action@v1`); the same tags in [checks.yaml](../.github/workflows/checks.yaml).

**What happens.** A moved tag runs new code with `contents: write`, `pull-requests: write` and the npm token; the package
carries no provenance statement.

**Recommendation.** Pin the actions of `publish.yaml` (and `checks.yaml`) to commit SHAs with the tag as a comment, kept
current by Dependabot's `github-actions` updates (one config file, no dependency); publish with provenance
(`id-token: write`, `NPM_CONFIG_PROVENANCE: true`), or npm trusted publishing instead of the token. Alternatives: pins
only; leave it for after 3.0.0 with the publish-the-tested-tarball item (plan 4's deferred list).

#### R17 The harness `tsconfig.json` uses `baseUrl`, which TypeScript 6 rejects

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** quality (tooling).

**Where.** [test/tsconfig.json:4](../test/tsconfig.json#L4).

**What happens (Q16).** Under TypeScript 6.0.3, `tsc -p test` fails with TS5101 (`baseUrl` is deprecated and stops
working in 7.0) before checking anything; with the deprecation silenced, the harness, the public-types probe, the emit
probe and the published declarations (`skipLibCheck: false`) are clean on 6.0.3, as on 5.9.3. Without `baseUrl` and with
`./`-relative `paths` the harness type-checks on 5.9.3 and 6.0.3. The surveyed consumer already compiles with 6.0.3.

**Recommendation.** Drop `baseUrl` and make the `paths` relative; verify that Playwright's runtime resolution of the
aliases still works (the harness run). Alternative: leave it until the root moves to TypeScript 6.

### 6. Tests

#### R18 The logger's level API and the fixture's retry rule have no test

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** test gap.

**Where.** [playwrightReportLogger.ts:116-162](../src/helpers/playwrightReportLogger.ts#L116-L162) (`setLogLevel`,
`getCurrentLogLevel`, `resetLogLevel`, `isCurrentLogLevel`, `isLogLevelEnabled`);
[base.fixtures.ts:12-13](../src/fixture/base.fixtures.ts#L12-L13); [logging.spec.ts](../test/tests/logging/logging.spec.ts)
reads the retry branch only when a test is retried.

**What happens (Q13, Q14).** No layer executes the five methods; mutants M44 (retry level always `warn`), M46
(`setLogLevel` a no-op), M48 (`resetLogLevel` a no-op) and M49 (`isLogLevelEnabled` always true) survive both layers.

**Recommendation.** Unit tests for the five methods over a shared level (parent and child); the fixture's choice of the
initial level moved into a small exported-internal function of `base.fixtures.ts` (`retry === 0` gives `warn`, a retry
`debug`) with a unit test. A harness test that fails once on purpose to reach a retry is not an option: CI sets
`failOnFlakyTests` (plan 4), so it would fail the run. Alternative: unit tests for the five methods only.

#### R19 The page object's `navOptions` defaults have no test

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** test gap.

**Where.** [navigation.ts:58-64](../src/helpers/navigation.ts#L58-L64).

**What happens (Q14).** M55 (`navOptions.timeout` ignored) and M56 (`navOptions.waitUntil` ignored) survive both layers;
plan 1.3-1.4's "per call, then the page object's `navOptions`, then Playwright's default" is pinned for the per-call
option only.

**Recommendation.** Harness specs against `/testnav`: a page object with `navOptions: { timeout }` fails a delayed
navigation within that timeout, and with `navOptions: { waitUntil: "commit" }` returns before a held `load`.

#### R20 The fixture verification test asserts the label, for 6 of 11 page objects

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** test gap (weak test).

**Where.** [verify.spec.ts:77-88](../test/tests/pageObject/verify.spec.ts#L77-L88); the fixtures
[testApp.fixtures.ts:29-74](../test/fixtures/testApp.fixtures.ts#L29-L74).

**What happens (Q20).** "the fixture page objects all verify" asserts `poc.label` truthy for `iframePage`, `testFilters`,
`testIds`, `testNav`, `testStorage`, `testPage`; `testPath`, `color`, `testNavItem`, `testStorageTwin` and
`testStorageSecond` are not in it. It passes because the scheduled check would fail the fixture, not because of its
assertion.

**Recommendation.** Request all eleven fixtures and resolve one path of each (or call the facade's `verify()` through a
public path such as `getLocatorSchema`), so the test fails by its own assertion. Alternative: rename it.

#### R21 Tests for the seed builder live in two other modules' test files

- [x] Fix  - [ ] Skip  - [ ] Discuss

> Notes: Triage 2026-10-16: Fix as recommended.

**Severity.** test gap (organisation; handover lead 4).

**Where.** `reusableLocatorBuilder.ts` has no colocated test; its tests are in
[locatorRegistrationBuilder.test.ts:180-243](../src/locators/locatorRegistrationBuilder.test.ts#L180-L243) and
[locatorRegistry.test.ts:228-249](../src/locators/locatorRegistry.test.ts#L228-L249).

**Recommendation.** Move them into a new `reusableLocatorBuilder.test.ts`, unchanged. Alternative: leave them.

### 7. Documentation (plan 11)

- **D1** `docs/v3` still presents itself as v2: [overview.md:1-5](../docs/v3/overview.md#L1-L5) ("v2.0.0"),
  [PageObject.md:1](../docs/v3/PageObject.md#L1), [locator-registry.md:1](../docs/v3/locator-registry.md#L1),
  [logging.md:1-5](../docs/v3/logging.md#L1-L5), [composing-locator-modules.md:1-5](../docs/v3/composing-locator-modules.md#L1-L5)
  (analysis 5 lists the overview title only).
- **D2** The held seeded builder (R8), if R8 is fixed as docs.
- **D3** The upgrade notes for `UrlMatcher` (release notes item 6, [PageObject.md](../docs/v3/PageObject.md) migration):
  Q15's only break outside the checklist is a consumer's own conditional type keyed on `FullUrlTypeFromOptions` being
  `RegExp`; add "a type that tests `fullUrl` against `RegExp` tests `UrlMatcher`".
- **D4** Session storage: a fragment caveat if R5 is skipped. Not needed: R5 is *Fix* and keeps the fragment (10.5).
- **D5** [AGENTS.md](../AGENTS.md) section 6: the `PLAN-<items>-<slug>.md` row of the table spans several source lines,
  so the table renders broken from that row on (markdownlint MD055/MD056). Fixed in this plan's ledger step, which
  edits `AGENTS.md` anyway.

---

## 8. What was checked and found sound

- **Baseline (Q1).** Lint clean (one warning, R15), 598 unit tests with no type errors, both type checks, 1281 harness
  tests on chromium, firefox and webkit, on a fresh clone of 3e560d8.
- **The ledger contracts that hold.** Every rule in section 9 marked *killed* is a release-note, changeset or decision
  promise that the code keeps and some test pins: the copies at the boundary and on every read (plan 1.10-2), JSON
  Merge Patch for `update` and the seeded override (7.16), the primary and empty-string rules, seeds as values, reuse
  by path (strategy, steps, explicit description), the any-frame checks at the call and in `verify()`, `skip`/`unskip`,
  the strategy check of `update`, cycles, the lifecycle (scheduled check, sticky failure, `strictChains` through
  `PageObject`), the call sites, the logger's output, `@step`'s titles and options, the URL rules, the bounce re-check,
  the post-navigation actions and their opt-out, and every session-storage and seed-registry rule in the list. The
  exceptions are R7, R18 and R19.
- **Interactions between plans.** The seeded Merge Patch with the copies (M09, M15-M17: no shared object between a seed,
  its variants and the registry); `strictChains` with `skip` (a registered ancestor still left out), with path reuse and
  with an any-frame root path (`registry.strictChains.spec.ts`); the any-frame rule with path reuse, hand-made seeds and
  `filter`/`nth`/`describe` (sound except R6, R7, R11); the `PageObject` facade with `createReusable` (passes through
  and does not trigger the definition, plan 1.7) and with registrations after the definition (accepted, unverified, as in 2.x).
- **The consumer project (Q15).** 3.0.0 adds 69 type errors, 67 of them upgrade-checklist items: `gotoThisPage` 31 (item
  4), `setOnNextNavigation` 21 (item 10), the removed storage generics 13 (item 11), `waitForLoadState` 1 (item 8),
  `UrlTypeOptions` 1 (item 24); the other 2 are the project's own types keyed on `fullUrl` being a `RegExp` (a helper
  parameter `string | RegExp` and a conditional type), D3. `declaration: true` emits with no new error. Changes that compile and behave differently, by call
  site: `getById` with a `#`/`id=` prefix 0; RegExp ids 3, all unanchored literal text (unchanged); `frameLocator` 1,
  without steps (unchanged); `update` with `undefined` 0; `@step` 60, all on `async` methods (they compile);
  `pageActionsToPerformAfterNavigation` 23, no `noImplicitOverride`; string `urlPath` values all ASCII (R3 does not
  reach it). Nothing in it breaks without a checklist item except D3.
- **TypeScript versions (Q16).** The published declarations are clean with `skipLibCheck: false` on 5.9.3 and 6.0.3;
  the harness, the public-types probe and the emit probe are clean on 6.0.3 once R17's deprecation is silenced.
- **The bundle (Q17).** `dist/index.js` requires `@playwright/test` and `util` only; `src/` uses nothing newer than
  ES2022 (`Array.prototype.at`).
- **Playwright inside the peer range (Q18).** `PLAYWRIGHT_VERSION=1.64.1 bash pack-test.sh` (root and `test/` swapped,
  both type checks): 1281 passed on chromium, firefox and webkit. 1.64.1 is the newest release in `>=1.64.0 <2.0.0`.
- **Leads from plan 9.** 1 is R12, 2 is part of R1, 4 is R21, 5 is R14. Lead 3, a JavaScript call with two mistakes
  reporting the primary first, is decided as such by 7.14 ("A call with two mistakes from JavaScript reports the
  primary first"); the review found no fact that decision lacked, so it is not reopened.
- **Not findings.** Session-storage step titles end in a colon (`Auth.SessionStorage.set:`): the 2.1.0 format,
  documented ([session-storage.md:40](../docs/v3/session-storage.md#L40)). `filter("text")` or `filter(42)` from
  JavaScript is a no-op filter, exactly as Playwright's own `filter` is. The two `setTimeout(0)` waits in the harness are
  the deliberate "the check does nothing afterwards" waits of plan 1.7; the harness has no `waitForTimeout`. The two
  harness tests without an assertion are `test.fail` declarations by design. M70 (no charset meta) survives the harness
  because the form also sets `acceptCharset`, which the form POST spec's `åæø 🚀` still proves. M73 (`isLocatorInstance`
  without the `locator` condition) is near-equivalent: no Playwright type has `filter` and `nth` without `locator`.
- **Coverage (Q13).** The unit layer covers 87.5 % of the statements of `src/` (navigation and session storage, which
  need a browser, are the low files); the harness executes the packed bundle's page object, navigation, storage, seed,
  logger and `@step` paths, while most locator paths run through the source-level specs (AGENTS.md section 4), so the
  tarball's own locator code is exercised by the fixture page objects and the type probes. No uncovered branch matters
  beyond R7, R18 and R19, and the unreachable internal guards (`requireType`, `persist` without a definition, the
  registry's internal `replace` of an unknown path, `neverAppliedError` without a seed).

---

## 9. Mutation probes (Q14)

Each mutant breaks one rule of the ledgers in a clone's `src/` (one exact replacement, applied and reverted per
mutant); the unit tests run in vitest's runtime mode, then `pack-build.sh` rebuilds and packs, `test/` installs the
tarball frozen, and the chromium harness runs (the source-level specs see the mutated `src` directly, the rest the
tarball). *killed (n)* is the number of failing tests. 87 of 96 are killed by at least one layer; the nine that survive
both are M24 and M25 (R7), M44, M46, M48 and M49 (R18), M55 and M56 (R19), and M73 (near-equivalent, section 8). Many
rules are pinned by one layer only, which is enough while both layers run in CI. The three marked *not run* do not
type-check, so tsup's declaration build stops; their unit result stands.

| mutant | rule broken | where | unit | harness (chromium) |
| --- | --- | --- | --- | --- |
| M01 | copyFilter no copy | `locators/utils.ts` | killed (4) | killed (3): add.spec.ts |
| M02 | normalizeSteps shallow | `locators/utils.ts` | killed (2) | killed (1): add.spec.ts |
| M03 | clone keeps options ref | `locators/utils.ts` | killed (3) | killed (3): add.reuseReusable.spec.ts, add.spec.ts |
| M04 | getIfExists no clone | `locators/locatorRegistry.ts` | killed (1) | killed (11): , add.get.clone.spec.ts, getLocatorSchema.clearSteps.spec.ts … |
| M05 | null key stored | `locators/utils.ts` | killed (7) | killed (2): add.reuseReusable.spec.ts, getLocatorSchema.update.spec.ts |
| M06 | lone null keeps | `locators/utils.ts` | killed (4) | killed (2): add.reuseReusable.spec.ts, getLocatorSchema.update.spec.ts |
| M07 | undefined key assigned | `locators/utils.ts` | killed (3) | killed (2): getLocatorSchema.update.spec.ts |
| M08 | empty options kept | `locators/utils.ts` | killed (4) | survived |
| M09 | seeded spread merge | `locators/utils.ts` | killed (39) | killed (1): add.reuseReusable.spec.ts |
| M10 | RegExp role accepted | `locators/utils.ts` | killed (2) | survived |
| M11 | number primary accepted | `locators/utils.ts` | killed (2) | survived |
| M12 | empty string allowed | `locators/utils.ts` | killed (7) | killed (12): add.frameLocator.spec.ts, add.getById.spec.ts, add.reuseReusable.spec.ts … |
| M13 | CR escape dropped | `locators/utils.ts` | killed (1) | killed (1): testIds.spec.ts |
| M14 | >> escape dropped | `locators/utils.ts` | killed (2) | survived |
| M15 | seed filter mutates | `locators/reusableLocatorBuilder.ts` | killed (1) | killed (1): add.reuseReusable.spec.ts |
| M16 | seed definition no copy | `locators/reusableLocatorBuilder.ts` | killed (1) | killed (1): add.reuseReusable.spec.ts |
| M17 | seed nth mutates | `locators/reusableLocatorBuilder.ts` | killed (3) | killed (1): add.reuseReusable.spec.ts |
| M18 | path reuse drops steps | `locators/locatorRegistry.ts` | killed (2) | killed (2): add.reuseExisting.spec.ts |
| M19 | reuse drops description | `locators/locatorRegistry.ts` | killed (2) | killed (4): add.describe.spec.ts, add.reuseExisting.spec.ts, add.reuseReusable.spec.ts |
| M20 | anyframe seed steps allowed | `locators/locatorRegistrationBuilder.ts` | killed (1) | killed (1): add.reuseReusable.spec.ts |
| M21 | anyframe add steps allowed | `locators/locatorRegistrationBuilder.ts` | killed (1) | killed (1): add.reuseExisting.spec.ts |
| M22 | query anyframe step allowed | `locators/locatorQueryBuilder.ts` | survived | killed (1): add.frameLocator.spec.ts |
| M23 | resolve ancestor anyframe not-first | `locators/locatorRegistry.ts` | survived | killed (1): add.frameLocator.spec.ts |
| M24 | resolve ancestor anyframe steps | `locators/locatorRegistry.ts` | survived | survived |
| M25 | resolve terminal anyframe not-first | `locators/locatorRegistry.ts` | survived | survived |
| M26 | verify anyframe first-segment | `locators/locatorRegistry.ts` | killed (2) | not run (the mutant does not type-check for the declaration build) |
| M27 | strictChains truthy | `locators/locatorRegistry.ts` | killed (1) | survived |
| M28 | strictChains first missing only | `locators/locatorRegistry.ts` | killed (2) | survived |
| M29 | PageObject drops strictChains | `pageObject.ts` | killed (1) | killed (1): verify.spec.ts |
| M30 | skip ignored | `locators/locatorRegistry.ts` | killed (2) | killed (5): add.frameLocator.spec.ts, getLocatorSchema.clearSteps.spec.ts, getLocatorSchema.skip.spec.ts … |
| M31 | unskip no-op | `locators/locatorQueryBuilder.ts` | killed (3) | killed (3): getLocatorSchema.skip.spec.ts |
| M32 | skipped segment accepts changes | `locators/locatorQueryBuilder.ts` | killed (2) | killed (2): getLocatorSchema.clearSteps.spec.ts, getLocatorSchema.skip.spec.ts |
| M33 | terminal skippable | `locators/locatorQueryBuilder.ts` | killed (1) | killed (1): getLocatorSchema.skip.spec.ts |
| M34 | update cross-strategy | `locators/locatorUpdateBuilder.ts` | killed (1) | killed (2): getLocatorSchema.update.spec.ts |
| M35 | default description empty | `locators/locatorRegistry.ts` | killed (2) | killed (5): add.describe.spec.ts, add.reuseExisting.spec.ts, add.reuseReusable.spec.ts … |
| M36 | cycle detection off | `locators/locatorRegistry.ts` | survived | killed (4): filter.cycle.spec.ts, getLocator.spec.ts, registry.verify.spec.ts |
| M37 | no scheduled check | `pageObject.ts` | killed (15) | killed (6): callSite.spec.ts, lifecycle.spec.ts |
| M38 | failure not sticky | `pageObject.ts` | killed (2) | killed (6): callSite.spec.ts, lifecycle.spec.ts, verify.spec.ts |
| M39 | atCallSite no rewrite | `helpers/callSite.ts` | killed (5) | killed (3): callSite.spec.ts, sessionStorage.spec.ts |
| M40 | wrong boundary | `pageObject.ts` | killed (1) | survived |
| M41 | logger inspects strings | `helpers/playwrightReportLogger.ts` | killed (1) | killed (1): logging.spec.ts |
| M42 | logger separator | `helpers/playwrightReportLogger.ts` | killed (2) | killed (2): logging.spec.ts |
| M43 | logger no level filter | `helpers/playwrightReportLogger.ts` | killed (1) | killed (1): logging.spec.ts |
| M44 | fixture retry level | `fixture/base.fixtures.ts` | survived | survived |
| M45 | json content type never | `helpers/playwrightReportLogger.ts` | killed (1) | killed (1): logging.spec.ts |
| M46 | setLogLevel no-op | `helpers/playwrightReportLogger.ts` | survived | survived |
| M47 | logger locale ignored | `helpers/playwrightReportLogger.ts` | killed (1) | killed (1): logging.spec.ts |
| M48 | resetLogLevel no-op | `helpers/playwrightReportLogger.ts` | survived | survived |
| M49 | isLogLevelEnabled always true | `helpers/playwrightReportLogger.ts` | survived | survived |
| M50 | step static title | `helpers/stepDecorator.ts` | killed (2) | survived |
| M51 | step options dropped | `helpers/stepDecorator.ts` | killed (1) | survived |
| M52 | url path prefix match | `helpers/url.ts` | killed (2) | killed (4): testNav.spec.ts |
| M53 | regex lastIndex not reset | `helpers/url.ts` | killed (1) | survived |
| M54 | no bounce re-check | `helpers/navigation.ts` | survived | killed (1): testNav.spec.ts |
| M55 | navOptions timeout ignored | `helpers/navigation.ts` | survived | survived |
| M56 | navOptions waitUntil ignored | `helpers/navigation.ts` | survived | survived |
| M57 | goto() skips actions | `helpers/navigation.ts` | survived | killed (5): actions.spec.ts, testNav.spec.ts, testPage.spec.ts |
| M58 | expectThisPage ignores opt-out | `helpers/navigation.ts` | survived | killed (2): actions.spec.ts, testNav.spec.ts |
| M59 | baseUrl path allowed | `helpers/url.ts` | killed (1) | killed (1): urls.spec.ts |
| M60 | urlPath // allowed | `helpers/url.ts` | killed (1) | killed (1): urls.spec.ts |
| M61 | storage origin check off | `helpers/sessionStorage.ts` | survived | killed (1): sessionStorage.spec.ts |
| M62 | undeclared non-string | `helpers/sessionStorage.ts` | killed (2) | not run (the mutant does not type-check for the declaration build) |
| M63 | missing key undefined | `helpers/sessionStorage.ts` | killed (1) | killed (2): sessionStorage.spec.ts |
| M64 | seed never immediate | `helpers/sessionStorage.ts` | survived | killed (1): sessionStorage.spec.ts |
| M65 | no teardown | `helpers/sessionStorageSeed.ts` | killed (1) | killed (2): sessionStorage.spec.ts |
| M66 | seed merge lost | `helpers/sessionStorageSeed.ts` | killed (1) | killed (1): sessionStorage.spec.ts |
| M67 | never-applied silent | `helpers/sessionStorageSeed.ts` | killed (1) | killed (2): sessionStorage.spec.ts |
| M68 | bypass by URL ignored | `helpers/sessionStorageSeed.ts` | killed (1) | survived |
| M69 | conditional headers kept | `helpers/sessionStorageSeed.ts` | killed (2) | survived |
| M70 | no charset meta | `helpers/sessionStorageSeed.ts` | killed (2) | survived |
| M71 | script < not escaped | `helpers/sessionStorageSeed.ts` | killed (2) | survived |
| M72 | no referrer meta | `helpers/sessionStorageSeed.ts` | killed (2) | killed (8): sessionStorage.spec.ts |
| M73 | isLocatorInstance loose | `locators/utils.ts` | survived | survived |
| M74 | isReusableLocator loose | `locators/utils.ts` | killed (2) | survived |
| M75 | whitespace allowed | `locators/utils.ts` | killed (2) | killed (1): validation.locatorSchemaPath.spec.ts |
| M76 | whitespace not escaped | `locators/utils.ts` | killed (1) | survived |
| M77 | nth last is first | `locators/utils.ts` | killed (3) | killed (17): add.filter.spec.ts, add.frameLocator.spec.ts, add.reuseReusable.spec.ts … |
| M78 | frame no contentFrame | `locators/locatorRegistry.ts` | survived | killed (18): add.frameLocator.spec.ts, add.reuseReusable.spec.ts, ge … |
| M79 | duplicate allowed | `locators/locatorRegistry.ts` | killed (4) | killed (4): add.spec.ts, lifecycle.spec.ts |
| M80 | facade verify skips | `pageObject.ts` | killed (3) | survived |
| M81 | actions evaluated once | `pageObject.ts` | survived | killed (3): actions.spec.ts |
| M82 | json stringify String | `helpers/sessionStorage.ts` | killed (4) | killed (11): sessionStorage.spec.ts |
| M83 | RegExp first arg as options | `locators/locatorUpdateBuilder.ts` | killed (2) | survived |
| M84 | id regex flags dropped | `locators/utils.ts` | killed (2) | killed (6): add.getById.spec.ts, getLocator.spec.ts, getLocatorSchema.update.spec.ts … |
| M85 | fullUrl concatenation | `helpers/url.ts` | killed (1) | killed (1): urls.spec.ts |
| M86 | codec non-string accepted | `helpers/sessionStorage.ts` | killed (1) | not run (the mutant does not type-check for the declaration build) |
| M87 | any POST reissuable | `helpers/sessionStorageSeed.ts` | killed (3) | survived |
| M88 | update primary ignored | `locators/locatorUpdateBuilder.ts` | killed (33) | killed (7): getLocatorSchema.update.spec.ts, testIds.spec.ts |
| M89 | replace keeps old options | `locators/locatorUpdateBuilder.ts` | killed (2) | survived |
| M90 | reuse same-path allowed | `locators/locatorRegistry.ts` | survived | killed (1): add.reuseExisting.spec.ts |
| M91 | strict check ancestors none | `locators/locatorRegistry.ts` | killed (5) | killed (4): registry.strictChains.spec.ts, verify.spec.ts |
| M92 | has resolved nested | `locators/locatorRegistry.ts` | survived | killed (10): filter.cycle.spec.ts, getLocat, getLocator.spec.ts … |
| M93 | query getLocator ignores steps | `locators/locatorQueryBuilder.ts` | killed (3) | killed (8): getLocatorSchema.filter.spec.ts, testFilters.spec.ts |
| M94 | clearSteps no-op | `locators/locatorQueryBuilder.ts` | survived | killed (10): getLocatorS, getLocatorSchema.clearSteps.spec.ts, getLocatorSchema.getLocator.spec.ts |
| M95 | describe check off | `locators/utils.ts` | killed (4) | killed (3): add.describe.spec.ts, add.reuseReusable.spec.ts, getLocatorSchema.describe.spec.ts |
| M96 | has path terminal not described | `locators/locatorRegistry.ts` | survived | killed (7): add.describe.spec.ts, getLocatorSchema.describe.spec.ts |


---

## Part 2. The plan

Every finding R1 to R22 was triaged *Fix* on 2026-10-16. The designs below were verified on 2026-10-16 in a fourth
scratchpad clone, `proto`, of 3e560d8, with prototypes of R1, R3, R4, R5, R12 and R17 (the other designs are small and
fully determined by Part 1's probes). Plan-time probes:

- **Q21** the prototype: `pnpm test:unit` (595 of 598 pass; the 3 failures are the expectations R5 changes, 10.4),
  `pnpm typecheck` clean with the harness's `TestApp` on `PageObjectOptions` and the harness `tsconfig.json` without
  `baseUrl`, the chromium harness 427 passed (so Playwright resolves the path aliases without `baseUrl` at runtime), and
  `sessionStorage.spec.ts`, `pageObject/` and `testNav.spec.ts` on three browsers, 249 passed.
- **Q22** runner probes against the prototype, three browsers, 36 passed: R3 for `/søk`, `/a b`, `/x?q=a b`, `/a/./b`,
  `/x#frag ment`, `/café?q=ø` (`goto()`, `expectThisPage`, `expectAnotherPage` rejecting, a RegExp base beside the
  string path); R4 for `undefined`, `null`, `9000`, an object; R5 for a seeded `goto` with a fragment, a seeded 302 from
  a URL with a fragment, a 302 whose `Location` has its own fragment, and a seeded form POST to an action with a
  fragment.
- **Q23** R5's continuation, three browsers, against HEAD: `location.replace(url + location.hash)` leaves the test on
  the writer document (the replace is a fragment navigation, which only scrolls); `location.reload()` keeps the fragment
  but the app's `performance.getEntriesByType("navigation")[0].type` becomes `reload`; moving the writer document to
  `/.pomwright-seed-continue` with `history.replaceState` first and then replacing keeps the fragment with type
  `navigate`, the history length and the request headers HEAD has (chromium 3, firefox 2, webkit 3; `cache-control`
  absent, absent, `no-cache`, as on HEAD).
- **Q24** `tsc` against the prototype's package: the ten seeded no-argument overrides compile; the unseeded ones keep
  HEAD's diagnostics (`Expected 1-2 arguments, but got 0.`, `Expected 1 arguments, but got 0.`); `PageObjectOptions` and
  `LocatorRegistryOptions` import, a domain base class forwarding `PageObjectOptions` compiles and emits with
  `declaration: true`.
- **Q25** R2's job on Node 20.20.2 (nvm, outside the repository): `POMWRIGHT_TARBALL=… bash pack-test.sh
  --project=chromium` (frozen root install, both type checks, browsers, the run) 427 passed, no engine warning.
- **Q26** R16: the commits the tags resolve to today (`git ls-remote`): `actions/checkout` v4 `11d5960a…`,
  `pnpm/action-setup` v4 `b906affc…`, `actions/setup-node` v4 `49933ea5…`, `actions/upload-artifact` v4 `ea165f8d…`,
  `actions/download-artifact` v4 `d3f86a10…`, `changesets/action` v1 (a branch) `a45c4d59…` (v1.9.0); and how
  `changeset publish` publishes with pnpm 9.12.0: `pnpm publish` packs and runs the runner's `npm publish <tarball>`
  with a copy of `process.env` (pnpm's `runNpm`/`createEnv`, read in its bundle), so `NPM_CONFIG_PROVENANCE` reaches npm
  11. The attestation itself first appears at the first real publish: nothing can publish before that.
- **Q27** R7: query methods chain in any order (`nth(…).replace(…)` resolves), and `clearSteps("frame")` before
  `replace("frame").frameLocator()` resolves.
- **Q28** R5 on HEAD, three browsers, a throwaway server on port 9100: an identity provider's 302 to
  `/callback#access_token=abc&state=xyz` into a seeded origin ends on `/callback` without the fragment; without a seed the
  app reads it.
- **Q29** R22, three browsers, 20 rounds per case, `page.title()` read right after a seeded `goto` returns: HEAD, with or
  without a fragment, chromium 0 and firefox 0 rounds early, WebKit 20 of 20 early; R5's fix moving only with a fragment,
  WebKit 0 early with a fragment and 20 of 20 without; moving before every continuation of the writer, 0 early on all
  three browsers, with and without a fragment. With that final form: Q22's and Q23's probes and Q29, 42 passed on three
  browsers (navigation type `navigate`, history length and headers as on HEAD), and `sessionStorage.spec.ts` with
  `pageObject/callSite`, 123 passed on three browsers.

### 10.1 Intended contract, for consumers

What a consumer can notice:

| where | today (verified) | 3.0.0 |
| --- | --- | --- |
| a string `urlPath` with characters `new URL` changes (`/søk`, `/a b`, `/x?q=a b`, `/a/./b`) | `expectThisPage` times out, `expectAnotherPage` passes on the page (Q6) | compared as the browser reports it, as `fullUrl` is and as Playwright's `toHaveURL(string)` does; both methods work (Q22) |
| `baseUrl` or `urlPath` neither a string nor a RegExp (an unset variable) | constructs; never matches; storage without origin (Q7) | throws at construction: `Login: baseUrl must be a string or a RegExp; received undefined.` |
| a seeded navigation to `…#fragment`, directly or through a redirect | the fragment is lost, an OIDC callback loses its token (Q8, Q28) | kept; a `Location` with its own fragment keeps that one (Q22) |
| `page.goto()` to a seeded origin, on WebKit | returns before the app's document has loaded, 20 of 20 (Q29) | returns on the app's document, as on chromium and firefox (Q29) |
| a hand-made seed with a missing or empty primary | registered (Q9) | throws at `add`: `reuse requires a selector value for "p".`, `reuse requires a non-empty selector for "p".` |
| `replace(sub).frameLocator()` on a segment with steps in the query | accepted, fails at resolution (Q4) | throws at the call: `replace() cannot apply to "frame": it has filter or nth steps, and frameLocator() without a selector takes none; call clearSteps("frame") first.` |
| `replace().frameLocator()` on the query's own path | accepted, fails at resolution | throws at the call: `replace() cannot apply to "frame.btn": it is the path this query resolves, and frameLocator() without a selector has no element to resolve to; replace an ancestor instead.` |
| `filter`/`nth` on an any-frame segment in a query | `frameLocator() without a selector does not point to a particular iframe; …` | `nth() cannot apply to "any": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`, as on `add` |
| a seeded override with no argument (`getByRole()`, `getByTestId()`, …) | `frameLocator()` compiles, the other nine do not (Q2) | all ten compile and keep the seed's definition, as on `update()` |
| a seeded builder held in a variable | a second override throws a message the docs no longer list (Q3) | unchanged; documented |
| a path that is not a string, from JavaScript | `TypeError: path.startsWith is not a function` | `LocatorSchemaPath must be a string; received 42.` |
| the duplicate-registration message | a repeated RegExp prints as `"[Circular]"`; heading `Existing Schema:` | the RegExp printed each time; heading `Existing and attempted schemas:` |
| naming the constructor options | impossible (TS2344) | `PageObjectOptions<Options>` and `LocatorRegistryOptions` from `pomwright` |
| everything else | | unchanged |

### 10.2 Principles

- **Mirror Playwright.** A string URL is compared in the form the browser reports and `toHaveURL(string)` compares
  (R3); a seeded hop keeps what the browser keeps, the fragment (R5).
- **Validate at runtime, where the value is used.** The URL parts (R4), a hand-made seed's primary (R6) and a path's type
  (R9) are checked at the boundary; an any-frame replacement that cannot resolve is rejected at the call (R7).
- **One rule, one message.** R7, R11.
- **No guard whose only purpose is to excuse a mistake.** The held seeded builder keeps working as it does (R8): the
  record it produces is right.
- **No new runtime dependency; no new dev dependency.** Dependabot is a GitHub feature configured by a file (R16).

### 10.3 Design and implementation, per finding

**R1.** [pageObject.ts](../src/pageObject.ts): `export type PageObjectOptions<Options extends PageObjectTypeOptions =
{ baseUrlType: string; urlPathType: string }> = { label?; navOptions?; sessionStorage?: { schema? }; locators?:
LocatorRegistryOptions }`, with the `locators` doc comment moved onto it; the constructor's fourth parameter is
`options?: PageObjectOptions<Options>` (L82-92). [locators/index.ts](../src/locators/index.ts) and
[index.ts](../index.ts) export `LocatorRegistryOptions` and `PageObjectOptions`. The harness's
[testApp.base.ts](../test/page-object-models/testApp/testApp.base.ts) takes `options?: PageObjectOptions<BaseOptions<Options>>`
(and so gains `locators`). `SessionStorageOptions` and `SeedOptions` stay unexported (R1's recommendation).

**R2.** [checks.yaml](../.github/workflows/checks.yaml): a boolean input `node-floor` (default `false`) and a job
`harness-node-floor`, `Harness (chromium, Playwright pin, Node 20)`, needing `changes` and `package`, run when code
changed and the input is set: the harness job's steps at the pin row with `node-version: 20.x`, chromium only.
[main.yaml](../.github/workflows/main.yaml) passes `node-floor: true`; `pr.yaml` does not. The unit tests stay on Node 24
(vitest needs 22.12). The gate `build` covers the job through `checks`.

**R3.** [url.ts](../src/helpers/url.ts) `createUrlMatcher`: a string path's expected rest is
`restOf(new URL(path || "/", typeof base === "string" ? base : "http://h"))`, with `restOf(url) = url.pathname +
url.search + url.hash` shared with the comparison; `UrlMatcher.path` stays the value given, and `toString()` prints the
normalised rest (`path "/s%C3%B8k"`), which is what the browser shows.

**R4.** [url.ts](../src/helpers/url.ts): `assertUrlPart(name, value, label)` throws unless the value is a string or a
RegExp: `<label>: <name> must be a string or a RegExp; received <value>.`, `<value>` being `String(value)` for a
primitive and `an object` otherwise; [pageObject.ts](../src/pageObject.ts) calls it for both parts before the existing
string checks (L96-101).

**R5 and R22.** [sessionStorageSeed.ts](../src/helpers/sessionStorageSeed.ts) `continueScript` (L131-141), one rule for
the writer and the redirect document: `var url = <target>; if (url.indexOf("#") === -1) { url += location.hash; }`; a
GET then, when `url` without its fragment is the document's own URL without its fragment (always for the writer, never
for the redirect document, which sits on another URL), `history.replaceState(null, "", "/.pomwright-seed-continue")`
before `location.replace(url)`: from the writer's own URL a replace with a fragment only scrolls (R5), and without one
WebKit does not attach it to the `goto` that waits (R22); `replaceState` changes the address only, no request is made.
A form POST uses `url` as its `action`. `onNavigated`
(L334-350) returns early for a committed seed whose frame URL has the path `/.pomwright-seed-continue` (the writer moving
off its URL, a same-document change Playwright reports as `framenavigated`). Rejected: `location.reload()`, which keeps
the fragment but reports the app's navigation as a `reload` (Q23); documenting the loss.

**R6.** [locatorRegistry.ts](../src/locators/locatorRegistry.ts) `add`, the seed branch (L212-229): unless the seed's
definition is the any-frame form, `assertStrategyPrimary(type, primary, { method: "reuse", path })` before anything is
registered, giving `reuse requires a <field> value for "<path>".`, `reuse requires a non-empty <field> for "<path>".` and
`reuse requires a non-empty id for "<path>".` A `null` selector is not the any-frame form (`isAnyFrameDefinition` tests
`undefined`), so it throws too. Path reuse needs no check: a registered record passed its builder's.

**R7.** [locatorQueryBuilder.ts](../src/locators/locatorQueryBuilder.ts) `applyReplacement` (L296-303): when the new
definition is the any-frame form, it throws before the definition is set, for the query's own path with the terminal
message of 10.1, and for a segment with steps in the query with the `clearSteps` message of 10.1 (`utils.ts` gains both
message functions beside `anyFrameStepsMessage`). The first-segment rule stays at resolution, where the chain is known.
`buildLocatorChain`'s three resolution-time checks stay as internal guards and get unit tests through the internal
`buildLocatorChain` (M24 and M25).

**R8.** No code change; docs (10.6) and a unit test of the held form through `registry.add`.

**R9.** [utils.ts](../src/locators/utils.ts) `validateLocatorSchemaPath` (L68-90) first throws
`LocatorSchemaPath must be a string; received <value>.` for a value that is not a string, with the same `<value>` form
as R4; `""` keeps `LocatorSchemaPath string cannot be empty`.

**R10.** [utils.ts](../src/locators/utils.ts) `stringifyForLog` (L196-218) builds a printable copy first, recursively:
a `Locator` as `String(locator)`, a RegExp as `{ type: "RegExp", source, flags }`, arrays and objects member by member,
and `"[Circular]"` only for an object already on the current path; then `JSON.stringify(copy, null, 2)`.
[locatorRegistry.ts:256](../src/locators/locatorRegistry.ts#L256): the heading `Existing and attempted schemas:`.

**R11.** [locatorQueryBuilder.ts](../src/locators/locatorQueryBuilder.ts) `ensureStepTarget` (L407-411) takes the method
name and throws ``anyFrameStepsMessage(`${method}()`, subPath)``; `anyFrameNoElementMessage` stays for resolution (a
terminal, a `has` reference).

**R12.** [locatorRegistrationBuilder.ts](../src/locators/locatorRegistrationBuilder.ts): one overload per strategy
method, `(...inherit: Seeded extends true ? [] : [never])`, documented "When seeded, no argument keeps the seed's
definition, as `update()` does"; the implementation signatures take an optional first argument. `frameLocator` keeps its
own two overloads (its no-argument form is already the seeded inherit and the unseeded any-frame form). No runtime change:
every one of them already inherits (Q2).

**R13.** The comments of Part 1: `getNestedLocator` ("Throws if the path is not registered; an unregistered ancestor is
left out of the chain."), the query's `update` ("The registry never changes; the update applies to this query."), the
query's `replace` ("PUT-style"), `createRegistryWithAccessors` (no "v2"), the logger's typos; the module comments of
`url.ts`, `sessionStorage.ts` and `sessionStorageSeed.ts` lose their `See release-3.0.0/…` lines, and `sessionStorage.ts`
its `see ./sessionStorageSeed.ts`. Each is checked in `dist/index.d.ts` after the build.

**R14.** [utils.ts](../src/locators/utils.ts) `applyDefinitionPatch` (L450-462) reads the strategy from the seed and
throws `applyDefinitionPatch: a "<seed type>" seed cannot take a "<patch type>" patch.` for another one.

**R15.** [publicTypes.typecheck.ts:185](../test/tests/packaging/publicTypes.typecheck.ts#L185) keeps its `void`, with
`// biome-ignore lint/suspicious/noConfusingVoidType: the probe asserts that path reuse is no longer void`: biome's
suggested `undefined` would make a probe that cannot fail, since `void` was never assignable to `undefined` either.
`package.json`'s `lint` becomes `biome check --error-on-warnings .`, which CI's `lint` job runs.

**R16 (option A).** Every `uses:` of a third-party action in [publish.yaml](../.github/workflows/publish.yaml) and
[checks.yaml](../.github/workflows/checks.yaml) pinned to the commit its current tag resolves to (Q26), with the exact
version as a comment (`# v4.3.0`), resolved again at execution; a new `.github/dependabot.yml` with one
`github-actions` entry, monthly, all updates grouped into one pull request. `publish.yaml` gains `id-token: write` and,
on the changesets step, `NPM_CONFIG_PROVENANCE: "true"`. `NPM_TOKEN` stays. Provenance needs a public repository and a
`repository.url` matching it: POMWright is open source and `repository.url` is `git+https://github.com/DyHex/POMWright.git`
(plan 4).

**R17.** [test/tsconfig.json](../test/tsconfig.json): `baseUrl` removed, the three `paths` written `./…` (Q21).

**R18.** [playwrightReportLogger.ts](../src/helpers/playwrightReportLogger.ts) gains an internal `initialLogLevel(retry)`
(`warn` on the first run, `debug` on a retry), not exported from the root; [base.fixtures.ts](../src/fixture/base.fixtures.ts)
uses it. Tests in 10.4.

**R19.** Harness specs, 10.4.

**R20.** [verify.spec.ts:77-88](../test/tests/pageObject/verify.spec.ts#L77-L88) requests all eleven fixtures and
resolves one registered path of each; a page object whose verification failed rethrows its sticky error there, so the test
fails by its own assertion. The test's name stays.

**R21.** The seed tests of `locatorRegistrationBuilder.test.ts:180-243` and `locatorRegistry.test.ts:228-249` move,
unchanged, into a new `src/locators/reusableLocatorBuilder.test.ts`.

### 10.4 Tests

Unit tests first, red against the step before, then green (vitest's typecheck mode included):

- `utils.test.ts`: R9 (a number, an array, an object, `undefined`, `null`; `""` keeps its message); R10 (a RegExp twice
  in one record and across both, a real cycle still `"[Circular]"`, a `Locator` twice); R14; R11's and R7's message
  functions.
- `locatorQueryBuilder.test.ts`: R7 (steps, the terminal, nothing changed after the throw, `clearSteps` first then the
  replace resolving on the fake page); R11 (`filter` and `nth` messages).
- `locatorRegistry.test.ts`: R6 (every primary rule through a hand-made seed, nothing registered after a throw, an
  any-frame seed without steps still registering); R7's resolution guards through `buildLocatorChain` (an any-frame
  ancestor that is not first, one with steps, an any-frame terminal under a registered ancestor: M23 to M25); R8 (a held
  seeded builder: an override after a step applies, a second override throws its message).
- `locatorRegistrationBuilder.test.ts`: R12 types (`expectTypeOf` for the ten seeded no-argument forms, `@ts-expect-error`
  for the unseeded ones) and runtime (each inherits).
- `url.test.ts`: R3 (the paths of Q22 matched by their `fullUrl`, by a RegExp base, and not by the raw string; the
  matcher's `toString()`); R4 (`assertUrlPart`).
- `pageObject.test.ts`: R4 through the constructor; R1 types (`PageObjectOptions` is the constructor's parameter).
- `sessionStorageSeed.test.ts`: R5 and R22 (the scripts of both documents: the writer moves off its URL before every
  continuation, the redirect document never, a target's own fragment wins; `onNavigated` ignoring the continue marker of
  a committed seed and not of an uncommitted one). **Changed expectations (R5):** the three tests that pin the exact
  continuation script, *buildSeedDocument* "stores every entry inside a try, then replaces itself with the URL for a
  GET" and "re-submits a form with one hidden input per field for a POST", and *buildRedirectDocument* "performs the
  navigation without storing anything".
- `playwrightReportLogger.test.ts`: R18 (the five level methods over a parent and a child; `initialLogLevel(0)` and
  `(1)`).
- `reusableLocatorBuilder.test.ts`: R21, moved.

Harness, each new spec shown red against 3e560d8 in a scratchpad clone (its tarball) before the step's commit:

- `pageObject/urls.spec.ts`: R4, a page object built with an unset variable throws its message at construction.
- `testApp/testNav.spec.ts`: R3, a page object with the path `/testnav/item/søk` (the item route takes any id; no new
  route): `goto()`, `expectThisPage`, `expectAnotherPage` rejecting; R19, a page object with `navOptions: { timeout: 500 }`
  fails `expectThisPage` within it on the 1.5 s delayed navigation, and one with `navOptions: { waitUntil: "commit" }`
  returns from `goto()` while a routed sub-resource holds the `load` event.
- `testApp/sessionStorage.spec.ts`: R5 on the second origin, a seeded `goto` to `/teststorage#section` (the app sees the
  entries and `location.hash`), the redirect route from a URL with a fragment, a redirect whose `Location` carries its own
  fragment (a callback with a token), the form POST to an action with one, and a form POST answered by a 307 and by a
  308 from a URL with a fragment (method, body and fragment kept); R22, `page.title()` and `page.url()` read
  right after a seeded `goto`, with and without a fragment, are the app's (red on WebKit against 3e560d8).
- `pageObject/verify.spec.ts`: R20.
- `locatorRegistry/add/add.frameLocator.spec.ts`: **changed expectation (R11):** L188-191, the query's `nth` and
  `filter` on `anyFrame`, now `anyFrameStepsMessage`; R7's two messages added.
- `locatorRegistry/add/add.spec.ts:236` and `locatorRegistry.test.ts:28`: **changed expectations (R10):** the heading.
- `packaging/publicTypes.typecheck.ts` and `publicTypes.emit.ts`: `PageObjectOptions` and `LocatorRegistryOptions` import
  and emit; a domain base class forwarding them; the seeded no-argument forms; the held seeded builder compiling; R15's
  `biome-ignore`.
- `test/tsconfig.json`: R17.

Re-run against the final tarball, recorded in the execution note: Q22 (36 on three browsers), Q23's fidelity check
(navigation type, history length and headers equal to HEAD's), Q28 (the token kept), Q29 (0 early on three browsers),
Q24, Q14's surviving mutants M24, M25, M44, M46, M48, M49,
M55 and M56 (each must now be killed), and Q15's consumer check (no new error beyond Part 1's 69).

### 10.5 Docs (`docs/v3` only, for the code changes)

- [locator-registry.md](../docs/v3/locator-registry.md): *Reuse patch rules* (L1008, L1017-1019): the override may be
  called once on the seeded builder, before or after steps; no argument keeps the seed's definition for every method; a
  second override throws its message (R8, R12); the error reference (L1156-1210) gains the R6, R7 and R9 messages and the
  restored "only one matching override" line, and the any-frame entries follow R11; troubleshooting item 3; *Common path
  mistakes* (L154-160) gains R9's message; the duplicate example (L369) its heading (R10).
- [PageObject.md](../docs/v3/PageObject.md): the domain base class (L181-182) with `PageObjectOptions`; *URL rules*: a
  string page is compared as the browser reports it (`/søk` is `/s%C3%B8k`), and a part that is neither a string nor a
  RegExp throws (R3, R4).
- [session-storage.md](../docs/v3/session-storage.md): a seeded hop keeps the URL fragment (R5).
- [overview.md](../docs/v3/overview.md): the type exports gain `PageObjectOptions` and `LocatorRegistryOptions` (R1).
- D1 and D3's `PageObject.md` migration line stay with plan 11; D4 is not needed (R5 keeps the fragment, which the
  `session-storage.md` line above documents); D3's release-note line and D5 are in the ledger
  step.

### 10.6 Changesets and versioning

- `.changeset/quality-review-fixes.md`, `patch`: R3, R4, R5, R22, R6, R7, R9, R10, R11 under *Fixes*, each a behaviour that
  failed later, matched nothing or printed the wrong thing; R4 with the migration hint "a page object built from an unset
  variable now throws at construction".
- `.changeset/page-object-options.md`, `minor`: R1's two type exports and R12's seeded no-argument forms.
- Tooling, CI and tests (R2, R15 to R21) go to the release notes only, as in plan 4.

All ride 3.0.0. Nothing here breaks code that worked: R4's and R7's new throws replace a matcher that never matched and a
locator that could not resolve.

### 10.7 Ledgers

At agreement (this update): [DECISIONS.md](DECISIONS.md) gets a plan 10 section; [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md)
gets the items of 10.1 as *planned*, under *Additions*, *Bug fixes*, *Tooling, CI, and tests* and *Documentation*,
and upgrade checklist item 6 gains D3's line; [PLANS.md](PLANS.md) row 10 reads "written 2026-10-16, decisions taken,
awaiting implementation".

At execution (the last step): the items to *done*; execution-time decisions; [AGENTS.md](../AGENTS.md): the revision
line; section 1 (the public API gains `PageObjectOptions` and `LocatorRegistryOptions`); section 2 (`.github/dependabot.yml`;
the `harness-node-floor` job; the new unit test file); section 3 (`pnpm lint` fails on warnings); section 5 (a string URL is
compared as the browser reports it; a hand-made seed is checked as every builder is; an any-frame replacement is checked at
the call); section 6 (plan 10 executed, next plan 11) and D5's table fixed; section 7 (the two new changesets);
[PLANS.md](PLANS.md) row 10 to executed; this plan's execution note.

### 10.8 Decisions

Taken on 2026-10-16 (triage of Part 1; R5's mechanism, R22 and the details below at plan time).

- [x] 10.1 R1: export `PageObjectOptions<Options>` (the constructor's fourth parameter) and `LocatorRegistryOptions`;
  the harness's `TestApp` uses `PageObjectOptions`. Replaces plan 9's "`LocatorRegistryOptions` is a type of the module"
  and narrows its 7.8 "no new exported type": the constructor options could not be named at all (TS2344) and the
  harness's own copy had drifted. Rejected: also `SessionStorageOptions` and `SeedOptions`; leaving it.
- [x] 10.2 R2: a chromium harness job at the pin on Node 20 in `main.yaml` through a `node-floor` input of `checks.yaml`;
  unit tests stay on Node 24. Rejected: a release-time probe only; nothing.
- [x] 10.3 R3: a string path is compared in its parsed form (`pathname + search + hash` of `new URL`), beside a string or
  a RegExp base. Rejected: rejecting such paths at construction.
- [x] 10.4 R4: `baseUrl` and `urlPath` must each be a string or a RegExp, checked at construction with the label.
  Rejected: rejecting `undefined` and `null` only.
- [x] 10.5 R5: a seeded hop keeps the fragment: the continuation target keeps its own fragment or takes the document's;
  the writer document moves to `/.pomwright-seed-continue` with `history.replaceState` before every replace (widened from
  "with a fragment" for R22), and the registry ignores that same-document change of a committed seed. Rejected:
  `location.replace(url + location.hash)` (only scrolls, Q23); `location.reload()` (the app sees a `reload`, Q23);
  moving only with a fragment (leaves R22, Q29); documenting the loss.
- [x] 10.6 R6: a hand-made seed's primary goes through `assertStrategyPrimary` with the method `reuse`, any-frame
  excepted. Rejected: leaving it to `verify()`; accepting only factory seeds.
- [x] 10.7 R7: `replace(sub).frameLocator()` throws at the call on a segment with steps in the query (naming
  `clearSteps("<sub>")`) and on the query's own path; the first-segment rule stays at resolution; unit tests for the
  resolution guards. Rejected: tests only.
- [x] 10.8 R8: documented, not changed: the override may be called once on a held seeded builder, before or after
  steps; a second throws, and the message returns to the error reference. Rejected: making the override throw after a
  step.
- [x] 10.9 R9: a non-string path throws `LocatorSchemaPath must be a string; received <value>.` Rejected: leaving it.
- [x] 10.10 R10: `stringifyForLog` marks only real cycles; the heading is `Existing and attempted schemas:`; two existing
  expectations change. Rejected: the RegExp order only.
- [x] 10.11 R11: the query's `filter` and `nth` on an any-frame segment use the registration builder's message; one
  harness expectation changes. Rejected: leaving both.
- [x] 10.12 R12: every seeded override accepts no argument, as `update()` does; the unseeded types and diagnostics are
  unchanged. Rejected: documenting the difference.
- [x] 10.13 R13: the doc comments of Part 1 corrected and the release-folder references removed from the source.
- [x] 10.14 R14: `applyDefinitionPatch` takes the seed's strategy and throws for a patch of another. Rejected: leaving it.
- [x] 10.15 R15: the probe's `void` kept with a justified `biome-ignore`; `lint` fails on warnings. Rejected: biome's
  `undefined` (a probe that cannot fail); fixing the warning only.
- [x] 10.16 R16: option A: the actions of `publish.yaml` and `checks.yaml` pinned to commit SHAs, Dependabot for
  `github-actions` (monthly, grouped), provenance through `id-token: write` and `NPM_CONFIG_PROVENANCE`; `NPM_TOKEN`
  stays. Rejected for now: trusted publishing (option B, a setting on npmjs.com, left to the release); leaving it
  (option C).
- [x] 10.17 R17: the harness `tsconfig.json` without `baseUrl`, with `./`-relative `paths`.
- [x] 10.18 R18: unit tests for the logger's level methods; the fixture's initial level through an internal
  `initialLogLevel(retry)` with a unit test. Rejected: a harness test that fails once to reach a retry (CI's
  `failOnFlakyTests`).
- [x] 10.19 R19: harness specs for `navOptions.timeout` and `navOptions.waitUntil`.
- [x] 10.20 R20: the fixture verification test covers all eleven fixtures and asserts through a first use.
- [x] 10.21 R21: the seed tests move to `reusableLocatorBuilder.test.ts`.
- [x] 10.23 R22: fixed by 10.5's move before every continuation of the writer document, pinned by a harness spec on three
  browsers that reads the page right after a seeded `goto`. Plan 1.5's "0 of 20 resolving on the writer document" held
  on Chromium only. Rejected: a WebKit caveat in the docs.
- [x] 10.22 Changesets `quality-review-fixes` (`patch`) and `page-object-options` (`minor`); tooling, CI and tests in the
  release notes only; docs per 10.5; D1 and D3's docs line to plan 11; D4 not needed (R5). No new dependency of either kind.

### 10.9 Execution order

One commit per step; each runs `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm harness:install`,
`pnpm typecheck` and the chromium project, unless it says more.

1. Locators: R6, R7, R9, R10, R11, R12, R14, R13's locator comments, R21's move, with their unit tests first (red,
   then green) and the two changed unit expectations of R10.
2. URLs and `PageObject`: R1, R3, R4, R13's URL and `PageObject` comments, with their unit tests first.
3. Session storage: R5 and R22, R13's storage comments, with their unit tests first and R5's three changed
   expectations.
4. Logger: R18, R13's logger comments, with their unit tests first.
5. Harness: 10.4's specs and probes (red first against 3e560d8 in a scratchpad clone), the changed expectations of R10
   and R11, `TestApp` on `PageObjectOptions`, R15's `biome-ignore`, R17; the three browsers for the new specs.
6. Tooling and CI: R15's `lint` flag, R2's job, R16's pins, `dependabot.yml` and provenance; `actionlint` if available,
   otherwise a YAML parse and a review of every `uses:` line.
7. Docs in `docs/v3` per 10.5.
8. Changesets.
9. Full run: `pnpm format`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm pack-test --reporter=line` (three
   browsers), and 10.4's re-runs against the final tarball; anything red is fixed as its own step.
10. Ledgers per 10.7.

The plan fits one execution: three of the steps are small code changes, the harness step is the largest, and nothing
waits on an outside party except the provenance statement, which appears at the first publish.
