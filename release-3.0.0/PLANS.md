# 3.0.0 plans: the remaining analysis items, in order

Every item of [POMWRIGHT-2.1.0-ANALYSIS.md](POMWRIGHT-2.1.0-ANALYSIS.md) is addressed by exactly one plan below. Plans
are written one at a time, in this order, each reviewed before execution and executed before the next is written
(AGENTS.md section 6). Scope per plan is sized to be implementable in one go; if a design review grows a plan beyond
that, it is split and this list is updated. Items ticked in the analysis by an earlier plan are not repeated.

| # | plan | analysis items | status |
| --- | --- | --- | --- |
| 1 | [PLAN-1.1-1.2-GETBYID.md](PLAN-1.1-1.2-GETBYID.md) | 1.1, 1.2, the id part of 1.8 and 1.10, unit-test layer (section 4) | executed 2026-10-06 |
| 2 | [PLAN-1.3-1.4-URL-NAVIGATION.md](PLAN-1.3-1.4-URL-NAVIGATION.md) | 1.3, 1.4, the `goto` bullet of 1.10, the `"" \| string` bullet of section 2 | executed 2026-10-08 |
| 3 | [PLAN-1.5-SESSION-STORAGE.md](PLAN-1.5-SESSION-STORAGE.md) | 1.5 a to g; section 5 `session-storage.md` bullets; the `SessionStorageState` bullet of 1.9d; the peer floor (section 4) | written 2026-10-08; reviewed, redesigned and decided 2026-10-09 and 2026-10-10; awaiting execution |
| 4 | `PLAN-1.6-1.8-REGISTRATION-AND-FRAMES.md` | 1.6 and 3.2 (frames as `locator` + `contentFrame`, steps on frames), 1.8 (registration requires the primary field; `update(x, undefined)` semantics), 1.9e (pre-definition builder types), 3.6 (fail fast, optional `registry.verify()`), the seeded-recovery bullet of 1.10; section 5 `locator-registry.md` bullets on frames and on the "Missing" list | next |
| 5 | `PLAN-1.7-PAGEOBJECT-LIFECYCLE.md` | 1.7 (lazy `defineLocators`, covering direct `locatorRegistry` use; actions evaluated at use), the `null`/`[]` actions bullet of section 2 (optional hook instead of abstract boilerplate), 3.7 (decide and document); section 5 `PageObject.md` bullets | |
| 6 | `PLAN-4-PACKAGING-TOOLING-CI.md` | every section 4 bullet: SPDX id, `exports`/`engines`/`sideEffects`, declared `@playwright/test` and a floor matrix (floor raised to `>=1.61.0` by plan 3), harness redesign (frozen install plus tarball step, no sudo), browser projects in CI, publish gated on tests, `tsc` step incl. the typecheck probe file, lint scope, `CHANGELOG.md` note, tick the unit-test bullet; section 2 `retries`, `.npmignore`, `src/dist` | |
| 7 | `PLAN-1.9-TYPES-AND-EXPORTS.md` | 1.9a (replace mode in the types), 1.9b (public builder surface, `stripInternal`), 1.9c (whitespace parity), 1.9d (missing exports); section 2 type-alias bullets (unused and duplicate aliases, `index: … \| null`) | |
| 8 | `PLAN-1.10-2-SMALL-FIXES.md` | 1.10 remaining bullets (`isLocatorInstance`, duplicate-registration error size, `remove` then `update`, steps on tombstones, `ensureSubPath` messages, `@step`, logger defect and enhancements); section 2 code bullets (unreachable branches, shadowed `isTerminalStep`, `getLocator` building a full builder, single-element helper, triple cloning); `debugSteps` is decided in plan 9 | |
| 9 | `PLAN-3-STRUCTURE.md` | 3.1 (strategy table), 3.3 (`describe` option, `debugSteps` or `explain`), 3.4 (strict chains), 3.5 (path reuse returns a builder), 3.8 (seed immutability) | |
| 10 | `PLAN-5-DOCS.md` | remaining section 5 bullets in `docs/v3` (overview, locator-registry, PageObject, logging, composing), README fixes allowed before release (typos, `@step` flavour, Node version), tick the AGENTS.md bullet (fixed 2026-10-06); any "Missing:" doc bullet closed by an earlier plan is ticked by that plan | |

Why this order: the three remaining verified bugs first (storage, registration and frames, page-object lifecycle),
then the packaging and CI plan so its `tsc` step and publish gate protect the refactors that follow, then types,
small fixes and dead code, the structural refactor last among code plans, and the documentation sweep at the end so
it describes the final shape. The Starlight site and the README repointing stay release work outside these plans.
