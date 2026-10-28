<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged, with the two corrections its message names (50 pending changesets; lines 24–25). -->

# Segment 2H: summary

The documentation as a whole and the README, at `d850405` (`fix/review-3-0-2`), in the worktree `/home/magdys/workspace/dyhex/POMWright-second-review`, reviewed as an *area* with the commits since `v3.0.1` as a change set. Reviewer: Opus 5.5, second review, segment 2H; 2026-10-28, 19:04 to 19:42 (+01:00). Probes: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/`. Log: [log.md](log.md); maps: [inventory-blind.md](inventory-blind.md), [inventory-reconciled.md](inventory-reconciled.md); pass 2: [first-review.md](first-review.md).

## What I read

- The method (`skills/defect-review/SKILL.md` in the worktree), `segments.md`, `baseline.md`, the brief.
- The guide: `AGENTS.md`, `website/AGENTS.md`, `test/AGENTS.md`, `docs/versioning.md`, in full. The site links only `AGENTS.md` and `website/AGENTS.md`.
- The README; the unowned pages in full (`index.mdx`, *Installation*, *Principles*, *Organizing a project*, *Upgrading from 2.x*, *TypeScript*, `api/index.md`, `internal/index.md`, *Internal → Documentation*); *Your first page object*, *Page objects in tests*, *Page objects*, *Paths and the registry*, *Registering locators* in full; the session storage and logging pages in the parts that state shared facts; every other Docs page by a sweep for broad claims.
- The site: `astro.config.mjs`, `sidebar.mjs`, `content.config.ts`, `website/package.json`, the cut plugin, `SiteTitle.astro`, `custom.css`, `snippets/`, the built `website/dist`.
- v2.1.0's source and declarations (a second worktree, built, removed at the end), and 3.0.1's published declarations (`npm pack pomwright@3.0.1`).
- The change set: `git log v3.0.1..d850405 -- README.md website` (92 commits), the diffs of the unowned pages, the README and the site config; the 50 pending changesets' first lines.
- Pass 2: the first review's scope H (brief, summary, H-1 to H-9), its decisions #7, #17, #36, #37, #40, #45, #46, #47, #52, the ledger rows, plan 38's notes, `PLAN-release-gates-and-audit.md`'s items for the second review, `inventory.md` §8.

## Coverage

| Inventory lines | Reviewed | How |
| --- | --- | --- |
| README (R1–R13) | fully | Example run verbatim end to end (routed app); chain, verification message, the body not running, the log attachment; links and badges fetched; versions against `package.json` |
| Unowned pages (P1–P9) | fully | Each statement against the code, the config or another page; examples run where they show behavior |
| *Upgrading from 2.x* (P5) | fully | 2.x statements against the built v2.1.0 (source, and a runtime spec); 3.x messages and chains against the build; a 2.x consumer compiled against 2.x, 3.0.1 and d850405; step 3's promise item by item |
| Across pages (X1–X7) | fully for the contracts that cross areas; the area pages' own contracts are the areas' | Shared contracts compared; broad claims swept; language rules on all 52 pages; Added-in markers against the export diff; every external link and playwright.dev anchor fetched |
| Site (S1–S6) | fully | Config read; 52 pages × light/dark × 390/1440 px in the preview (overflow, console errors, images, the current tab); a diagram sample by eye |
| Examples end to end (E1–E4) | a sample, as the brief asks | README, *Your first page object* (with the trace viewer), *Organizing a project*, the upgrade guide's messages; 96 doc-comment `@example` blocks compiled |
| Page messages outside *Error messages* | fully | Every `text`-block line compared with *Error messages*; the ones in another form probed |
| `api/errors.md` as a whole | partly | Pass 2 only (H-2's messages present; the check enforces the page); its sections are the areas' |
| Doc comments | partly | Their `@example` blocks compiled; the rest is each area's |

Not run: the full suites (baseline ran them); firefox and webkit (nothing here is browser behavior, except the `en_US` locale, which the logging page says only Chromium accepts, and the probe ran there); Node 20 and 22; the *TypeScript* page's TS2883 and TS4023 texts (2F's); the README on npmjs.com (it refuses scripted requests, so the rendering of its relative links there is unchecked).

## Test gaps

Most important first.

1. **Messages and compiler output on pages other than *Error messages* are not checked.** `check-error-messages.mjs` reads `api/errors.md` only and `docsChains.spec.ts` rebuilds chains, not messages. Every page message is right today except the upgrade guide's compiler output (2H-4), which is how it went stale. A check could compare every `text` line that ends as a message with *Error messages*' skeletons (`messages/text-lines.mjs` is a start), and compile the upgrade guide's 2.x lines with `// @ts-expect-error` against the build.
2. **No check compiles the doc comments' `@example` blocks**, the editor's hover. 95 of 96 compile with their context; `PageObjectTypeOptions`' does not (*Outside the segment*). `examples/build.mjs` shows one way.
3. **No check holds *Upgrading from 2.x* to its completeness promise.** A 2.x consumer compiled against the build (`upgrade/consumer.ts`) lists every compile error a 2.x project meets; the page missed one (2H-5).
4. **No check that the README's example does what its text says at run time** (it compiles, and its chain is rebuilt); 2H-3 is a run-time claim.

