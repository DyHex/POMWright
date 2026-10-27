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

(filled in at execution)
