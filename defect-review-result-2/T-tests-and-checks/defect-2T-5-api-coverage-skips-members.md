# 2T-5: The API coverage check never walks a class's static members, and walks fewer members without a word when the declarations it is given cannot resolve `@playwright/test`

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 99 in [DECISIONS.md](../DECISIONS.md) (statics walked; an unresolved import fails); planned in the checks plan
- **Area**: documentation checks: `scripts/check-api-coverage.mjs`
- **Severity**: Low (no static member is public today, and every CI job installs the root so the default path resolves;
  the check would pass an undocumented static member, or a declarations file checked from elsewhere, while reporting
  0 problems)
- **Semver of the fix**: none (tooling only)
- **Pass**: 1
- **First review**: missed by the first review (at 54cdada the walk is the same `getDeclaredTypeOfSymbol` and the
  program the same `skipLibCheck` one; G's probes linked `node_modules` beside their copies, so Playwright resolved;
  8eda398 reworked the `@see` rules after it)
- **Reviewed**: `d850405`, 2026-10-28T18:37+01:00, Opus 5.5, second review, segment 2T

## Contract

- `scripts/check-api-coverage.mjs:4-12`: "Every public or protected member of an exported class, interface or object type
  has a `### member` heading ... Every export, every such member and every class constructor has a doc comment with a
  summary ... Every export, every method, every property of a class and every class constructor has a `@see`".
- `scripts/check-api-coverage.mjs:20`: `node scripts/check-api-coverage.mjs [declarations]   # default: the installed
  package, .pack/pomwright/dist/index.d.ts`; `website/AGENTS.md`: "a path argument overrides it".
- `website/AGENTS.md`, *Rules*: "every export and every public or protected member has a summary, `@param` for each
  parameter, ... and a `@see` with its API page".

## Reproduction

Probes in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/api-coverage/`. Each mutation is applied alone to
a copy of `.pack/pomwright/dist/index.d.ts`, and the check, unchanged in the worktree, is pointed at the copy.

1. Static members (`mutate.mjs`, copies in the probes folder):

   ```sh
   node /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/api-coverage/mutate.mjs /home/magdys/workspace/dyhex/POMWright-second-review /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/api-coverage
   ```

   exit 0; per mutation:

   ```text
   == an undocumented public static method on SessionStorage: exit 0
      api coverage: 40 exports, 105 members, 134 site links, 0 problems
   == an undocumented public static property on SessionStorage: exit 0
      api coverage: 40 exports, 105 members, 134 site links, 0 problems
   == an undocumented public instance method on SessionStorage: exit 1
      no summary: SessionStorage.keys / no @see: SessionStorage.keys / no heading: SessionStorage.keys in the section of SessionStorage (class-sessionstorage.md)
   ```

   The mutations add `static fromPage(page: Page, label: string): SessionStorage;` and `static defaultLabel: string;`
   with no doc comment. The same run catches a removed `@see` and a `@see` pointing at another heading (control rows in
   the output). From the resolving location (`mutate2.mjs`, below), a static method with a full doc comment is noticed
   only through its `@see` URL naming a missing heading; with a `@see` to an existing heading it would pass too.
2. Members lost when `@playwright/test` does not resolve:

   ```sh
   P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/api-coverage
   node scripts/check-api-coverage.mjs $P/unresolved.d.ts      # a copy, no node_modules above it
   node scripts/check-api-coverage.mjs $P/resolving/index.d.ts # the same copy beside a node_modules link
   node scripts/check-api-coverage.mjs                         # the installed package
   ```

   all exit 0:

   ```text
   api coverage: 40 exports, 105 members, 134 site links, 0 problems
   api coverage: 40 exports, 108 members, 134 site links, 0 problems
   api coverage: 40 exports, 108 members, 134 site links, 0 problems
   ```

   `members.mjs` (the check's walk, printed) shows the three: `diff` of the resolving and the unresolved lists is
   `FilterDefinition.hasNotText`, `FilterDefinition.hasText`, `FilterDefinition.visible`. The compiler reports no
   diagnostic for the unresolved import (`skipLibCheck`, a declarations file).

## Observed / expected

Observed: (1) the walk takes `checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))`, the instance side
of a class, so a public static method or property is never checked for a summary, a `@param`, a `@see` or a heading;
(2) when `import ... from "@playwright/test"` in the given declarations does not resolve, the types built from
Playwright's (`FilterDefinition` picks fields of Playwright's filter options) lose their members, and the check passes
with fewer members, saying nothing.

Expected: every public or protected member, static ones included, is held to the rules; a declarations file whose
imports do not resolve fails the check (or is refused) rather than being checked in part.

## Cause

`scripts/check-api-coverage.mjs:112-151` (the instance type only) and `:40` (`ts.createProgram` with
`skipLibCheck: true`, its diagnostics never read, so an unresolved module is silent).

## Fix plan

- **Intended contract**: the rules apply to every public or protected member, static or not, and the check reads only
  declarations whose imports resolve.
- **Options**:
  1. (recommended) Walk `checker.getPropertiesOfType(checker.getTypeOfSymbol(symbol))` for a class as well (skipping
     `prototype`), with the static members' headings under the same section; and before walking, resolve each import of
     the declarations (`program.getResolvedModule` or `ts.resolveModuleName` for the `import` declarations of the file)
     and fail with "cannot resolve @playwright/test from <path>; install the root first" when one does not. Cost: a few
     lines; no change on the site today (no static members; every job installs the root).
  2. Narrower: refuse a path argument outside the repository, and document that the check needs the root's install.
     Cost: the argument becomes less useful; statics stay unchecked.
- **Implementation steps**: `scripts/check-api-coverage.mjs`, the export loop and the program setup.
- **Tests**: rerun `mutate.mjs` (the static rows must exit 1) and the unresolved copy (must exit 1 with the message).
- **Docs**: the script's header; `website/AGENTS.md` (the coverage check's sentence) if option 2.
- **Changeset**: none.
- **Decisions to tick**: none.
