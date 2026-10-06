# POMWright 3.0.0 decisions log

Every decision made while building 3.0.0, across all plans, big and small. One row each: date, decision, reason.
Grouped by origin, newest plan at the bottom. A reversed decision is not deleted: add a new row that supersedes it
and say which one it replaces. Open questions live in the last section and move up when answered.

## Process and release shape

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-05 | Plan first, one analysis item (or tightly coupled pair) at a time. A reviewable plan file precedes any code and is executed only after explicit confirmation. | Keeps each change reviewable and surfaces contract questions before implementation. |
| 2026-10-05 | Work proceeds in the order suggested by analysis section 6 unless redirected. | The order front-loads verified bugs with small blast radius. |
| 2026-10-05 | Every claim in a plan is verified against the source and, for runtime behaviour, against Chromium through the Playwright install in `test/`. | The earlier bundle-based analysis contained errors that only probes caught. |
| 2026-10-06 | The next release is **3.0.0**, a major. It collects all work derived from the analysis: bug fixes, maintenance, dead and redundant code removal, structural improvements, packaging, tooling, CI, quality, reliability, performance, test coverage, and documentation. No intermediate 2.x release from this work. | Consumers absorb one bump, and breaking items need not be split from the fixes they belong with. |
| 2026-10-06 | The getById fix ships in 3.0.0 as a `major` changeset with a *Breaking changes* heading. Supersedes the plan's original recommendation of a minor. | Removing documented prefix stripping is breaking by the book; a major keeps `^2.1.0` consumers safe from a silent behaviour change. |
| 2026-10-06 | `docs/v2` is frozen as the 2.x reference. `docs/v3` is created as a verbatim copy and receives every doc edit from every 3.0.0 plan. README and CHANGELOG keep linking to v2 until release. | 2.x docs stay an accurate snapshot while 3.0.0 changes accumulate in one place. |
| 2026-10-06 | 3.0.0 ships a redesigned documentation site built with Starlight on GitHub Pages, using `docs/v3` as source notes. This is release work, not part of any feature plan. | Starlight builds static output and deploys to Pages with the official Astro action; the v3 notes feed it. |
| 2026-10-06 | All release working documents live in `release-3.0.0/`: the analysis file, plans named `PLAN-<analysis items>-<slug>.md`, `RELEASE-NOTES-3.0.0.md`, and this file. Links inside are relative to the folder. The folder is temporary and is removed or archived when 3.0.0 ships. | Everything for the release is in one place and numbered against the analysis. |
| 2026-10-06 | `RELEASE-NOTES-3.0.0.md` lists only what is done or committed to by a plan, each item with a status marker. It is never a copy of the analysis. | Release notes should reflect delivered scope, not intentions. |
| 2026-10-06 | `AGENTS.md` rewritten as the persistent contributor guide. It carries the 3.0.0 workflow and corrects the "thenable query builders" error from the 2.x version. | Agents and humans need one accurate place for conventions and process. |
| 2026-10-06 | The independent second-pass review of the analysis was verified claim by claim, reconciled into the analysis (section "Second-pass review, reconciled 2026-10-06"), and deleted. | One source of truth; its outcomes and the test expectations it asked for now live in the analysis. |

