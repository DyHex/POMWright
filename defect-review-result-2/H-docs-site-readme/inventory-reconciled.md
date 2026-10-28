# Segment 2H: reconciled inventory

Pass 3. The union of `inventory-blind.md` (pass 1, this review) and the first review's lines for the area
(`defect-review-result/inventory.md` §8 and the lines tagged `[H]`, with scope H's brief and summary for what it read).
Each line is marked **both**, **blind only** or **first only**, with how deeply each review probed it. "First" is the
first review at 54cdada (any scope); "second" is this segment at d850405. Line IDs refer to `inventory-blind.md`.

## Lines

| Line | Mark | First review | Second review |
| --- | --- | --- | --- |
| README, example (R3–R5, R7) | both | H: compiled against the packed build; chain and verification message probed against the build | Run verbatim end to end against a routed app (the README changed since: a49709d); chain, message, the body not running, and the log attachment checked → 2H-3 |
| README, table, links, versions (R1, R8–R11) | both | H: table snippets compiled; links and peer/Node statements checked | Every link and badge fetched; versions against `package.json`; rows against their pages |
| README, *Contributing* (R12) | both | H, with AGENTS.md (then one file) | Read against the guide's new layout (6d1de0e); no finding |
| Home page (P1) | both | H: read | Read; links built; rendered light/dark, 390/1440 |
| *Installation* (P2) | blind only for H (first: F's page) | F: requirements, TypeScript settings, packaging claims | The JavaScript runtime-check sentence probed through the public API → 2H-6; the rest read against `tsconfig.json`, `package.json` and the other pages |
| *Principles* (P3) | both | H: read every claim; H-7 probed `@step` | Read against the concept pages after decision 40's rewrite; spelling → 2H-2 |
| *Organizing a project* (P4) | both | H: read every claim | Run end to end (step title, malformed `SHOP_URL`, RegExp-path subclass) |
| *Locator modules* | first only (now 2B's page) | H: probed chain, duplicates, slots, TS4023 | Pass 2 re-ran H's probe: identical outputs; not otherwise reviewed here |
| *Upgrading from 2.x* (P5) | both | H: *Introduction* and *How to upgrade* fully, the rest for consistency; 2.x checked for `getById` only (H-1, H-3) | Every item's 2.x statement against the v2.1.0 build (source and a runtime spec), every 3.x message and chain against d850405, completeness by compiling a 2.x consumer against 2.x, 3.0.1 and d850405 → 2H-4, 2H-5; step 3's promise per item (pass 2) → 2H-7 |
| *TypeScript* (P6) | blind only for H (first: F's and D's page) | F: types, TS4023, TS2883 | The type table against the declarations and `index.ts`; TS2883/TS4023 not re-run |
| `api/index.md` (P7) | both | H: 38 exports against `index.ts` | 40 exports, every one in a row; links built |
| `api/errors.md` as a whole | first only | H: 88 throw sites matched by hand → H-2 | Not mapped in pass 1 (the brief gives it to the areas and 2T's check); pass 2 confirmed H-2's two messages on the page and `check-error-messages.mjs` enforcing it both ways |
| `internal/index.md` (P8) | both | H: modules and diagram against the code | Module table against `src/`; diagram looked at in dark and light |
| *Internal → Documentation* (P9) | blind only for H (first: G's page) | G: read against the scripts and workflows | Every statement against `package.json`, `pack-test.sh`, `checks.yaml`, `pages.yaml` → 2H-1 |
| Doc comments as the editor's API reference | first only (each area's) | Each scope its own files | Only as far as a page fact reaches one (2H-2's `LocatorSchemaPathArgument` comment) |
| Across pages: one contract stated twice (X1) | both | H: first-argument rule, `urlPath`, `defineLocators()` timing, `seed`; H-9 | Log levels (→ 2H-3), lifecycle (sound), JavaScript runtime checks (→ 2H-6), `createRegistryWithAccessors<string>` (→ 2H-5) |
| Broad claims (X2) | both | H: *Principles* "every rule" (H-7) | Swept every Docs page and the README for "always/never/every/exactly/identical" → 2H-6 |
| Language conventions (X3) | both | H: spelling (H-6), page shapes, alphabetical members | Spelling (→ 2H-2), banned words, front matter on all 52 pages, link form; members' order not re-checked (area pages) |
| "Added in" markers (X4) | both | H: H-8 (design question) | Six markers for six new exports; no new member or option (3.0.1 declarations diffed) |
| Links (X5) | both | H: README links and `v2.1.0` paths; the build for internal links | Every external link and every playwright.dev anchor fetched; internal links by the build |
| Reading order, a new user's gaps (X6, X7) | blind only | Not listed | Sidebar against *What's next* and the README; read as a new user |
| Site files (S1, S2) | both | H: read | Read; the cut plugin against the snippet check's languages |
| Site rendering (S3, S6) | both | H: 17 diagrams light/dark; nine pages at 390/1280 | 52 pages × light/dark × 390/1440: overflow, console errors, images, the current tab; a diagram sample by eye |
| Example app (S4) | both | H: compiled, read | Read against the pages that describe it |
| Built site, moved page (S5) | both | H: build, `noindex`, banner, warnings | `dist` listing, canonical, sitemap; the move decided without a redirect |
| Examples run end to end (E1–E4) | blind only (as runs) | H: compiled and probed rendered values | README, *Your first page object* (with the trace viewer), *Organizing a project*, the upgrade guide's messages |
| Change set since v3.0.1 (C1) | both | H: the commits up to 54cdada | All 92; the ones after 54cdada first → 2H-1, 2H-3, 2H-4, 2H-5 |
| AGENTS.md | first only (now 2I's) | H: §1–§4, §6, §9 fully | Read only as the site cites it; 2I's segment |

## Findings, both ways

**First-review findings the blind pass would have met.** H-1, H-2, H-4 (site part), H-7, H-8 and H-9 are fixed, so
pass 1 could not meet them. Two were fixed incompletely:

- **H-6 → 2H-2.** Pass 1 found the five `misspelt` and took them for new (3e37c74 claimed "American spelling
  throughout"); pass 2 showed all five were present at 54cdada and outside H-6's search. Met by pass 1, misdated.
- **H-3 → 2H-7.** A blind spot of pass 1: it checked the upgrade guide's items against 2.x and 3.x and for
  completeness, but not step 3's promise that each item that needs a change gives a search. Pass 2 found the missed
  item by re-running H-3's count with a wider cut.

**Blind findings the first review did not report.**

| Finding | New since 54cdada, or missed | Commit or reason |
| --- | --- | --- |
| 2H-1 *Internal → Documentation*'s CI sentence | new | 429f2c2 (the error-message check, not in the site job), f866325 (every job on every run); the sentence was true at 54cdada |
| 2H-2 `misspelt` | missed (H-6 fixed incompletely) | H-6's word list and plan 38's endings did not include the `-t` participle |
| 2H-3 README `log.info` not attached | new | a49709d rewrote the README example |
| 2H-4 the upgrade guide's TS2339 text | new | f422b77 changed `get`'s result type; the page's block is from 6f2c87d |
| 2H-5 the upgrade guide's two compile errors | first gap new, second missed | `createRegistryWithAccessors`'s required paths: 49454c6 (then e571381 rewrote the page); the storage item's **Compiles** marker: present at 54cdada, in a section H read for consistency only |
| 2H-6 *Installation*'s runtime-check sentence | missed | present at 54cdada (ffcc23f); *Installation* was scope F's page, and decision 40 rewrote the same claim on *Principles* only |
| 2H-7 the upgrade guide's JavaScript item | missed (H-3 fixed incompletely) | H-3's `awk` cut the marker line to 16 characters |

## Lines neither review probed deeply

Taken up in pass 4:

1. `api/errors.md`'s own text blocks beyond what `check-error-messages.mjs` reads (its prose, its grouping, the
   message lines' paths), and every other page's message lines against the code (test gap 3 partly open): the class of
   2H-4.
2. The doc comments' `@throws` and `@example` against the pages that show the same message or call (one body across
   the hover and the site).
3. *TypeScript*'s TS2883 text and *Installation*'s TypeScript 5.0 claim (2F's, but the pages are 2H's): only if pass 4
   has time.
4. The skill's Phase 1 list, item by item, for what both maps leave out.
