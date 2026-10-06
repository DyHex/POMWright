# Plan: make `getById` behave as intended (analysis items 1.1 and 1.2)

Working document for review, kept in `release-3.0.0/` beside the analysis it answers (items 1.1 and 1.2). File links
are relative to that folder. Decisions taken so far are ticked in section 7 and mirrored in
[DECISIONS.md](DECISIONS.md); consumer-facing outcomes are tracked in [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md).
Edit anything you disagree with, then ask for execution.

Every runtime claim below was verified against Chromium through the Playwright 1.62.1 install in `test/`, and
every code reference points at the exact lines in this repository.

**Decided (2026-10-05):** string ids resolve as `[id="…"]`; the `#` / `id=` prefix stripping is removed and the
string is matched verbatim; empty ids throw at registration with the registry path in the message; whitespace inside
ids is escaped, not rejected. **Amended 2026-10-06:** all RegExp flags, including sticky `y`, pass through to
Playwright unchanged (see 1.2 and the *Flags* paragraph in 3.2).

**Decided (2026-10-06):** RegExp ids resolve through Playwright's `internal:attr` engine (3.2); the tricky-id fixture
is a new `/testids` route (5.1); unit tests run on vitest, colocated as `src/**/*.test.ts` (5.2). All decisions in
section 7 are now ticked; the plan is ready to execute.

**Decided (2026-10-06):** this ships as **POMWright 3.0.0**. The changeset is `major`, the `#` / `id=` prefix removal
is documented as a breaking change, and the docs carry a 2.x to 3.0 migration note. See sections 4.3 and 6.

**Decided (2026-10-06):** doc edits land in a new `docs/v3`, created by this plan as a verbatim copy of `docs/v2`.
`docs/v2` is frozen as the 2.x reference. `docs/v3` is the working copy for every plan derived from the analysis
document and the source notes for the Starlight site that ships with 3.0.0. The Starlight work itself is out of
scope here. See 4.2.

---

## 1. Intended contract

### 1.1 `getById(string)` is an exact, verbatim id match

- The string is compared verbatim, case-sensitive, to the element's `id` attribute (HTML ids are case-sensitive).
- No prefixes, no normalisation: writing the id is as simple as writing it in the DOM.
  `getById("settings.panel:user.item[0]")` matches `id="settings.panel:user.item[0]"`, and `getById("#x")` matches
  `id="#x"`. POMWright owns the conversion to valid selector syntax.
- May match zero, one, or many elements. Playwright strictness applies at action time as usual; `nth`, `filter`,
  `count()`, `all()` work as for any other locator.

### 1.2 `getById(RegExp)` is a pattern match

- The regex is evaluated against each element's `id` attribute value, in the browser, with its flags. All flags
  pass through to Playwright unchanged, including `y`; POMWright adds no regex semantics of its own (see *Flags*
  in 3.2 for what `y` means on each Playwright version).
- Anchoring is the caller's choice: `/^button\.submit\.[a-z0-9]{4}$/` matches whole ids of that shape,
  `/btn-submit-form/` matches any id containing that text.
- Intended for auto-generated ids with a stable shape, and for "all ids containing X" iteration.

### 1.3 Edge cases, with the proposed answer

The HTML spec has exactly two rules for `id`: at least one character, and no ASCII whitespace. Anything else is
allowed, including ids made only of digits or only of punctuation. Browsers enforce neither rule; the attribute is
stored as a plain string, so invalid ids exist in real pages and the test author might not be able to change them.

