# Scope B: Registration and resolution: summary

- **Scope:** segment B of the final whole-project review. Reviewed as an area, and the seven in-scope commits since `v3.0.1` (13017b7, bb03471, ffcc23f, 61e266c, 9dc8048, db26390, 2accf34) as a change set.
- **Code:** worktree `/home/magdys/workspace/dyhex/POMWright-final-review`, detached at `54cdada`.
- **Reviewer and date:** scope B reviewer (Claude), 2026-10-23.
- **Probes:** `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/`.
  - `lib.mjs` loads `dist/index.js` and chromium from the root package.
  - It renders a chain without its trailing description, because Playwright's `toString()` prints the description of a described locator.

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").

## What was read

- **Source, in full with doc comments:** `src/locators/locatorRegistry.ts`, `locatorRegistrationBuilder.ts`, `reusableLocatorBuilder.ts`, `utils.ts`, `types.ts` and `index.ts`.
  - Also the parts of `locatorQueryBuilder.ts` and `locatorUpdateBuilder.ts` (`parseUpdateArguments`) that registration uses.
  - Also `index.ts` and the page object's registry facade (`src/pageObject.ts:280-365`).
- **Unit tests:** the names and the relevant cases of the four in-scope files.
- **Harness:** the in-scope specs, classified by whether they import the source or the package. The iframe locator schema.
- **Docs:**
  - all seven in-scope Docs pages;
  - `class-locatorregistry`, `class-registrationbuilder` and `class-reusablelocator`;
  - in `types.md`: FilterDefinition, IndexSelector, LocatorSchemaPathFormat and LocatorSchemaPathArgument;
  - in `errors.md`: Paths, Registering, Reusing, Resolving and verifying, and Queries (for the any-frame text);
  - the Internal pages `registry-records`, `resolution`, `strategies-table`, `builders` and the `index` section;
  - the registration and resolution parts of `upgrading-from-2x`;
  - AGENTS.md in full.

## Coverage

**Reviewed fully:**
- `add` and the ten methods, steps and the any-frame form.
- Copies and `readFields`.
- Ended registrations: 4 builder kinds × 9 ending calls × every method (`p05`).
- First-argument rules: 10 strategies × registration, seed and seeded override × 6 values × one and two arguments (`p06`).
- Path rules, at runtime and in the types.
- Resolution: chains, terminal-only `has`/`hasNot`, cycles, frames, nested frames, any-frame in every position, `strictChains`, descriptions.
- `verify`.
- Reuse by path and by seed, including hand-made seeds.
- `getById`: strings, RegExps, shadow DOM, quirks mode.
- `createRegistryWithAccessors`.
- Every chain and message on the in-scope pages.
- The change set.

**Reviewed partly:**
- Declaration emit of registry results: TS4023 reproduced only.
- Performance claims: not measured.

**Not run:**
- Firefox and WebKit for my probes. Frames are covered by the baseline harness on all three browsers; `has` inside a frame was probed on chromium only.
- Node 20 and 22: no URL code is in scope.
- A `v3.0.1` worktree. Reading the tag's source showed that B-1 to B-4 already exist in `v3.0.1`, so no regression needed a run. B-1 is a gap left by 9dc8048's promise; B-5 is the sibling path of 2accf34's fix.

**Fix sketch:**
- `sketch-B1-B5.diff` was applied, built, and then reverted with `git checkout`, followed by `pnpm harness:install`.
- With it, the probes for B-1 to B-5 pass.
- `pnpm test:unit`, `pnpm typecheck` and 349 in-scope chromium specs passed (`sketch-*.log`).

**Worktree:** left clean, with the build from `54cdada`. The ignored files are as in baseline.md; port 9000 is free; no extra worktree.

## Decisions taken without asking

- IDs are numbered in the order the files were written. B-3's long-path probe actually ran before B-1's.
- `p06` reads stored records through the internal `registry.get()`, which ends no registration, to inspect state. Every finding reproduces through the public API.
- summary.md could not be written by this session; see the note at the top of the hand-back.

## Test gaps, most important first

1. Own non-enumerable option or filter properties (B-1).
2. A locator method that fails when it persists, followed by a second call on the same registration (B-2). Today's unit tests cover a wrong-type override, a second override and a second strategy only.
3. Reuse by a union-typed or wide path variable (B-4).
4. Type-level path rules:
   - `validation.locatorSchemaPath.typecheck.ts` tests only the ASCII space;
   - no long-path case (B-3);
   - the runtime whitespace list is covered by `utils.test.ts`.
