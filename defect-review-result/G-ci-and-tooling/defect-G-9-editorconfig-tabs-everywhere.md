# G-9: `.editorconfig` asks for tabs in every file, including YAML, where a tab cannot indent, and the Markdown pages, whose examples AGENTS.md wants in two spaces

- **Kind**: defect
- **Area**: config, `.editorconfig`
- **Severity**: Low (an editor that follows EditorConfig indents a new line of a workflow with a tab, which breaks the
  file, or a doc example with tabs; lint does not see either: biome processes neither YAML nor Markdown)
- **Semver of the fix**: none (repository configuration)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #34](../DECISIONS.md))

## Contract

- `.editorconfig` lines 6-9: `[*]` `indent_style = tab`, `indent_size = 2`, "to ensure consistent display of code in
  GitHub".
- AGENTS.md §5: "Tabs, width 2, line width 120 (biome)" (code); §9: doc examples are "TypeScript with two-space
  indentation".
- YAML: a tab cannot start an indentation (the workflows, `dependabot.yml`, `pnpm-workspace.yaml`).

## Reproduction

What the repository's files use (`git ls-files`, a line starting with a tab or with spaces):

```text
yaml: 9 files, 0 with tab-indented lines, 9 with space-indented lines
yml: 1 files, 0 with tab-indented lines, 1 with space-indented lines
md: 112 files, 0 with tab-indented lines, 78 with space-indented lines
```

A workflow with one line indented as `.editorconfig` asks (a copy in
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/editorconfig/`):

```sh
cd /home/magdys/workspace/dyhex/POMWright-final-review-probes/G/editorconfig
cp /home/magdys/workspace/dyhex/POMWright-final-review/.github/workflows/pages.yaml .github/workflows/pages.yaml
sed -i 's/^  contents: read$/\tcontents: read/' .github/workflows/pages.yaml
../tools/actionlint -no-color .github/workflows/pages.yaml; echo "exit $?"
```

```text
.github/workflows/pages.yaml:15:0: could not parse as YAML: found character that cannot start any token [syntax-check]
actionlint exit 1
```

## Observed / expected

Observed: the one EditorConfig section covers every file with tabs; every YAML and Markdown file in the repository is
indented with spaces, and a tab in a workflow breaks it. Expected: `.editorconfig` describes the conventions the files
follow, so an editor does not produce what the repository rejects.

## Cause

`.editorconfig` has a single `[*]` section.

## Fix plan

- **Intended contract**: EditorConfig matches biome for code and the files' own conventions elsewhere.
- **Options**:
  - **(recommended)** Add `[*.{yml,yaml}]` and `[*.{md,mdx}]` sections with `indent_style = space` and
    `indent_size = 2`. Changes no file.
  - Narrow `[*]` to the file types biome formats.
- **Implementation steps**: `.editorconfig`.
- **Tests**: none (editor setting); actionlint in a PR would catch a broken workflow, but CI does not run actionlint.
- **Docs**: none.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] the sections: `[*.{yml,yaml}]` and `[*.{md,mdx}]`, spaces, width 2 ([DECISIONS.md #34](../DECISIONS.md))
- **Execution order**: independent.
