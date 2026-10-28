# Segment 2I: The contributor guide

Segment 2I of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/I/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set.

The guide was split on 2026-10-28 into the root `AGENTS.md`, six folder files and `docs/`. No review has read it in
this form.

## The guide, read first

All of it, in full, in the worktree: `AGENTS.md`, `src/AGENTS.md`, `src/locators/AGENTS.md`, `src/helpers/AGENTS.md`,
`test/AGENTS.md`, `website/AGENTS.md`, `.github/AGENTS.md`, `docs/repository.md`, `docs/versioning.md`,
`docs/releases.md`.

## In scope

- **The ten files above**, as a guide: does every statement still describe the repository at `d850405`?
- **The repository files the guide describes**: `.editorconfig`, `biome.json`, `.gitignore`, `.vscode/`,
  `tsconfig.json`, `tsconfig.vitest.json`, `pnpm-workspace.yaml`, the `scripts` of `package.json`, the top-level layout.
- **The Internal pages' claims about the guide** (`website/src/content/docs/internal/index.md` and
  `internal/documentation.md`), and the README's *Contributing*.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- AGENTS.md '*/AGENTS.md' '*/*/AGENTS.md' docs .editorconfig biome.json .gitignore .vscode tsconfig.json pnpm-workspace.yaml package.json ':!defect-review-result'`.
Read each diff; the commits after `54cdada` first. Where a rule moved between files in the split, check that it
arrived whole.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- **Accuracy**: every command run as written (the cheap ones; cite the baseline for the rest), every path, count, list
  and version against the repository, the public API list against `index.ts`.
- **The index**: the table's rows against the files; the loading claims for Claude Code and for Codex against those
  tools' own documentation (read it on the web; do not start another agent or session to test it).
- **Placement**: the maintainer's rule that a rule relevant to more than one area is never stated only in one folder's
  file; a rule stated twice that has drifted; two files that contradict each other.
- **The guide against practice**: the release and plan rules against how this branch's work was actually organized
  (the commits, the changesets, the working folders it names), and the *Do not* lists against the repository.
- **Reach**: would a contributor (human, Claude Code, Codex) who reads what the index tells them to read before a given
  task meet every rule that task needs?

## Pass 2: the first review

The contributor-guide findings of its scope H (`defect-review-result/H-docs-readme-agents/`, those about `AGENTS.md`)
and of other scopes that touched the guide; the ledger rows of `defect-review-result/report.md` whose area is the
guide, their `DECISIONS.md` entries and their plans (`PLAN-agents-split.md` among them); the items
`PLAN-release-gates-and-audit.md` leaves for the second review in this area; the first `inventory.md`'s *contributor
guide* lines. Probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/`.

## Neighbours

What each area's rules say is right or wrong is the area segment's; this segment checks that the guide holds together
and matches the repository. Report what you meet elsewhere under *outside the segment*.
