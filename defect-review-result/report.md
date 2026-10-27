# Final review of POMWright at `54cdada`: consolidated report

> Saved by the orchestrating session from the consolidation agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files"). The 13 "Merged with" lines in the finding files were written by the agent itself.

- **Scope**: the whole repository at `54cdada` (`fix/review-3-0-2`, "fix: a string urlPath with "^" matches the page on Node 20 and 22"), read in the detached review worktree `/home/magdys/workspace/dyhex/POMWright-final-review`. The branch has since gained one commit, `3960900`, which changes only AGENTS.md's `skills/` row and `skills/defect-review/` (`git diff --stat 54cdada 3960900`), both outside this review.
- **Reviewers**: eight scope sessions (A to H, one per folder beside this file, each with the defect-review skill) and this consolidation (Phase 4).
- **Date**: 2026-10-23 13:35 CEST (read with `date`).
- **Sources**: [scopes.md](scopes.md), [inventory.md](inventory.md), [baseline.md](baseline.md), each scope's `summary.md` and finding files; probes in `/home/magdys/workspace/dyhex/POMWright-final-review-probes/<letter>/`, the consolidation's in `…-probes/R/`.

Each finding file holds the contract, the reproduction with its command and exit code, the observed and expected output, the cause and a fix plan. This report ranks them, merges duplicates, adds what only a view across the scopes shows, and ends with the ledger for the fix work.

## Summary

After merging, **53 entries**: **30 confirmed defects** (6 Medium, 24 Low; 22 patch, 8 none), **19 documentation findings** (all Low; all none, three with a patch-level code option), **1 suspected**, **3 design questions**. Five merges folded 8 findings into others; four findings (`R-1` to `R-4`) come from the scopes' *Outside the scope* notes. No fix can only be a major, so no finding needed a GitHub issue draft; every major option a finding mentions has a non-breaking alternative.

The release is not ready to merge as it stands:

- **Act first**: Dependabot's PR #47 (`changesets/action` v2) is open and green and would make every Publish run fail (G-3); PR #60 (this branch) is open, green and mergeable, and merging it starts a release whose changesets claim three fixes that do not fully hold (E-1, A-1, F-1/F-5). See [Act before the next merge](#act-before-the-next-merge).
- **The biggest defects**: a helper bound to an origin can write into another origin's storage when the page commits there mid-batch, and the call resolves (A-1); the `log` fixture fails a test whose `locale` is `en_US` (E-2); `@step` refuses generic `async` methods (E-5); inside a boxed step, `@step` and the helpers' steps point into POMWright's bundle, a regression of this branch's `333a928` for `@step` (E-1); 3.0.0 and 3.0.1 carry no npm provenance (G-10).
- **Decide first**: F-5, whether this release is 3.0.2 or 3.1.0; it also settles the bump of F-1 and F-2's new exports and goes with H-8's "Added in" markers.

## 1. Baseline

From [baseline.md](baseline.md), at `54cdada`, Node 24.22.0, pnpm 12.14.0, `@playwright/test` 1.64.0:

| Step | Command | Exit | Result |
| --- | --- | --- | --- |
| install | `pnpm install --frozen-lockfile` | 0 | |
| lint | `pnpm lint` | 0 | |
| unit | `pnpm test:unit` | 0 | 33 files, 782 tests; no type errors |
| pack-test | `pnpm pack-test --reporter=line` | 0 | typecheck (tsc, declaration emit, legacy decorators, 215 snippets + 12 `nocheck`, API coverage 38 exports / 98 members / 0 problems); harness on chromium, firefox, webkit: 1506 passed, 3 skipped (browser-specific); step locations: 7 checked |
| node20 | `pack-test.sh --project=chromium` on Node 20.20.2 with the same tarball | 0 | 503 passed; step locations 4 passed |
| docs-build | `pnpm docs:build` | 0 | one harmless warning (`i18n` collection) |
| status | `git status --porcelain --ignored` | 0 | clean; ignored build artefacts only |

Added by the scopes:

- F: `PLAYWRIGHT_VERSION=1.64.1 bash pack-test.sh --project=chromium` (the latest 1.x) exit 0, 503 passed; the AGENTS.md §7 packaging probes in full (packed file list, Node 20/22/24 one-copy loading, TypeScript `node10`/`node16`/`nodenext`/`bundler`, attw 0.18.5 "No problems found", the runner in CommonJS, `"type": "module"` and `experimentalDecorators` projects), all passing; TypeScript 5.0.4 to 7.0.2 consumers.
- G: the latest-1.x row again in a clone (exit 0); `pnpm bench` (exit 0, within noise of *Internal → Performance*); actionlint 1.7.12 and shellcheck 0.11.0 clean (one intentional SC2016 info).
- Consolidation re-runs (section 9): every one exited 0 and printed what its finding quotes.

Not run by anyone: the harness at the latest 1.x on firefox and webkit; the harness on Node 22; the GitHub workflows themselves (`gh` logged out; the public REST API was read instead); a real publish.

The baseline is green, so every finding below is a gap the existing checks do not see.

## 2. Inventory

[inventory.md](inventory.md). One erratum: §7 says "the 31 pending changesets"; there are 29 (`R-3`).

## 3. Scopes and coverage

| Scope | Reviewed fully | Reviewed partly | Not run |
| --- | --- | --- | --- |
| [A](A-session-storage/summary.md) Session storage | values and codecs; keys at the boundary; the `origin` option (Node 20/22/24); turns; `seed` at the call on every path (3 browsers, 25-round races); listener lifetimes; failure reporting; frames, CSP, bfcache; every message; storage types; batches | call sites (read, unit tests); the seed registry page's measured rates | latest 1.x; firefox/webkit for the Node-side value and key probes; a `v3.0.1` worktree (the code read at the tag) |
| [B](B-registration-and-resolution/summary.md) Registration and resolution | `add` and the ten methods; copies and `readFields`; ended registrations (4 builders × 9 ending calls × every method); first-argument rules (10 strategies × 3 builders × 6 values); paths (runtime and types); resolution, frames, `verify`, reuse, `getById`; every chain and message on its pages; its seven commits | declaration emit of registry results (TS4023 only); performance claims | firefox/webkit (frames covered by the baseline on 3 browsers); Node 20/22; a `v3.0.1` worktree |
| [C](C-queries/summary.md) Queries | all four query contracts; both builders; *Queries* of `errors.md` against its 12 throw sites; sub-path and update types; inputs; its three commits against a `v3.0.1` build | registration rules through query paths; the coverage map of its specs | firefox/webkit; Node 20/22; latest 1.x |
| [D](D-page-objects-urls-navigation/summary.md) Page objects, URLs, navigation | constructor and URL validation (Node 20/22/24, against `v3.0.1`); lifecycle; actions hook; `fullUrl` and `UrlMatcher`; URL comparison (3 browsers × 3 Node versions); `goto` and the `expect*` methods; types; its `errors.md` sections; navigation step locations | credentials (no real HTTP auth); storage through a page object | latest 1.x; full `pack-test`; lifecycle and navigation probes on firefox/webkit; the navigation probe on Node 22 |
| [E](E-logging-step-fixture/summary.md) Logging, `@step`, fixture | every member; `@step` in every form at run time (Babel 2023-05, tsc standard and legacy output) and in types (both modes); logger contents, levels, order, names; the fixture; its errors; its AGENTS.md lines | none | the step probes at the latest 1.x; Node 20/22 beyond `Intl`; retries beyond the unit test |
| [F](F-packaging-types-changesets/summary.md) Packaging, types, changesets | export surface (38); declaration emit; §7 packaging probes in full; the 29 changesets (bump, first line, text, dry `changeset version`); `pack:version` | installation.md's runtime-check sentence (spot checks); storage and `@step` messages in the changesets (source only) | `EBADENGINE` (engines unchanged); 1.64.1 on firefox/webkit; Node 22 harness; workflows |
| [G](G-ci-and-tooling/summary.md) CI and tooling | every script, workflow and config; the CI lifecycle; the site config; three Internal pages; the live repository through the public API | `write-esm-entry.mjs`; `test/server.js`; changeset text | runs on GitHub; Publish logs (need a token); latest 1.x on firefox/webkit; Node 22; a real publish with provenance |
| [H](H-docs-readme-agents/summary.md) Documentation, README, AGENTS.md | README; home, *Principles*, *Organising a project*, *Locator modules*; `api/index.md`; `errors.md` completeness against 88 throw sites; `internal/index.md`; the example app; site build, Mermaid render, layout; page shapes; AGENTS.md §1–§4, §6, §9 | *Upgrading from 2.x* beyond its first two sections (consistency; 2.x checked for `getById` only); AGENTS.md §5, §7, §8 sampled | `pnpm bench`, `docs:dev`; firefox/webkit; Node 20/22 |

