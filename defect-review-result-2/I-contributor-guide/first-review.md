# Segment 2I: the first review's guide findings at `d850405`

Pass 2 of segment 2I, written 2026-10-28 20:11 +0100. Each reproduction was copied into
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/I/run1/<ID>/run.sh`, pointed at the review worktree, and run
there; its output is `out.txt` beside it (every run exited 0). The first review read one guide file (`AGENTS.md`, with
sections §1 to §9); since `9923a9f` and `6d1de0e` its text is in ten files, so each re-run looks in the file that now
holds the sentence.

## Findings

| First-review ID | Kind then | What it said | Re-run at `d850405` | Outcome |
| --- | --- | --- | --- | --- |
| H-4 | documentation | AGENTS.md §4, *Tests and checks* and *URL matching* say the URL sweep has "one known difference" (Chromium's `\|`); the spec also lists `^` on Node 20 and 22 | `run1/H-4`: no "one known difference" or "but one" in the guide or the Internal pages (grep exit 1); `test/AGENTS.md` line 98 "with the known differences listed: Chromium's `\|` in a path, and, on Node 20 and 22, whose `new URL` keeps a `^`, every browser's `%5E`", matching the spec's `KNOWN` (lines 12–19) and its skip of `# ? / % \` (line 30); *Tests and checks* line 28 "the known differences"; *URL matching* line 58 "except in the path" | **fixed** (`3bf7a19`, decision 17) |
| H-5 | documentation | AGENTS.md §4's routes leave out `/teststorage/sandboxed` and `/teststorage/shadowed-navigation` | `run1/H-5`: every one of the 27 routes `test/server.js` defines is named in `test/AGENTS.md` (`missing=0`) | **fixed** (`1b15aff`, decision 47; point 2, "any new route", also holds) |
| A-8 | documentation | the same two routes (merged into H-5) | `run1/A-8` (same script) | **fixed** |
| G-9 | defect | `.editorconfig` asks for tabs in YAML and Markdown | `run1/G-9`: `[*.{yml,yaml}]` and `[*.{md,mdx}]` use spaces; yaml 9 files and yml 1, none tab-indented; md 114, none tab-indented; **mdx 1 file, tab-indented** (`website/src/content/docs/index.mdx`), while the header says "YAML and Markdown with two spaces, as every such file here is" | **fixed incompletely**: [2I-9](defect-2I-9-editorconfig-mdx.md). Decision 34 added `mdx` to the space section on the strength of "every YAML and Markdown file … is indented with spaces"; the one `.mdx` page is not |
| R-1 | defect | `.vscode/playwright-snippets.code-snippets` inserts v1's `pocName` | `run1/R-1`: `.vscode/` holds only `extensions.json` and `settings.json`; no `pocName` outside `CHANGELOG.md` (grep exit 1); `docs/repository.md` line 24 has the `.vscode/` row decision 35 asked for | **fixed** (`1717edb`, decision 35) |
| G-11 | documentation | three tooling comments describe the repository as it was | `run1/G-11`: `vitest.config.ts` lines 7–10, `check-api-coverage.mjs` lines 20–22 and `playwright.base.ts` lines 1–3 describe the current tooling; the three stale phrases are gone (grep exit 1) | **fixed** (`1b15aff`, decision 51) |
| F-4 (the guide's part) | documentation | "AGENTS.md §4 also lists only two compile-only files under `packaging/`" | `run1/F-4`: `test/AGENTS.md` line 95 names all three (`publicTypes.typecheck.ts`, `publicTypes.emit.ts`, `stepLegacyDecorators.typecheck.ts`). Line 116's *compile-only probes* sentence still names two of the three `.typecheck.ts` files, a different sentence neither review had reported: [2I-7](defect-2I-7-guide-statements-that-do-not-match.md) item 12 | **fixed** for what F-4 named; the pages part is 2F's |
| G-5 (the guide's part) | documentation | the guide promised "that commit's own CI run publishes" | `run1/G-5`: the promise is gone (grep exit 1); `docs/releases.md` line 48 has decision 4's merge rule (without the npmjs.com approval, which decision 72 removed); `.github/AGENTS.md` lines 32 and 49 and *Tests and checks* line 102 say the newer commit's run continues the release and publishes only when no changeset is pending | **fixed** for the guide (`3284aa4`, `8beb9d0`, `01d1096`); the workflow is 2G's |
| F-5 | design question | documented-but-missing exports: patch or minor? | `run1/F-5`: `docs/versioning.md` lines 26–31 state decision 6's rule and its exclusions; the three promises it cites are on *TypeScript* line 11, *Types* lines 6–7 and *Installation* line 43 | **fixed differently** (decision 6: patch; the guide says so) |
| H-8 | design question | "Added in" markers for the 3.0.2 exports | `run1/H-8`: `website/AGENTS.md` lines 66–69 state decision 7's rule; six names carry `Added in: v3.0.2` (`AllEntries`, `Decoded`, `SeedOptions`, `SessionStorageOptions`, `ReusableLocatorFactory`, `StepDecorator`) | **fixed differently** (decision 7) |
| R-4 | design question | a punctuation convention for messages | `run1/R-4`: `src/AGENTS.md` line 44 records it as considered and not planned | **still present: decided** (decision 54, no convention) |

Not in this segment: H-1, H-2, H-3, H-6, H-7 and H-9 (the site's pages, 2H), R-3 (the first review's own inventory, not
the repository), and the behaviour behind the guide sentences of E-1 and D-4 (2E, 2D). Their guide wording was read:
`src/helpers/AGENTS.md` lines 57–69 and `src/AGENTS.md` lines 49–53 say what decisions 12 and 37 decided.

## Claims beyond the findings

| Claim (first review) | Re-checked at `d850405` | Note |
| --- | --- | --- |
| H sound: AGENTS.md's counts (18 runtime files, 6,443 lines; 16 unit test files; 55 specs, 8,407 lines; 24/14/13 pages) | `run1/H-sound`: the guide states no file, line or page count now | no longer applicable: the split dropped them by design (PLAN-agents-split *Execution notes*, "4 stale counts and lists dropped"; decision 76) |
| H sound: §1's export list equals `index.ts` (38) | 40 exports, each named in `AGENTS.md` lines 19–27 (pass 1) | holds, with the two exports added since (`StepDecorator`, `ReusableLocatorFactory`) |
| H sound: every function and type §2 names exists | the 25 identifiers of `src/locators/AGENTS.md` and the 10 of `src/helpers/AGENTS.md` grepped (pass 1) | holds |
| H sound: §3's scripts match `package.json`; pnpm 12.14.0 in the three manifests, lockfiles and action steps; Astro 22.22, vitest 22.12 | pass 1: all present; `pack-test.sh` now runs seven checks, as `test/AGENTS.md` says | holds |
| H sound: §6's `git show 08bdcac^:release-3.0.0/DECISIONS.md` resolves | `git cat-file -e` succeeds | holds |
| H sound: "`git grep` finds no reference to a plan, finding or decision number outside the git history" | `run1/H-sound`: at `54cdada`, `test/tests/locatorRegistry/registry/registry.verify.spec.ts:7` "The table in the plan's section 1.9 is the contract." | **did not hold at 54cdada**, and still does not: [2I-6](defect-2I-6-plan-reference-left-in-a-spec.md) |
| H sound: §9's checks pass | `pnpm typecheck` exit 0 (doc snippets 226 checked, 12 `nocheck`; API coverage 40 exports, 108 members, 0 problems; error messages ok) | holds |
| report.md sound: "README and AGENTS.md facts" | as the rows above | holds, except the plan reference |
| inventory.md §10: "does every count, path, file list, command and rule still describe the repository" | one line in the first inventory; pass 1's inventory covers it item by item | see `inventory-reconciled.md` |

## Test gaps

| First review's gap | At `d850405` |
| --- | --- |
| H 1 / report 7: nothing checks that *Error messages* is complete | closed: `scripts/check-error-messages.mjs` (`429f2c2`), in `pnpm typecheck` |
| H 2 / report 15: README examples compiled by hand | closed: `check-doc-snippets.mjs` compiles the README (line 27, `ff8a2ac`) |
| H 3 / report 15: nothing re-probes the chains pages show | closed: `test/tests/docs/docsChains.spec.ts` (`6c53973`, `3be8ca9`) |
| H 4 / report 15: Mermaid checked by eye | closed for rendering: `scripts/check-diagrams.mjs` (`54cf090`); how a diagram looks is still by eye, as `website/AGENTS.md` says |
| H 5: a page object's error with a base class untested | closed: `test/tests/pageObject/callSite/checkSite.spec.ts:56` "with a base class of the project's own" |

## Items `PLAN-release-gates-and-audit.md` leaves for the second review, in this area

- **British spellings left in specs and unit tests, and `normaliseOrigin`**: the guide's spelling rule is for pages
  (`website/AGENTS.md` *Rules*, page shapes: "American spelling"); none of the ten guide files has a British spelling
  (pass 1 grep). Left in code and tests (`git grep` over `src`, `test`, `scripts`, `website/src`, `website/snippets`):
  `labelled` ×8, `initialiser` ×3, `initialisation`, `normaliseOrigin` ×3, `recognised`, `recognises`, `normalises`,
  `behaviour` (all in specs, unit tests or an internal name, which plan 38 left by choice), **and one on a page**:
  `website/src/content/docs/internal/page-object-lifecycle.md` line 29, "initialiser" (since `5ab09ea`, missed by H-6 and
  plan 38's search), which breaks the guide's page rule: noted for 2H under *outside the segment*.
- The other items (report.md §9's *Considered and not filed*, E's test gap 7, R-3) are other segments' areas.

## Decisions that bear on this segment's findings

- **Decision 5, point 2, and decision 62**: `defect-review-result/` is the working folder of the implementation "under
  this name"; plans are one per item or group, a plan without a finding is `PLAN-T<n>-<slug>.md`; `PLANS.md`'s
  changesets table replaces the release notes. Pass 1's 2I-5 stands, reframed: the practice was decided for this
  release, but the audit (plan 41) did not carry it into `docs/releases.md`, and four plans follow neither the guide's
  nor decision 62's naming. See 2I-5's *Pass 2* section.
- **Decisions 76 and 77** (the split): "each rule sits in the file that loads for every change that can trigger it";
  "the maintainer uses only current Claude Code clients and Codex". 2I-1, 2I-2 and 2I-8 are places where the first
  sentence does not hold; 2I-3's version caveat matters less under the second (noted there).

## Outcome counts

- fixed: 7 (H-4, H-5, A-8, R-1, G-11, F-4's guide part, G-5's guide part)
- fixed differently: 2 (F-5, H-8)
- still present (decided): 1 (R-4, decision 54)
- fixed incompletely: 1 (G-9 → 2I-9)
- not fixed: 0; regressed: 0; cannot re-run: 0
- a *what is sound* claim that did not hold: 1 (no plan reference outside the folder → 2I-6)