5. `locator()`'s `has`/`hasNot` option with a `getLocator` call inside the `add` chain (B-5).
6. These run against the source (`LocatorRegistryInternal`), not the packed package: reuse by path and by seed, frames (`add.frameLocator`), `getById`, cycles, `verify`, `getLocator` and `getNestedLocator`.
   - Package-level coverage comes only through the testApp page objects (iframe, testIds, testFilters), `add.validation`, `add.registrationEnds`, `add.get.clone` and the `registry.*` specs.
7. No test checks the rename claim (B-6). `p11-rename.cjs` could become one.

## What is sound (path probed)

- **Docs chains and messages** reproduce exactly from the build (`p01`, `p02`, `p07`, `p03`, `p12`). This covers:
  - all in-scope pages, including the strict-mode texts in `resolving-locators` and `frames`;
  - the TypeScript messages in `types.md` and `locator-paths.md`;
  - the find-and-replace regexes;
  - the record shown in `registry-records`;
  - the `verify` outputs.
- **Copies** (`p04`). The paths covered are `add` options, filters, a `has` Locator (kept), a seed's definition and its getters, a seeded override, `createReusable` options and hand-made seeds. On all of them:
  - prototypes, class getters, frozen objects, symbol keys and null-prototype objects are read as Playwright reads them;
  - a `compile()` or other change after the call alters nothing;
  - `g`/`y` RegExps give stable counts across repeated resolution.
  The exception is B-1.
- **Ended registrations** (`p05`): every ending call ends the registration and the message names it. `createReusable` does not end one, which matches the docs' list, AGENTS.md §5 and the unit test.
- **First-argument rules** (`p06`): the documented message and the stored record every time. A throwing call leaves the registry and the builder usable, except for the persist case (B-2).
- **Paths:**
  - all 26 whitespace characters are rejected by both the type and the runtime;
  - U+200B, U+180E and U+2060 are accepted by both;
  - empty paths and leading, trailing and consecutive dots agree.
- **Resolution** (`p02`, `p07`):
  - `has`/`hasNot` resolve terminal-only, including inside a frame chain;
  - cycles through `has`, `hasNot` and reuse are reported;
  - frames with `nth` and `filter({ visible })`/`last`, and nested frames;
  - the any-frame locator finds content in the main frame and in nested frames;
  - any-frame followed by a frame with a selector;
  - a misplaced any-frame (middle, terminal, `has`) is rejected;
  - `strictChains`;
  - the default description is the path;
  - `nth(undefined, null, NaN, 1.5, -1, 99)` behaves exactly as Playwright;
  - `verify` passes on a closed page and with a selector that does not parse.
- **`getById`** (`p02`, `p15`, `p16`, `p17`):
  - string ids with quotes, backslash, LF, CR, FF, tab, NBSP and emoji;
  - RegExps behave identically to `getByTestId`, including its limit with the `u` flag and `>>`;
  - open versus closed shadow roots;
  - case-sensitive in quirks mode;
  - the `y` flag anchors.
- **db26390:** an undefined first argument compiles on all ten seeded methods; registration and `createReusable` still reject it (`p08`).
- **Upgrade guide:** the TS4023 claim reproduces (`p13`).
- **Code rules:** no per-strategy `switch`, and no thenables in `src/locators`.

## Outside the scope

- **TS2883 under pnpm** when an exported function returns `seed.definition` of an untyped `ReusableLocator<Paths>` (`p14-seed-props-emit.ts`). The cause is that Playwright's `Locator` from playwright-core cannot be named. This is a Playwright type-portability matter, not POMWright's; for scope F's information.
- Nothing else found in the neighbours. The page object facade is guarded against re-entry.

## Index

| ID | Kind | Severity | Semver | File | Summary |
| --- | --- | --- | --- | --- | --- |
| B-1 | defect | Low | patch | defect-B-1-own-non-enumerable-option-dropped.md | Own non-enumerable option or filter properties are dropped; Playwright reads them. |
| B-2 | defect | Low | patch | defect-B-2-failed-locator-method-keeps-definition.md | A locator method that throws at registration keeps its definition; the next call reports the wrong cause. |
| B-3 | defect | Low | patch | defect-B-3-long-path-literal-ts2589.md | Path literals of 999 or more characters fail with TS2589; the runtime accepts them. |
| B-4 | defect | Low | patch | defect-B-4-reuse-path-variable-rejected.md | Reuse with union-typed or wide path variables does not compile, with a misleading error. |
| B-5 | defect | Low | patch | defect-B-5-has-option-ended-message.md | A `getLocator` in `locator()`'s `has` option gets the generic ended-registration advice. |
| B-6 | documentation | Low | none | defect-B-6-rename-skips-has-paths.md | The rename from a use does not reach `has`/`hasNot` paths, contrary to two pages. |
| B-7 | documentation | Low | none | defect-B-7-errors-page-gaps.md | `errors.md` leaves out the hand-made seed's "reuse requires …" messages and the registration's any-frame step message. |