## What is sound

- **README example**, run verbatim against a routed app: the test passes; the chain matches the text block (`describe("")`), `toString()` is the path; the broken variant's message is identical and its body never runs (`readme/`).
- ***Your first page object***, run with its own test: passes; the trace viewer shows "Click main.form@login.button@login", the chain in the Call tab's `locator`, and "waiting for locator('main').getByRole('form', …)" in the Log tab, as the page says (`firstpo/`, show-trace).
- ***Organizing a project***: both base classes, the locator module, the step title `LoginPage.submit`, the malformed `SHOP_URL` message naming `AccountPage`, a RegExp-path subclass (`organizing/`).
- ***Upgrading from 2.x*, every statement about 2.x**: v2.1.0's `getById` (`#login` → `locator('#login')`, a RegExp as `[id*="order.row"]`), frame steps dropped, `update(…, undefined)` clearing options, a strategy switch, `describe(null)` falling back to the path, `nth(null)` dropped, seeds mutating (`.first().last()`), late steps changing a registration, `defineLocators()` in `super()` registering `undefined`, `fullUrl` without the slash, `Function.create`, `nb-NO` names, `[object Object]`, JSON re-formatting (`upgrade/rt2/`); navigation, URL composition, `get` leaving missing keys out and `get([])` meaning all, from the source.
- ***Upgrading from 2.x*, every 3.x message and chain it shows** but one (2H-4): `upgrade/rt3/messages.mjs`.
- **Messages on pages other than *Error messages***: each matches the build (`messages/`).
- ***Installation*'s deep-import statement**: `require` and `import` of `pomwright/dist/index.js` both give `ERR_PACKAGE_PATH_NOT_EXPORTED`; `require` and `import` share one copy.
- **Path rules**: U+FEFF is rejected at runtime and is in the type's 26 characters, as *Paths and the registry* means.
- **API index and *TypeScript* table**: all 40 exports listed; every exported type in the table, type parameters as declared.
- **"Added in"**: the six exports new since 3.0.1 carry `Added in: v3.0.2` under their headings; no member or option is new.
- **Language rules**: no "simply", "just" or marketing words; a `title` and a quoted `description` on all 52 pages; internal links root-absolute with the base.
- **Links**: every internal link and anchor (the build); every external link and playwright.dev anchor (`check-links.mjs`), but `blob/main/website/AGENTS.md`, which exists on this branch only and resolves at the merge.
- **Site rendering**: 52 pages × light/dark × 390/1440 px: no page overflow, no console errors, no broken images, the current section's tab marked; sampled diagrams legible in dark mode (`render/`).
- **Lifecycle across pages**: README, *Principles*, *Page objects*, *Page objects in tests*, *Upgrading* agree on when a broken page object fails and where its error points.

## Outside the segment

