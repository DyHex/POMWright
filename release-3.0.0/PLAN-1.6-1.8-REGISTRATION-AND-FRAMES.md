# Plan: registration guards, frames, and update semantics (analysis items 1.6, 1.8, 1.9e, 3.2, 3.6, the seeded-recovery bullet of 1.10, and the peer floor)

Working document, kept in `release-3.0.0/` beside the analysis it answers: items 1.6 and 3.2 (steps on frame
segments, frames as `locator` plus `contentFrame`, the any-frame `frameLocator()`), 1.8 (registration without the
primary argument; `update` semantics, which grew in review into a same-strategy `update` with JSON Merge Patch
semantics), 1.9e (steps and `describe` before a strategy compile), 3.6 (fail fast at registration, `verify()`), the
"asymmetric seeded recovery" bullet of 1.10, the section 5 bullets for `locator-registry.md` on frames and on the
"Missing" list, and, decided in review, the Playwright peer floor raised to 1.64.0 with the harness pinned to it. File
links are relative to this folder. Written 2026-10-12, reviewed and redesigned the same day (frames kept as option A
with the any-frame segment added; the empty-string rule narrowed to what Playwright cannot use; `update` restricted to
the registered strategy with `null` as the delete value; `verify()` made automatic; the floor). Every decision in
section 7 is taken and mirrored in [DECISIONS.md](DECISIONS.md) and [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md)
as *planned*.

Every runtime claim below was verified on 2026-10-12: Playwright's behaviour against Chromium through the 1.62.1
install in `test/` and through a 1.64.0 install made in the session scratchpad for the comparison (both by
`createRequire` of the respective `package.json`), on a local http server of the probe's own with pages holding
visible, hidden and nested iframes and elements with empty attributes; Firefox 153 and WebKit 26.5 from the 1.62.1
install for the browser-level `[id=""]` question; POMWright's current behaviour through a fresh `pnpm build` of
`dist/index.mjs` with Chromium loaded from the root package; the existing harness suite on 1.64.0 in an isolated copy
of `test/` against the packed HEAD tarball; type claims with the repository's TypeScript 5.9.3 under the root
`tsconfig.json` flags plus `target: es2024`, every negative case a consumed `@ts-expect-error`; Playwright version
facts from the installed 1.62.1 and 1.64.0 type definitions, the release notes, and the fix PR; API usage facts from
the user's `ice-orderform-web` Playwright project (pomwright 2.1.0, 31 locator files, 494 registrations). Every code
reference points at the exact lines in this repository. Example hosts are generic (`*.example`).

