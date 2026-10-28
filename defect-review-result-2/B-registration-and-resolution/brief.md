# Segment 2B: Registration and resolution

Segment 2B of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set.

## The guide, read first

`AGENTS.md`, `src/AGENTS.md`, `src/locators/AGENTS.md` and `test/AGENTS.md`, in full, in the worktree.

## In scope

- **Source**: `src/locators/locatorRegistry.ts`, `locatorRegistrationBuilder.ts`, `reusableLocatorBuilder.ts`,
  `utils.ts`, `types.ts`, `index.ts`, `fakePage.ts`, and the registry parts of `src/pageObject.ts` (`add`,
  `getLocator`, `getNestedLocator`, `getLocatorSchema`, `defineLocators`, `strictChains`, the check after
  construction). Read all of it, with its doc comments. The query and update builders are 2C's; read them as far as
  resolution uses them.
- **Unit tests**: `src/locators/*.test.ts` except the query and update builders' own.
- **Harness**: `test/tests/locatorRegistry/` (`add/`, `registry/`, `validation/`, `getLocator/`, `getNestedLocator/`,
  `filter.cycle.spec.ts`), `test/tests/testApp/iframe.spec.ts`, `testIds.spec.ts`, `testPage.spec.ts`, the locator
  schemas under `test/page-object-models/`, and the registry parts of `test/tests/packaging/publicTypes.typecheck.ts`
  and `publicTypes.emit.ts`.
- **Docs** (under `website/src/content/docs/`): `docs/registering-locators.md`, `resolving-locators.md`,
  `reusing-locators.md`, `locator-paths.md`, `locator-modules.md`, `frames.md`, `locating-by-id.md`,
  `verifying-registries.md`; `api/class-locatorregistry.md`, `class-registrationbuilder.md`,
  `class-reusablelocator.md`; the registration, path and resolution sections of `api/errors.md`;
  `internal/builders.md`, `registry-records.md`, `resolution.md`, `strategies-table.md`, and the registry's part of
  `internal/performance.md`.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- src/locators src/pageObject.ts test/tests/locatorRegistry website/src/content/docs .changeset ':!defect-review-result'`,
narrowed to what touches registration and resolution. Read each diff and its changeset; the commits after `54cdada`
first.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- **Paths**: every rule a path must follow, at runtime and in the types: characters, empty and repeated segments, very
  long paths, wide `string` paths, template literal types, variables holding a path.
- **Registration**: every method before and after the call that ends a registration, a call that fails partway, and
  what the registry holds afterwards.
- **Copies and inputs**: inputs changed after they were passed, returned objects used again after later calls, inputs
  that are not plain literals (the skill's list).
- **Reuse**: `createReusable`, reuse by path, reuse across registries and page objects, and what a reused definition
  carries along.
- **Frames and ids**: `frameLocator`, the any-frame form, `getById` in every form, mixed in one chain.
- **Strategies**: every row of the `STRATEGIES` table against Playwright's own method and options, including what
  Playwright prints for the resulting locator.
- **Checks**: `verify()`, `strictChains` and the check after construction: what they catch, when, and with which message.
- **Messages and types**: every message the pages and the `@throws` show, character for character; the public types
  against the runtime.

## Pass 2: the first review

Its scope B: `defect-review-result/B-registration-and-resolution/`; the ledger rows of `defect-review-result/report.md`
whose area is registration, paths, reuse or resolution, their `DECISIONS.md` entries and their plans; the items
`PLAN-release-gates-and-audit.md` leaves for the second review in this area; the first `inventory.md`'s lines tagged
`[B]`. Probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/B/`.

## Neighbours

Queries and updates are 2C's, page objects' lifecycle and URLs 2D's, packaging 2F's, the docs-chain spec's mechanism
2T's (whether the chains the pages show are right is yours). Report what you meet there under *outside the segment*.
