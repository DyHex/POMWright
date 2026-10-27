# Plan 2: `.editorconfig` for YAML and Markdown; the VS Code snippets file deleted

- **Decisions**: [DECISIONS.md](DECISIONS.md) #34, #35
- **Findings**: [G-9](G-ci-and-tooling/defect-G-9-editorconfig-tabs-everywhere.md),
  [R-1](report.md#r-1-the-pw-step-snippet-inserts-v1s-pocname)
- **Bump**: none (no changeset)
- **Stop**: no
- **Depends on**: nothing

## Contract

An editor that honours `.editorconfig` indents YAML and Markdown with two spaces, as every such file in the repository
is indented (a tab cannot indent YAML); code keeps tabs, biome's style. The VS Code snippets file, whose `pw-step`
snippet inserts v1's `pocName`, is gone; AGENTS.md §2 lists `.vscode/` as part of the repository.

## Current behaviour

- `.editorconfig` has one section, `[*]` with `indent_style = tab` and `indent_size = 2` (lines 7-9).
- `.vscode/` holds `extensions.json` (biome recommended), `settings.json` (biome formats on save) and
  `playwright-snippets.code-snippets`, whose output does not compile on 3.x (`…-probes/R/r1-pocName.out`). AGENTS.md §2
  has no row for `.vscode/`.

## Steps

1. `.editorconfig`: after `[*]`, add

   ```ini
   # YAML and Markdown: spaces, as every such file here is indented (a tab cannot indent YAML)
   [*.{yml,yaml}]
   indent_style = space
   indent_size = 2

   [*.{md,mdx}]
   indent_style = space
   indent_size = 2
   ```

   and reword the first comment to say what the file is for (editors and GitHub's display; code is indented with tabs,
   as biome formats it). No file is reformatted.
2. Delete `.vscode/playwright-snippets.code-snippets`.
3. AGENTS.md §2: a row `.vscode/` | "Contributor editor settings: `extensions.json` recommends biome's extension,
   `settings.json` formats and fixes with it on save." | yes. The `.editorconfig` row says "tabs for code, two spaces for
   YAML and Markdown".

## Tests

None (an editor setting and a deleted file). From plan 3 on, actionlint in the lint job fails a tab-indented workflow.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm lint` confirms biome ignores the new sections.

## Commit

```text
chore: spaces for YAML and Markdown in .editorconfig; drop the VS Code snippets

.editorconfig asked for tabs everywhere, while every YAML and Markdown file
is indented with spaces and a tab cannot indent YAML. The snippets file
inserted v1's pocName, which no page object has had since 2.0.

Plan: defect-review-result/PLAN-G-9-R-1-repository-hygiene.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27. As planned: `.editorconfig` with the two space sections and a reworded header comment; the snippets file
deleted (`git rm`); AGENTS.md §2's `.editorconfig` row and a new `.vscode/` row. Checks: `pnpm lint` 0 (160 files, one
fewer: biome had checked the snippets file); `pnpm test:unit` 782 passed; `pnpm pack-test --reporter=line` exit 0
(1,509 passed, 3 skipped; doc snippets 215; api coverage 0 problems; step locations 7). No site change, so no
`docs:build`.