Not reviewed by any scope: `skills/` (outside the review), `docs/v1*` and `docs/v2` (frozen).

### Test gaps, most important first

Merged from the eight summaries; the finding each would have caught is in brackets.

1. **Nested boxed steps** (decided: [#12](DECISIONS.md), nested cases and a reporter that fails on an unchecked marker): `test/step-locations` has no step inside a boxed step, and its reporter does not require each `// LOCATION` marker to be checked (a probe that stops reporting stays green, "6 checked") [E-1; E and G].
2. **A batch interrupted by a navigation to another origin** (decided: [#9](DECISIONS.md)): `sessionStorage.spec.ts:78-102` asserts B's render-time snapshot, not B's live storage; `clear`, `get(keys)` and an on-origin `seed` mid-navigation are untested [A-1].
3. **Releases** (decided: the exit code, [#1](DECISIONS.md); provenance, [#3](DECISIONS.md); actionlint, and the workflows untried before a merge accepted, [#8](DECISIONS.md)): nothing checks that a published version has provenance, and changesets/action v1.9.0 ignores the publish script's exit code; `publish.yaml` and `pages.yaml` never run before a merge, and CI runs no actionlint [G-10, G-3].
4. **Configuration Playwright accepts but Node rejects** (decided: [#10](DECISIONS.md)) (`locale: "en_US"`, `""`) [E-2].
5. **Type tests for forms the docs promise** (decided: [#11](DECISIONS.md), [#20](DECISIONS.md), [#21](DECISIONS.md), [#22](DECISIONS.md), [#18](DECISIONS.md), [#38](DECISIONS.md), [#19](DECISIONS.md), each with its finding): a generic `@step` method [E-5]; sub-paths on a `string` or template-literal registry [C-1]; reuse by a union or wide variable [B-4]; long path literals, and every whitespace character at the type level [B-3]; template or branded storage keys, a schema without `storage` [A-4, A-7]; a RegExp page's `navigation` as `NavigationFor<string, string>` [D-1].
6. **Declaration emit** (decided: [#23](DECISIONS.md), [#24](DECISIONS.md), [#39](DECISIONS.md)): no probe exports a preconfigured `@step`, emits a registry factory's result or `createReusable`, or imports only from `pomwright` under pnpm; nothing checks that every public return type is exported [F-1, F-2, F-3].
7. **`errors.md` completeness** (decided: [#36](DECISIONS.md), a message-coverage check): nothing compares the throw sites with the page [B-7 and its merged findings].
8. **An `about:blank` popup with an inherited origin** (decided: [#13](DECISIONS.md), [#14](DECISIONS.md)): overlapping bound and unbound calls; `seed` then `set` before the arrival (only Firefox's failure is pinned, by a `test.fail`) [A-2, A-3].
9. **Registration edges** (decided: [#15](DECISIONS.md), [#27](DECISIONS.md), [#25](DECISIONS.md)): own non-enumerable options [B-1]; a locator method that fails at persist, called again [B-2]; a `has` option or a query resolution ending a registration [B-5].
10. **Source-only coverage** (decided: [#55](DECISIONS.md), a packed twin for every source-level spec, the source specs evaluated after): reuse, frames, `getById`, cycles, `verify`, `update`'s merge patch, the query's `describe` and the any-frame query are tested against `src/`, not the packed package [B, C].
11. **Page objects** (decided: [#37](DECISIONS.md), [#16](DECISIONS.md), [#17](DECISIONS.md); Node 22 and the chromium-only floor run accepted, [#8](DECISIONS.md)): a consumer base class's call site (the harness's own `testApp.base.ts` would show it) [D-4]; `async defineLocators()` [D-5]; a string `fullUrl` with `|` or `^` in `toHaveURL` [D-2]; Node 22 never runs the harness and Node 20 runs chromium only.
12. **CI scripts** (decided: the scripts deleted, [#31](DECISIONS.md); `@see` targets, [#49](DECISIONS.md); the snippet fences and `nocheck`, [#56](DECISIONS.md)): `ci-changes.sh` and `ci-last-green.sh` have no tests [G-1, G-2]; the snippet check skips `~~~ts` and `tsx` fences; the API coverage check does not check a `@see`'s target [G-7].
13. **Logger** (decided: the logger part, [#41](DECISIONS.md); legacy decorators at run time, [#57](DECISIONS.md)): a second `attachLogsToTest`, teardown order [E-4]; legacy decorators at run time (unit-tested with a hand-made descriptor only).
14. **Packaging** (decided: the file list, [#33](DECISIONS.md); the §7 probes and TypeScript versions in a `consumer` job, [#58](DECISIONS.md)): the §7 probes are manual; consumers' TypeScript versions are unchecked; the packed file list is not asserted [G-4].
15. **Docs** (decided: [#59](DECISIONS.md), the README in the snippet check, the reverse message check, a docs-chains spec, a Mermaid render check): README examples are compiled by hand; nothing re-probes the chains and messages pages show; Mermaid is checked by eye.
16. **Smaller** (decided: [#29](DECISIONS.md) and [#30](DECISIONS.md) for C-7 and R-2; the rest, [#60](DECISIONS.md), harness specs and a sentence on the back/forward cache): a kept query across later registrations [C-7]; a back/forward-cache restore of a seeded origin (no cacheable fixture page); the never-applied message for several origins [R-2]; a rejecting action, the `beforeAll` and worker-fixture lifecycle rows, the `navigationTimeout` fallback, the `expect*` step locations, host forms in a browser (all confirmed by D's probes, none tested).

## 4. Confirmed defects, by severity

| # | ID | Severity | Semver | Summary | Merged |
| --- | --- | --- | --- | --- | --- |
| 1 | [A-1] | Medium | patch | A helper bound to an origin writes into, or removes from, another origin's storage when the page commits there between two calls of a batch (`set`, `clear`, an on-origin `seed`), and the call resolves; deterministic on all three browsers | |
| 2 | [G-3] | Medium | none | Dependabot proposes the majors the backlog defers; its open PR #47 (`changesets/action` v2) is green in every check and would make every Publish run fail | |
| 3 | [E-2] | Medium | patch | A `locale` Playwright accepts but Node's `Intl` rejects (`en_US`, `""`) makes the `log` fixture fail the test with `RangeError` once anything is logged | |
| 4 | [G-10] | Medium | none | 3.0.0 and 3.0.1 carry no npm provenance attestation, although `publish.yaml` sets it up and the 3.0.0 changelog promises it | |
| 5 | [E-5] | Medium | patch | `@step` does not compile on a generic `async` method in either decorator mode; under `experimentalDecorators` the error says to make the method `async` | |
| 6 | [E-1] | Medium | patch | Inside a boxed step, a boxed `@step` method and the navigation and session storage steps are reported at a line of POMWright's bundle; for `@step` a regression of `333a928` | covers A and D helpers |
| 7 | [A-3] | Low | patch | `seed` on an `about:blank` popup that inherited the origin registers instead of writing: a later `set` is overwritten at the arrival (Chromium, WebKit), or the test fails naming a failed navigation that never happened (Firefox) | |
| 8 | [B-1] | Low | patch | An own non-enumerable property of an options, patch or filter object is dropped silently (`add`, seeds, overrides, query `update`/`replace`/`filter`), where Playwright reads it | C-5 |
| 9 | [A-2] | Low | patch | On an `about:blank` popup with an inherited origin, a bound and an unbound helper take turns on different chains, so overlapping calls end out of call order | |
| 10 | [D-5] | Low | patch | An `async defineLocators()` compiles; the page object verifies a half-finished definition, with misleading failures or an unlabelled error that is not kept | |
| 11 | [D-2] | Low | patch (`^`), none (`\|` docs) | A string `fullUrl` with `^` (Node 20/22) or `\|` (Chromium) is not the URL the browser reports, so the documented `toHaveURL(fullUrl)` fails where `expectThisPage()` passes | |
| 12 | [A-4] | Low | patch | A storage key typed as a template literal or a branded string is typed as a plain string, although it may be a declared key whose value comes back decoded | |
| 13 | [D-1] | Low | patch | A RegExp page object's `navigation` is assignable to `NavigationFor<string, string>`, so `goto()` without a target compiles and throws | |
| 14 | [C-1] | Medium | patch | A query's sub-path parameters accept nothing on a `string` registry, and not the query's own path when it matches a template-literal member; in a generic base class that adds paths, no sub-path compiles, the common ones included (since 2.0.0; found in the walkthrough) | |
| 15 | [B-4] | Low | patch | `add(path, { reuse })` does not compile with union-typed or wide path variables, and the error says the paths are the same | |
| 16 | [B-3] | Low | patch | A well-formed path literal of 999 characters or more fails with TS2589; the runtime accepts it | |
| 17 | [F-1] | Low | patch | `step(title/options)` returns the unexported `StepDecoratorFactory`, so an exported preconfigured decorator fails `declaration: true` (TS4023) | |
| 18 | [F-2] | Low | patch (the factory alias: patch or minor, see F-5) | `createRegistryWithAccessors()`'s result, its `add` and `registry.createReusable` cannot be emitted (TS4023, TS4094), against the docs' "except in one pattern" | |
| 19 | [B-5] | Low | patch | `2accf34`'s hint misses two sibling paths: a `getLocator` in `locator()`'s `has`/`hasNot` option, and a query's resolution in a filter's arguments, both get the old self-contradicting advice | C-2 |
| 20 | [A-5] | Low | patch | On Firefox's error page after a failed navigation to the origin, `set`, `get` and `seed` say the document is sandboxed | |
| 21 | [B-2] | Low | patch | A locator method that throws at persist keeps its definition, so the next call reports "has already been provided" instead of the real cause | |
| 22 | [C-6] | Low | patch | A query's `describe()` on an any-frame terminal is accepted at the call, where its `filter()`/`nth()` and the registration's `describe()` are rejected | |
| 23 | [C-7] | Low | patch | A query kept while an ancestor is registered says the ancestor has "no locator schema registered" | |
| 24 | [R-2](#r-2-the-never-applied-message-for-several-origins) | Low | patch | The never-applied failure for several origins reads "… and the seed for B … was never applied" and carries the first seed's label and call site only | |
| 25 | [G-5] | Low | none | A merged Version Packages commit is never published when a PR with a changeset lands before its CI run ends; the guard says the newer run publishes | |
| 26 | [G-2] | Low | none | On a pull request the skip is decided on the head commit while the jobs test GitHub's merge commit, so after `main` moves a docs-only push reports green for an untested merge | |
| 27 | [G-1] | Low | none | `ci-changes.sh` sees only a renamed file's new name, so a move into `website/` or to a `*.md` name skips the jobs its old path needs | |
| 28 | [G-4] | Low | none | `pnpm build` never empties `dist/`, so local packs ship and test files the current source no longer produces (the harness passed on a build without declarations) | |
| 29 | [G-9] | Low | none | `.editorconfig` asks for tabs in every file, YAML and Markdown included, where a tab breaks a workflow | |
| 30 | [R-1](#r-1-the-pw-step-snippet-inserts-v1s-pocname) | Low | none | The `pw-step` VS Code snippet inserts `${x.pocName}`, a v1 property that no 2.x or 3.x page object has | |

Notes:

- **Severity calibration across scopes.** E-5 stays Medium while B-4, C-1 and D-1 (also "types reject or accept the wrong thing") stay Low: E-5 hits the recommended usage, a page object method, while the others need a non-literal path type or a cross-type assignment the docs do not lead to. E-1 is Medium as "a documented feature that does not work as documented" and as a regression this branch's changeset claims to have fixed.
- **E-1 covers scopes A and D.** The mechanism (AGENTS.md §5, "exactly one `async` POMWright frame") is shared by `@step`, the navigation helper and `SessionStorage`; neither A nor D probed a helper inside a boxed step (D's location probe, `D/steps/zz-probe-D-steploc.spec.ts`, calls `goto` from a plain method), so there is no contradiction, and the fix is one helper for all three.
- **A-3 reverses a recorded decision.** Commit `d4cffbb`'s message decided "seed is not taught about inherited origins" and accepted the Firefox failure; the Chromium and WebKit overwrite is recorded nowhere, and no page names the case. Option 1 reverses the decision, option 2 documents it (decision 12).
- **D-2's docs part and H-4** edit the same paragraph of `internal/url-matching.md` but are not duplicates. H-4 does not depend on D-2's choice: the sweep compares the browser's URL with `new URL`, not with `fullUrl` (`test/tests/testApp/urlForms.spec.ts:21-46`), so its `^` entries stay whatever D-2 does.

## 5. Documentation findings

| # | ID | Severity | Semver | Summary | Merged |
| --- | --- | --- | --- | --- | --- |
| 1 | [B-7] | Low | none | Error lists are incomplete where pages and comments claim "every message": `errors.md` misses `goto()`'s URL-object message, the hand-made seed's `reuse requires a role value / non-empty selector / non-empty id …`, the any-frame step message after reuse by path, and an on-origin `seed`'s two write failures; `goto()`'s Throws and `@throws` miss `Cannot resolve …`; `seed`'s, `get`'s and `clear`'s lists miss the opaque-origin and navigation messages; the query's `describe()` has no Throws; the update builder's page and ten `@throws` miss the skipped-segment error (and `frameLocator`'s the strategy error). D-3 also: `UrlMatcher.toString()` is said to appear in step titles (it does not), and `runPostNavigationActions` is given a `navOptions` default (it defaults to `true`) | A-6, C-4, D-3, H-2 |
| 2 | [D-4] | Low | none (patch for the code option) | Five pages give two versions of where a page object's registry error points; the report's code frame is the first `super(...)` of the class chain, which with the documented site base class is the same base-class line for every page object; the Internal page's "the line that created the page object" is false | H-9 |
| 3 | [A-7] | Low | none (code option: see decision 14) | A page object that passes `sessionStorage.schema` without declaring `storage` compiles and decodes values its types call strings; the docs warn only of the opposite mismatch | |
| 4 | [F-3] | Low | none | The `declaration: true` paragraphs omit the pnpm TS2883 case (a module importing only `pomwright`: an extended `test`, `seed.definition`) and the cases of F-1 and F-2 | |
| 5 | [H-7] | Low | none | *Principles* says "Every rule is checked at runtime"; `@step`'s Promise rule is TypeScript's alone, and so are D-5's synchronous `defineLocators()` and A-7's type/value pairing | |
| 6 | [E-4] | Low | none (patch for option 2) | What a second `attachLogsToTest` does (attaches every entry again) and what happens to an entry logged after the fixture's teardown (dropped silently) is undocumented | |
| 7 | [E-3] | Low | none | The `step` API page says `box` reports the step at the calling line; every `@step` step is reported there, and `box` moves where an error inside points | |
| 8 | [B-6] | Low | none | The editor's rename from a use does not reach `has`/`hasNot` paths, although two pages say it reaches every use | |
| 9 | [C-3] | Low | none | *Frames* sends readers to *Queries* for `replace(subPath).frameLocator()`; *Queries* never mentions frames or the any-frame rules | |
| 10 | [H-1] | Low | none | *Upgrading from 2.x* lists three methods that reject an empty first argument; `getById` is the fourth, and `update().getById("")`, which 2.x accepted, is in no section | |
| 11 | [H-3] | Low | none | *How to upgrade* says to install 3.0.0 while the page describes 3.0.2's rules, and promises a search for every **compiles** item where four have none | |
| 12 | [H-4] | Low | none | AGENTS.md §4, *Tests and checks* and *URL matching* say the URL sweep has one known difference; it also lists `^` on Node 20 and 22. The same sentences should say the sweep skips the five characters that end or escape a part (`# ? / % \`), D's note | |
| 13 | [H-5] | Low | none | AGENTS.md §4's routes of `/teststorage` leave out `/teststorage/sandboxed` and `/teststorage/shadowed-navigation` | A-8 |
| 14 | [F-4] | Low | none | The TypeScript page's table of exported types lacks the four 3.0.2 storage types; *Packaging* (and AGENTS.md §4) count two compile-only type checks where there are three | |
| 15 | [G-7] | Low | none | Two Internal pages say the API coverage check requires each `@see` to link its own heading; it accepts any `@see` | |
| 16 | [G-6] | Low | none | *Internal → Performance* says every per-call measurement runs 20,000 calls; registration runs 2,000 | |
| 17 | [G-11] | Low | none | Three tooling comments describe the repository as it was (`vitest.config.ts`, `check-api-coverage.mjs`, `playwright.base.ts`) | |
| 18 | [H-6] | Low | none | 21 British spellings in 15 files, one a page title, where §9 requires American spelling | |
| 19 | [R-3](#r-3-inventorymd-counts-31-pending-changesets) | Low | none | The review's own inventory says 31 pending changesets; there are 29 | |

## 6. Suspected

| ID | Severity | Semver | Summary |
| --- | --- | --- | --- |
| [G-8] | Low | none | A re-run of an older green `CI` run would redeploy the older site; `pages.yaml` builds the tested commit without checking that `main` has moved on. Not reproduced: it needs runs on GitHub. `pages.yaml`'s "guarded as publish.yaml is" means the job condition (its own comment, line 24, says so), so AGENTS.md §2 and §7 are not wrong on their face; `main.yaml`'s "an older commit's run can never finish after a newer one's" is the claim at stake |

## 7. Design questions

| ID | Summary |
| --- | --- |
| [F-5] | Exporting `SeedOptions` and `SessionStorageOptions` is classed as a patch on §5's promise, which covers return types only; by §7 it is a minor, which makes this release 3.1.0, unless §5's promise is widened to option and property types. It also decides F-2's factory alias and the wording of `.changeset/export-storage-types.md` ("as every other public signature already allows", untrue for `step()`'s result, F-1, and for the parameter types `EntriesFor`, `NonEmpty`, `KeyOnly`, A's note) |
| [H-8] | Should §9's "Added in" rule cover exports and accepted inputs added in a patch (the four storage types, `update()`'s `undefined` first argument, and F-1/F-2's types if added)? |
| [R-4](#r-4-message-punctuation) | Messages have no punctuation convention: every session storage message, the four path messages and three navigation messages end without a period, the rest with one; the closest pair, the page object's `baseUrl` message and `SessionStorage`'s `origin` message, state the same rule and differ |

## 8. Consolidation findings

### R-1: the `pw-step` snippet inserts v1's `pocName`

- **Kind**: defect (contributor tooling, not published)
- **Area**: `.vscode/playwright-snippets.code-snippets`
- **Severity**: Low (the snippet's output does not compile against any page object since 2.0; contributors only)
- **Semver of the fix**: none
- **Reviewed**: `54cdada`, 2026-10-23, consolidation (from H's *Outside the scope*)
- **Status**: decided: the snippets file is deleted (2026-10-26, [DECISIONS.md #35](DECISIONS.md))

**Contract.** A page object's name is `label` (`PageObjectOptions.label`; `readonly label` at `src/pageObject.ts:180`); the 2.x migration guide says "`pocName` is replaced by `options.label`". A repository file that generates code for an API removed in 2.0 is a hole rather than a broken promise.

**Reproduction.** From the worktree root (output in `…-probes/R/r1-pocName.out`):

```sh
git grep -n pocName -- src test website index.ts README.md .vscode   # exit 0, one hit
git show v2.1.0:src/pageObject.ts | grep -c pocName                  # 0
```

**Observed / expected.** Only `.vscode/playwright-snippets.code-snippets:19` names it: ``"body": ["await test.step(`${$1.pocName}: $2`, async () => {", …]``. On a 3.x page object `x.pocName` is a compile error. Expected: `${$1.label}`, or no such snippet, since the docs recommend `@step` for page object steps. The file dates from `b026c08` (2024-01-15, v1); `39fb86a` only reformatted it.

**Fix plan.** Replace `pocName` with `label` (or drop the `pw-step` snippet); optionally list `.vscode/` in AGENTS.md §2. Tests: none. Docs: none. Changeset: none. Decision: `label` or remove.

### R-2: the never-applied message for several origins

- **Kind**: defect
- **Area**: session storage, `seed` failures (`neverAppliedError`, `src/helpers/sessionStorageSeed.ts:162-177`)
- **Severity**: Low (grammar, and with seeds from two helpers the label and the call site name only the first)
- **Semver of the fix**: patch (a message)
- **Reviewed**: `54cdada`, 2026-10-23, consolidation (from A's *Considered and not filed* and H's *Outside the scope*)
- **Status**: decided: fix, option 3, each seed's helper and call location listed (2026-10-26, [DECISIONS.md #30](DECISIONS.md))

**Contract.** AGENTS.md §5: a never-applied seed fails the test "with the `seed` call site in the stack"; messages name the call the user made. `api/errors.md` (*seed*) shows only the one-origin form.

**Reproduction.** Scope A's `…-probes/A/specs/lifetimes.spec.ts` (several pending origins, then the page closes), log `…-probes/A/out/lifetimes.101043.log` line 31; the code and the line are copied to `…-probes/R/r2-never-applied.out`.

**Observed / expected.**

```text
SessionStorage.seed: the seed for http://localhost:9001 (keys: k) and the seed for http://localhost:9002 (keys: k) and the seed for http://localhost:9003 (keys: k) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends
```

Expected "were never applied" for several seeds. The message takes `first[1].title` and `first[1].site`, so with a page object's helper and a standalone one seeding two origins, the error names and points at the first helper's call only.

**Fix plan.** Options: (1, recommended) the plural verb, and each seed's label in its own clause when the labels differ; (2) one error per pending seed with its own call site, the others as `cause`. Tests: a unit case in `src/helpers/sessionStorageSeed.test.ts` with two pending origins from two helpers. Docs: the plural form on `api/errors.md` (*seed*). Changeset: patch, "The failure for seeds never applied on several origins says 'were never applied' and names each seed's helper." `.changeset/empty-seed.md` quotes the one-origin form, which stays.

### R-3: inventory.md counts 31 pending changesets

- **Kind**: documentation (the review's own notes, not the repository)
- **Severity**: Low · **Semver**: none · **Status**: open
- **Reproduction**: `ls .changeset | wc -l` prints 31; `ls .changeset/*.md | grep -v README.md | wc -l` prints 29; the other two are `config.json` and `README.md`. F counted 29 and checked each (all patch, so 3.0.2 by `changeset status`); G and H noted the same.
- **Fix**: none in the repository; correct inventory.md §7 if the review notes are kept.

### R-4: message punctuation

- **Kind**: design question
- **Status**: decided: no convention (2026-10-27, [DECISIONS.md #54](DECISIONS.md))
- **Area**: error messages across areas
- **Reproduction**: `bash …-probes/R/r4-punctuation.sh` from the worktree root (output `r4-punctuation.out`, exit 0) counts the last character of every message line on `api/errors.md`: *Session storage* 22 of 22 without a final period; *Paths* 4 without (the four `LocatorSchemaPath string cannot …`); *Navigation* 3 without (the `expected URL …` family); *Queries* 10 of 10 with; *Registering* 13 of 14 with. The two origin rules side by side: `url.ts:99` ends `…received ${…}${why}.` and `sessionStorage.ts:164-166` ends `…received ${…}${why}` (no period).
- **Argument**: no contract states a convention, so this is not a defect; but a reader of *Error messages* sees two styles, and the closest pair state the same rule. Cost of a change: 22 session storage messages, their pages and doc comments, unit tests that match exact strings, and any user test matching a whole message exactly.
- **Options**: (1) record a convention in AGENTS.md §5 (a final period, as most areas have) and apply it when each message is next touched; (2) apply it now in one patch; (3) leave it. Recommended: 1.

## 9. Across the scopes

### Merges

| Kept | Merged | Why, and the evidence kept |
| --- | --- | --- |
| B-1 | C-5 | One cause (`readFields` reads `Object.entries`, `src/locators/utils.ts:192-213`) and one fix. B-1 keeps the DOM counts (Playwright 1 match, the registration 2) and the full-harness fix sketch; C-5 adds the query paths (`update`, `replace`, `filter`) and the unit probe of `copyFields` and `mergeOptions` |
| B-5 | C-2 | Both are paths `2accf34`'s hint misses (AGENTS.md §5: "the message shows the two ways to write it"). B-5: a locator method's own `has`/`hasNot` option (`ensureOpen` gives the hint for `filter` only, `locatorRegistrationBuilder.ts:138`); C-2: a query in a filter's arguments (`endOpenRegistration` sets `resolvedPath` only for `getLocator`/`getNestedLocator`, `locatorRegistry.ts:120-133`). The fix needs both halves, since `locator("x", { has: getLocatorSchema(p).getLocator() })` takes both paths |
| B-7 | A-6, C-4, D-3, H-2 | One contract (AGENTS.md §9: API pages and doc comments list every message per member, *Error messages* all of them) and one docs pass. H-2's two messages duplicate B-7 (`reuse requires …`) and D-3 (`goto()` URL object). D-3's two non-error corrections (`toString()` in step titles, `runPostNavigationActions`'s default) ride along: same API page and doc comments |
| D-4 | H-9 | The same mechanism (`captureCallSite(PageObject)`, `src/pageObject.ts:328`). D-4 keeps the source sketch with `new.target` run through the harness (the code frame becomes the `new` line; `callSite.spec.ts` changes as designed); H-9 adds the five pages and their two versions |
| H-5 | A-8 | The same AGENTS.md §4 sentence and the same two routes; kept under H with H-4, so AGENTS.md §4 is edited once |

Folded without a finding file of their own: A's note on unexported parameter types (into F-5), B's TS2883 note (F-3), C's note on the upgrade page (H-1), D's note on the sweep's skipped characters (H-4), F's note on `dist/` (G-4), G's note on the 3.0.0 changelog's provenance line (G-10), E's helper cases (E-1).

### Contracts that two areas state differently

1. *Principles*: "Every rule is checked at runtime". Exceptions in other areas: `@step`'s Promise rule (H-7, E's area), a synchronous `defineLocators()` (D-5: checked nowhere), and the storage type/value pairing (A-7; `session-storage.md` says "nothing checks that both are there"). H-7's rewrite should name all three, unless D-5's option 1 adds a runtime check.
2. `installation.md`: paths, first arguments, URLs and storage values "are checked at runtime as the types check them". The types are stricter than the runtime in B-3, B-4 and C-1 and narrower in A-4; the type fixes close it.
3. Where a page object's error points: AGENTS.md §5 "the construction site in the stack" (holds), the Internal page "the line that created the page object" (false with a base class), *Page objects in tests* "the line of `super(...)`". Merged as D-4.
4. "Every message" (`errors.md`, `api/index.md`) against the members' lists: merged as B-7.
5. AGENTS.md §5 and *Internal → Call sites*: "exactly one `async` POMWright frame" gives the caller's line; Playwright drops that frame only without a boxed ancestor (E-1). The rule is shared by scopes A, D and E.
6. "Read as Playwright reads them … for `add`, `createReusable` and queries alike": merged as B-1.
7. *Session storage*: "Calls for one origin act in the order they were made … across helpers", and `d4cffbb`'s "calls keep their order", against the popup case (A-2).
8. "POMWright's types are [nameable], except in one pattern" (`installation.md`, `typescript.md`) against F-1, F-2 and F-3 (and B's TS2883 note).
9. `.changeset/export-storage-types.md`: "as every other public signature already allows", against F-1 and A's parameter types (F-5).
10. The publish guard's "that commit's own CI run publishes" (AGENTS.md §2, `publish.yaml`) against the changesets action's version flow (G-5).
11. `docs/seeding-session-storage.md` and the API page: "on the origin already, it writes at once", against `d4cffbb`'s decision for inherited origins (A-3).
12. Message punctuation (R-4).

### Fixes that touch each other

- **Pending changesets quote messages.** A fix that changes a message also edits the unreleased changeset that quotes it: `.changeset/sandboxed-document-message.md` (A-5), `.changeset/batch-navigation-message.md` (A-1's count of the key in flight), `.changeset/ended-registration-message.md` if B-5's wording changes the quoted text.
- **Session storage**: A-2 before A-3 (A-2's option 3 also covers A-3's option 1); A-1 and A-5 before B-7's storage lists; R-2 with them.
- **Locators**: B-2 before B-5 (both `locatorRegistrationBuilder.ts`); B-3 and C-1 (`types.ts`) with B-4 (`locatorRegistry.ts`), then the path type probes once; F-2's `AddAccessor` interface after B-4, since it must carry B-4's new `add` signature; C-6 with B-7's query entry and with C-3.
- **Call sites**: D-4's code option and E-1's option 1 both change how POMWright captures a call site (`src/helpers/callSite.ts`, `src/pageObject.ts`): one change, *Internal → Call sites* edited once (E-1 reverses its *Alternatives weighed* entry). D-5 in the same pass (`pageObject.ts`).
- **URLs**: D-2 and H-4 in one edit of `internal/url-matching.md`; D-1 changes `goto` to a property, so `check-api-coverage.mjs` must still find `### goto()`, edited with B-7's `class-navigation.md` changes.
- **Logger**: E-2 before E-4's option 2 (`attachLogsToTest`).
- **Types and docs**: F-1 and F-2 before F-3 and F-4; F-5 decides their bump and H-8 their markers.
- **CI**: G-1 with G-2 (`ci-changes.sh`); G-5 and G-10 with backlog issue 01 (`publish.yaml`); G-8 takes the guard's shape.
- **Docs last**: H-7 after D-5; H-6 (spelling) after every other page edit.
- **A-7's code option overlaps filed issue 06** (breaking: write the schema once). Issue 06 records that making the value required "breaks the documented generic base class"; the mirror-image check could do the same. Prefer the docs option now and add this direction to issue 06.

### Disagreements between scopes, resolved

- F decided the stale `dist/` is not a finding; G filed it (G-4). G-4 stands: G showed the "authoritative" local run passing on a build CI rejects (AGENTS.md §3) and packs with files §7 says must not be there.
- H's "every per-member label is present or replaced by a group statement" is narrowed by C-4 (the query's `describe()` throws and has no Throws; the page's *Errors of every method* covers sub-paths only) and A-6 (`get`, `clear`).
- D's "navigation step locations are right from a page object method" holds for an unboxed method; E-1 is the boxed case.
- A-3 is kept as a defect although `d4cffbb` decided the Firefox outcome: the Chromium and WebKit overwrite was not decided, and nothing outside the commit message records the decision.
- C-2 and C-5, filed in C for B's code, are merged into B's findings.

### Re-checks by the consolidation

All from the worktree root unless noted; outputs in `…-probes/R/`.

| What | Command | Exit | Result |
| --- | --- | --- | --- |
| E-1, helpers included | `bash ../E/steps/run.sh nested.spec.ts` (from `…-probes/R/`; no browser) | 0 | as filed: `inner-boxed @ index.js:967`, `ProbePage: Navigate to this Page @ index.js:2931`, `S.SessionStorage.set: @ index.js:861` inside boxed steps; Playwright's own `native-inner` at the spec line (`e1-nested.rerun.out`) |
| B-1, C-5 | `node ../POMWright-final-review-probes/B/f1-nonenumerable.mjs`, `…/C/p13-readfields.mjs` | 0, 0 | as filed (`add: getByRole('button') count 2`; `query replace own non-enumerable: getByRole('listitem')`) |
| B-5, C-2 | `…/B/f5-has-option.mjs`, `…/C/p09-ended-by-query.mjs` | 0, 0 | as filed |
| B-7 group | `…/B/f7-errors-gaps.mjs`, `…/C/p11-thrown-by-builder.mjs`, `…/D/goto-throws.cjs`; `grep -c` on `api/errors.md` | 0 | messages as filed; `errors.md` has 0 hits for `takes a URL string` and `the page navigated while seed`, and only the `reuse requires a registered path or a seed …` form; the query's `describe()` section has no Throws |
| G-3 | `curl https://api.github.com/repos/DyHex/POMWright/pulls?state=open` | 0 | #47, #48, #49 and #60 open (`open-pulls.json`) |
| G-10 | `curl …/-/npm/v1/attestations/pomwright@3.0.1` (and `@3.0.0`, control `sigstore@3.0.0`) | 0 | 404, 404, 200; the registry document has no `attestations` for 3.0.1 |
| PR #60 | `curl …/pulls/60`, `…/commits/3960900…/check-runs` | 0 | open, `mergeable_state: clean`, all eight checks `success` (`pr60.json`, `pr60-checks.json`) |
| R-1 to R-4 | see section 8 | 0 | confirmed |

Not re-run: the browser-dependent probes of A and D and the type probes. Their outputs and exit codes are in the scope folders, and each finding cites a log.

### Considered and not filed, from the scopes' notes

A: `seed` on an already closed page gets "await seed() before the test ends" (the cause is right); `set({})` resolves on `about:blank` (an empty list reads nothing); a pending seed outliving a test on a shared page (not probed). D: a RegExp base's `goto(target)` type admits a relative URL with a colon (the runtime throws the documented message); `UrlMatcher.test()` with a relative string throws `TypeError`; the matcher keeps the caller's RegExp objects (§8's copy rule covers builders only). E: `@step()` on a getter compiles under `experimentalDecorators` and throws at class definition, so `errors.md`'s "From JavaScript" is slightly narrow. None is a broken contract; each can be reopened.

## 10. What is sound

Each line names the path probed; the evidence is in the scope's summary and probes folder.

- **Session storage values and keys**: codecs that throw, `BigInt`, cyclic values, `NaN`, `Date`; `__proto__` and other prototype names, empty, unicode, lone surrogates and 1,000,000-character values round-trip through `set`, `get` and `clear`; a bad value in a batch writes nothing (chromium).
- **The `origin` option**: identical on Node 20, 22 and 24; schemes without a URL origin rejected with the reason.
- **`seed` against a racing navigation**: 25 rounds each order on three browsers, never resolved without the entries; CSP-served documents receive the entries before their first script; a back navigation is seeded; refused writes are reported after `replaceState`/`pushState`/hash changes (three browsers).
- **Listener lifetimes**: none left after success, encoding errors, in-flight failures, a missing Navigation API or a refused write (three browsers).
- **Locator chains and messages on the docs pages**: every chain and message of scopes B and C's pages reproduces from the build, the strict-mode texts and the `verify` outputs included.
- **Copies**: prototypes, class getters, frozen and null-prototype objects, symbol keys, RegExps mutated or `compile()`d after the call; `g`/`y` flags stable on repeated resolution (except B-1).
- **Ended registrations**: 4 builder kinds × 9 ending calls × every method; `createReusable` ends none.
- **First-argument rules**: 10 strategies × registration, seed, override × 6 values; the throwing call leaves the registry usable (except B-2).
- **Paths**: all 26 whitespace characters rejected by type and runtime; dots and empty paths agree (except B-3's length).
- **Resolution**: terminal-only `has`, cycles, frames and nested frames, any-frame in every position, `strictChains`, default descriptions, `nth` values handed to Playwright as given.
- **`getById`**: quotes, backslashes, control characters, NBSP, emoji; RegExps as `getByTestId`; shadow roots; quirks mode.
- **Queries**: independence, copies, step order, `describe`/`describe("")` as Playwright shows them (step title, assertion, call log, strict-mode error, through the runner), `update`'s merge patch on every strategy, `replace`'s argument lists for all ten methods, `skip`/`unskip`; the change set against a `v3.0.1` build differs only as intended.
- **URLs**: every printable ASCII character, 13 non-ASCII and 15 percent-encoded forms in path, query and fragment match in `expectThisPage` on 3 browsers × 3 Node versions; host forms (case, ports, IDN, IPv6, IPv4 forms, credentials); 27 `urlPath` forms never leave the origin; empty `?`/`#` make `expectThisPage` and `expectAnotherPage` exact opposites.
- **Navigation**: no POMWright timeout default (the project's `navigationTimeout` applies); `goto()` argument checks before any navigation; step titles and locations outside boxed steps; the actions hook; the lifecycle table's rows (chromium).
- **`@step` at top level**: every form at the calling line, in Babel's and tsc's standard and legacy output; unboxed nesting; errors in nested boxed steps at the outermost boxed call site, as Playwright.
- **Logger**: arguments printed as `console.log` does; levels shared across the tree; call order across children; names in `en-US` and `nb-NO` on Node 20, 22 and 24; the fixture survives `extend` and `mergeTests`.
- **Packaging**: the tarball holds exactly 8 files; one copy across `import` and `require` on Node 20, 22, 24; deep imports closed; TypeScript `node10`, `node16`, `nodenext`, `bundler`; attw clean; the runner in CommonJS, ESM and `experimentalDecorators` projects; the harness at 1.64.1; consumers on TypeScript 5.0.4 to 7.0.2.
- **Public surface**: 38 exports match AGENTS.md §1 and `api/index.md`; no class re-exported as a type; no builder returns `this`; every declaration change since 3.0.1 has a changeset.
- **Changesets**: 29, all patch, each starting with a sentence; a dry `changeset version` writes the §7 format.
- **CI**: `ci-changes.sh` on 11 scenarios (except G-1, G-2); `ci-last-green.sh` with a stub `gh`; `pack-test.sh` exit codes and switches; the gate `build` from live runs; branch protection requires `build`; the `github-pages` environment allows `main` only; the 8 action pins match their tags; workflow conditions keep forks and branches out; the site build fails on a missing page or anchor.
- **README and AGENTS.md facts**: the README example compiles and its chain and message match the build; AGENTS.md's counts (18 runtime files, 6,443 lines; 16 unit test files; 55 specs, 8,407 lines; 24/14/13 pages), its §1 export list, §2 names and §3 commands hold.
- **Site**: 53 pages build; 17 Mermaid diagrams render in light and dark; no overflow at 390 and 1280 px; no `noindex` or banner.

## 11. Decisions for the maintainer

**Status**: every question decided (2026-10-27, [DECISIONS.md](DECISIONS.md) #1–#61; the map is in #61). Where a
decision differs from an option marked [rec] here, the decision applies.

Options marked [rec] are the ones the finding or this report recommends.

**Release and process**

1. **F-5**: release 3.1.0 (A: the option types are a minor by §7 as written), or keep 3.0.2 and widen §5's promise to the option types of public constructors and methods and to public property types (B). Either way, reword `.changeset/export-storage-types.md`'s "as every other public signature already allows". This also decides F-2's factory alias (patch under B, minor under A).
2. **H-8**: whether patch-level exports and accepted inputs carry "Added in" markers ([rec] extend the rule), decided with F-5.
3. **R-4**: a punctuation convention for messages ([rec] record it in §5, apply when touched).
4. **G-3**: which majors Dependabot ignores ([rec] `changesets/action`, `@changesets/cli`, `@changesets/changelog-github`, `typescript`, each naming its issue); whether `@types/node` follows Node 24; close #47.
5. **G-5**: [rec] a warning in the guard when a release commit is skipped plus a §7 rule "merge nothing with a changeset until Publish has run for the release commit"; or publish the tested release commit.
6. **G-10**: read the logs of Publish runs 39451244770 and 39588664835; then Trusted Publishing now (issue 01) or `--provenance` until then; [rec] a verification step after publishing; or withdraw the promise with a changeset.
7. **G-2**: [rec] on pull requests skip on the PR base alone; or test the head and require up-to-date branches; or document the gap. Whether branch protection requires up-to-date branches.
8. **G-8** (suspected): [rec] give `pages.yaml` the moved-`main` guard, or document that a re-run redeploys.
9. **G-7**: [rec] make the API coverage check require the member's own anchor (and scope headings per `## Name`), or correct the two pages.

**Session storage**

10. **A-1**: [rec] check the page's origin around every call of a batch, or a guarded evaluation; how the message counts the key in flight; whether a single call's one-round-trip window is documented or closed.
11. **A-2**: [rec] a barrier for calls on a page without a URL origin (option 3).
12. **A-3**: [rec] teach `seed` the inherited origin (reverses `d4cffbb`'s decision), or document the case and reword the `return` message.
13. **A-4**: [rec] widen every non-literal key type (the `{} extends Record<K, unknown>` test), or narrow by pattern.
14. **A-7**: docs only for this release ([rec] by this report: the code option risks the base-class break issue 06 records), or reject a schema without `storage`; add this direction to issue 06.

**Registration, resolution and queries**

15. **B-1**: [rec] read own non-enumerable properties, or document the limit.
16. **B-2**: [rec] check before changing state, or validate at `add`, or assign after persisting.
17. **B-3**: [rec] template-literal pattern checks, or per-segment recursion, or a stated limit.
18. **B-4**: [rec] reject only a single-literal self-reuse.
19. **B-5**: [rec] the hint for `filter` and `locator`, and `resolves` for query resolutions; the wording for a query (the "pass a path" alternative drops the query's changes).
20. **B-6**: [rec] correct the two pages, or give `has` the path's literal type.
21. **C-1**: [rec] filter the chain's segments by the path type.
22. **C-6**: [rec] check the query's `describe()` at the call, or document the exception.
23. **C-7**: the wording ([rec] keep today's text unless the registry now has the path).

**Page objects, URLs, navigation**

24. **D-1**: [rec] `goto` as a property (option 1) or a brand, or document the hole; keep a string page's helper assignable to `NavigationFor<RegExp, UrlMatcher>`.
25. **D-2**: [rec] write `^` as `%5E` in a string `fullUrl` and document `|`, or docs only.
26. **D-4 (with H-9)**: keep the `super(...)` frame and correct the five pages, or capture at `new.target` (patch).
27. **D-5**: [rec] reject a Promise from `defineLocators()` with a labelled, kept error (and its message), or docs only.
28. **D-3 (in B-7)**: also label the `Cannot resolve …` message (patch), or docs only.

**Steps and logging**

29. **E-1**: [rec] pass a computed `location` (reverses *Internal → Call sites*' *Alternatives weighed* entry), or document the limit; apply it to the navigation and session storage helpers in the same change; accept the location given to a boxed method whose Promise is returned without `await`.
30. **E-2**: [rec] normalise underscores, then fall back to the machine's locale; whether an invalid `timeZone` falls back too.
31. **E-4**: [rec] docs only, or attach each entry once.
32. **E-5**: [rec] the method type as the type parameter, `any` in its constraint as `ClassMethodDecoratorContext` has it.

**Types, packaging and docs**

33. **F-1**: [rec] export the type; its name (`StepDecoratorFactory` or `StepDecorator`).
34. **F-2**: A, B or C, and the factory type's name (its bump follows decision 1).
35. **F-3**: the wording, after F-1 and F-2.
36. **B-7 group**: [rec] add the missing messages; optionally a script that checks every throw site's message against `errors.md` (H's test gap).
37. **H-6**: [rec] American spelling, keeping the slug `organising-a-project`.
38. **H-7**: [rec] name the type-only rules on *Principles* (after D-5).
39. **R-1**: replace `pocName` with `label`, or remove the snippet.

## Act before the next merge

**Status**: decided: items 1–5 by [DECISIONS.md](DECISIONS.md) #1–#5; PRs #47, #48 and #49 closed by the maintainer
on 2026-10-27 (#48's change lands in this branch).

1. **Do not merge Dependabot's PR #47** (G-3). It is still open and green (re-checked today) and replaces `changesets/action` v1.9.0 with v2.1.2, which refuses `@changesets/cli` 2 and the `publish` input: every Publish run would fail. Close it and add the `ignore` entries. PR #49 (TypeScript 7, changesets CLI 3) is red and must not be merged either. PR #48 bumps Mermaid to a new major: CI cannot see a diagram that fails to render (AGENTS.md §9), so render the 17 diagrams first (H's `…-probes/H/mermaid/render.mjs`).
2. **Hold PR #60** (`fix/review-3-0-2` into `main`). It is open, green on all eight checks and mergeable. Merging it makes Publish open a Version Packages pull request from 29 patch changesets, so before it:
   - decide F-5 (3.0.2 or 3.1.0) and H-8;
   - land the fix work, or decide which findings wait;
   - correct the three changesets that claim more than the code does: `boxed-step-location.md` (E-1: the nested boxed case regressed in `333a928`, the commit that changeset describes), `batch-navigation-message.md` (A-1: a commit between two calls lands in the other origin), and `export-storage-types.md` (F-1, F-5);
   - update the changesets that quote a message a fix changes (section 9).
3. **Before the release runs, read the two Publish logs** (G-10). Unless the cause is found, 3.0.2 will likely ship without provenance as well.
4. **After the Version Packages pull request is merged, merge nothing with a changeset until Publish has run for that commit** (G-5), or that version is never published.
5. **Keep `defect-review-result/` out of PR #60.** It is untracked in the checkout. In the spirit of AGENTS.md §6 rule 7, move what must outlive the review into fixes or issues, then delete it.

## Ledger

The ledger for the fix work. "This branch" means `fix/review-3-0-2` before PR #60 is merged. No fix is major-only, so no row goes to a GitHub issue; A-7's direction is added to the filed issue 06.

| ID | Kind | Severity | Semver | Merged IDs | Route | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [A-1] | defect | Medium | patch | | this branch: origin check around every call; amend `batch-navigation-message.md` | decided ([#9](DECISIONS.md)) |
| [G-3] | defect | Medium | none | | this branch: issue 01's move, `dependabot.yml`, Mermaid 12; close PRs #47, #48 and #49 | decided ([#1](DECISIONS.md)) |
| [E-2] | defect | Medium | patch | | this branch: validate `locale`/`timezoneId` at the fixture's setup | decided ([#10](DECISIONS.md)) |
| [G-10] | defect | Medium | none | | this branch: Trusted Publishing (decision 1), a warning check, a changeset note | decided ([#3](DECISIONS.md)) |
| [E-5] | defect | Medium | patch | | this branch: method type as the type parameter; generic example on *Test steps* | decided ([#11](DECISIONS.md)) |
| [E-1] | defect | Medium | patch | (covers A and D helpers) | this branch: computed `location`; amend `boxed-step-location.md` | decided ([#12](DECISIONS.md)) |
| [A-3] | defect | Low | patch | | this branch: `seed` reads the inherited origin; reworded return message | decided ([#14](DECISIONS.md)) |
| [B-1] | defect | Low | patch | C-5 | this branch: own non-enumerable names; amend `options-read-like-playwright.md` | decided ([#15](DECISIONS.md)) |
| [A-2] | defect | Low | patch | | this branch: page-wide barrier for pages without a URL origin | decided ([#13](DECISIONS.md)) |
| [D-5] | defect | Low | patch | | this branch: reject a returned Promise with a labelled, kept error | decided ([#16](DECISIONS.md)) |
| [D-2] | defect | Low | patch (`^`), none (`\|`) | | this branch: `^` as `%5E` in `fullUrl`, `\|` documented; amend `caret-in-url-path.md` | decided ([#17](DECISIONS.md)) |
| [A-4] | defect | Low | patch | | this branch: per-member key typing (option 3); amend `storage-string-key-types.md` | decided ([#18](DECISIONS.md)) |
| [D-1] | defect | Low | patch | | this branch: `goto` as a property in `NavigationFor`; docs explain the type | decided ([#19](DECISIONS.md)) |
| [C-1] | defect | Medium | patch | | this branch: per-member sub-path types; `createRegistryWithAccessors` requires `<Paths>`; sub-paths in a generic base (regression since 2.0.0) | decided ([#20](DECISIONS.md)) |
| [B-4] | defect | Low | patch | | this branch: compile-time self-reuse check for a single literal only; non-distributive `reuse` | decided ([#21](DECISIONS.md)) |
| [B-3] | defect | Low | patch | | this branch: pattern checks reporting every broken rule, type and runtime alike | decided ([#22](DECISIONS.md)) |
| [F-1] | defect | Low | patch | | this branch: export the decorator type as `StepDecorator` | decided ([#23](DECISIONS.md)) |
| [F-2] | defect | Low | patch | | this branch: `AddAccessor` as an interface; `ReusableLocatorFactory` exported; every public member emits | decided ([#24](DECISIONS.md)) |
| [B-5] | defect | Low | patch | C-2 | this branch: the hint for `filter` and `locator`, after a resolving call or a query; extend the pending changeset | decided ([#25](DECISIONS.md)) |
| [A-5] | defect | Low | patch | | this branch: the message names the error page and the sandboxed document; amend the pending changeset | decided ([#26](DECISIONS.md)) |
| [B-2] | defect | Low | patch | | this branch: persist first, assign after; the path half settled by #22 | decided ([#27](DECISIONS.md)) |
| [C-6] | defect | Low | patch | | this branch: the query's `describe()` checked at the call | decided ([#28](DECISIONS.md)) |
| [C-7] | defect | Low | patch | | this branch: today's message unless the registry now has the path | decided ([#29](DECISIONS.md)) |
| [R-2](#r-2-the-never-applied-message-for-several-origins) | defect | Low | patch | | this branch: plural, each seed's helper and call location | decided ([#30](DECISIONS.md)) |
| [G-5] | documentation (reclassified from defect) | Low | none | | this branch: AGENTS.md §7 rule, a failing check in the guard, corrected wording | decided ([#4](DECISIONS.md)) |
| [G-2] | defect | Low | none | | this branch: drop the docs-only skip; every job runs | decided ([#31](DECISIONS.md)) |
| [G-1] | defect | Low | none | | settled by #31 (the script is deleted) | decided ([#32](DECISIONS.md)) |
| [G-4] | defect | Low | none | | this branch, **first in the plan**: `--clean` in `build`; the packed file list asserted | decided ([#33](DECISIONS.md)) |
| [G-9] | defect | Low | none | | this branch: space sections for YAML and Markdown | decided ([#34](DECISIONS.md)) |
| [R-1](#r-1-the-pw-step-snippet-inserts-v1s-pocname) | defect | Low | none | | this branch: delete the snippets file | decided ([#35](DECISIONS.md)) |
| [B-7] | documentation | Low | none (D-3 label: patch) | A-6, C-4, D-3, H-2 | this branch: complete lists in one late docs pass; labelled `Cannot resolve`; a message-coverage check | decided ([#36](DECISIONS.md)) |
| [D-4] | documentation | Low | patch (code option) | H-9 | this branch: `captureCallSite(new.target)`; frame-budget tests | decided ([#37](DECISIONS.md)) |
| [A-7] | documentation | Low | patch (code option) | | this branch: type and value must agree (value without type, explicit type without value, key without codec); a comment on #58 | decided ([#38](DECISIONS.md)) |
| [F-3] | documentation | Low | none | | this branch: the two remaining exceptions and their fixes (late docs pass) | decided ([#39](DECISIONS.md)) |
| [H-7] | documentation | Low | patch (runtime check) | | this branch: `@step` checked at run time; *Principles* names the type-only rules | decided ([#40](DECISIONS.md)) |
| [E-4] | documentation | Low | none | | this branch: docs, an outcome-based fixture example; the redesign as a breaking issue draft | decided ([#41](DECISIONS.md)) |
| [E-3] | documentation | Low | none | | this branch: `box` described as Playwright does | decided ([#42](DECISIONS.md)) |
| [B-6] | documentation | Low | none | | this branch: a find and replace for the path and its descendants; F2 with its limits | decided ([#43](DECISIONS.md)) |
| [C-3] | documentation | Low | none | | this branch: a *Queries* section on the any-frame form | decided ([#44](DECISIONS.md)) |
| [H-1] | documentation | Low | none | | this branch: `getById` named in the upgrade sentence | decided ([#45](DECISIONS.md)) |
| [H-3] | documentation | Low | none | | this branch: 3.x throughout the upgrade page; a search for every item that needs a change | decided ([#46](DECISIONS.md)) |
| [H-4] | documentation | Low | none | | this branch, with D-2 | decided ([#17](DECISIONS.md)) |
| [H-5] | documentation | Low | none | A-8 | this branch: the two routes in AGENTS.md §4, and any new one | decided ([#47](DECISIONS.md)) |
| [F-4] | documentation | Low | none | | this branch: every exported type in the table, checked; *Packaging* names every check | decided ([#48](DECISIONS.md)) |
| [G-7] | documentation | Low | none | | this branch: `@see` to its own heading, headings per section | decided ([#49](DECISIONS.md)) |
| [G-6] | documentation | Low | none | | this branch: the call counts stated; a fresh bench run after the registry changes | decided ([#50](DECISIONS.md)) |
| [G-11] | documentation | Low | none | | this branch: the three comments, and a final pass over changed tooling | decided ([#51](DECISIONS.md)) |
| [H-6] | documentation | Low | none | | this branch: American spelling; the page renamed without a redirect | decided ([#52](DECISIONS.md)) |
| [R-3](#r-3-inventorymd-counts-31-pending-changesets) | documentation | Low | none | | review notes only | closed, no action ([#8](DECISIONS.md)) |
| [G-8] | suspected | Low | none | | this branch: the tip guard in `pages.yaml` | decided ([#53](DECISIONS.md)) |
| [F-5] | design question | — | patch: the release is 3.0.2 | | AGENTS.md §7 wording; `export-storage-types.md` text | decided ([#6](DECISIONS.md)) |
| [H-8] | design question | Low | none | | this branch: markers on the four types (and F-1/F-2's if adopted); AGENTS.md §9 | decided ([#7](DECISIONS.md)) |
| [R-4](#r-4-message-punctuation) | design question | — | none | | no convention; each message punctuated as reads best | decided ([#54](DECISIONS.md)) |

[A-1]: A-session-storage/defect-A-1-batch-lands-on-other-origin.md
[A-2]: A-session-storage/defect-A-2-about-blank-popup-two-chains.md
[A-3]: A-session-storage/defect-A-3-seed-on-inherited-origin-popup.md
[A-4]: A-session-storage/defect-A-4-non-literal-key-types.md
[A-5]: A-session-storage/defect-A-5-error-page-called-sandboxed.md
[A-6]: A-session-storage/defect-A-6-on-origin-seed-errors-unlisted.md
[A-7]: A-session-storage/defect-A-7-schema-value-without-type.md
[A-8]: A-session-storage/defect-A-8-agents-teststorage-routes.md
[B-1]: B-registration-and-resolution/defect-B-1-own-non-enumerable-option-dropped.md
[B-2]: B-registration-and-resolution/defect-B-2-failed-locator-method-keeps-definition.md
[B-3]: B-registration-and-resolution/defect-B-3-long-path-literal-ts2589.md
[B-4]: B-registration-and-resolution/defect-B-4-reuse-path-variable-rejected.md
[B-5]: B-registration-and-resolution/defect-B-5-has-option-ended-message.md
[B-6]: B-registration-and-resolution/defect-B-6-rename-skips-has-paths.md
[B-7]: B-registration-and-resolution/defect-B-7-errors-page-gaps.md
[C-1]: C-queries/defect-C-1-sub-paths-never-on-wide-paths.md
[C-2]: C-queries/defect-C-2-ended-by-query-message.md
[C-3]: C-queries/defect-C-3-queries-page-no-any-frame.md
[C-4]: C-queries/defect-C-4-api-throws-incomplete.md
[C-5]: C-queries/defect-C-5-own-non-enumerable-option-dropped.md
[C-6]: C-queries/defect-C-6-query-describe-any-frame-terminal.md
[C-7]: C-queries/defect-C-7-kept-query-not-registered-message.md
[D-1]: D-page-objects-urls-navigation/defect-D-1-navigationfor-accepts-regexp-helper.md
[D-2]: D-page-objects-urls-navigation/defect-D-2-fullurl-not-browser-form.md
[D-3]: D-page-objects-urls-navigation/defect-D-3-navigation-messages-docs.md
[D-4]: D-page-objects-urls-navigation/defect-D-4-check-points-at-base-super.md
[D-5]: D-page-objects-urls-navigation/defect-D-5-async-definelocators.md
[E-1]: E-logging-step-fixture/defect-E-1-boxed-step-inside-boxed-step-located-in-bundle.md
[E-2]: E-logging-step-fixture/defect-E-2-locale-playwright-accepts-fails-log-fixture.md
[E-3]: E-logging-step-fixture/defect-E-3-step-api-page-misdescribes-box.md
[E-4]: E-logging-step-fixture/defect-E-4-attachlogstotest-lifecycle-undocumented.md
[E-5]: E-logging-step-fixture/defect-E-5-step-rejects-generic-async-methods.md
[F-1]: F-packaging-types-changesets/defect-F-1-step-factory-type-not-exported.md
[F-2]: F-packaging-types-changesets/defect-F-2-registry-values-do-not-emit.md
[F-3]: F-packaging-types-changesets/defect-F-3-declaration-true-docs-pnpm.md
[F-4]: F-packaging-types-changesets/defect-F-4-typescript-page-type-table.md
[F-5]: F-packaging-types-changesets/defect-F-5-storage-option-types-bump.md
[G-1]: G-ci-and-tooling/defect-G-1-rename-hides-old-path.md
[G-2]: G-ci-and-tooling/defect-G-2-pr-skip-ignores-merge-commit.md
[G-3]: G-ci-and-tooling/defect-G-3-dependabot-proposes-deferred-majors.md
[G-4]: G-ci-and-tooling/defect-G-4-build-keeps-stale-dist.md
[G-5]: G-ci-and-tooling/defect-G-5-release-skipped-when-main-moves.md
[G-6]: G-ci-and-tooling/defect-G-6-performance-call-count.md
[G-7]: G-ci-and-tooling/defect-G-7-api-coverage-see-target-unchecked.md
[G-8]: G-ci-and-tooling/defect-G-8-pages-rerun-deploys-older-site.md
[G-9]: G-ci-and-tooling/defect-G-9-editorconfig-tabs-everywhere.md
[G-10]: G-ci-and-tooling/defect-G-10-no-provenance-on-3x-releases.md
[G-11]: G-ci-and-tooling/defect-G-11-stale-tooling-comments.md
[H-1]: H-docs-readme-agents/defect-H-1-upgrade-first-argument-omits-getbyid.md
[H-2]: H-docs-readme-agents/defect-H-2-errors-page-misses-two-messages.md
[H-3]: H-docs-readme-agents/defect-H-3-upgrade-how-to-names-3-0-0.md
[H-4]: H-docs-readme-agents/defect-H-4-agents-urlforms-one-known-difference.md
[H-5]: H-docs-readme-agents/defect-H-5-agents-server-routes-incomplete.md
[H-6]: H-docs-readme-agents/defect-H-6-british-spellings.md
[H-7]: H-docs-readme-agents/defect-H-7-principles-every-rule-at-runtime.md
[H-8]: H-docs-readme-agents/defect-H-8-no-added-in-markers-for-3-0-2-exports.md
[H-9]: H-docs-readme-agents/defect-H-9-report-points-at-super-not-new.md