| case | today | proposed |
|---|---|---|
| `getById("#x")`, `getById("id=x")` | prefix stripped, targets `id="x"` | matched verbatim, targets `id="#x"` / `id="id=x"`; stale call sites fail with a timeout whose message shows `locator('[id="#x"]')` (see 4.3 for the grep) |
| `getById("")` | accepted; `TypeError` at resolution | throws at registration, naming the call site: `getById requires a non-empty id for "main.form@user".` (exact messages per entry point in 3.3) |
| seeded builder, `getById()` / `getById(undefined)` | inherits the seeded id | unchanged |
| whitespace inside an id, e.g. `id="has space"` (invalid HTML, but browsers accept it) | `#has space` matches nothing | matches (`[id="has space"]`); not rejected, because support is free and the application's HTML is not ours to fix |
| LF, CR or FF inside an id (invalid HTML, but browsers accept them; CR also arrives from markup as `&#13;`) | invalid selector (`BADSTRING`) | escaped to `\a `, `\d `, `\c ` (amended 2026-10-06: the first draft escaped LF only; verified) |
| `"` or `\` inside an id (both allowed by the spec) | wrong or invalid selector | escaped by the one-line CSS string escape; a raw `"` is a parse error and a raw `\` silently matches nothing, so these two escapes are mandatory |
| `>>` inside an id (allowed by the spec; Playwright's chain separator) | wrong element | matches (verified; the attribute value is quoted, so the selector parser does not split it) |
| case: `id="Settings.Panel"` vs `getById("settings.panel")` | no match | no match, in every document mode (see 3.1); regex users opt in with `/…/i` |
| RegExp with the sticky flag `y` | all flags dropped (only `source` is used) | passed through unchanged like every other flag (amended 2026-10-06). On Playwright 1.64 and later `y` is deterministic and acts as a start anchor, equivalent to `^`, because Playwright resets `lastIndex` per element since [microsoft/playwright#42818](https://github.com/microsoft/playwright/pull/42818). On 1.57 to 1.63 one regex object carries `lastIndex` across elements, so `/foo/y` matched `foo1` and `foo3` but skipped `foo2` (verified), exactly as `getByTestId(/foo/y)` does on those versions. Documented; the docs recommend `^` |
| other RegExp flags (`g`, `i`, `m`, `s`, `u`, `v`) | dropped | passed through unchanged; `g` is harmless for a match test (`/foo/g` matched all four, verified) and the rest do what the author expects |
| non-ASCII ids, e.g. `id="résumé"` | works | works |
| shadow DOM | CSS `#id` pierces open roots | `[id="…"]` and the regex engine both pierce open roots, neither pierces closed roots (verified) |
| frames and `has:`/`hasNot:` references | work | unchanged; both go through the same resolver |

---

## 2. How `getById` works today

### 2.1 Entry points

All four DSL entry points store `{ type: "id", id: string | RegExp }`
([types.ts:145-148](../src/locators/types.ts#L145-L148)) and call `normalizeIdValue`:

- registration: [locatorRegistrationBuilder.ts:390-397](../src/locators/locatorRegistrationBuilder.ts#L390-L397)
- update and replace: [locatorUpdateBuilder.ts:583-592](../src/locators/locatorUpdateBuilder.ts#L583-L592), then again
  in the merge at [L184-191](../src/locators/locatorUpdateBuilder.ts#L184-L191) and the replacement at
  [L283-289](../src/locators/locatorUpdateBuilder.ts#L283-L289)
- reusable seeds: [reusableLocatorBuilder.ts:191-193](../src/locators/reusableLocatorBuilder.ts#L191-L193)
- seeded registration patches normalise once more in `applyDefinitionPatch`
  ([utils.ts:292-296](../src/locators/utils.ts#L292-L296))

`normalizeIdValue` ([utils.ts:73-90](../src/locators/utils.ts#L73-L90)) strips one leading `#` or `id=` and passes
RegExp through untouched. The convention dates from v1 (commit `54cbc2a`, January 2024), when the id strategy was
`"#" + id` and `id=` was Playwright's own selector prefix; it existed to tolerate pasted selectors
([LocatorSchema-explanation.md:193](../docs/v1/LocatorSchema-explanation.md#L193)).

### 2.2 Resolution

`createLocator` ([utils.ts:148-156](../src/locators/utils.ts#L148-L156)) normalises a final time and then:

- string: `target.locator("#" + cssEscape(id))`
- RegExp: `target.locator('[id*="' + cssEscape(regex.source) + '"]')`

`cssEscape` ([utils.ts:64-67](../src/locators/utils.ts#L64-L67)) is meant to backslash-escape CSS metacharacters.
Inside a regex literal, `\\` is an escaped backslash rather than an escaped `]`, so the character class closes at
that `]`, and the trailing `()]` becomes an empty group followed by a literal `]`. The pattern therefore means "one
metacharacter immediately followed by `]`" and leaves every realistic id untouched.

Verified results, current code, Chromium:

| call | resolved selector | browser result |
|---|---|---|
| `getById("unique-element")` | `#unique-element` | correct |
| `getById("settings.panel")` | `#settings.panel` | matches the decoy `<div id="settings" class="panel">`, never the `<section id="settings.panel">` |
| `getById("form:user")` | `#form:user` | `SyntaxError: not a valid selector` |
| `getById("items[0]")` | `#items[0]` | `SyntaxError` |
| `getById("1st")` | `#1st` | `SyntaxError` |
| `getById("has space")` | `#has space` | matches nothing |
| `getById("##x")` | `#x` | targets `id="x"`, so `id="#x"` is unreachable |
| `getById("#")` | `#` | invalid selector |
| `getById("")` | none stored | `TypeError` at resolution |
| `getById(/btn-submit-form/)` | `[id*="btn-submit-form"]` | correct by coincidence (plain literal) |
| `getById(/^button\.submit\.[a-z0-9]{4}$/)` | `[id*="^button\.submit\.[a-z0-9]{4}$"]` | matches nothing |
| `getById(/x/i)` | `[id*="x"]` | flag ignored |

The same applies to Playwright's own `locator()`: `page.locator("#settings.panel")` is the compound selector
"id `settings` and class `panel`". Matching `id="settings.panel"` with `locator()` requires
`locator("#settings\\.panel")` (double backslash in a JS string) or `locator('[id="settings.panel"]')`.

### 2.3 What is correct today

- Plain ids (letters, digits, `-`, `_`, not starting with a digit) resolve correctly and exactly.
- RegExp made only of literal characters behaves as a substring match, which is what the docs describe.
- Prefix stripping works as designed; it is removed on purpose (3.3), not because it is broken.
- All plumbing: one-strategy rule, `{ reuse }` seeding and override, `update()` inheriting the id when omitted,
  `replace()`, cloning, `filter`/`nth`/`describe`, frame ancestors, `has:` path references, `toString()` output.
- The `string | RegExp` signature and the seeded `undefined` overload.

### 2.4 What is wrong today

1. No escaping, so ids with `.`, `:`, `[`, `]`, space, or a leading digit silently target the wrong element or throw
   inside the browser (1.1).
2. A RegExp is reduced to a literal substring of its source. Anchors, classes, quantifiers, alternation, and flags are
   inert (1.2). The signature promises what `getByTestId(RegExp)` delivers; the implementation does not.
3. Normalisation runs one to three times depending on the code path, so an id that begins with `#` cannot be targeted
   (1.10, third bullet).
4. Empty ids are accepted at registration and fail late with an unhelpful error (overlaps 1.8).
5. The `normalized ?? ""` fallback in `createLocator` masks a missing id instead of reporting it.
6. Docs claim escaping at [locator-registry.md:283](../docs/v2/locator-registry.md#L283) and document the
   substring-of-source regex behaviour at [L287-291](../docs/v2/locator-registry.md#L287-L291).
7. Every existing `getById` test compares `toString()` or the stored definition against the never-navigated harness
   page ([add.getById.spec.ts:18-45](../test/tests/locatorRegistry/add/add.getById.spec.ts#L18-L45),
   [getLocator.spec.ts:110-115](../test/tests/locatorRegistry/getLocator/getLocator.spec.ts#L110-L115),
   [getNestedLocator.spec.ts:129-134](../test/tests/locatorRegistry/getNestedLocator/getNestedLocator.spec.ts#L129-L134),
   [getLocatorSchema.update.spec.ts:202-204](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L202-L204)).
   None of them resolves an element, which is why the bug stayed invisible.

---

## 3. Design

### 3.1 String ids: `[id="…"]` with a small CSS string escape (decided, amended 2026-10-06)

Inside a CSS double-quoted string five characters are special: `"`, `\`, and the three CSS newline characters LF,
CR and FF. A raw occurrence of any newline character is a `BADSTRING` parse error (verified 2026-10-06; the first
draft of this plan escaped LF only). NUL is left alone: the DOM accepts it in an id, but no CSS selector can express
it, so the id is unmatchable either way. The escape is:

```ts
const escapeCssString = (value: string) =>
	value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\a ")
		.replace(/\r/g, "\\d ")
		.replace(/\f/g, "\\c ");
// resolved selector: `[id="${escapeCssString(id)}"]`
```

Verified in Chromium (standards mode) that each of these resolves exactly its own element and nothing else:
`settings.panel` (next to the decoy `<div id="settings" class="panel">`), `say"hi`, `back\slash`, `has space`, `1st`,
`#literal-hash`, `id=weird`, `items[0]`, `form:user`, `a>>b`, and `in.open` inside an open shadow root.

Why the escape is required even though it is tiny: a raw `"` produces a selector parse error, and a raw `\` produces
zero matches with no error at all (`[id="back\slash"]` is a valid selector for the id `backslash`).

Semantics compared with the hash form:

- Exact and case-sensitive in every document mode. In a quirks-mode page (no doctype) `#SETTINGS` matches
  `id="settings"`; `[id="SETTINGS"]` does not. Verified.
- Shadow DOM: identical. Both pierce open roots, including nested ones, neither pierces closed roots, and both can
  be restricted to light DOM with the `css:light=` prefix. The piercing is done by Playwright's CSS engine; the
  browser's own `querySelectorAll("#in-open")` returns zero for the same page.
- Rendering: `locator('[id="unique-element"]')` for every id. For tricky ids this reads better than the escaped
  hash form (`#settings\.panel\:user\.item\[0\]`). Five spec lines and one doc line assert the old form (5.1).
- Performance: no browser id fast path. Microseconds at page scale, and Playwright's own attribute-based locators
  scan the same way.

Alternatives rejected:

- `#` + a spec-compliant `CSS.escape`: about 25 lines, many identifier edge cases (leading digit, hyphen-digit,
  control characters, NUL), quirks-mode case-insensitivity, unreadable output for tricky ids, and the previous escape
  attempt in this codebase already went wrong once.
- Playwright's documented `id=` selector engine (`locator("id=settings.panel")`): internally `[id="…"]` with JSON
  escaping, so zero escaping code on our side, and every tricky id above matched. Rejected because an id containing
  `>>` is split into a chain at the selector-string level and silently matches nothing, and because it lives on the
  "other locators" page that Playwright discourages.
- `internal:attr=[id="…"s]` for strings as well: uniform with 3.2 but puts the primary path on an undocumented engine.

### 3.2 RegExp ids: Playwright's attribute engine, `internal:attr=[id=/source/flags]` (decided 2026-10-06; one caveat)

Playwright's public API has no way to regex-match an arbitrary attribute. The options are:

1. **`internal:attr` engine.** This is what `getByPlaceholder`, `getByTitle`, and `getByAltText` compile to
   (`internal:attr=[placeholder=…]`, verified in the 1.62.1 bundle), and `getByTestId` uses its sibling
   `internal:testid`. The engine queries `[id]`, then filters with `element.getAttribute("id")`: a RegExp value is
   tested with `String.prototype.match`, a `"…"s` value is strict equality, a `"…"i` value is a case-insensitive
   substring. It pierces open shadow roots. Verified in Chromium:

   | selector | matched ids |
   |---|---|
   | `internal:attr=[id=/^button\.submit\.[a-z0-9]{4}$/]` | `button.submit.af3b`, `button.submit.bd2a` (not `button.submit.toolong`) |
   | `internal:attr=[id=/btn-submit-form/]` | `a4f38e-btn-submit-form-34ab` |
   | `internal:attr=[id=/SETTINGS/i]` | `settings.panel`, `settings`, `Settings.Panel` |

2. `selectors.register()` with a custom engine. Must run before the page is created and is global to the browser,
   so a `PageObject` that receives an existing page cannot do it.
3. Approximate with CSS `^=`, `$=`, `*=`. Cannot express classes or quantifiers; fails the stated use case.

**Caveat.** `internal:*` selectors are not documented public API. Mitigations: it is the engine Playwright's own
public locators compile to, so it cannot disappear without breaking Playwright; the selector string is built in one
helper so a future change touches one line; and the new integration tests resolve real elements through it, so a
Playwright bump that changes it fails CI loudly instead of silently.

**Serialisation.** Copy Playwright's `escapeRegexForSelector` (escape unescaped quotes, escape `>>`, pass `u`/`v`
regexes through as-is) into `utils.ts`. It is five lines; `playwright-core` does not export `lib/utils` in its
`exports` map, so it cannot be imported. Credit the origin in a comment.

**Flags.** Every flag is serialised as-is and passed to Playwright. POMWright adds no regex semantics of its own
(decided 2026-10-06, replacing an earlier plan to reject `y`). The `g` flag is harmless, since `String.prototype.match`
resets it. The sticky `y` flag depends on the Playwright version. Before the fix in
[microsoft/playwright#42818](https://github.com/microsoft/playwright/pull/42818) (merged 2026-09-22, absent from
1.63.0, present in the 1.64.0 alphas, so first release 1.64.0) the attribute matcher reused one regex object across
elements and `lastIndex` carried over, so `/foo/y` matched every other element. From 1.64.0 `lastIndex` is reset per
element, which makes `y` a start anchor: `/foo/y` behaves as `/^foo/` (verified in Node with the reset applied).
Playwright's own `getByTestId`, `getByRole` name, `getByText` and the rest behave identically on each version, so
`getById` matches them exactly. The docs state this and recommend `^`.

**Rendering.** `toString()` becomes `locator('internal:attr=[id=/^button\\.submit\\.[a-z0-9]{4}$/]')` instead of
`locator('[id*="…"]')`. Called out in the changeset.

Rejected alternative (decided 2026-10-06): keep the string path from 3.1, add
`getById(id: string, { match?: "exact" | "contains" | "startsWith" | "endsWith" })` over CSS attribute operators, and
make `getById(RegExp)` throw at registration when the source contains regex metacharacters, since only literal
substrings could be honoured. That gives up the pattern use case.

### 3.3 No normalisation; validate at the boundary (decided)

- `normalizeIdValue` is deleted. The string passed to `getById` is stored and matched verbatim. This removes the
  `##x` double-prefix rule, makes ids beginning with `#` or `id=` reachable, matches Playwright's `getByTestId`
  convention of taking the raw value, and closes the triple-normalisation finding (1.10, third bullet) by removing
  the code rather than fixing it.
- A small `assertIdValue(id, source)` runs at the three DSL entry points and throws before anything is registered.
  The message always names the call site:
  - registration: `add("main.form@user").getById("")` throws `getById requires a non-empty id for "main.form@user".`
  - update and replace: the same message with the sub-path being updated
  - reusable seeds, which have no path yet: `createReusable.getById requires a non-empty id.`
  - RegExp values are accepted as they are. No flag is rejected or rewritten (amended 2026-10-06; see *Flags* in 3.2).
- The registration builder distinguishes `undefined` (inherit, seeded only) from a value with an explicit
  `=== undefined` check instead of truthiness. A non-seeded `getById(undefined)` throws.
- `createLocator` throws a descriptive error if a definition somehow lacks an id, instead of `?? ""`.
- **This is a contract change, not a bug fix.** Prefix stripping is documented behaviour in 2.1, so removing it is
  breaking by the book and ships as a major (3.0.0). Blast radius is small and the failure is visible: a stale `getById("#login")` times out with
  a message that prints `locator('[id="#login"]')` plus the registry path. No registration-time guard for a leading
  `#` or `id=`; it would reintroduce the blind spot being removed. See 4.3 and 6.

### 3.4 Sketch of the new helpers

```ts
// utils.ts

/** Escapes a value for use inside a double-quoted CSS string. */
export const escapeCssString = (value: string): string =>
	value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\a ")
		.replace(/\r/g, "\\d ")
		.replace(/\f/g, "\\c ");

/** Port of Playwright's escapeRegexForSelector (Apache-2.0). */
export const escapeRegExpForSelector = (re: RegExp): string => {
	if (re.unicode || re.unicodeSets) return String(re);
	return String(re).replace(/(^|[^\\])(\\\\)*(["'`])/g, "$1$2\\$3").replace(/>>/g, "\\>\\>");
};

export const buildIdSelector = (id: string | RegExp): string =>
	typeof id === "string" ? `[id="${escapeCssString(id)}"]` : `internal:attr=[id=${escapeRegExpForSelector(id)}]`;

export const assertIdValue = (id: string | RegExp, source: { method: string; path?: string }): void => {
	const where = source.path === undefined ? "" : ` for "${source.path}"`;
	if (typeof id === "string" && id.length === 0) {
		throw new Error(`${source.method} requires a non-empty id${where}.`);
	}
};
// registration builder:   assertIdValue(id, { method: "getById", path: this.path });
// update/replace builder: assertIdValue(id, { method: "getById", path: subPath });
// reusable builder:       assertIdValue(id, { method: "createReusable.getById" });

// createLocator, case "id":
//   if (definition.id === undefined) throw new Error(`Locator definition of type "id" has no id value.`);
//   return target.locator(buildIdSelector(definition.id));
```

---

## 4. Implementation steps

### 4.1 Runtime (`src/`)

1. [utils.ts:64-67](../src/locators/utils.ts#L64-L67): delete `cssEscape` (not exported from the package root); add
   `escapeCssString`, `escapeRegExpForSelector`, `buildIdSelector`, `assertIdValue`.
2. [utils.ts:73-90](../src/locators/utils.ts#L73-L90): delete `normalizeIdValue` and its import in the three builders.
3. [utils.ts:148-156](../src/locators/utils.ts#L148-L156): `createLocator` id case uses `buildIdSelector`; descriptive
   error when the id is missing; no `?? ""`.
4. [utils.ts:292-296](../src/locators/utils.ts#L292-L296): `applyDefinitionPatch` id case becomes
   `patch.id !== undefined ? patch.id : base.id`.
5. [locatorRegistrationBuilder.ts:390-397](../src/locators/locatorRegistrationBuilder.ts#L390-L397): `=== undefined`
   check; non-seeded `undefined` throws; `assertIdValue(id, { method: "getById", path: this.path })`; store verbatim; JSDoc describes verbatim vs pattern
   semantics and the absence of prefixes.
6. [locatorUpdateBuilder.ts:184-191](../src/locators/locatorUpdateBuilder.ts#L184-L191) and
   [L283-289](../src/locators/locatorUpdateBuilder.ts#L283-L289): drop `normalizeIdValue`, use the raw value;
   [L583-592](../src/locators/locatorUpdateBuilder.ts#L583-L592): `assertIdValue(id, { method: "getById", path: subPath })` when a value is provided.
7. [reusableLocatorBuilder.ts:191-193](../src/locators/reusableLocatorBuilder.ts#L191-L193): `assertIdValue(id, { method: "createReusable.getById" })`,
   store verbatim, JSDoc.
8. No change to `IdDefinition` or any exported type. No signature change.

### 4.2 Docs

Docs work for 3.0.0 lands in `docs/v3`. `docs/v2` is frozen and is not edited by this or any later plan.

- First, in its own commit with no content changes: `cp -r docs/v2 docs/v3` (six files). A verbatim copy keeps the
  review diff for the real edits readable. Line references below point at the copy and match v2 at copy time.
- [AGENTS.md](../AGENTS.md) was rewritten on 2026-10-06 and already points at `docs/v3` with `docs/v2` listed as
  frozen, so there is nothing to change there.
- [README.md:311-316](../README.md#L311-L316) and the CHANGELOG keep linking to `docs/v2` until 3.0.0 ships.
  Repointing them (to `docs/v3` or to the Starlight site) belongs to the release, not to this plan.
- [locator-registry.md:274-299](../docs/v3/locator-registry.md#L274-L299): rewrite the `getById` deep dive with
  subsections *String ids (verbatim, exact match)*, *RegExp ids (pattern match)*, *Flags (passed through unchanged;
  `y` is a start anchor on Playwright 1.64 and later and unreliable before, prefer `^`)*, *Validation*, *Multiple matches*,
  *What the resolved selector looks like*, *Why not `locator("#settings.panel")`*, and *Migrating from 2.x to 3.0: no
  more `#` / `id=` prefixes*. Update the TOC at [L20-23](../docs/v3/locator-registry.md#L20-L23).
- [locator-registry.md:240](../docs/v3/locator-registry.md#L240): `getById(id: string | RegExp)`.
- [overview.md:184](../docs/v3/overview.md#L184) is fine as is.

### 4.3 Changeset

`.changeset/getbyid-verbatim-ids-and-regex.md`, `"pomwright": major` (2.1.0 to 3.0.0, see section 6), with a
*Breaking changes* heading listing:

- String ids are matched verbatim and resolve as `[id="…"]`; ids containing `.`, `:`, `[`, `]`, spaces, quotes, or a
  leading digit now work.
- The `#` and `id=` prefixes are no longer stripped. `getById("#login")` now looks for `id="#login"`. Find stale call
  sites with:

  ```sh
  grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts .
  ```

- RegExp ids are evaluated as regular expressions with their flags. In 2.x the regex source was matched as literal
  substring text, so plain unanchored patterns such as `/btn-submit/` behave the same, while metacharacters (`.`,
  `[`, `(`, `+`, `*`, `?`, `^`, `$`, `|`) and flags now take effect: escape characters meant literally (`/a\.b/`)
  and anchor with `^` and `$` for whole-id matches. The rendered selector changes from `[id*="…"]` to
  `internal:attr=[id=/…/]`.
- `getById("")` throws at registration, naming the registry path.
- RegExp flags pass through to Playwright unchanged, as with Playwright's own locators. The sticky `y` flag acts as
  a start anchor on Playwright 1.64 and later and is unreliable before that (Playwright bug fixed in #42818); prefer `^`.
- The rendered selector for string ids changes from `locator('#x')` to `locator('[id="x"]')`.

### 4.4 Analysis, release notes, decisions

Tick *Fix* on 1.1 and 1.2 in [POMWRIGHT-2.1.0-ANALYSIS.md](POMWRIGHT-2.1.0-ANALYSIS.md), note the decisions, mark the
third bullet of 1.10 (triple normalisation) as resolved by removal, and note under 1.8 that the id-specific part is
resolved here. Flip this plan's entries in [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md) from *planned* to
*done*, and record any decision taken during execution in [DECISIONS.md](DECISIONS.md).

---

## 5. Tests

### 5.1 Integration tests (Playwright, `test/`; `/testids` route decided 2026-10-06)

**Fixture page.** Add an express route `/testids` to [server.js](../test/server.js), next to `/testfilters` and
`/iframe`, so the W3 template page stays untouched. Contents:

```html
<section id="settings.panel">settings panel</section>
<div id="settings" class="panel">decoy</div>
<div id="Settings.Panel">case decoy</div>
<input id="form:user" value="colon">
<ul><li id="items[0]">first</li><li id="items[1]">second</li></ul>
<p id="1st">digit</p>
<p id="has space">space</p>
<p id="line&#10;feed">lf</p>
<p id="carriage&#13;return">cr</p>
<p id="form&#12;feed">ff</p>
<p id="literal-hash">no hash</p>
<p id="#literal-hash">hash</p>
<p id="id=weird">id-eq prefix</p>
<p id="say&quot;hi">quote</p>
<p id="back\slash">backslash</p>
<p id="a>>b">chain chars</p>
<p id="résumé">unicode</p>
<div id="generated">
  <button id="button.submit.af3b">one</button>
  <button id="button.submit.bd2a">two</button>
  <button id="button.submit.toolong">three</button>
  <span id="a4f38e-btn-submit-form-34ab">four</span>
</div>
<div id="shadow-host"></div>
<iframe id="frame.ids" title="frame.ids" srcdoc="<button id='inner.button'>inner</button>"></iframe>
<script>
  document.getElementById("shadow-host").attachShadow({ mode: "open" }).innerHTML =
    '<p id="in.open">shadow</p>';
</script>
```

**Page object.** `test/page-object-models/testApp/pages/testids/testids.locatorSchema.ts` and `testids.page.ts`,
following the `testfilters` layout; fixture `testIds` in [testApp.fixtures.ts](../test/fixtures/testApp.fixtures.ts).

**New spec** `test/tests/testApp/testIds.spec.ts`, asserting against the DOM (`toHaveCount`, `toHaveId`,
`toHaveText`, `evaluateAll` of ids):

- each tricky string id resolves exactly its own element and never the decoy
- ids containing LF, CR and FF, set from markup through character references, resolve exactly their own element
- verbatim contract: `getById("#literal-hash")` resolves `id="#literal-hash"` and not `id="literal-hash"`;
  `getById("literal-hash")` the reverse; `getById("id=weird")` resolves `id="id=weird"`
- case sensitivity: `getById("settings.panel")` has count 1
- `getById("a>>b")` resolves one element; `getById('say"hi')` and `getById("back\\slash")` resolve theirs
- `getById("in.open")` resolves inside the open shadow root
- anchored regex matches exactly the two 4-character ids; unanchored `/btn-submit-form/` matches one;
  `/settings/i` matches three; `/^button\.submit\./g` matches three (the `g` flag is harmless); `nth` and
  `count()` on a multi-match regex; no DOM assertion for `y`, whose result depends on the Playwright version
  (acceptance and flag preservation are asserted in `add.getById.spec.ts`)
- `getNestedLocator` scoped under `generated` returns only the buttons inside it
- `getLocatorSchema(path).update().getById("items[1]")` and `.replace().getById(/^items\[\d\]$/)` resolve real elements
- a `filter({ has: "<id path>" })` reference with a tricky id
- `frameLocator('[id="frame.ids"]')` ancestor plus `getById("inner.button")` inside the frame

**Extend existing specs** (focused additions, no replacements):

- [add.getById.spec.ts](../test/tests/locatorRegistry/add/add.getById.spec.ts): the current assertions at
  [L19](../test/tests/locatorRegistry/add/add.getById.spec.ts#L19) and
  [L27-33](../test/tests/locatorRegistry/add/add.getById.spec.ts#L27-L33) expect `"#unique-element"` to be normalised;
  they flip to verbatim storage. Add: `getById("")` throws and the message names the path; `getById(/x/gi)` and
  `getById(/x/y)` are accepted and keep their flags; stored definition keeps the raw id; `toString()` for
  string ids (`locator('[id="settings.panel"]')`, `locator('[id="say\\"hi"]')`) and for a RegExp
  (`locator('internal:attr=[id=/^a\\.b$/i]')`); flags preserved; seeded `getById()` inherits and `getById("other")`
  overrides.
- Rendering assertions that change from `#x` to `[id="x"]`:
  [add.getById.spec.ts:36](../test/tests/locatorRegistry/add/add.getById.spec.ts#L36),
  [getLocator.spec.ts:114](../test/tests/locatorRegistry/getLocator/getLocator.spec.ts#L114),
  [getNestedLocator.spec.ts:133](../test/tests/locatorRegistry/getNestedLocator/getNestedLocator.spec.ts#L133),
  [getLocatorSchema.filter.spec.ts:222](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.filter.spec.ts#L222),
  [getLocatorSchema.update.spec.ts:202](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L202)
  (the hand-built comparison locator changes too).
- [getLocator.spec.ts:110-115](../test/tests/locatorRegistry/getLocator/getLocator.spec.ts#L110-L115) and
  [getNestedLocator.spec.ts:129-134](../test/tests/locatorRegistry/getNestedLocator/getNestedLocator.spec.ts#L129-L134):
  one tricky-id row and one RegExp row each.
- [getLocatorSchema.update.spec.ts:202-204](../test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.update.spec.ts#L202-L204)
  and the replace spec: tricky id and RegExp cases; `update().getById("")` throws and names the sub-path;
  `update().getById(/x/y)` is accepted.
- [add.reuseReusable.spec.ts](../test/tests/locatorRegistry/add/add.reuseReusable.spec.ts): seed with a tricky id, override
  with another; `createReusable.getById("")` throws with the `createReusable.getById` prefix.

### 5.2 Unit tests: vitest, colocated (decided 2026-10-06)

**Why vitest.** The pure helpers (`escapeCssString`, `escapeRegExpForSelector`, `buildIdSelector`, `assertIdValue`,
`applyDefinitionPatch`, later `composeFullUrl` for analysis item 1.3) need no browser, and the inner loop should be
milliseconds rather than pack, install, and launch. The repo already used vitest in v1 (removed in 2.0.0 with the v1
code, commit `795e948`), so the setup is familiar. Node's built-in `node:test` would need `tsx` because `src` uses
extensionless imports that Node's native type stripping cannot resolve, so it is not actually dependency-free.

**Why not vitest browser mode.** POMWright has no components. The only browser-dependent behaviour is Playwright's
selector engines, and the correct subject for that is a Playwright `Page` and `Locator`, which the existing
integration harness already provides and a vitest browser context does not.

**Setup.**

- devDependency `vitest` (latest); `vitest.config.ts` with `test.include: ["src/**/*.test.ts"]` and
  `environment: "node"`, so the Playwright specs under `test/` are never picked up.
- Scripts: `"test:unit": "vitest run"`, `"test": "pnpm test:unit && pnpm pack-test"`.
- CI: add `pnpm run test:unit` to [main.yaml](../.github/workflows/main.yaml) after lint.
- `biome check ./src` already lints colocated test files; tsup bundles from `index.ts`, so tests are never shipped.
  Verified 2026-10-06 with a probe `src/locators/__probe.test.ts` exporting a marker constant: after `pnpm build`
  the marker is absent from all four `dist/*` files, and `pnpm pack` publishes only `dist/**`, `README.md`,
  `LICENSE` and `CHANGELOG.md` (the `files` allowlist in `package.json`; `src` and `test` are also in `.npmignore`).
  Two independent guards, so a test file cannot reach consumers.
- Add `coverage/` to `.gitignore`.

**Files.**

- `src/locators/utils.test.ts`:
  - `escapeCssString`: `"` and `\` escaped, LF to `\a `, CR to `\d `, FF to `\c `, everything else passed through
    verbatim (`.`, `:`, `[`, `]`, space, tab, `#`, `>>`, leading digit, non-ASCII, NUL, empty string)
  - `assertIdValue`: `""` throws with the path in the message; the `createReusable.getById` label is used when no
    path is given; non-empty strings and RegExp with any flags (`g`, `i`, `m`, `s`, `u`, `v`, `y`) pass
  - `buildIdSelector`: string cases incl. quotes and backslashes; RegExp with flags, quotes, backticks, `>>`, `/` in
    source, `u` flag passthrough
  - `createLocator` id case against a stub target that records the selector it received; missing id throws
  - `applyDefinitionPatch` id case: patch value stored verbatim (no stripping), `undefined` patch inherits the base id

---

## 6. Versioning

**Decided (2026-10-06): this ships as POMWright 3.0.0.** The changeset is `"pomwright": major` with a *Breaking
changes* section. No type or signature changes, so the API surface is unchanged, but observable behaviour moves in
four ways: regex metacharacters and flags are now interpreted instead of matched as literal text, `#`/`id=` prefixes are no longer
stripped, the rendered selectors change for both string and RegExp ids, and empty ids fail at registration instead
of resolution.

Removing the documented prefix stripping is a breaking change by the book, and a major keeps the version signal
honest: a consumer on `^2.1.0` never picks up a silent `getById` behaviour change. The small blast radius and the
visible failure mode still describe the risk accurately; they are no longer a reason to ship it as a minor.

Consequences for this plan:

- The changeset in 4.3 is `major` and its heading is *Breaking changes*.
- The docs subsection in 4.2, written under `docs/v3`, is titled as a 2.x to 3.0 migration, and the grep in 4.3 is
  the migration aid. Per
  AGENTS.md, intentional breaking changes need explicit migration notes; these two are them.
- The PR description calls out the major bump and links the migration subsection.

---

## 7. Decisions

- [x] 3.1 string ids: `[id="…"]` with the CSS string escape for `"`, `\`, LF, CR, FF (amended 2026-10-06)
- [x] 3.3 no prefix stripping; `normalizeIdValue` deleted; strings matched verbatim
- [x] 3.2 RegExp ids resolve through Playwright's `internal:attr` engine (decided 2026-10-06). Rejected alternative:
  a `match: "exact" | "contains" | "startsWith" | "endsWith"` option over CSS attribute operators, with
  `getById(RegExp)` throwing on any regex metacharacter
- [x] 1.3 empty id throws at registration; the message names the registry path (or `createReusable.getById`)
- [x] 1.3 whitespace in ids is escaped, not rejected
- [x] 1.3 all RegExp flags pass through unchanged, including sticky `y` (decided 2026-10-06; supersedes the earlier
  decision to reject `y`, after Playwright fixed the `lastIndex` carry-over in #42818, first release 1.64.0)
- [x] 5.1 fixture page as a new `/testids` express route with its own page object, fixture and spec (decided
  2026-10-06); the static W3 index page stays untouched
- [x] 5.2 vitest, colocated under `src/**/*.test.ts` (decided 2026-10-06). Test files never reach the package:
  tsup bundles from `index.ts` and `pnpm pack` publishes only the `files` allowlist (verified, see 5.2)
- [x] 6 changeset `major`: ships as 3.0.0 with a *Breaking changes* section (decided 2026-10-06)
- [x] 4.2 doc edits land in a new `docs/v3` (verbatim copy of `docs/v2`, which is frozen); AGENTS.md repointed
  (decided 2026-10-06)

> Notes:
> - 3.0.0 scope: resolved 2026-10-06. 3.0.0 collects all work derived from the analysis document, so later breaking
>   items ride the same major. This plan itself stays scoped to items 1.1 and 1.2. See [DECISIONS.md](DECISIONS.md).
> - Docs roadmap: 3.0.0 ships a Starlight site on GitHub Pages, built from `docs/v3` as source notes. Every plan
>   derived from the analysis document edits `docs/v3`, never `docs/v2`. The Starlight site is separate work and not
>   part of this plan.

---

## 8. Execution order

1. vitest setup, scripts, CI step.
2. `utils.ts` helpers with unit tests written first (red), then implementation (green); delete `cssEscape` and
   `normalizeIdValue`.
3. Builder changes (registration, update, reusable) and the `applyDefinitionPatch` cleanup.
4. `/testids` route, page object, fixture, new spec; flip and extend the existing specs.
5. Docs: `cp -r docs/v2 docs/v3` in its own commit, then the `getById` edits under `docs/v3`. Changeset.
6. `pnpm lint`, `pnpm test:unit`, `pnpm pack-test`; fix anything red.
7. Tick 1.1 and 1.2 in the analysis document, flip this plan's entries in `RELEASE-NOTES-3.0.0.md` from *planned*
   to *done*, and append any execution-time decisions to `DECISIONS.md`.
