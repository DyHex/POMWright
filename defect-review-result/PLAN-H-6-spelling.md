# Plan 38: American spelling; *Organizing a project*

- **Decisions**: [DECISIONS.md](DECISIONS.md) #52
- **Findings**: [H-6](H-docs-readme-agents/defect-H-6-british-spellings.md)
- **Bump**: none (`package.json`'s description is metadata)
- **Stop**: no
- **Depends on**: every plan that edits pages (last among them, so the pages are edited once more only here)

## Contract

American spelling throughout (AGENTS.md §9): organizing, organizes, behavior, labeled, honors, recognize, synthesized,
serializes, and any British form this branch's own text brought in. `docs/organising-a-project.md` becomes
`docs/organizing-a-project.md`, titled *Organizing a project*, **without a redirect**: the old address stops working.
No spelling check is added; AGENTS.md §9 stays the guard.

## Current behaviour

21 British spellings in 15 files, `package.json`'s description ("organises") and one page's title and URL among them
(the finding's list). Links to the page: `website/sidebar.mjs:15`, `docs/page-objects-in-tests.md`,
`docs/locator-modules.md`, `docs/principles.md`, `docs/verifying-registries.md`, and the README's documentation list.

## Steps

1. Re-run the finding's search over `website/src/content/docs`, `README.md`, `AGENTS.md`, `package.json`, `src/` (doc
   comments) and `.changeset/` (the pending changesets are this release's notes), so text written by plans 1–37 is
   included; fix each (code identifiers and quoted Playwright text excepted; a quoted British name from elsewhere stays).
2. `git mv` the page; its `title`; the sidebar entry; every internal link; the README's link text and URL.
3. `pnpm docs:build`: the link check finds any link left.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
docs: American spelling throughout; Organizing a project at its new address

Plan: defect-review-result/PLAN-H-6-spelling.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- Step 1, the search re-run, wider than the finding's (endings in -ise, -ised, -isation, -our, -lled, -tre and a list
  of British words: artefact, colour, normalise, neighbouring, cancelling, …) over the pages, the snippets, the sidebar,
  the README, AGENTS.md, `package.json`, `src/` (not its tests), the changesets, `scripts/`, and the specs this branch
  added (`lifecycle.outcomes.spec.ts`, `test/lifecycle-outcomes/`): 68 replacements in 30 files. Beyond the finding's
  21: AGENTS.md (20: behaviour, labelled, organised, colours, artefacts), `src/` comments (labelled, serialises,
  serialised, serialisation, normalised, normalisation), three changesets (labelled, unlabelled, behaviour), the two
  check scripts (labelled, in `check-doc-snippets.mjs`'s message too; neighbouring), the README's "Cancelling" in
  prose, and `lifecycle.outcomes.spec.ts`' `LABELLED` constant and `"labelled"` marker (this branch's own).
- Left as they are: the README example's `"Cancelled"` status, which is the app's text; `aria-labelledby`, an HTML
  attribute (`locatorRegistrationBuilder.ts`, `class-registrationbuilder.md`); `normaliseOrigin`, an internal function
  name; the titles and comments of specs and unit tests written before this branch (outside the plan's list).
- Step 2: `git mv` to `docs/organizing-a-project.md`, its `title`, the sidebar entry, the links on four pages
  (*Locator modules*, *Page objects in tests*, *Principles*, *Verifying registries*) and the page's own link; the
  README names the page in its *Getting started* line only, as text, now "organizing a project". No redirect.
- Step 3: `pnpm docs:build` passed its link check; `website/dist/docs/organizing-a-project/` is built and nothing at
  the old address.
- Checks: `pnpm lint` 0; `pnpm test:unit` 900 passed; `pnpm pack-test --reporter=line` exit 0 (2,427 passed, 3
  skipped; doc snippets 226; api coverage 0 problems; error messages 0 problems; step locations 31); `pnpm docs:build` 0
  with its link check.