Out of scope, left to the plans listed in [PLANS.md](PLANS.md): lazy `defineLocators` (1.7, plan 5), which also
decides where the automatic `verify()` call moves; replace mode in the builder *types*, the public builder surface,
whitespace parity and the missing type exports (1.9a to 1.9d, plan 7); the strategy table (3.1), the `describe`
option (3.3), strict chains (3.4), path reuse returning a builder (3.5), seed immutability (3.8) and any
strategy-typed registration style that would let `update()` narrow at compile time (plan 9); `remove` then `update`
dropping steps and the other 1.10 bullets (plan 8), including the "Missing: 1.10" doc bullet, which is documented when
plan 8 decides the behaviour; the floor matrix in CI (section 4, plan 6). One section 2 bullet closes here as a side
effect: the shadowed `isTerminalStep` at [locatorRegistry.ts:474](../src/locators/locatorRegistry.ts#L474) disappears
with the frame branch (4.6).

---

## 1. Intended contract

### 1.1 Principles for this plan

- **Mirror Playwright, on the floor POMWright declares.** A frame segment is what Playwright recommends for frames
  since 1.43: an element locator, then `contentFrame()`; Playwright deprecates `FrameLocator.first()`, `last()` and
  `nth()` in favour of exactly that form. The any-frame `frameLocator()` of 1.63 is exposed as it is. The floor is
  1.64.0, so there is one Playwright behaviour to document, not a version table.
- **POMWright allows what Playwright allows and is stricter only where the input is never valid.** A registration,
  a seed, an update and a replacement check their primary argument where it is written, with the method and the
  registry path in the message. A missing primary is rejected everywhere; an empty string only where Playwright
  itself errors or can never match (`locator`, `frameLocator`, `getByRole`, and `getById` from plan 1.1-1.2).
  `getByText("")`, `getByTestId("")` and the other text-likes match real elements (verified) and are stored verbatim.
- **`update` is a PATCH of the registered definition, `replace` is a PUT of a new one.** `update` keeps the
  registered strategy and follows JSON Merge Patch: a provided value replaces, `null` deletes, an absent or
  `undefined` value leaves the field alone. Changing the strategy is `replace`, which takes a full definition. Neither
  touches steps or the description; `filter`, `nth`, `clearSteps` and `describe` do.
- **A DSL call that throws changes nothing.** The registry after a failed call is the registry before it, for every
  builder error.
- **Compile-time checks only where they cost nothing.** The builder returned by `add(path)` exposes the ten strategy
  methods and nothing else; `filter`, `nth` and `describe` appear after a strategy. Nothing that works today stops
  compiling, except what always threw.
- **Verification is automatic for page objects and explicit for standalone registries.** `PageObject` verifies every
  path once right after `defineLocators()`; `createRegistryWithAccessors` users call `registry.verify()`. There is no
  opt-out, because verification fails only where a resolution would fail.

### 1.2 Peer floor 1.64.0

The peer range becomes `@playwright/test >=1.64.0 <2.0.0`; the harness pins 1.64.0. Three reasons, each
verified:

- The regex fix [microsoft/playwright#42818](https://github.com/microsoft/playwright/pull/42818) (merged 2026-09-22,
  after 1.63.0 of 2026-09-04, before 1.64.0 of 2026-10-07) is in 1.64.0: on the same page `getByText(/foo/g)` matched
  5 of 9 elements on 1.62.1 and 9 of 9 on 1.64.0, `getByText(/foo/y)` 6 and 9, `getByLabel(/foo/g)` 2 of 3 and 3,
  `getByTestId(/panel/y)` 2 of 3 and 3; `/-[abc]$/y` is 0 on both, so sticky at index 0 is a start anchor. With the
  floor at 1.64, the `y` caveat in the getById docs, release notes, changeset and decisions goes, and the harness can
  assert `y` against DOM.
- `page.frameLocator()` without a selector (1.63, section 1.4) exists on the floor.
- `page.sessionStorage` (1.61, plan 1.5) is covered.

`<2.0.0` stays: POMWright wraps `page.sessionStorage`, `route.fetch`, `waitForURL`, `contentFrame()` and the selector
engines, any of which a Playwright major may change, and an open range would let a consumer install an untested major
without a peer warning; widening after testing is a non-breaking one-line release, narrowing later is breaking.

The existing suite on 1.64.0 (isolated copy, packed HEAD tarball, chromium):

| result | count |
| --- | --- |
| passed | 287 |
| failed | 3 |

All three failures are one rendering change: 1.64 adds `locator.visible()` and renders `filter({ visible: true })` as
`.visible()` ([add.filter.spec.ts:142](../test/tests/locatorRegistry/add/add.filter.spec.ts#L142),
[add.reuseReusable.spec.ts:310](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts#L310),
[getLocatorSchema.filter.spec.ts:372](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L372));
the selector is unchanged. The 1.64 note that elements inside hidden iframes count as hidden made no difference for a
`display: none` iframe (hidden on both versions). Consumers on 1.63, such as the `ice-orderform-web` project, upgrade
to 1.64 to take 3.0.0.

### 1.3 Frames with a selector: an element locator whose descendants resolve inside the frame

Rules:

- `add(path).frameLocator(selector)` registers a frame segment. At resolution the segment is
  `target.locator(selector)`, then its recorded steps in chain order (`filter`, `nth`, `first`, `last`), then:
  - for a non-terminal segment, `.contentFrame()` is the target for the next segment;
  - for a terminal segment (`getLocator(path)`, `getNestedLocator(path)` ending on it, or a `has`/`hasNot` path
    reference to it), the element locator itself, the `<iframe>` element, as today's `owner()` gives.
- Steps on a frame segment work everywhere steps work: at registration, on a reusable seed, and on the query builder
  (`nth("shell.frame", 1)`, `filter("shell.frame", { visible: true })`, `clearSteps("shell.frame")`).
- `frameLocator(selector)` keeps Playwright's signature, a selector and no options; a filter on the iframe element is
  a `filter` step.
- What a step means on a frame segment is what it means on any `<iframe>` element locator in Playwright: `nth`,
  `first` and `last` pick among the matching iframes in the parent document; `filter({ visible })` and
  `filter({ has, hasNot })` are evaluated against the iframe element in the parent document; `filter({ hasText })`
  never matches, because the frame's document is not part of the parent document's text (verified: count 0).
- Disambiguating by content *inside* the frame is not possible in Playwright: strict mode fails on the iframe
  element before entering it (verified: with "Frame B" in one of three iframes,
  `frameLocator('iframe').getByRole('heading', { name: 'Frame B' })` throws `strict mode violation: locator('iframe')
  resolved to 3 elements`), and a `has` that enters a frame is rejected (`Frame locators are not allowed inside
  composite locators`, verified). What works is context in the parent document, which is the ancestor chain
  (`locator('section', { hasText: 'Section B' }).frameLocator('iframe')` reads "Frame B", verified); the docs lead
  with that and present a step on the iframe element as the last resort, as for any locator.
- Rendering follows Playwright: `locator('iframe').nth(1).contentFrame().getByRole('button')`. A frame segment
  without steps renders exactly as today, because `page.frameLocator(sel)` and `page.locator(sel).contentFrame()`
  build byte-identical selectors on 1.62.1 and 1.64.0 (verified), and Playwright derives the rendered string from the
  selector. Every existing string assertion against `page.frameLocator(...)` keeps passing.

What Playwright provides, verified in the installed types and in Chromium:

- `locator.contentFrame(): FrameLocator` and `frameLocator.owner(): Locator`, both since 1.43 (release notes), at
  [types.d.ts:14540](../test/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core/types/types.d.ts#L14540)
  and [L21448](../test/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core/types/types.d.ts#L21448)
  of the 1.62.1 types (15096 and 22181 in 1.64.0).
- `FrameLocator.first()`, `last()` and `nth()` carry `@deprecated Use locator.first() followed by
  locator.contentFrame() instead` (and the same for `last` and `nth`) in the `FrameLocator` interface at
  [types.d.ts:21024](../test/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core/types/types.d.ts#L21024)
  onward (`first` L21030, `last` L21371, `nth` L21426). `FrameLocator` has no `filter`.
- Rendering and selector parity (probe, `toString()` and the client-side selector; identical on 1.64.0):

  | expression | `toString()` | selector |
  | --- | --- | --- |
  | `page.frameLocator('iframe').getByRole('button')` | `locator('iframe').contentFrame().getByRole('button')` | `iframe >> internal:control=enter-frame >> internal:role=button` |
  | `page.locator('iframe').contentFrame().getByRole('button')` | same | same |
  | `page.frameLocator('iframe').owner()` | `locator('iframe')` | `iframe` |
  | `page.locator('#sectionB').frameLocator('iframe').owner()` | `locator('#sectionB').locator('iframe')` | `#sectionB >> iframe` |
  | `page.locator('iframe').nth(1).contentFrame().getByRole('button')` | `locator('iframe').nth(1).contentFrame().getByRole('button')` | `iframe >> nth=1 >> internal:control=enter-frame >> internal:role=button` |
  | `page.frameLocator('iframe').nth(1).getByRole('button')` (deprecated form) | same as the row above | same |
  | `page.locator('iframe').filter({ visible: true }).last().contentFrame().getByRole('button')` | `locator('iframe').filter({ visible: true }).last().contentFrame().getByRole('button')` on 1.62.1; `.visible().last()` on 1.64 | `iframe >> visible=true >> nth=-1 >> internal:control=enter-frame >> internal:role=button` |
  | `page.locator('#sectionB').locator('#iframeB').contentFrame().locator('#iframeC').contentFrame().getByTestId('toggle')` | as written | `#sectionB >> #iframeB >> internal:control=enter-frame >> #iframeC >> internal:control=enter-frame >> internal:testid=[data-testid="toggle"s]` |
  | `page.locator('section').filter({ has: page.locator('iframe#iframeB') })` | `locator('section').filter({ has: locator('iframe#iframeB') })` | `section >> internal:has="iframe#iframeB"` |

- Selector-string equivalents, for the docs: `frameLocator(':nth-match(iframe, 2)')`, `frameLocator('iframe >>
  nth=1')` and `frameLocator('iframe >> visible=true >> nth=-1')` all reach the second visible frame (verified) and
  the second renders exactly as `locator('iframe').nth(1).contentFrame()`; `frameLocator('iframe:visible')` alone
  still hits strict mode with two visible frames.
- DOM behaviour on the probe page (three iframes in the top document, one `display: none`, one nested):
  `locator('iframe').nth(1).contentFrame().getByRole('button')` reads "Toggle B: Off", a click turns it "On" and
  leaves the first frame's button "Off"; `locator('iframe').filter({ visible: true }).count()` is 2;
  `filter({ visible: true }).last()` is the second visible frame; the nested chain reads "Toggle C: Off";
  `filter({ has: iframe#iframeB })` on `section` yields `sectionB`; a click inside the hidden frame times out.
- Locator construction is pure: 10,000 chains with `has`, `nth`, `contentFrame` and `describe` built in 8 ms, and a
  chain is constructible on `about:blank`. `verify()` (1.8) relies on this.

Correction to the analysis for the record (1.6 says the dropped `nth` "targets the first iframe"): with the step
dropped, the resolved chain is `locator('iframe').contentFrame()...`, and when the selector matches more than one
iframe, which is the only case in which the step mattered, the action fails with a strict mode violation that names
`locator('iframe')` and not the dropped step (verified through `dist`). The step is dropped silently at resolution;
the failure is loud but misleading at action time. The spec title "skips frame-level filters" at
[getLocatorSchema.filter.spec.ts:316](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L316)
shows the drop was by design in 2.1; 3.0.0 replaces it with Playwright's model rather than keeping an API that
records what it then ignores.

### 1.4 Frames without a selector: the any-frame segment

Playwright 1.63 made the selector optional on `page.frameLocator()` and `frame.frameLocator()` only (1.64.0 types:
`Page` and `Frame` have `frameLocator(selector?: string)`, `Locator` and `FrameLocator` keep `selector: string`).
Verified on 1.64.0: `page.frameLocator().getByRole('button', { name: 'one' })` renders `frameLocator().getByRole(…)`
and finds the button in whichever frame holds it, the main frame included; with matches in several frames every
action throws `frameLocator() matched elements in multiple frames`; `page.frameLocator().owner()` throws `Selector
cannot be empty after frameLocator()`; `page.locator('#s2').frameLocator()` and `page.frameLocator('#f2').frameLocator()`
silently build `locator('undefined')` and match nothing (on 1.62.1 the same calls fail at action time with
`selector: expected string, got undefined`).

POMWright exposes exactly that:

- `add(path).frameLocator()` with no argument registers an any-frame segment. It returns nothing chainable (as
  path-based reuse does today): there is no element to apply `nth` or `filter` to, and no element to describe.
- At resolution the segment is `page.frameLocator()` and must be the first registered segment of the chain being
  resolved: if the current target is not the page (an ancestor resolved before it, in the registry or after a query
  builder change), resolution throws `frameLocator() without a selector must be the first segment of the chain;
  "shell.anyFrame" has the ancestor "shell"`, because Playwright would otherwise build `locator('undefined')`.
  A sparse chain or a removed ancestor whose resolved target is still the page is fine.
- It has no terminal form: `getLocator("anyFrame")`, `getNestedLocator("anyFrame")` and a `has`/`hasNot` reference to
  it throw `frameLocator() without a selector does not point to a particular iframe; resolve a path inside it`,
  mirroring Playwright's unsupported `owner()`.
- Descendants resolve inside whichever single frame matches: `getNestedLocator("anyFrame.button")` is
  `page.frameLocator().getByRole('button')`; several frames matching is Playwright's error at action time,
  documented. `getLocator("anyFrame.button")` is terminal-only as for any ancestor: `page.getByRole('button')`.
- The query builder throws for `nth("anyFrame", …)` and `filter("anyFrame", …)` with the same no-element message;
  the path types carry no strategy, so this is a runtime check.
- `replace(sub).frameLocator()` makes a sub-path any-frame (a PUT without a selector); `update(sub).frameLocator()`
  changes nothing (a PATCH with nothing provided); a seeded `add(path, { reuse: seed }).frameLocator()` inherits the
  seed's selector. `createReusable.frameLocator(selector)` requires the selector: an any-frame segment has nothing a
  seed could carry.
- `frameLocator("")` is rejected on every builder: a css parse error at action time on every version (verified).

### 1.5 Registration requires the strategy's primary argument

| method | primary field | accepted | `add` unseeded | `add` seeded | `createReusable` | `update` | `replace` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `getByRole` | `role` | non-empty string | required | `undefined` inherits | required | `undefined` inherits | required |
| `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle` | `text` | string (empty allowed) or RegExp | required | `undefined` inherits | required | `undefined` inherits | required |
| `locator` | `selector` | non-empty string | required | `undefined` inherits | required | `undefined` inherits | required |
| `frameLocator` | `selector` | non-empty string, or absent for any-frame (1.4) | required or any-frame | `undefined` inherits | required | `undefined` inherits | required or any-frame |
| `getByTestId` | `testId` | string (empty allowed) or RegExp | required | `undefined` inherits | required | `undefined` inherits | required |
| `getById` (plan 1.1-1.2, unchanged) | `id` | non-empty string or RegExp | required | `undefined` inherits | required | `undefined` inherits | required |

"Required" means provided (not `undefined`), and for the four non-empty rows also not `""`. `undefined` inherits only
where there is something to inherit from (a seed, or the definition being updated). RegExp values are accepted as they
are. The options-only overloads of the registration builder stay typed `never` on an unseeded builder, as today; the
runtime check covers JavaScript callers and `as never` casts. The truthiness checks go, so `getByTestId("")` and
`frameLocator("")` are no longer read as "not provided", and a seeded `getByTestId("")` stores `""` instead of
inheriting.

Messages, two templates: `getByRole requires a role for "main.button".` when the value is missing, and
`locator requires a non-empty selector for "list".` for the four strategies that reject `""`; `getById` keeps
`getById requires a non-empty id for "…"` for both cases; seeds say `createReusable.locator requires a non-empty
selector.`

Why this split and not "reject every empty string" (the first draft) or "pass everything through": verified on a
page with empty attributes (`data-testid=""`, `placeholder=""`, `alt=""`, `title=""`, an empty `<label>`, `id=""`):

| Playwright call | 1.62.1 and 1.64.0 | rule |
| --- | --- | --- |
| `locator("")`, `frameLocator("")` | css parse error at action time | reject |
| `getByRole("")` | `selector cannot be empty` | reject |
| `getByRole(undefined)`, `locator(undefined)`, `frameLocator(undefined)` below `Page` | a `'undefined'` literal that matches nothing, or an error at action time | reject as missing |
| `getByTestId(undefined)`, `getByText(undefined)` | `TypeError` at construction | reject as missing |
| `getByTestId("")` | matches the element with `data-testid=""` | allow |
| `getByText("")` | 19 elements, 11 with `exact` | allow |
| `getByLabel("")`, `getByPlaceholder("")`, `getByAltText("")`, `getByTitle("")` | match the empty-attribute element, plus substring matches without `exact` | allow |
| `getById("")` as `[id=""]` | engine-dependent, table below | reject (plan 1, kept) |

`getById("")` stays rejected on two grounds: `id=""` is invalid HTML (the attribute must contain at least one
character), and the engines disagree on whether `[id=""]` matches it, so a locator built from it would pass in one
browser project and fail in another:

| engine | `querySelectorAll('[id=""]')` with `<div id="">` present | `[data-testid=""]` |
| --- | --- | --- |
| Chromium 151 (the 1.62.1 build) | 0 | 1 |
| Chromium 156 (the 1.64.0 build) | 1 | 1 |
| Firefox 153 | 1 | 1 |
| WebKit 26.5 | 0 | 1 |

### 1.6 `update` and `replace`

`getLocatorSchema(path).update(subPath?)` patches the definition registered for the sub-path and keeps its
strategy; `replace(subPath?)` installs a new definition of any strategy. Neither touches steps or the description.

`update` follows JSON Merge Patch at both levels:

```ts
update().getByRole("link")                       // primary replaced, options kept
update().getByRole({ name: "Save" })             // one option set, the rest kept
update().getByRole("button", { name: null })     // the name option deleted, the rest kept
update().getByRole("button", null)               // all options deleted
update().getByRole(null)                         // all options deleted, primary kept
update().getByRole("button", undefined)          // no change to options: same as update().getByRole("button")
update().getByRole({ name: undefined })          // no change: undefined is absent
update().getByRole()                             // no change at all
update().locator("li")                           // on a role path: throws, use replace()
replace().locator("li")                          // new definition, steps kept
replace().getByRole({ name: "x" })               // throws: replace requires the primary
```

- A provided primary replaces the primary; `undefined` keeps it. Options merge key by key; a `null` key is deleted,
  an `undefined` key is skipped, `null` for the whole options argument deletes every option. When no option remains
  the definition has no `options`, so it renders as `getByRole('button')`.
- A strategy other than the registered one throws at the call: `update("list.item") cannot change the strategy from
  "role" to "locator"; use replace("list.item").locator(…)`. The path types carry no strategy, so all ten methods
  stay on the update builder for autocompletion and the check is at runtime (a strategy-typed registration style is a
  plan 9 question).
- `replace` takes Playwright's own argument shapes: primary required (`frameLocator()` without a selector means
  any-frame), options as given, no `null`; a `null` passed anyway equals omission.
- The per-path per-type cache that let a builder switch strategies and back without restating the primary is
  removed with the strategy switch.
- Steps and the description survive both verbs. A step is what Playwright chains after the locator and belongs to
  the path, not to the strategy; `clearSteps(subPath)` is one call when the old steps no longer fit. This is also how
  the user's project uses the API: 24 query chains do `update(ancestor).locator({ hasText })` and then
  `.nth(ancestor, index)`.

Why `update` is same-strategy: a PATCH of a role definition yields a role definition; changing the strategy is a PUT,
which `replace` is, and `replace` keeps steps and the description, so a cross-strategy `update` could do nothing that
`replace` cannot. The cache existed only to make a switch-and-back free, which is hidden state the caller must know
about. In the user's project (pomwright 2.1.0) all 75 `update` calls are options-only patches on the registered
strategy (66 `locator({ hasText })` on `locator` paths, 9 `getByRole({ name })` on `getByRole` paths), `replace`,
`remove` and `clearSteps` are unused, and no call passes `undefined` options; nothing there changes.

Why `null` and not an explicit `undefined` as the delete value (2.1's design, detected by `arguments.length`):
`f(a, undefined)` and `f(a)` are the same call in every TypeScript signature and in Playwright's own methods, so a
variable that happens to be `undefined` (`const opts = cond ? { exact: true } : undefined`) wiped the registered
options silently (verified: `getByRole('button')` after `update().getByRole("button", opts)`). `null` is the Merge
Patch delete value, cannot arrive by accident, and works per key as well, where 2.1 relied on an object spread plus
Playwright ignoring `undefined` values.

### 1.7 Steps and `describe` need a strategy first, at compile time

`add(path)` returns a builder typed with the ten strategy methods only. `add("a").filter(…)`, `.nth(…)` and
`.describe(…)` are compile errors; after a strategy the post-definition builder has `filter`, `nth`, `describe`, as
today. A seeded builder (`add(path, { reuse: seed })`) keeps `filter`, `nth` and `describe` before its optional
override, because the seed is the definition. For JavaScript callers the runtime check stays, with one message for
the three methods: `filter() needs a locator strategy first for "a"; call getByRole, getByText, getByLabel,
getByPlaceholder, getByAltText, getByTitle, locator, frameLocator, getByTestId or getById before it.`

### 1.8 A throwing DSL call changes nothing

After `add(p, { reuse: seed }).getByText(…)` on a `role` seed throws, `p` is still registered with the seed. After
a second same-type override throws, `p` holds the first override. After a second strategy on an unseeded builder
throws, `p` holds the first. The registry never unregisters a path on its own.

### 1.9 `verify()`

`registry.verify(): void` resolves every registered path once, the definition and its own steps as `getLocator`
does, which evaluates every `has`/`hasNot` path reference through the normal resolution: a reference to an
unregistered path, a cyclic reference, an unsupported reference value, a corrupted definition, an any-frame segment
used as a terminal or below an ancestor, all throw there. Failures are collected and reported together:

```
Locator registry verification failed for 2 of 14 paths:
  "list.item": No locator schema registered for path "list.titel".
  "menu.item": Detected cyclic filter reference while resolving "menu.item": "menu.item".
```

`PageObject` calls it right after `this.defineLocators()` ([pageObject.ts:97](../src/pageObject.ts#L97)), so a
typo in any page object fails every test that constructs it, at fixture setup, with the path named. The cost is one
synchronous pass with no browser round trip, about a microsecond per path (10,000 chains in 8 ms), so a page object
with a few hundred paths verifies in well under a millisecond per construction even with the per-instance
re-definition of analysis 3.7. There is no opt-out: verification fails only where a resolution would fail. Plan 5
(1.7) moves the call together with the lazy definition. The method is public on the registry and in the
`LocatorRegistry` type for standalone registries, which have no "done" hook. Registration itself is unchanged:
forward references are allowed, so in a standalone registry that never verifies a typo surfaces at the first action
that resolves it, exactly as today.

What `verify()` does not do: evaluate selectors against the DOM, or parse them (Playwright parses selectors at
action time; `locator("div >>")` fails there, as it does in Playwright).

### 1.10 Edge cases, with the decided answer

| case | today (verified) | 3.0.0 |
| --- | --- | --- |
| `add("w.frame").frameLocator("iframe").nth(1)`, `add("w.frame.go").getByRole("button")`, `getNestedLocator("w.frame.go")` | step recorded, never applied: `locator('iframe').contentFrame().getByRole('button')`; with three iframes the click fails with `strict mode violation: locator('iframe') resolved to 3 elements` | `locator('iframe').nth(1).contentFrame().getByRole('button')`; clicks in the second iframe |
| the same with `.filter({ visible: true }).nth("last")` | both dropped, same strict-mode failure | applied; the last visible iframe; renders `.visible().last()` on 1.64 |
| `getNestedLocator("w.frame")` and `getLocator("w.frame")` on the stepped frame | `locator('iframe')`, step dropped | `locator('iframe').nth(1)`: the second `<iframe>` element |
| `getLocatorSchema("w.frame.go").nth("w.frame", 0)` | dropped | applied |
| `getLocatorSchema("w.frame.go").clearSteps("w.frame")` | no effect | removes the frame's steps; with several matching iframes the action then fails with Playwright's strict mode violation |
| `has: "w.frame"` from another path | the `<iframe>` element without the step | the `<iframe>` element with the step |
| frame segment without steps, any depth | `locator('x').contentFrame()…` | identical selector and rendering |
| `update("w.frame").frameLocator()` (nothing provided) | selector inherited, steps kept, steps dropped at resolution | no change; steps applied |
| `replace("x").frameLocator("iframe")` on a segment registered with another strategy and with steps | via `update`: descendants resolve inside, the segment's steps dropped | the segment's steps apply to the iframe element, then `contentFrame()`; `update` with another strategy throws |
| `filter({ hasText: "Submit" })` on a frame segment | dropped | applied and never matches (Playwright: the frame's document is not the parent's text); documented |
| `describe("Login frame")` on a terminal frame | on the element locator | same |
| `add("anyFrame").frameLocator()`, `add("anyFrame.go").getByTestId("toggle-c")`, `getNestedLocator("anyFrame.go")` | registers without a selector; `locator('undefined')` | `page.frameLocator().getByTestId('toggle-c')`; finds the element in the one frame that has it |
| `getNestedLocator("anyFrame.button")` with buttons in several frames | n/a | Playwright: `frameLocator() matched elements in multiple frames` at action time |
| `getLocator("anyFrame")`, `getNestedLocator("anyFrame")`, `has: "anyFrame"` | n/a | throws: no particular iframe |
| `add("shell").locator("main")`, `add("shell.anyFrame").frameLocator()`, resolve a descendant | n/a | throws: must be the first segment; `remove("shell")` on the query builder makes it resolvable |
| `nth("anyFrame", 1)`, `filter("anyFrame", …)` on the query builder | n/a | throw: no element |
| `createReusable.frameLocator()` | n/a | compile error and `createReusable.frameLocator requires a non-empty selector.` |
| `frameLocator("")` unseeded | registers `{ type: "frameLocator" }`; resolves to `locator('undefined')` | throws `frameLocator requires a non-empty selector for "…"` |
| `getByTestId("")` unseeded | registers `{ type: "testId" }`; resolution throws Playwright's `Cannot read properties of undefined (reading 'unicode')` | registers `testId: ""`; matches `data-testid=""` |
| `locator("")` | registers `selector: ""`; renders as an empty selector; action fails with Playwright's css parse error | throws at registration |
| `getByText("")` (and label, placeholder, alt text, title) | registered | registered; matches as Playwright matches |
| `getByRole({ name: "x" })` on an unseeded builder from JavaScript | registers `{ type: "role", options }`; `getByRole('undefined', { name: 'x' })` | throws `getByRole requires a role for "…"` |
| `getByRole(undefined)`, `getByTestId(undefined)` unseeded from JavaScript | registered without the field | throw |
| seeded `getByTestId("")` | inherits the seed's id silently | stores `""`; `getByTestId(undefined)` inherits |
| seeded `frameLocator("")` | inherits silently | throws; `frameLocator(undefined)` inherits |
| `createReusable.locator("")`, `.frameLocator("")`, `.getByRole("")` | accepted | throw |
| `createReusable.getByTestId("")`, `.getByText("")` | accepted | accepted, stored verbatim |
| `update().locator("")`, `update().getByRole("")`, `replace().locator("")` | passed through | throw |
| `update().getByTestId("")` | `getByTestId('')` | same, by design now |
| `update().getByRole("button", undefined)` on `{ name: "Login" }` | `getByRole('button')`: options wiped | `getByRole('button', { name: 'Login' })` |
| `update().getByRole("button", null)` | compile error | `getByRole('button')` |
| `update().getByRole({ name: null })` on `{ name: "Login", exact: true }` | compile error | `getByRole('button', { exact: true })` |
| `update().getByRole({ name: undefined })` | the key is removed | no change |
| `update().locator({ hasText: undefined })` (spec at [update spec:134-145](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L134-L145)) | removes `hasText` | no change; the spec migrates to `{ hasText: null }` |
| `update(path).locator("div")` on a role path | switches | throws naming `replace()` |
| `update(path).locator("div")` then `update(path).getByRole()` in one builder | the cached role definition returns | the first call throws; no cache |
| `replace().getByRole("button")` | `getByRole('button')` | same |
| `replace().getByRole({ name: "x" })` | throws `requires a "role" value` | same |
| `replace(sub).locator("li")` on a path with steps | steps kept | same |
| `add("a").filter({ hasText: "x" })` | compiles; throws `A locator definition must be provided before applying filters or indices for "a".` | compile error; at runtime `filter() needs a locator strategy first for "a"; call …` |
| `add("a").nth(0)`, `add("a").describe("d")` | compile; throw (two different messages) | compile errors; the same runtime message naming the method |
| `add("s", { reuse: seed }).filter(…).nth(0).describe("d")` | compiles and works | unchanged |
| seeded wrong-type override | throws; the path is unregistered | throws; the path holds the seed |
| seeded second same-type override, unseeded second strategy | throw; the first stays | same |
| `filter({ has: "list.titel" })` with a typo, in a page object | registers; throws at the first resolution | the page object's constructor throws the verification error naming `list.item` and `list.titel` |
| the same in a standalone registry | same | same as today until `registry.verify()` is called |
| forward reference, target registered later | resolves | same; `verify()` passes |
| a `y`-flag RegExp id against DOM | version-dependent | a start anchor, asserted in the harness |

### 1.11 2.1.0 and 3.0.0 side by side

| aspect | 2.1.0 today | 3.0.0 |
| --- | --- | --- |
| peer range | `>=1.61.0 <2.0.0` (after plan 1.5) | `>=1.64.0 <2.0.0` (7.1) |
| harness pin | 1.62.1 | 1.64.0 |
| frame segment resolution | `target.frameLocator(sel)` ([L472-487](../src/locators/locatorRegistry.ts#L472-L487)); steps never read; terminal `owner()` | `target.locator(sel)`, steps, then `contentFrame()` for descendants; terminal: the element locator (7.2) |
| `nth`, `first`, `last`, `filter` on a frame segment | recorded, dropped (1.6) | applied |
| rendering of a step-less frame chain | `locator('x').contentFrame()…` | identical |
| rendering of a stepped frame | the step is absent | `locator('x').nth(1).contentFrame()…` |
| `frameLocator()` without a selector | registers an undefined selector; `locator('undefined')` | the any-frame segment: `page.frameLocator()`, first segment only, no steps, no terminal form (7.3) |
| `frameLocator` signature | `(selector)` | `(selector)` or `()` |
| missing primary on any builder | registered, fails or misbehaves at resolution (1.8) | throws at the call, naming method and path (7.4) |
| `""` for `locator`, `frameLocator`, `getByRole` | registered | throws (7.4) |
| `""` for the text-likes and `getByTestId` | registered, except `getByTestId` which lost the field | stored verbatim, Playwright matches it (7.4) |
| `getById("")` | throws (plan 1) | throws, now with the engine table as the reason (7.4) |
| `update` across strategies | allowed, per-type cache | throws naming `replace()`; no cache (7.5) |
| `update(x, undefined)` | registered options wiped (1.8) | kept (7.5) |
| deleting options in `update` | explicit `undefined` (all), `{ key: undefined }` (one) | `null` (all), `{ key: null }` (one); `undefined` is absent (7.5) |
| `replace` | any strategy, primary required, steps kept | same (7.5) |
| `filter`, `nth`, `describe` before a strategy | compile; throw with two different messages (1.9e) | compile errors; one runtime message naming the method (7.6) |
| seeded wrong-type override | rolls back the seed (1.10) | leaves the seed registered (7.7) |
| typo in a `has`/`hasNot` path | first resolution throws | page objects throw at construction; `registry.verify()` for standalone registries (7.8) |
| public `LocatorRegistry` members | `add`, `createReusable`, `getLocator`, `getLocatorSchema`, `getNestedLocator` | plus `verify` (7.8) |
| `createLocator` return type | `Locator \| FrameLocator` | `Locator` (the any-frame case is handled in the chain) |
| sticky `y` flag in docs | "deterministic on 1.64 and later, unreliable before, prefer `^`" | a start anchor, no caveat (7.1) |

---

## 2. How it works today

### 2.1 Frames

[buildLocatorChain](../src/locators/locatorRegistry.ts#L427-L525): the frame branch at
[L472-487](../src/locators/locatorRegistry.ts#L472-L487) calls `createLocator`, which for a frame definition calls
`target.frameLocator(selector)` ([utils.ts:172-173](../src/locators/utils.ts#L172-L173)), takes `.owner()` for a
terminal segment ([L477](../src/locators/locatorRegistry.ts#L477)) or uses the `FrameLocator` as the next target
([L481](../src/locators/locatorRegistry.ts#L481)), pushes an empty `recordedSteps` entry and `continue`s
([L485-486](../src/locators/locatorRegistry.ts#L485-L486)). `steps.get(part)` is read only at
[L490](../src/locators/locatorRegistry.ts#L490), after the branch, so a frame's steps never reach
[L496-507](../src/locators/locatorRegistry.ts#L496-L507). [L474](../src/locators/locatorRegistry.ts#L474) re-declares
`isTerminalStep` (analysis section 2). `createLocator` is typed `Locator | ReturnType<Page["frameLocator"]>`
([utils.ts:153-156](../src/locators/utils.ts#L153-L156)) because of this one case; `LocatorBuilderTarget` is
`Page | Locator | FrameLocator` ([types.ts:226](../src/locators/types.ts#L226)); `FrameLocatorDefinition` requires
`selector` ([types.ts:135-138](../src/locators/types.ts#L135-L138)).

The builders record steps for frames like for any strategy
([locatorRegistrationBuilder.ts:420-432](../src/locators/locatorRegistrationBuilder.ts#L420-L432),
[locatorQueryBuilder.ts:119-205](../src/locators/locatorQueryBuilder.ts#L119-L205),
[reusableLocatorBuilder.ts:41-49](../src/locators/reusableLocatorBuilder.ts#L41-L49)) and the types allow it
(probe: `add("a").frameLocator("iframe").nth(1).filter({ visible: true }).describe("frame")` and
`createReusable.frameLocator("iframe").nth(1).filter(…)` compile). Verified through `dist`:
`registry.get("frames").steps` is `[{ kind: "index", index: 1 }]` and every resolution drops it (1.10 table).

### 2.2 Registration

- `getByRole` [L125-142](../src/locators/locatorRegistrationBuilder.ts#L125-L142): a non-string first argument becomes
  `{ type: "role", options }` ([L139](../src/locators/locatorRegistrationBuilder.ts#L139)) with no role; the same
  shape for the five text-likes ([L172](../src/locators/locatorRegistrationBuilder.ts#L172),
  [L205](../src/locators/locatorRegistrationBuilder.ts#L205), [L238](../src/locators/locatorRegistrationBuilder.ts#L238),
  [L271](../src/locators/locatorRegistrationBuilder.ts#L271), [L304](../src/locators/locatorRegistrationBuilder.ts#L304))
  and `locator` ([L338](../src/locators/locatorRegistrationBuilder.ts#L338)).
- `frameLocator` [L353-362](../src/locators/locatorRegistrationBuilder.ts#L353-L362) and `getByTestId`
  [L373-378](../src/locators/locatorRegistrationBuilder.ts#L373-L378) use truthiness
  ([L358](../src/locators/locatorRegistrationBuilder.ts#L358), [L376](../src/locators/locatorRegistrationBuilder.ts#L376)),
  so `""` is "not provided": on an unseeded builder the field is dropped; on a seeded one `""` inherits.
- `getById` [L395-403](../src/locators/locatorRegistrationBuilder.ts#L395-L403) is the pattern: `undefined` inherits
  on a seeded builder, otherwise `assertIdValue` ([utils.ts:106-114](../src/locators/utils.ts#L106-L114)).
- `commit` [L405-418](../src/locators/locatorRegistrationBuilder.ts#L405-L418) checks nothing about the definition;
  `persist` [L465-483](../src/locators/locatorRegistrationBuilder.ts#L465-L483) registers whatever it holds.
- `createReusable`: [reusableLocatorBuilder.ts:70-197](../src/locators/reusableLocatorBuilder.ts#L70-L197); only
  `getById` validates ([L194-197](../src/locators/reusableLocatorBuilder.ts#L194-L197)).
- Pre-definition steps: `ensureDefinition` [L459-463](../src/locators/locatorRegistrationBuilder.ts#L459-L463) for
  `filter` and `nth`; `describe` [L110-114](../src/locators/locatorRegistrationBuilder.ts#L110-L114) goes straight
  to `persist`, whose guard at [L466-468](../src/locators/locatorRegistrationBuilder.ts#L466-L468) produces the
  "No locator schema definition provided" message. The type at
  [L518-535](../src/locators/locatorRegistrationBuilder.ts#L518-L535) intersects the post-definition view, so all
  three compile (probe).
- Seeded recovery: `ensureDefinitionAllowedWithRollback`
  [L434-457](../src/locators/locatorRegistrationBuilder.ts#L434-L457) rolls back at
  [L437](../src/locators/locatorRegistrationBuilder.ts#L437) for a wrong type only; `rollbackSeededRegistration`
  [L485-490](../src/locators/locatorRegistrationBuilder.ts#L485-L490) calls `registry.unregister`
  ([locatorRegistry.ts:255-257](../src/locators/locatorRegistry.ts#L255-L257)), whose only caller it is.

### 2.3 Update and replace

- `parseUpdateArguments` [locatorUpdateBuilder.ts:12-42](../src/locators/locatorUpdateBuilder.ts#L12-L42) takes
  `optionsProvided` ([L15](../src/locators/locatorUpdateBuilder.ts#L15)), which every options-taking method passes as
  `args.length >= 2` ([L328](../src/locators/locatorUpdateBuilder.ts#L328), [L361](../src/locators/locatorUpdateBuilder.ts#L361),
  [L391](../src/locators/locatorUpdateBuilder.ts#L391), [L422](../src/locators/locatorUpdateBuilder.ts#L422),
  [L454](../src/locators/locatorUpdateBuilder.ts#L454), [L484](../src/locators/locatorUpdateBuilder.ts#L484),
  [L518](../src/locators/locatorUpdateBuilder.ts#L518)); the definition then carries `options: undefined`
  ([L334](../src/locators/locatorUpdateBuilder.ts#L334)) and `mergeOptions`
  [L44-60](../src/locators/locatorUpdateBuilder.ts#L44-L60) returns `undefined` because `"options" in updates`
  ([L48-56](../src/locators/locatorUpdateBuilder.ts#L48-L56)). The argument tuples at
  [L62-64](../src/locators/locatorUpdateBuilder.ts#L62-L64) are mode-agnostic (1.9a, plan 7).
- `mergeLocatorDefinition` [L66-197](../src/locators/locatorUpdateBuilder.ts#L66-L197) accepts any `updates.type`
  and resolves the primary from three sources through `source()` ([L77-88](../src/locators/locatorUpdateBuilder.ts#L77-L88)):
  the current definition, the builder's per-type cache (`preferredSource`) and the registry's definition
  (`baseline`); a switch without a cached definition of the target type throws `requires a "selector" value`
  (verified). `buildReplacementDefinition` [L199-294](../src/locators/locatorUpdateBuilder.ts#L199-L294) requires the
  primary in every case (verified: `replace().getByRole({ name })` throws).
- The cache: `perPathTypeCache` [locatorQueryBuilder.ts:29-32](../src/locators/locatorQueryBuilder.ts#L29-L32),
  `ensureTypeCache` [L415-426](../src/locators/locatorQueryBuilder.ts#L415-L426), consulted and refilled in
  `applyUpdate` [L225-250](../src/locators/locatorQueryBuilder.ts#L225-L250) and `applyReplacement`
  [L289-304](../src/locators/locatorQueryBuilder.ts#L289-L304). Steps are never cached: `applyUpdate` leaves
  `this.steps` alone except when rehydrating a tombstone ([L234](../src/locators/locatorQueryBuilder.ts#L234)).
- `frameLocator` [L541-550](../src/locators/locatorUpdateBuilder.ts#L541-L550) and `getByTestId`
  [L561-570](../src/locators/locatorUpdateBuilder.ts#L561-L570) pass `""` through; `getById`
  [L582-594](../src/locators/locatorUpdateBuilder.ts#L582-L594) validates a provided value.
- Documented at [docs/v3/locator-registry.md:551-588](../docs/v3/locator-registry.md#L551-L588), including the
  strategy switch at [L580-586](../docs/v3/locator-registry.md#L580-L586).

### 2.4 `has`/`hasNot` references and the public type

A path reference is resolved at resolution time only, in `resolveFilterLocator`
([locatorRegistry.ts:275-294](../src/locators/locatorRegistry.ts#L275-L294)) through `getLocatorWithContext`
([L303-330](../src/locators/locatorRegistry.ts#L303-L330)), which detects cycles
([L310-312](../src/locators/locatorRegistry.ts#L310-L312)) and resolves the target terminal-only. Nothing walks the
registry after `defineLocators()`. The public type is the `Pick` at
[L542-545](../src/locators/locatorRegistry.ts#L542-L545); `PageObject` holds it as `locatorRegistry`
([pageObject.ts:56](../src/pageObject.ts#L56)) and calls `defineLocators()` at
[L97](../src/pageObject.ts#L97).

### 2.5 Harness coverage

- Frames: [add.frameLocator.spec.ts](../test/tests/locatorRegistry/add/add.frameLocator.spec.ts) has one test and
  no step; [iframe.spec.ts](../test/tests/testApp/iframe.spec.ts) resolves real frames through
  [iframe.locatorSchema.ts](../test/page-object-models/testApp/pages/iframe/iframe.locatorSchema.ts) against
  `/iframe` ([server.js:118-212](../test/server.js#L118-L212)), none stepped. String assertions against
  `page.frameLocator(...)`: [getNestedLocator.spec.ts:538-562](../test/tests/locatorRegistry/getNestedLocator/getNestedLocator.spec.ts#L538-L562),
  [getLocatorSchema.filter.spec.ts:316-343](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L316-L343)
  (whose title, "skips frame-level filters", asserts the drop; the updated segment carries
  `filter({ hasText: "hasText" })` from [testfilters.locatorSchema.ts:103](../test/page-object-models/testApp/pages/testfilters/testfilters.locatorSchema.ts#L103)),
  [getLocatorSchema.describe.spec.ts:239-270](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.describe.spec.ts#L239-L270),
  [getLocator.spec.ts:256-267](../test/tests/locatorRegistry/getLocator/getLocator.spec.ts#L256-L267),
  [add.describe.spec.ts:97-112](../test/tests/locatorRegistry/add/add.describe.spec.ts#L97-L112),
  [getLocatorSchema.update.spec.ts:194-196](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L194-L196)
  and [L319-326](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L319-L326).
- Strategy switches through `update`, which 3.0.0 moves to `replace`:
  [getLocatorSchema.update.spec.ts:4-20](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L4-L20)
  (`locator` to `getByRole`), [L22-32](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L22-L32)
  (second call), [L147-255](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L147-L255)
  (every strategy and the cache), [L328-345](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L328-L345)
  (`locator` to `getById`); [getLocatorSchema.filter.spec.ts:261-280](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L261-L280),
  [L316-343](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L316-L343) and the
  parametrised block [L345-410](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L345-L410)
  (`getByRole` to every other strategy). Same-strategy `update` calls elsewhere are unaffected
  ([L34-62](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L34-L62),
  [L88-145](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L88-L145),
  [L257-326](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L257-L326),
  [getLocatorSchema.clearSteps.spec.ts:128-132](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.clearSteps.spec.ts#L128-L132)).
- `undefined` as a delete value: [getLocatorSchema.update.spec.ts:134-145](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L134-L145)
  only; nothing covers an `undefined` second argument.
- Registration: no spec registers an empty or missing primary except the `getById` ones.
- Seeded recovery: [add.reuseReusable.spec.ts:128-132](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts#L128-L132)
  re-adds the path after the wrong-type throw and so depends on the rollback;
  [L182-193](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts#L182-L193) covers the second override.
- Pre-definition: [add.spec.ts:78-88](../test/tests/locatorRegistry/add/add.spec.ts#L78-L88) checks that strategies
  disappear after a definition; nothing checks the reverse.
- `has` typos: no coverage beyond [add.reuseExisting.spec.ts:427-435](../test/tests/locatorRegistry/add/add.reuseExisting.spec.ts#L427-L435)
  (a missing reuse source, a different check).
- The sticky flag: [add.getById.spec.ts:78-79](../test/tests/locatorRegistry/add/add.getById.spec.ts#L78-L79) and
  [getLocatorSchema.update.spec.ts:344](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L344)
  assert acceptance only.
- Unit layer: [utils.test.ts:119-149](../src/locators/utils.test.ts#L119-L149) already drives `createLocator` with a
  recording stub target; no unit test touches the builders.

### 2.6 What is sound

Step recording in all three builders and their per-path, in-order application; the terminal-only resolution of
`has` references and the cycle detection; `getById`'s boundary check and its `undefined`-inherits rule; the
`never`-typed options-only overloads on unseeded builders; the post-definition narrowing of the builder type; the
duplicate-registration guard; `replace` keeping steps; the separation of definition verbs from step verbs.

---

## 3. Design

### 3.1 Frames in `buildLocatorChain`

One loop body for the ten strategies, plus a short any-frame case:

```ts
for (const [index, part] of registeredChain.entries()) {
	const isTerminalStep = index === lastIndex;
	// tombstone and missing-definition checks unchanged (L461-470)
	if (isAnyFrameDefinition(definition)) {                       // { type: "frameLocator" } without selector
		if (currentTarget !== this.page) throw anyFrameNotFirst(part, path, previousPart);
		if (isTerminalStep) throw anyFrameHasNoElement(part, path);
		if ((steps.get(part) ?? []).length > 0) throw anyFrameHasNoElement(part, path);   // defensive: the builders reject earlier
		currentTarget = this.page.frameLocator();
		debugSteps.push({ path: part, definition, appliedFilters: [], recordedSteps: [] });
		continue;
	}
	let resolvedLocator = createLocator(currentTarget, definition);   // a Locator for every strategy
	const recordedSteps = steps.get(part) ?? [];
	// filter / index loop unchanged (L496-507)
	lastLocator = resolvedLocator;
	currentTarget = isFrameLocatorDefinition(definition) && !isTerminalStep ? resolvedLocator.contentFrame() : resolvedLocator;
	debugSteps.push({ path: part, definition, appliedFilters, index: appliedIndex, recordedSteps });
}
```

`createLocator` ([utils.ts:153-188](../src/locators/utils.ts#L153-L188)) returns `Locator`; its frame case becomes
`target.locator(definition.selector)` and throws if the selector is absent (the chain handles that case before).
`FrameLocatorDefinition.selector` becomes optional; `cloneLocatorStrategyDefinition`
([L234-235](../src/locators/utils.ts#L234-L235)) and `applyDefinitionPatch` ([L310-313](../src/locators/utils.ts#L310-L313))
spread it only when present. `LocatorBuilderTarget` keeps `FrameLocator`. `isFrameLocatorDefinition` stays;
`isAnyFrameDefinition` is added. The frame branch, its cast and the shadowed `isTerminalStep` go. `describe` at
[L520-522](../src/locators/locatorRegistry.ts#L520-L522) is unchanged. `page.frameLocator()` with no argument
compiles because step 0 moves the root's auto-installed `@playwright/test` to 1.64.0.

Why not `FrameLocator.nth()` / `first()` / `last()` on the current branch: deprecated in the installed types in
favour of `locator().nth().contentFrame()`, `FrameLocator` has no `filter`, and it keeps two code paths. Why not
rejecting steps on frames at registration, 2.1's intent made explicit: it would make a chain Playwright supports and
recommends an error, it needs frame variants of three builder types, and the realistic cases (hidden duplicate
iframes, repeated identical cards) have no other DSL expression.

### 3.2 `assertPrimaryValue`

[utils.ts](../src/locators/utils.ts) gains

```ts
export function assertPrimaryValue(
	value: string | RegExp | undefined,
	source: { method: string; field: string; path?: string; allowEmpty: boolean },
): asserts value is string | RegExp;
// undefined: `${method} requires a ${field}${where}.`
// "" with allowEmpty false: `${method} requires a non-empty ${field}${where}.`
```

and `assertIdValue` becomes `assertPrimaryValue(id, { ...source, field: "id", allowEmpty: false })` with its message
unchanged (`requires a non-empty id` for both cases, as today). `allowEmpty` is `false` for `locator`, `frameLocator`,
`getByRole` and `getById`, `true` for the six others. Call sites, following `getById` at
[L395-403](../src/locators/locatorRegistrationBuilder.ts#L395-L403):

- Registration builder: each strategy method computes its primary (`undefined` for the options-only shape), then
  `if (primary === undefined && this.seededDefinition) → commit({ type })` else `assertPrimaryValue(primary, …)`.
  `frameLocator` is the exception: on an unseeded builder `frameLocator()` registers the any-frame definition and
  returns `void` (overload); `frameLocator("")` is asserted like any other. `frameLocator` and `getByTestId` replace
  their truthiness checks with `=== undefined`.
- `createReusable`: `assertPrimaryValue` on every method, method label `createReusable.<method>`, the selector
  required for `frameLocator`.
- Update builder: `if (primary !== undefined) assertPrimaryValue(primary, { method, field, path: subPath, allowEmpty })`
  in every method, in both modes; a missing primary in replace mode is still reported by `buildReplacementDefinition`
  (`requires a "selector" value`), except `replace().frameLocator()`, which is any-frame.

### 3.3 Same-strategy `update` with Merge Patch

[locatorUpdateBuilder.ts](../src/locators/locatorUpdateBuilder.ts):

```ts
type OptionsPatch<O> = { [K in keyof NonNullable<O>]?: NonNullable<O>[K] | null };
type UpdateArgsWithOptions<Primary, Options> = [] | [Primary] | [OptionsPatch<Options> | null] | [Primary, OptionsPatch<Options> | null];
type UpdateArgsWithoutOptions<Primary> = [] | [Primary];

const parseUpdateArguments = (primaryOrOptions, options) => {
	// options given (object or null) -> hasOptions; a first argument that is an object or null and no second argument is the options form
	// no args.length, no optionsProvided
};

const mergeOptions = (current, patch) => {
	if (patch === undefined) return current;                 // absent: unchanged
	if (patch === null) return undefined;                    // delete all
	const merged = { ...current };
	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) continue;                     // absent: unchanged
		if (value === null) delete merged[key];                // delete one
		else merged[key] = value;
	}
	return Object.keys(merged).length > 0 ? merged : undefined;
};

const mergeLocatorDefinition = (current, updates, path) => {
	if (current.type !== updates.type) throw new Error(`update("${path}") cannot change the strategy from "${current.type}" to "${updates.type}"; use replace("${path}").${methodFor(updates.type)}(…) instead.`);
	// one same-type merge per strategy: primary = updates.primary ?? current.primary; options = mergeOptions(current.options, updates.options)
};
```

`preferredSource`, `baseline` and the `source()` helper go; `buildReplacementDefinition` keeps its shape (primary
required, options as given, `null` options treated as absent, `frameLocator` without a selector allowed). In the
query builder, `perPathTypeCache`, `ensureTypeCache` and the cache lines in `applyUpdate` and `applyReplacement` go;
`applyUpdate` merges against the current definition (or, for a tombstoned sub-path, the registry's definition as
today at [L230-236](../src/locators/locatorQueryBuilder.ts#L230-L236)). `LocatorUpdate` ([types.ts:238-252](../src/locators/types.ts#L238-L252))
becomes the patch shape: options as `OptionsPatch | null`. The mode-aware *types* for `replace` (1.9a) stay with
plan 7; at runtime `replace` validates as today plus the boundary checks.

### 3.4 The pre-definition builder type and the runtime message

```ts
export type LocatorRegistrationPreDefinitionBuilder<LocatorSchemaPathType, Path> = Pick<
	LocatorRegistrationBuilder<LocatorSchemaPathType, Path, false>,
	"getByRole" | "getByText" | "getByLabel" | "getByPlaceholder" | "getByAltText" | "getByTitle" | "locator" | "frameLocator" | "getByTestId" | "getById"
>;
```

replaces [L518-535](../src/locators/locatorRegistrationBuilder.ts#L518-L535); the unused `Seeded` parameter and
the intersection go. `frameLocator` gets two overloads on the unseeded builder, `(): void` and
`(selector: string): PostDefinitionView`; the seeded form keeps `(selector?: string): PostDefinitionView`.
`LocatorRegistrationSeededBuilderForType` ([L559-564](../src/locators/locatorRegistrationBuilder.ts#L559-L564)) is
otherwise unchanged. `ensureDefinition(method)` ([L459-463](../src/locators/locatorRegistrationBuilder.ts#L459-L463))
takes the method name and is called from `applyFilter`, `applyIndex` and both `describe` implementations
([L110-114](../src/locators/locatorRegistrationBuilder.ts#L110-L114), [L506-510](../src/locators/locatorRegistrationBuilder.ts#L506-L510));
the `persist` guard at [L466-468](../src/locators/locatorRegistrationBuilder.ts#L466-L468) stays as an internal
invariant. `ReusableLocatorFactory.frameLocator(selector: string)` is unchanged in shape and gains the assertion.

### 3.5 No rollback

`ensureDefinitionAllowedWithRollback` becomes `ensureDefinitionAllowed`: the call at
[L437](../src/locators/locatorRegistrationBuilder.ts#L437) and `rollbackSeededRegistration`
([L485-490](../src/locators/locatorRegistrationBuilder.ts#L485-L490)) are deleted. `LocatorRegistryInternal.unregister`
([locatorRegistry.ts:255-257](../src/locators/locatorRegistry.ts#L255-L257)) loses its only caller and is deleted
with it (internal; the docs list it as an internal lifecycle method and are updated).

### 3.6 `verify()`

```ts
verify(): void {
	const failures: string[] = [];
	for (const path of this.schemas.keys()) {
		try {
			this.getLocator(path);
		} catch (error) {
			failures.push(`"${path}": ${error instanceof Error ? error.message : String(error)}`);
		}
	}
	if (failures.length > 0) {
		throw new Error(
			`Locator registry verification failed for ${failures.length} of ${this.schemas.size} paths:\n  ${failures.join("\n  ")}`,
		);
	}
}
```

`getLocator(path)` resolves the path's definition and its own steps, so every segment is resolved exactly once over
the whole pass and every `has`/`hasNot` reference goes through `resolveFilterLocator` with cycle detection; an
any-frame path is reported through the terminal-form error of 1.4, and an any-frame path that is not a terminal is
exercised by its descendants. The `LocatorRegistry` `Pick` at [L542-545](../src/locators/locatorRegistry.ts#L542-L545)
gains `"verify"`. `PageObject` calls `this.locatorRegistry.verify()` right after `this.defineLocators()` at
[pageObject.ts:97](../src/pageObject.ts#L97). `createRegistryWithAccessors` is unchanged (`registry.verify()` is
reachable; no accessor). Rejected: walking the steps and checking `schemas.has(reference)` only, which misses cycles
and unsupported reference values; throwing at the first failure, which hides the rest; an opt-out, which would only
excuse a broken registry.

### 3.7 Public surface

No new export from [index.ts](../index.ts). `LocatorRegistry` gains `verify`; the pre-definition builder type
narrows; `frameLocator` gains the no-argument overload; `createLocator` narrows to `Locator`; the update builder's
option arguments accept `null`; `LocatorUpdate` becomes the patch shape. `assertPrimaryValue`, like `assertIdValue`,
stays internal (exported from `src/locators/utils.ts` for the unit tests only).

---

## 4. Implementation steps

### 4.1 Step 0: the floor and the harness pin

- [package.json:65](../package.json#L65): `">=1.64.0 <2.0.0"`; `pnpm install` so the root lockfile's auto-installed
  peer ([pnpm-lock.yaml:356](../pnpm-lock.yaml#L356), 1.62.1 today) becomes 1.64.0; check `node -e
  "console.log(require('@playwright/test/package.json').version)"` at the root.
- [test/package.json:12](../test/package.json#L12): `"1.64.0"`; in `test/`, `pnpm add -D @playwright/test@1.64.0
  --ignore-scripts`, then `pnpm exec playwright install chromium firefox webkit` (new browser builds; no sudo, the
  OS dependencies are present).
- The three rendered strings for `filter({ visible: true })` (1.2) become `.visible()`.
- Floor and sticky mentions: [AGENTS.md:10](../AGENTS.md#L10), [L72](../AGENTS.md#L72), [L83](../AGENTS.md#L83);
  [docs/v3/locator-registry.md:313-323](../docs/v3/locator-registry.md#L313-L323) (the `y` flag is a start anchor,
  no version caveat); [docs/v3/session-storage.md:18](../docs/v3/session-storage.md#L18) and
  [L363](../docs/v3/session-storage.md#L363) (1.64 or later; `page.sessionStorage` itself dates from 1.61);
  [.changeset/session-storage-on-webstorage.md:10](../.changeset/session-storage-on-webstorage.md#L10) (the floor
  line, with the three reasons); [.changeset/getbyid-verbatim-ids-and-regex.md:23-25](../.changeset/getbyid-verbatim-ids-and-regex.md#L23-L25)
  (drop the version caveat); the release notes and decisions rows (4.6).
- A DOM assertion for the sticky flag in [testIds.spec.ts](../test/tests/testApp/testIds.spec.ts): `getById(/^gen/y)`
  and `getById(/en/y)` against the `/testids` page (the second matches nothing).
- Full run: `pnpm lint`, `pnpm test:unit`, the packed integration suite on chromium; everything else green.

### 4.2 Runtime (`src/`)

1. [utils.ts](../src/locators/utils.ts): `assertPrimaryValue`; `assertIdValue` delegates; `createLocator` frame case
   and return type; `isAnyFrameDefinition`; clone and patch for the optional selector (3.1, 3.2).
2. [types.ts](../src/locators/types.ts): `FrameLocatorDefinition.selector?`; `LocatorUpdate` as the patch shape;
   `OptionsPatch` (3.3).
3. [locatorRegistry.ts](../src/locators/locatorRegistry.ts): the loop body (3.1); `verify()` and the `Pick` (3.6);
   `unregister` deleted (3.5).
4. [locatorRegistrationBuilder.ts](../src/locators/locatorRegistrationBuilder.ts): primary checks in the ten
   methods and the `frameLocator` overloads (3.2, 3.4); `ensureDefinition(method)` and the `describe` call sites
   (3.4); the pre-definition type (3.4); `ensureDefinitionAllowed` without rollback (3.5).
5. [reusableLocatorBuilder.ts](../src/locators/reusableLocatorBuilder.ts): primary checks (3.2).
6. [locatorUpdateBuilder.ts](../src/locators/locatorUpdateBuilder.ts): `parseUpdateArguments`, `mergeOptions`,
   same-type `mergeLocatorDefinition`, the tuples (3.3); primary checks (3.2).
7. [locatorQueryBuilder.ts](../src/locators/locatorQueryBuilder.ts): the cache removed from the fields,
   `applyUpdate` and `applyReplacement` (3.3); the any-frame guard in `filter` and `nth` (1.4).
8. [pageObject.ts:97](../src/pageObject.ts#L97): `this.locatorRegistry.verify()` after `this.defineLocators()` (3.6).
9. No new dependency, no export change at the root.

### 4.3 Fixture and harness (`test/`)

- [server.js:118-146](../test/server.js#L118-L146): `/iframe` gains `section#sectionC` with
  `<h2>Section C</h2>` and `<iframe id="iframeHidden" title="iframeHidden" src="/iframe/a" style="display: none">`,
  after the existing sections, so `#sectionA`, `#sectionB`, their iframes and `first()` / `nth(1)` over `iframe`
  are unchanged and `iframe.spec.ts` stays green.
- [iframe.locatorSchema.ts](../test/page-object-models/testApp/pages/iframe/iframe.locatorSchema.ts) gains
  `iframes@second` (`frameLocator("iframe").nth(1)`) with `iframes@second.toggle` (`getByRole("button")`),
  `iframes@lastVisible` (`frameLocator("iframe").filter({ visible: true }).nth("last")`) with `.toggle`,
  `iframes@last` (`frameLocator("iframe").nth("last")`, the hidden one) with `.toggle`, `iframe@hidden`
  (`frameLocator("#iframeHidden")`), `section@hidden` (`locator("section").filter({ has: "iframe@hidden" })`),
  `anyFrame` (`frameLocator()`) with `anyFrame.toggleC` (`getByTestId("toggle-c")`), `anyFrame.button`
  (`getByRole("button")`) and `anyFrame.title` (`getByRole("heading", { name: "Iframe playground" })`).
- Specs per section 5.

### 4.4 Docs (`docs/v3` only)

[locator-registry.md](../docs/v3/locator-registry.md):

- [L232-245](../docs/v3/locator-registry.md#L232-L245) *All strategy methods*: the primary argument is required on
  every builder, which strategies reject `""` and why; `undefined` inherits on seeded and update builders;
  `frameLocator(selector)` and `frameLocator()`.
- [L247-262](../docs/v3/locator-registry.md#L247-L262) *Post-definition chain methods*: available after a strategy
  only, enforced by the type; steps apply to frame segments too; not to any-frame segments.
- [L264-271](../docs/v3/locator-registry.md#L264-L271) *One-strategy-per-registration rule*: a call that throws
  changes nothing.
- [L425-431](../docs/v3/locator-registry.md#L425-L431) *Frame-locator restrictions in filters* rewritten as *Frames
  in filters*: a path reference to a frame segment yields the `<iframe>` element with the segment's steps; an
  any-frame segment cannot be referenced; why a `has` cannot look inside a frame; the v1 "inline frame locator"
  wording goes (section 5 bullet [L345]).
- [L460-473](../docs/v3/locator-registry.md#L460-L473) *Frame behavior* rewritten: the model of 1.3 with the
  rendering table, steps on frames with the ancestor-context recommendation first, `hasText`, hidden iframes, nested
  frames, strictness; a new *Any frame* subsection from 1.4 with the first-segment and no-terminal rules and the
  multiple-frames error.
- New *Verifying a registry: `verify()`* section after *Resolution APIs*: what it checks, the message, that page
  objects verify automatically after `defineLocators()`, where a standalone registry calls it, what it does not
  check.
- [L206-218](../docs/v3/locator-registry.md#L206-L218) *Public `LocatorRegistry`*: `verify`; `unregister` removed
  from the internal list.
- [L551-588](../docs/v3/locator-registry.md#L551-L588) *`update` and `replace`* rewritten from 1.6: same-strategy
  `update`, Merge Patch with the example block, `null` and `undefined`, the strategy-switch error, `replace` as the
  switch, steps and description untouched by both, the cache gone.
- [L654-671](../docs/v3/locator-registry.md#L654-L671) *Reuse patch rules*: `""` versus `undefined`; no rollback;
  seeds need a selector.
- [L732-762](../docs/v3/locator-registry.md#L732-L762) *Error reference*: remove `Frame locators cannot be used as
  filter locators.` ([L750](../docs/v3/locator-registry.md#L750), section 5 bullet [L668]); replace the
  "must be provided before applying filters" entry ([L742](../docs/v3/locator-registry.md#L742)); add the
  `requires a`, strategy-switch, any-frame and verification messages.
- [L764-781](../docs/v3/locator-registry.md#L764-L781) *Tested behavioral guarantees*: frame steps, any-frame,
  registration guards, `update` semantics, `verify`.
- A *Migration from 2.x* subsection next to the one `getById` has: audit `frameLocator(...)` chains with `nth` or
  `filter` (they now take effect), `update` calls that change the strategy (rename to `replace`, state the
  primary), `update(x, undefined)` and `{ key: undefined }` (now no-ops; use `null`), empty primaries for
  `locator`, `frameLocator` and `getByRole`, pre-definition calls no longer compile, no rollback, automatic
  verification, the 1.64 floor.
- TOC entries ([L32](../docs/v3/locator-registry.md#L32), [L36](../docs/v3/locator-registry.md#L36)) follow.

[overview.md](../docs/v3/overview.md): the API summary ([L425-434](../docs/v3/overview.md#L425-L434)) mentions
`verify()`, the registration guard and the `update`/`replace` split; the requirement lines say 1.64. The getById
*Flags* section and `session-storage.md` requirement lines are step 0 (4.1).

Section 5 bullets closed by this plan: `locator-registry.md` [L345] and [L668], and "Missing: 1.6" and "Missing:
1.8". "Missing: 1.10" stays with plan 8.

### 4.5 Changeset

`.changeset/registration-guards-and-frames.md`, `"pomwright": major`, under *Breaking changes*:

- `filter`, `nth`, `first` and `last` on a `frameLocator` segment now apply (2.x recorded and dropped them). A
  chain that relied on the dropped step changes meaning; such a chain either failed with a strict mode violation or
  carried a step that did nothing. Rendering of a stepped frame becomes `locator('x').nth(1).contentFrame()…`; a
  step-less frame renders as before.
- `update()` keeps the registered strategy and throws for another one; use `replace()` to change strategy (steps and
  description are kept). The builder-local cache that restored an earlier strategy's definition is gone. Migration:
  rename cross-strategy `update` calls to `replace` and state the primary argument.
- `update()` follows JSON Merge Patch: `null` deletes an option or all options, `undefined` and absent leave them
  alone. `update(x, undefined)` no longer wipes options and `{ key: undefined }` no longer removes a key. Migration:
  `grep -rn 'update(' --include=*.ts . | grep -n 'undefined'` and use `null`.
- Every builder throws at the call for a missing primary argument, and for an empty string on `locator`,
  `frameLocator` and `getByRole` (`getById` already did), naming the method and the path. `getByTestId("")` and the
  text-likes now store the empty string (2.x dropped `getByTestId`'s value).
- `filter`, `nth` and `describe` before a strategy no longer compile; at runtime the message names the method.
- A seeded registration whose override throws keeps the seeded definition instead of being unregistered.
- `PageObject` verifies every registered path after `defineLocators()`, so a mistyped `has`/`hasNot` path reference
  or a cycle fails at construction instead of at the first action that resolves it.

Under *New*: `registry.verify()`; `add(path).frameLocator()` for Playwright's any-frame locator. Under *Fixes*:
analysis 1.6, 1.8, 1.9e, the 1.10 bullet. The floor line lives in the session-storage changeset (4.1).

### 4.6 Analysis, release notes, decisions, AGENTS.md, PLANS.md

Tick *Fix* on 1.6, 3.2, 1.8 (registration and update sides), 1.9e (within 1.9), 3.6 and the seeded-recovery bullet
of 1.10 with notes (including the strict-mode correction of 1.3 and the fact that the frame drop was 2.1's design);
tick the section 2 bullet for the shadowed `isTerminalStep` ([L464](POMWRIGHT-2.1.0-ANALYSIS.md#L464)) as closed by
the frame rewrite; tick the four section 5 bullets of 4.4; note the floor in section 4. [DECISIONS.md](DECISIONS.md)
and [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md) carry the decisions and the *planned* items now and flip to
*done* at execution; the three reversed rows (sticky flag pass-through rationale, no DOM assertion on `y`, floor
1.61) are replaced per the decisions file's rule.

[AGENTS.md](../AGENTS.md) after execution: the revision line; the peer range at [L10](../AGENTS.md#L10) and the
installed version at [L72](../AGENTS.md#L72) and [L83](../AGENTS.md#L83); the public API line (`verify` on
`LocatorRegistry`); the repo map rows for `src/` (unit-test files and counts) and `src/locators/`
(`assertPrimaryValue`, `verify`, the any-frame case); section 4 (the `/iframe` hidden section, new specs, counts);
section 5: a convention line for frames and registration (a `frameLocator(selector)` segment is `locator(selector)`
plus its steps, then `contentFrame()` for descendants and the element for the terminal case; `frameLocator()` is
Playwright's any-frame locator, first segment only; every builder requires the strategy's primary argument through
`assertPrimaryValue`, empty strings rejected only where Playwright cannot use them; `update` is same-strategy Merge
Patch with `null` as the delete value, `replace` changes strategy, neither touches steps; a throwing DSL call changes
nothing; page objects verify after definition); section 7 (the fourth pending changeset); [PLANS.md](PLANS.md) row 4
to executed, row 6's floor note, row 8's scope minus the `isTerminalStep` bullet.

---

## 5. Tests

### 5.1 Unit tests (vitest)

- [utils.test.ts](../src/locators/utils.test.ts): `assertPrimaryValue` for each field name with `allowEmpty` both
  ways, with and without a path, `""`, `undefined`, a RegExp, a non-empty string; `assertIdValue` unchanged;
  `createLocator` with the existing stub target: a frame definition calls `target.locator(selector)` and nothing
  else, an any-frame definition throws, and the return type is `Locator` (`expectTypeOf`); clone and patch of a
  frame definition with and without a selector.
- New `src/locators/locatorRegistrationBuilder.test.ts`, with `new LocatorRegistryInternal<Paths>({} as Page)`
  (registration never touches the page): for each of the ten strategies on an unseeded builder, `undefined`
  (through `as never` where the types forbid it) and the options-only shape throw the `requires a` message and
  register nothing; `""` throws for `locator`, `frameLocator`, `getByRole`, `getById` and registers verbatim for the
  six others; `frameLocator()` registers `{ type: "frameLocator" }` and returns `undefined`; a seeded builder
  inherits on `undefined` and stores or rejects `""` per strategy; `createReusable.<method>` applies the same rules
  with the `createReusable.` label and requires the frame selector; `filter`, `nth` and `describe` before a strategy
  throw the message of 1.7 and register nothing, and the path can still be registered afterwards; a seeded
  wrong-type override throws and the record equals the seed; a second same-type override throws and the record
  equals the first override; an unseeded second strategy throws and the record equals the first. Types:
  `@ts-expect-error` on `add("a").filter(…)`, `.nth(…)`, `.describe(…)`, on `add("a").frameLocator().nth(0)` and on
  `createReusable.frameLocator()`; a seeded builder's `filter`, `nth`, `describe` before an override compile;
  `expectTypeOf` the keys of the pre-definition builder; the existing negative cases of the type probe (options-only
  on unseeded, `frameLocator(undefined)` and `getByTestId(undefined)` unseeded) stay errors.
- New `src/locators/locatorUpdateBuilder.test.ts`: `parseUpdateArguments` (exported for the test) over `("button")`,
  `("button", undefined)`, `("button", null)`, `({ name })`, `(null)`, `(undefined, { name })`, `(undefined, undefined)`,
  `(/re/)`, `()`; `mergeOptions` over absent, `null`, `{ key: null }`, `{ key: undefined }`, `{ key: value }`, mixed,
  and the empty result dropping `options`; `mergeLocatorDefinition` keeps the primary when none is given, replaces
  it when given, and throws the strategy-switch message naming `replace()` and the right method for every pair of
  strategies; `buildReplacementDefinition` accepts `frameLocator` without a selector and treats `null` options as
  absent. Types: `OptionsPatch`, `null` accepted at both levels, `{ key: undefined }` compiles, a `null` primary is
  an error.
- Everything resolution-level (frames, the rendered chains, `verify()`) is integration-tested against the real
  page; the unit layer stays with the pure parts and the types, as for plans 1.3-1.4 and 1.5.

### 5.2 Integration tests (Playwright, `test/`)

- [iframe.spec.ts](../test/tests/testApp/iframe.spec.ts), against DOM: `iframes@second.toggle` reads "Toggle B:
  Off", a click turns it "On" and leaves `sectionA.frame.toggle` "Off"; `iframes@lastVisible.toggle` is the same
  button; `getNestedLocator("iframes@second")` has `id` `iframeB` and `getLocator("iframes@second")` too;
  `getNestedLocator("iframes@last")` is hidden and `iframes@last.toggle` is not visible; `section@hidden` has `id`
  `sectionC`; `getLocatorSchema("iframes@second.toggle").nth("iframes@second", 0)` reads "Toggle A"; `clearSteps`
  on the frame sub-path makes the action reject with `strict mode violation`; `filter("iframes@second",
  { hasText: "Toggle" })` resolves to no element (`toHaveCount(0)` on the owner); the nested
  `sectionB.frame.innerFrame.toggle` keeps working; rendered strings of the stepped chains equal
  `page.locator("#iframe…")`-built counterparts from 1.3; any-frame: `anyFrame.toggleC` reads "Toggle C: Off" and a
  click turns it "On", `anyFrame.title` is the main-frame heading, `anyFrame.button` rejects with `matched elements
  in multiple frames`, `getLocator("anyFrame")` and `getNestedLocator("anyFrame")` throw the no-element message,
  `getNestedLocator("anyFrame.toggleC")` renders `frameLocator().getByTestId('toggle-c')`.
- [add.frameLocator.spec.ts](../test/tests/locatorRegistry/add/add.frameLocator.spec.ts): steps are recorded for a
  frame; `getLocator` and `getNestedLocator` of a stepped terminal frame render `locator('iframe').nth(1)`; an
  ancestor frame with `filter({ visible: true }).nth("last")` renders the chain of 1.3 (`.visible().last()`); a seed
  with `frameLocator("iframe").nth(1)` is inherited with its step and `add(p, { reuse })` can add `.filter(…)`;
  `frameLocator("")` throws on all three builders and on `createReusable`; seeded `frameLocator(undefined)`
  inherits; `add("shell").locator("main")` plus `add("shell.anyFrame").frameLocator()` throws at resolution naming
  the ancestor, and `getLocatorSchema("shell.anyFrame.x").remove("shell")` resolves; `nth("anyFrame", 1)` and
  `filter("anyFrame", …)` throw; `has: "anyFrame"` throws; `replace("x").frameLocator()` makes a sub-path any-frame;
  `update("anyFrame").frameLocator()` changes nothing.
- New `add.validation.spec.ts` under `locatorRegistry/add/`: the 1.5 table through the public API for every
  strategy (unseeded, seeded, `createReusable`), one test per strategy, messages asserted verbatim; `getByTestId("")`
  and `getByText("")` resolve against `/testids` or `/testfilters` DOM where an empty attribute exists (the
  `/testids` page gains one element with `data-testid=""`).
- [getLocatorSchema.update.spec.ts](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts):
  the Merge Patch block of 1.6 as tests, including `(primary, undefined)` keeping options, `(primary, null)` and
  `(null)` dropping them, `{ key: null }` dropping one, `{ key: undefined }` a no-op, the empty result rendering
  without options; the strategy-switch error for every strategy pair with the suggested `replace` method in the
  message; the tests at [L4-20](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L4-L20),
  [L22-32](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L22-L32) and
  [L328-345](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L328-L345) move their
  switches to `replace`; [L147-255](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L147-L255)
  is rewritten as "replace switches strategies and keeps steps" over all ten strategies (the switch-back half goes
  with the cache); [L134-145](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L134-L145)
  uses `{ hasText: null }`; `update().locator("")`, `.frameLocator("")`, `.getByRole("")` and the `replace()` forms
  throw; `update().getByTestId("")` resolves to `getByTestId('')`.
- [getLocatorSchema.filter.spec.ts](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts):
  [L261-280](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L261-L280) and the
  parametrised block [L345-410](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L345-L410)
  switch through `replace`; the frame test at [L316-343](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L316-L343)
  is renamed to "frameLocator keeps the chain inside the frame and applies frame-level steps", switches through
  `replace`, and its two expectations gain the segment's `filter({ hasText: 'hasText' })` before `contentFrame()`.
  [getLocatorSchema.nth.spec.ts](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.nth.spec.ts) and
  the filter spec gain `nth("frame.path", 1)` and `filter("frame.path", { visible: true })` on a frame sub-path.
- [add.spec.ts](../test/tests/locatorRegistry/add/add.spec.ts): the pre-definition cases with `@ts-expect-error` and
  the runtime message (through an `as unknown as { filter: … }` cast), plus a seeded builder chaining `filter`
  before its override.
- [add.reuseReusable.spec.ts:120-152](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts#L120-L152): after
  the wrong-type throw the record equals the seed; the re-add at [L132](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts#L132)
  becomes an assertion on the record; [L182-193](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts#L182-L193)
  additionally asserts the record.
- New `registry.verify.spec.ts` under `locatorRegistry/registry/` (source-level): a clean registry returns; a typo in
  `has` throws naming the holding path and the missing reference; a `hasNot` typo likewise; two failures listed in
  one error with the `2 of N` count; a forward reference registered later passes; a cycle is reported; an
  unsupported reference value is reported; an any-frame terminal is reported; an empty registry returns; `verify()`
  twice gives the same result; `registry.get(...)` afterwards shows nothing changed.
  [registry.binding.spec.ts](../test/tests/locatorRegistry/registry/registry.binding.spec.ts) (tarball-level) adds
  `registry.verify()` through `createRegistryWithAccessors`. A new `pageObject/verify.spec.ts` (tarball-level): a
  small `PageObject` subclass with a correct schema constructs; one with a typo throws at construction with the
  verification message naming the path; the fixture page objects all construct (they already do in every spec).
- Step 0: the three `.visible()` expectations; the sticky DOM assertion in `testIds.spec.ts`.
- Every other existing spec, including every `page.frameLocator(...)` comparison, must stay green unchanged.
- One-off local runs of `iframe.spec.ts` and `add.frameLocator.spec.ts` on the `firefox` and `webkit` projects
  (1.64 builds installed in step 0), outcome recorded in the ledger.

**Running**: `./pack-build.sh`, then in `test/` `pnpm add -D "pomwright@file:../pomwright-test-build.tgz" --ignore-scripts`
and `pnpm exec playwright test --project=chromium --reporter=line` (AGENTS.md section 3). Most `locatorRegistry/`
specs import from `../../../../src/locators` and run against source; `iframe.spec.ts`, `registry.binding.spec.ts`,
`pageObject/verify.spec.ts`, the `getLocatorSchema.update/filter/replace/remove` specs and the page objects run
against the tarball.

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking by the book: the floor; steps on frame segments taking effect; same-strategy
`update` and the cache removal; `null` as the delete value with `undefined` a no-op; missing primaries and the four
empty-string cases throwing where 2.x registered them; pre-definition calls no longer compiling; the seed no longer
rolled back; automatic verification. Each has a one-line migration in 4.5 and in the docs. `verify()`, the any-frame
segment and the narrowed types are additions.

---

## 7. Decisions

Taken with the user on 2026-10-12; the chosen option is stated first in each.

- [x] 7.1 Peer range `>=1.64.0 <2.0.0`, harness pinned to 1.64.0, as execution step 0 with its own commit; the
  three reversed decisions of plans 1.1-1.2 and 1.5 are replaced. `<2.0.0` kept. Rejected: staying at 1.61 with
  documented version caveats; an open-ended range.
- [x] 7.2 A `frameLocator(selector)` segment resolves as `target.locator(selector)`, then its steps, then
  `contentFrame()` for descendants; the terminal form is the `<iframe>` element locator; `frameLocator(selector)`
  keeps Playwright's signature with no options. One loop body for the ten strategies; `createLocator` returns
  `Locator`. The docs recommend ancestor context first. Rejected: `FrameLocator.nth/first/last` on the current branch
  (deprecated, no `filter`, two paths); rejecting steps on frames at registration (2.1's intent, which the API never
  enforced); keeping the silent drop.
- [x] 7.3 `add(path).frameLocator()` registers Playwright's any-frame locator: first segment of the resolved chain
  only, no steps, no terminal form, no `has` reference, returns nothing chainable; `replace().frameLocator()` makes a
  sub-path any-frame; `update().frameLocator()` and a seeded `frameLocator()` inherit; `createReusable.frameLocator`
  requires the selector; `frameLocator("")` is rejected everywhere.
- [x] 7.4 Every builder requires the strategy's primary argument: `undefined` is rejected unless inheriting on a
  seeded or update builder; `""` is rejected only for `locator`, `frameLocator`, `getByRole` and `getById` (Playwright
  errors, or engine-dependent matching of invalid HTML), and stored verbatim for the text-likes and `getByTestId`,
  which Playwright matches; the truthiness checks go; two message templates (`requires a <field>`, `requires a
  non-empty <field>`); `assertIdValue` becomes a call to the generic `assertPrimaryValue`. Rejected: rejecting every
  empty string (the first draft); passing `""` through for the four.
- [x] 7.5 `update` keeps the registered strategy and throws naming `replace()` for another; it follows JSON Merge
  Patch at both levels (`null` deletes, `undefined` and absent leave alone); `replace` is any strategy with the
  primary required and Playwright's option shapes; neither verb touches steps or the description; the per-path
  per-type cache, `preferredSource` and `baseline` go; the strategy check is at runtime because the path types carry
  no strategy. Rejected: 2.1's switch plus cache; switch allowed without the cache; explicit `undefined` as the
  delete value; a strategy-agnostic `patch()` method (loses per-method option types).
- [x] 7.6 `LocatorRegistrationPreDefinitionBuilder` exposes the ten strategy methods only; the `Seeded` parameter and
  the intersection with the post-definition view go; the seeded builder type is unchanged; the runtime check stays
  with one message naming the method and the strategies.
- [x] 7.7 A DSL call that throws leaves the registry as it was: the wrong-type rollback and `unregister` are
  deleted. Rejected: rolling back in both seeded cases.
- [x] 7.8 `verify(): void` on the registry and in the public `LocatorRegistry` type: resolves every path once
  (terminal-only, as `getLocator`), aggregates every failure into one error with the `n of N` count; `PageObject`
  calls it right after `defineLocators()`, no opt-out; standalone registries call it themselves; plan 5 moves the
  call with the lazy definition. Rejected: manual only (the first draft); reference walking only; first failure only;
  an opt-out.
- [x] 7.9 Fixture: `section#sectionC` with a hidden iframe appended to `/iframe`; the frame and any-frame paths of
  4.3 in `iframe.locatorSchema.ts`; one `data-testid=""` element on `/testids`; no new route.
- [x] 7.10 Existing expectations that change, each encoding the old contract: the frame test in
  `getLocatorSchema.filter.spec.ts`; the strategy switches through `update` in the update and filter specs (moved
  to `replace`, the switch-back half of the cache test dropped); `{ hasText: undefined }` to `null`; the re-add after
  the wrong-type throw in `add.reuseReusable.spec.ts`; the three `.visible()` strings (step 0). All other specs
  stay as they are.
- [x] 7.11 Docs: the `locator-registry.md` sections of 4.4 and the `overview.md` API summary; the floor and sticky
  mentions in step 0; section 5 bullets [L345], [L668], "Missing: 1.6" and "Missing: 1.8" close here; "Missing:
  1.10" (`remove` then `update`) is documented by plan 8 with the behaviour it decides.
- [x] 7.12 Unit layer: the builders' guards, the update parsing and merge, the recovery rule and the types in new
  colocated test files with a `{} as Page` registry; resolution and `verify()` in integration specs against the real
  page.
- [x] 7.13 One `major` changeset for this plan, `registration-guards-and-frames`; the floor line is edited into the
  session-storage changeset and the version caveat removed from the getById changeset (both unreleased).

> Notes: the frame drop and the explicit-`undefined` delete were 2.1 design, not bugs; both are replaced through
> these decisions rather than kept, because the first recorded steps it then ignored and the second made
> `f(a, undefined)` differ from `f(a)` in one place only. The project survey (1.6) showed no use of strategy
> switching, the cache, `replace`, `remove`, `clearSteps` or `undefined` options, so the user's own suites migrate
> without edits beyond the Playwright upgrade.

---

## 8. Execution order

0. The floor: peer range, root lockfile, harness pin and lockfile, browsers, the three `.visible()` strings, the
   sticky DOM assertion, the floor and sticky mentions in docs, changesets and AGENTS.md; `pnpm lint`,
   `pnpm test:unit`, the packed suite on chromium, all green.
1. `utils.ts` and `types.ts` with their unit tests first (red, then green); then `locatorRegistry.ts`,
   `locatorRegistrationBuilder.ts`, `reusableLocatorBuilder.ts`, `locatorUpdateBuilder.ts`,
   `locatorQueryBuilder.ts`, `pageObject.ts`, with the two new unit-test files; `pnpm lint`, `pnpm test:unit`.
2. `/iframe` and `/testids` fixture additions, `iframe.locatorSchema.ts`, the new and extended specs of 5.2, the
   changed expectations; run the chromium project against the packed tarball; run `iframe.spec.ts` and
   `add.frameLocator.spec.ts` once on `firefox` and `webkit`.
3. Docs in `docs/v3`.
4. Changeset.
5. Full run: `pnpm lint`, `pnpm test:unit`, packed integration suite; fix anything red.
6. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md`, `AGENTS.md`, `PLANS.md` status.