- **2D, `PageObjectTypeOptions`' doc comment** (`src/pageObject.ts`, lines 24–25): its `@example`, `class OrderPage extends PageObject<Paths, { urlPathType: RegExp; storage: typeof orderStorage }> {}`, does not compile: `error TS2515: Non-abstract class 'OrderPage' does not implement inherited abstract member defineLocators …` (`examples/proj2/src/c-2576.ts`, the example verbatim with its imports and `type Paths = "main"`; `tsc -p examples/proj2/tsconfig.json`, exit 2). The editor shows it on hover. Fix: `abstract class OrderPage …`, or a body with `defineLocators()`. Low, docs only.
- **2G or 2T, CI's site job** runs the snippet and API checks but not `check-error-messages.mjs` (`checks.yaml`, the `site` job). Every harness job runs it through `pack-test.sh`, so nothing goes unchecked; noted because 2H-1's page says otherwise.
- **2I, README's *Contributing*** names an `AGENTS.md` in `src/`, `test/`, `website/` and `.github/`; the guide has six (`src/locators/` and `src/helpers/` too). Read as "in `src/`, its sub-folders included", not filed.

## Pass 2 outcomes

From [first-review.md](first-review.md): fixed 4 (H-1, H-2, H-4's site part, H-8); fixed differently 2 (H-7, H-9); fixed incompletely 2 (H-3 → 2H-7, H-6 → 2H-2); not fixed 0; regressed 0; still present 0; cannot re-run 0; 2I's 1 (H-5, and H-4's AGENTS.md part). Its *what is sound* lines hold where re-checked; its test gaps 1, 2, 4 and 5 are closed, 3 partly (gap 1 above).

## What passes 3 and 4 changed

- **Pass 2** corrected 2H-2's provenance (pass 1 took the five `misspelt` for new; all were at 54cdada, outside H-6's search) and found 2H-7 (H-3's count had dropped an item).
- **Pass 3** settled 2H-5's and 2H-6's provenance (missed by the first review: *Installation* was scope F's page; the storage item's marker sat in a section H read for consistency only) and named pass 1's blind spot: step 3's search promise, item by item.
- **Pass 4** checked the page messages outside *Error messages* (all sound), compiled the 96 doc-comment examples (one outside the segment), scanned the changesets for failures a 2.x upgrader meets (→ 2H-8), and probed the deep-import statement (sound).

## Findings

| ID | Kind | Severity | Semver | Pass | First review | One line |
| --- | --- | --- | --- | --- | --- | --- |
| [2H-1](defect-2H-1-documentation-page-ci-sentence.md) | documentation | Low | none | 1 | new (429f2c2, f866325) | *Internal → Documentation* says the site job runs all three checks on changes to code or pages and the harness two; the site job runs two on every run, the harness three |
| [2H-2](defect-2H-2-misspelt-british-spelling.md) | documentation | Low | none | 1 | H-6: fixed incompletely | "misspelt" (British) on four pages and in `LocatorSchemaPathArgument`'s doc comment |
| [2H-3](defect-2H-3-readme-log-info-not-attached.md) | documentation | Low | none | 1 | new (a49709d) | The README's example "logs the orders to the report" with `log.info`, which a first run does not record; the passing test attaches nothing |
| [2H-4](defect-2H-4-upgrade-guide-stale-ts2339.md) | documentation | Low | none | 1 | new (f422b77) | *Upgrading from 2.x* shows TS2339 with `type 'string \| null'`; 3.0.2 reports `'string \| { name: string; age: number; } \| null'` |
| [2H-5](defect-2H-5-upgrade-guide-two-compile-errors.md) | documentation | Low | none | 1 | new (49454c6, e571381) and missed | *Upgrading from 2.x* omits `createRegistryWithAccessors`'s required type argument and marks the storage item **Compiles** though structured values without a codec do not compile |
| [2H-6](defect-2H-6-installation-storage-values-runtime-claim.md) | documentation | Low | none | 1 | missed (F's page; H-7's sibling) | *Installation* says session storage values are checked at runtime as the types check them; a codec key's value is not |
| [2H-7](defect-2H-7-upgrade-javascript-item-no-search.md) | documentation | Low | none | 2 | H-3: fixed incompletely | The upgrade guide's JavaScript item needs a change and gives no search, against step 3's promise |
| [2H-8](defect-2H-8-upgrade-guide-log-locale-check.md) | documentation | Low | none | 4 | missed | The upgrade guide does not say that a locale Playwright accepts but `Intl` rejects (`en_US`) fails every test that requests `log`, where 2.x ignored it |

Counts: 0 defects, 8 documentation, 0 suspected, 0 design questions. No source sketch proposed: every finding is docs-only.
