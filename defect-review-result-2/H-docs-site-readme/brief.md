# Segment 2H: The documentation as a whole and the README

Segment 2H of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/H/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set.

The area segments checked their own pages item by item. This segment reads the documentation as a user and as a
contributor would: across pages, from the README in, and the pages no area owns.

## The guide, read first

`AGENTS.md` and `website/AGENTS.md`, in full, in the worktree; then the other guide files as far as the site cites them.

## In scope

- **The README** in full.
- **The pages no area owns** (under `website/src/content/docs/`): `index.mdx`, `docs/installation.md`,
  `principles.md`, `organizing-a-project.md`, `upgrading-from-2x.md`, `typescript.md` (with 2F), `api/index.md`,
  `internal/index.md`, `internal/documentation.md`.
- **Every page, across pages**: two pages that state one contract differently; a broad claim ("every", "always",
  "identical to Playwright") against the narrower contracts; what a new user needs that no page says; the order a reader
  meets things in; links and anchors.
- **The site itself**: `website/astro.config.mjs`, `sidebar.mjs`, `plugins/expressive-code-cut.mjs`, `snippets/`,
  `components/`, `styles/`, `content.config.ts`; the built site in `website/dist/` (the baseline built it and rendered
  every diagram); `pnpm -C website preview` where rendering matters.
- **Examples**: beyond compiling (2T checks the snippet check), run a sample of the examples end to end against the test
  server and see that they do what the text around them says.
- **The upgrade guide**: against 2.x's real behaviour (tag `v2.1.0` or the latest 2.x tag; a second worktree, see
  *Base and head*) and 3.0.2's.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- README.md website ':!defect-review-result'`.
Read each diff; the commits after `54cdada` first.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- Does the README agree with the site, and the site with itself?
- Does each example, run, do what the page says, and show the output the page shows?
- Does the upgrade guide cover every change a 2.x user meets, with code that compiles before and after?
- Do the language conventions the guide states hold across the pages?
- Does the site build, render and link as `website/AGENTS.md` says, in light and dark?

## Pass 2: the first review

Its scope H: `defect-review-result/H-docs-readme-agents/` (the site and README findings; its contributor-guide findings
are 2I's); the ledger rows of `defect-review-result/report.md` whose area is the documentation as a whole, their
`DECISIONS.md` entries and their plans; the items `PLAN-release-gates-and-audit.md` leaves for the second review in this
area; the first `inventory.md`'s *Documentation* lines and those tagged `[H]`. Probes:
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/`.

## Neighbours

Each area's pages are the area segment's, the docs checks 2T's, the contributor guide 2I's. Report what you meet there
under *outside the segment*.
