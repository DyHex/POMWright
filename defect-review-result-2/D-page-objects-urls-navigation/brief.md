# Segment 2D: Page objects, URLs and navigation

Segment 2D of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set.

## The guide, read first

`AGENTS.md`, `src/AGENTS.md`, `src/helpers/AGENTS.md`, `src/locators/AGENTS.md` (as far as page objects use the
registry) and `test/AGENTS.md`, in full, in the worktree.

## In scope

- **Source**: `src/pageObject.ts` (all but session storage), `src/helpers/url.ts`, `navigation.ts`, `thenable.ts`, and
  `callSite.ts` as the check after construction uses it. Read all of it, with its doc comments.
- **Unit tests**: `src/pageObject.test.ts`, the URL and navigation tests, and the check-site parts of
  `callSite.test.ts`.
- **Harness**: `test/tests/pageObject/` (`lifecycle.spec.ts`, `lifecycle.outcomes.spec.ts` with
  `test/lifecycle-outcomes/` as far as the table it checks, `urls.spec.ts`, `verify.spec.ts`, `actions.spec.ts`,
  `callSite/checkSite*`), `test/tests/testApp/testNav.spec.ts`, `testPath.spec.ts`, `color.spec.ts`, `urlForms.spec.ts`,
  `urlHosts.spec.ts`, the page objects under `test/page-object-models/testApp/` (`testApp.base.ts`, `testnav/`,
  `testPath/`), and the page object and URL parts of `test/tests/packaging/publicTypes.typecheck.ts`.
- **Docs** (under `website/src/content/docs/`): `docs/page-objects.md`, `first-page-object.md`,
  `page-objects-in-tests.md`, `urls-and-navigation.md`; `api/class-pageobject.md`, `class-navigation.md`; the page
  object, URL and navigation sections of `api/errors.md`; `internal/page-object-lifecycle.md`, `url-matching.md`, and
  the check-site part of `internal/call-sites.md`.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- src/pageObject.ts src/helpers/url.ts src/helpers/navigation.ts src/helpers/thenable.ts src/helpers/callSite.ts test/tests/pageObject test/tests/testApp test/lifecycle-outcomes website/src/content/docs .changeset ':!defect-review-result'`,
narrowed to what touches page objects, URLs and navigation. Read each diff and its changeset; the commits after
`54cdada` first.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- **URLs**: every form of `baseUrl` and `urlPath` the docs allow (strings, RegExps, placeholders), with the characters,
  credentials, ports, hosts, query and hash forms the skill lists, through `fullUrl`, `goto`, `expectThisPage` and
  `expectAnotherPage`, on the three browsers and on Node 20, 22 and 24.
- **Navigation**: each method with each option and each URL form; what it waits for; what it reports when it fails.
- **Lifecycle**: construction, `defineLocators` (sync and async), the check after construction and its timing, a
  failure partway, subclass chains, and what the outcomes table on *Page objects* says happens in each case.
- **Call sites**: where an error raised at construction or at the check is reported.
- **Messages and types**: every message the pages and the `@throws` show, character for character; `NavigationFor`
  and the `*TypeFromOptions` helpers against the runtime.

## Pass 2: the first review

Its scope D: `defect-review-result/D-page-objects-urls-navigation/`; the ledger rows of `defect-review-result/report.md`
whose area is page objects, URLs or navigation, their `DECISIONS.md` entries and their plans; the items
`PLAN-release-gates-and-audit.md` leaves for the second review in this area; the first `inventory.md`'s lines tagged
`[D]`. Probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/`.

## Neighbours

Session storage is 2A's, the registry 2B's, steps and their locations 2E's, the lifecycle-outcomes run as a mechanism
2T's. Report what you meet there under *outside the segment*.