## Plan 1.1-1.2: getById ([PLAN-1.1-1.2-GETBYID.md](PLAN-1.1-1.2-GETBYID.md))

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-05 | String ids resolve as `[id="…"]` with a one-line CSS string escape (quote, backslash, newline). Replaces `#<id>` through the no-op `cssEscape`. | Attribute selectors accept any string value; `#` needs identifier escaping, which was broken. |
| 2026-10-05 | `#` and `id=` prefix stripping is removed, `normalizeIdValue` is deleted, and the string is matched verbatim and case-sensitively. | Makes ids starting with `#` or `id=` reachable, matches the `getByTestId` convention, and removes the triple normalisation from analysis 1.10. |
| 2026-10-05 | No registration-time guard against a leading `#` or `id=`. | A guard would reintroduce the blind spot being removed. A stale call site fails visibly, with the rendered selector and the registry path in the message. |
| 2026-10-05 | An empty id throws at registration via `assertIdValue`. The message names the registry path, or `createReusable.getById` for reusable seeds. | Fail fast at the boundary instead of a `TypeError` at resolution. |
| 2026-10-05 | Whitespace inside ids is escaped, not rejected. | HTML ids may contain spaces, and the attribute selector handles them. |
| 2026-10-05 | A RegExp with the sticky `y` flag throws at registration. Every other flag passes through unchanged. | Playwright evaluates one regex object across all candidates; `lastIndex` would make results order-dependent. |
| 2026-10-05 | `cssEscape` is deleted together with `normalizeIdValue`. | Not exported from the package root; replaced by the new `escapeCssString` and `buildIdSelector` helpers. |
| 2026-10-05 | The registration builder distinguishes `undefined` (inherit, seeded only) from a value with an explicit `=== undefined` check. A non-seeded `getById(undefined)` throws. `applyDefinitionPatch` keeps the id case as `patch.id !== undefined ? patch.id : base.id`. | Truthiness checks conflated an empty string with "not provided". |
| 2026-10-05 | `createLocator` throws a descriptive error when an id definition lacks an id, instead of `?? ""`. | Surfaces a corrupted definition instead of producing an empty selector. |
| 2026-10-05 | No change to `IdDefinition` or any exported type. No signature change. | The contract change is behavioural; stable types keep the migration to call-site values. |
| 2026-10-05 | New integration coverage asserts against real DOM elements, not only against `toString()`. | The 2.x suite passed while the selector was broken because it only compared rendered strings. |
| 2026-10-06 | Ships in 3.0.0 as `major`; doc edits land under `docs/v3`. | See the process table. |
| 2026-10-06 | The CSS string escape covers `"`, `\`, LF, CR and FF (`\a `, `\d `, `\c `). Supersedes the 2026-10-05 row above, which listed only quote, backslash and newline. NUL is left as is, since no CSS selector can express it. | Chromium probe: a raw CR or FF inside a CSS string is a `BADSTRING` parse error. The second-pass review flagged the gap. |
| 2026-10-06 | `getById(RegExp)` resolves through Playwright's `internal:attr=[id=/source/flags]` engine. Rejected: a `match` option over CSS attribute operators plus throwing on regex metacharacters, which would give up the pattern use case. | It is the engine `getByTestId(RegExp)` compiles to, so it cannot disappear quietly; the selector string is built in one helper; integration tests resolve real elements through it, so a Playwright change fails CI loudly. |
| 2026-10-06 | The tricky-id fixture is a new `/testids` express route with its own page object, fixture and spec. The static W3 index page stays untouched. | Keeps the fixture readable and isolated; follows the existing `/testfilters` and `/iframe` layout. |
| 2026-10-06 | Unit tests run on vitest, colocated as `src/**/*.test.ts`, with `vitest.config.ts` limiting discovery to that glob. Rejected: `node:test` with `tsx`, and a separate `unit/` folder. | Pure helpers need no browser and the inner loop should be milliseconds. Verified that test files cannot ship: tsup bundles from `index.ts` only, and `pnpm pack` publishes only the `files` allowlist (`dist/**`, README, LICENSE, CHANGELOG). |
| 2026-10-06 | All RegExp flags pass through to Playwright unchanged, including sticky `y`. Supersedes the 2026-10-05 row that rejected `y` at registration. The docs recommend `^`. | Playwright fixed the `lastIndex` carry-over in [microsoft/playwright#42818](https://github.com/microsoft/playwright/pull/42818) (merged 2026-09-22; verified absent from 1.63.0 and present in the 1.64.0 alphas, so first release 1.64.0). With the reset, `y` is a deterministic start anchor. Passing it through keeps `getById` identical to `getByTestId` on every Playwright version; rejecting it would have been POMWright-specific semantics. |

## Open questions

None as of 2026-10-06. The three questions raised on 2026-10-05 for plan 1.1-1.2 (RegExp engine, fixture location,
unit-test runner) were decided on 2026-10-06 and moved into the plan's table above.
