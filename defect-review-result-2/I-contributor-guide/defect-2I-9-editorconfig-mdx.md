# 2I-9: `.editorconfig` gives `.mdx` two-space indentation and says "as every such file here is", but the one `.mdx` page is indented with tabs

- **Kind**: documentation
- **Area**: the repository files the guide describes: `.editorconfig` (`docs/repository.md` map: "tabs for code and two spaces for YAML and Markdown")
- **Severity**: Low (an editor that follows the file indents new lines of the home page's JSX with spaces beside tab-indented ones; nothing processes `.mdx` for style, so nothing fails)
- **Semver of the fix**: none (repository configuration or one page's whitespace)
- **Pass**: 2
- **First review**: G-9: fixed incompletely (decision 34 added `mdx` to the space section without the one `.mdx` file following it; `1717edb`)
- **Reviewed**: `d850405`, 2026-10-28 20:13 +0100, Opus 5.5, second review, segment 2I

## Contract

G-9's expected behaviour, which decision 34 adopted: "`.editorconfig` describes the conventions the files follow, so an
editor does not produce what the repository rejects." Decision 34's reason: "every YAML and Markdown file in the
repository is indented with spaces". `.editorconfig` lines 1–2 (its own header): "code is indented with tabs, as biome
formats it; YAML and Markdown with two spaces, as every such file here is (a tab cannot indent YAML)".
`docs/repository.md` line 23 describes the file the same way.

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/I/run1/G-9/run.sh` (G-9's count, with `mdx` added), run
from anywhere; exit 0. Output (`run1/G-9/out.txt`):

```text
[*.{md,mdx}]
indent_style = space
indent_size = 2
yaml: 9 files, 0 with tab-indented lines, 9 with space-indented lines
yml: 1 files, 0 with tab-indented lines, 1 with space-indented lines
md: 114 files, 0 with tab-indented lines, 64 with space-indented lines
mdx: 1 files, 1 with tab-indented lines, 1 with space-indented lines
tab-indented md/mdx/yaml files:
website/src/content/docs/index.mdx
```

`website/src/content/docs/index.mdx` lines 25–29:

```text
	<LinkCard
		title="Locators"
		href="/POMWright/docs/locator-paths/"
		description="One locator per dot-delimited path, …"
	/>
```

(tabs at the start of each line; `grep -n -P '^\t' website/src/content/docs/index.mdx` lists them). The file has not
changed since `0a98954` (2026-10-22), before decision 34.

## Observed / expected

Observed: `[*.{md,mdx}]` asks for spaces and the header says every such file uses them; the only `.mdx` file uses tabs
for its JSX. Expected: `.editorconfig` matches the files it governs, as G-9's fix intended.

## Cause

Decision 34 counted `.md` and `.yaml` files (G-9's reproduction did not count `.mdx`) and wrote the section as
`{md,mdx}`.

## Fix plan

- Intended contract: `.editorconfig` describes how each kind of file here is indented.
- Options: (1) **recommended**: reindent `index.mdx`'s JSX with two spaces, matching the Markdown rule and the site's
  two-space examples (`website/AGENTS.md`); biome does not format `.mdx`, so nothing reverts it; check with
  `pnpm docs:build` that the home page renders the same. (2) Give `*.mdx` its own section with tabs and reword the
  header ("Markdown with two spaces; the MDX home page's JSX with tabs"). Cost: a second convention for one file.
- Docs: `.editorconfig`'s header; `docs/repository.md` line 23 holds with either.
- Changeset: none.
- Relation: was item 10 of 2I-7 in pass 1; moved here when pass 2 tied it to G-9.
