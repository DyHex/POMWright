# Plan: the contributor guide and the CI pages

- **Decisions**: [82, 107 (points 1 to 3), 108 (point 1), 109, 110, 111 (points 1 and 2), 112 (point 1)](DECISIONS.md)
  (2026-10-29)
- **Findings**: [2I-2](I-contributor-guide/defect-2I-2-rules-their-trigger-does-not-reach.md) (Medium),
  [2I-1](I-contributor-guide/defect-2I-1-dev-dependency-rule-in-src.md),
  [2I-8](I-contributor-guide/defect-2I-8-subfolder-files-do-not-point-to-src.md),
  [2G-3](G-ci-release-publishing/defect-2G-3-pages-every-merge-claim.md),
  [2G-5](G-ci-release-publishing/defect-2G-5-ci-descriptions-lag-the-jobs.md),
  [2H-1](H-docs-site-readme/defect-2H-1-documentation-page-ci-sentence.md),
  [2I-3](I-contributor-guide/defect-2I-3-claude-code-loading-claim.md),
  [2I-5](I-contributor-guide/defect-2I-5-working-folder-rules-vs-practice.md),
  [2I-6](I-contributor-guide/defect-2I-6-plan-reference-left-in-a-spec.md),
  [2I-7](I-contributor-guide/defect-2I-7-guide-statements-that-do-not-match.md),
  [2I-9](I-contributor-guide/defect-2I-9-editorconfig-mdx.md),
  [2T-8](T-tests-and-checks/defect-2T-8-base-config-comment-stale-again.md),
  [2F-3](F-packaging-types-changesets/defect-2F-3-migration-hint-rule-names-2x.md),
  [2H-2](H-docs-site-readme/defect-2H-2-misspelt-british-spelling.md), 2Z-3 (`report.md`, section 5)
- **Bump**: none (the guide, pages, comments; `.changeset/trusted-publishing.md`'s wording, unreleased)
- **Stop**: **yes**, after step 3's commit: it changes comments in `pages.yaml`, `main.yaml` and `pr.yaml` (no job), so
  the maintainer pushes and checks the run; built after the code plans and the upgrade guide, since the guide describes
  their result
- **Depends on**: every plan before it; the checks plan's link check (decision 112) runs over this plan's pointers

## Contract

The guide routes every task to the rules it triggers, matches the repository, and keeps what rule 7's cleanup would
otherwise delete; the CI pages describe the jobs as they run.

## Implementation (one commit per step)

1. **Routing (decision 82, point 1).** The root index's `website/AGENTS.md` row also names "changing anything a page or
   doc comment describes: behavior, a message, chain or rendering, a mechanism or a design (most changes under `src/`
   and `.github/`)"; `src/AGENTS.md` *Rules held elsewhere* says the same; `.github/AGENTS.md` points to *Internal →
   Tests and checks* and *Internal → Documentation* and the rule that a workflow change updates them.
2. **The gaps (decision 82, points 2 and 3).** `docs/versioning.md`: a Node-floor bullet (`engines`, what moves with it:
   CI's `harness-node` matrix, the `consumer` job's Node, the README and *Installation*; the manual `EBADENGINE` check
   before the release) and the Playwright bullet's eight places (the root keeps its floor with the reasons, listed);
   `src/locators/AGENTS.md` points to the benchmark rerun; `test/AGENTS.md` *Do not* has the whole item (a second build
   in a harness job, `POMWRIGHT_TARBALL`); both dependency rules move to `docs/repository.md` *Toolchain*, with a
   pointer in `src/AGENTS.md`; the root's fallback reads "the folder's file and those of the folders above it"; the
   intros of `src/locators/AGENTS.md` and `src/helpers/AGENTS.md` name `src/AGENTS.md`.
3. **The CI pages (decision 107, points 1 to 3).** The tip rule in `.github/AGENTS.md`, *Internal → Documentation* and
   `pages.yaml`'s comments (a green commit `main` moved past is not deployed; a manual run builds the commit it was
   started on); `main.yaml`'s concurrency comment as GitHub guarantees it; *Tests and checks* lists the test-server job;
   `pr.yaml`'s header: Node 20 and 22; *Internal → Documentation* names each docs check per job. **Stop** after this
   commit.
4. **The guide's corrections (decision 109).** 2I-3 (the Read tool, under the working directory; the wider fallback, in
   the root, its index's column and `docs/repository.md`); 2I-6 (`registry.verify.spec.ts`'s comment; rule 7's audit
   gains the `git grep` for references to a working folder, a plan or a decision); 2I-7 (the twelve statements, item by
   item, each re-checked against the files as the plans left them); 2I-9 (`index.mdx` reindented with two spaces);
   2T-8 (`playwright.base.ts`'s header: the two configs that build on it and the three that do not); 2F-3 (the
   changeset rule: "code written against the previous release"; beside it, *Upgrading from 2.x* describes the upgrade
   to the latest 3.x, and a change that alters what a 2.x project must do updates it in the same plan).
5. **Planning from a review (decision 110).** *Planning* in `docs/releases.md` gains *From a review's findings* (about
   fifteen lines, as the decision lists), linking the `defect-review` skill.
6. **The release's lasting rules (decisions 111 and 112).** *Carrying out a release*: npm publishing access "Require
   two-factor authentication and disallow tokens"; the Version Packages pull request's checks wait for the maintainer's
   approval; "no npm token is stored" becomes "the workflow uses no npm token" in `.github/AGENTS.md`, `publish.yaml`'s
   comment and `.changeset/trusted-publishing.md`; the after-merge issue's draft (decision 111) finalized from the first
   review's records for the maintainer to file.
7. **The final pass (decision 108).** "misspelt" → "misspelled" on four pages and in `LocatorSchemaPathArgument`'s doc
   comment; "initialiser" → "initializer" on *Internal → Page object lifecycle* and in `src/pageObject.test.ts`'s title;
   a sweep of the edited files for the British forms the review swept.

## Verification

- **Tracing**: five tasks followed through the index and the pointers, as Claude Code and as a client that loads only
  the root: a mechanism change in `src/helpers/`, moving the Node floor, a workflow change, a new dev dependency in
  `website/`, planning a release from a review. Each must reach every rule it triggers.
- The guide's link check (the checks plan) passes; `pnpm lint`; `pnpm docs:build`; actionlint (step 3);
  `pnpm test:unit` (step 7's test title); the grep for the external consumer projects' names; the `git grep` of step 4
  over the repository outside the review folders, which must find nothing.

## Decisions checklist

- [x] Decision 82: routing where it always loads; the gaps; the root keeps its Playwright floor
- [x] Decision 107, points 1 to 3: the tip rule; the test-server job; Node 20 and 22; the checks per job
- [x] Decision 108, point 1: American spelling, last
- [x] Decision 109: 2I-3, 2I-6, 2I-7, 2I-9, 2T-8, 2F-3 with the upgrade page's rule
- [x] Decision 110: *From a review's findings*
- [x] Decision 111, points 1 and 2, and 112, point 1: the publishing-access rule, the approval sentence, the wording;
  the issue's draft finalized

## Execution

Seven commits, one per step, `docs: …` or `chore: …`, with `Plan: defect-review-result-2/PLAN-2I-contributor-guide.md`
and the `Co-Authored-By:` trailer; a stop after step 3. The maintainer pushes.
