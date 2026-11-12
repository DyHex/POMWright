# PLAN-7-SITE: the Skills tab on the documentation site

Status: **Q1 to Q5 answered and the go given 2026-11-12 (below); widened 2026-11-12 to `defect-review` (the
maintainer: "update plan 7 to include defect review skill"), rewritten that day (da4bd1b); built 2026-11-12.** From PLAN-0 (decision 5: a fourth topic in
`website/sidebar.mjs`, presenting each skill and linking it; the tab last), DECISIONS.md S5b (`defect-review` listed
apart once it is generalized) and the README's goal 5 (a Skills tab like aihero.dev's skill pages, after testing).

## What the site has now (read 2026-11-11)

- Three topics in `website/sidebar.mjs` (Docs, API, Internal), from `starlight-sidebar-topics`, shown as tabs beside the
  title by `src/components/SiteTitle.astro`, which maps every topic, so a fourth topic needs no component change. The
  tabs hide below 50rem.
- Starlight 0.42.6; its icon set has `puzzle` (`dist/schemas/icon.d.ts`).
- `website/AGENTS.md` and *Internal → Documentation* say "three sections"; `skills/README.md` holds the table of
  skills, the install commands and how the skills are kept true; no site page mentions the skills except *Internal →
  Documentation* (the snippet and chain checks).
- aihero.dev, the model (read 2026-11-11): `/skills` holds installation once, for the whole set (`npx skills add`,
  then the Claude Code plugin), and the groups; each skill has a short page with fixed sections: *What it does*, *When
  to reach for it*, advice, *It's working if*, *Common questions*, *Where it fits*. No install command per skill.

## What changes

- `website/sidebar.mjs`: a fourth topic, last: `{ label: "Skills", link: "/skills/", icon: "puzzle", items: [...] }`.
- `website/src/content/docs/skills/`, Markdown pages by the site's rules (a `title`, a quoted `description`,
  root-absolute links with the base, plain sentences, no marketing):
  - `index.md`, **Agent skills**: what a skill is (the Agent Skills format, linked), the skills (a table: skill, how it
    starts, what it does, its page), installation once for all (`npx skills add DyHex/POMWright`, the options, and
    the folders per agent for a copy by hand), requirements, `POMWRIGHT.md` in one paragraph linking the `pomwright`
    page, and how they are kept true and tested, in a sentence or two with no scores (Q2).
  - `pomwright.md`, `pomwright-map-site.md`, `pomwright-teach.md`, one per skill, short and concise (the maintainer,
    Q2): *What it does*, in a few sentences; *When to use it* (the tasks it is for, and how it starts: by itself from
    the description's triggers, or "only when you run it", with an example request or two); *How it works* (what it
    asks first: `pomwright` the version and `POMWRIGHT.md`, the decisions, all open questions in one message, with what
    the project does now beside each default; `map-site` the origin, the pages, a login; `teach` the workspace and what
    to learn; then what it writes, or that it writes nothing); *Install and source* (one line linking the index's
    installation, and the skill's folder on GitHub at `main`).
  - The `pomwright` page also presents `POMWRIGHT.md`: what it records, where it lives, the template linked on GitHub,
    the decisions asked once. Its defaults stay in the skill (one home per fact); the page links them.
  - `defect-review.md`, the same four sections, listed apart from the POMWright skills (S5b): in the index, a
    table of its own under *Other skills*, and in the sidebar a group of its own. Its page says it is general (any
    kind of system, not only POMWright projects), that it starts only when the user runs it, the profile it writes
    first, that it changes nothing, and that it asks who runs its segments and whether to cap their cost. Its eval
    (PLAN-DEFECT-REVIEW-EVAL) has not run: the page states no results, as for the others (Q2).
- Links into the tab, one line each: the home page (`index.mdx`) and *Installation* (for a project worked through an
  agent). See Q4. *Locator paths*' naming paragraph (PLAN-2D, 113c94b) links the `pomwright` page, where a project
  records its own convention.
- `skills/README.md`: keeps the table and the install command, which GitHub and `npx skills` users read there, and
  links the tab for the rest. See Q5.
- The contributor guide: `website/AGENTS.md` (*Files*, *Rules*: four sections, `skills/` to install and use the agent
  skills), *Internal → Documentation* (the same), `skills/AGENTS.md` (*Changing a skill*: a change to what a skill
  does or how it starts updates its page on the Skills tab in the same change), and `docs/repository.md`'s `skills/`
  row, which says "not on the site yet".
- The root `README.md`: a short *Agent skills* section (two or three sentences: what the skills do, and links to the
  Skills tab and to `skills/` on GitHub). The maintainer, 2026-11-12.
- **The skills never ship in the `pomwright` package** (the maintainer, 2026-11-12). `package.json#files` is
  `dist/**`, `README.md`, `LICENSE` and `CHANGELOG.md` (read 2026-11-12), so `skills/` is not packed; this plan adds
  nothing to it, and the README links the skills rather than holding them. Checked at execution: `npm pack --dry-run`
  lists no `skills/` file.
- No changeset: the site, the contributor guide and a README section with links only, nothing a consumer's code does
  (PLAN-0, *Versioning*; as PLAN-2D's Q1).

## Facts the pages state, and where each is checked

- Each skill's triggers and requirements are copied from its frontmatter (`description`, `compatibility`,
  `disable-model-invocation`); what it creates, from its `SKILL.md`; the install commands, from `skills/README.md`, run
  once more against the skills CLI before the page states them (`npx skills add DyHex/POMWright --list`, or the
  CLI's current equivalent).
- No TypeScript blocks are planned; any that a page needs is compiled by the snippet check. No rendered chains, so
  `docsChains.spec.ts` gains no test; if a page shows one, it gains its test.
- `pnpm docs:build` checks every internal link and anchor; links to GitHub are external and checked by opening them
  once, after the merge (the skills are on `main` only then).

## Execution

1. Re-read the skills' frontmatter and `skills/README.md`; check the install commands against the skills CLI.
2. The topic and the four pages; the links from the home page and *Installation* (Q4).
3. `skills/README.md` (Q5); the root README's *Agent skills* section; `website/AGENTS.md`, *Internal →
   Documentation*, `skills/AGENTS.md`.
4. Checks: `pnpm docs:build` (links and anchors), `pnpm docs:preview` and a look at the tab on desktop and phone width
   (the tabs hide below 50rem, so the sidebar's topic switcher is the way there), `pnpm lint`, `pnpm lint:guide`,
   `node scripts/check-doc-snippets.mjs`, `npm pack --dry-run` (no `skills/` file), the private-name grep.
5. One commit.

## The recommended effort (the maintainer, 2026-11-11)

The Skills tab states the effort level to run the skills at, high, in a sentence: the evals ran at high, and the
effort probe and matrix 2 say why (low, medium and the default ran away or broke on a reasoning task where high and
xhigh answered in seconds). No other effort is evaluated (the maintainer, 2026-11-12: high only). Written from the
final reports, not from this note.

## Questions for the maintainer

Answered 2026-11-12:

- **Q1**: "Skills", last, as recommended.
- **Q2**: keep testing to a short note. What matters is a concise explanation of each skill: how and when to use it,
  how it works, a link to the skill and how to install it. The skills are never part of the `pomwright` package.
- **Q3**: an index and a page per skill, as recommended.
- **Q4**: one line on the home page and one on *Installation*, as recommended.
- **Q5**: `skills/README.md` keeps the table and the install command and links the tab, as recommended.
- Added: the root README mentions the skills and links the Skills tab.

The questions as asked:

- **Q1. The tab's name and place.** Recommended: "Skills", last (Docs, API, Internal, Skills), as agreed for PLAN-0;
  the alternative is "Agent skills" or a place after Docs.
- **Q2. Test results on the site?** Recommended: say how the skills are tested (the checks in CI, and evaluations with
  and without the skills on several models before a release of the skills) with no scores: scores belong to one
  version of the skills and the models of the day, and the evaluations are not in the repository. The alternative is a
  short results table dated and tied to a commit.
- **Q3. A page per skill, or one page?** Recommended: an index and a page per skill (three now, `defect-review`
  later), as aihero.dev does; the alternative is one page with a section per skill.
- **Q4. Links into the tab from Docs.** Recommended: one line on the home page and one on *Installation*; the
  alternative is the tab alone.
- **Q5. `skills/README.md`.** Recommended: it keeps the table and the install command and links the tab; the
  alternative is a link only, so installation has one home on the site.

## Execution notes (2026-11-12)

- Built: the Skills topic, last, icon `puzzle`, with the index, a group *POMWright* (three pages) and a group *Other
  skills* (`defect-review`); one line on the home page and one on *Installation*; *Locator paths*' naming paragraph
  links the `pomwright` page; the root README's *Agent skills* section (after *Documentation*); `skills/README.md` links
  the section; `website/AGENTS.md`, *Internal → Documentation*, `skills/AGENTS.md` (a change to what a skill does, how
  it starts or what it needs updates its page and its README row), `docs/repository.md` and `custom.css`'s comment say
  four sections.
- The install commands, checked first against the skills CLI 1.5.0 in this machine's npx cache (a stand-in), then
  (2026-11-12, the maintainer asked) against the latest release, 1.8.1 (npm, 2026-11-11): its `docs/commands.md` and
  its parser (`type: "list"` options take the positionals that follow, so space-separated and repeated both work), and
  a real run on Node 26: `add <repo>/skills --list` listed the four skills, and
  `add <repo>/skills --skill pomwright pomwright-map-site --agent claude-code codex -y` installed both into
  `.agents/skills/` (Codex) and linked them from `.claude/skills/` (Claude Code), the folders the copy-by-hand table
  names. Unchanged since 1.5.0 but for the Node floor, `>=22.20.0` (1.5.0: `>=18`), which the index and
  `skills/README.md` already state. Not run on Node 22.20 itself; the source was the local folder, not `DyHex/POMWright`
  (the skills are not on `main` until the merge).
- The effort: one sentence in *Requirements* (the evaluations ran Claude Opus at high; run them at high). Testing: two
  sentences in *How they are kept true*, with no scores (Q2).
- Checks: `pnpm docs:build` (58 pages, every internal link valid), `pnpm docs:preview` looked at in Chromium at 1280 and
  390 wide (the phone menu's topic list reaches Skills; no horizontal scroll), `pnpm lint`, `lint:guide`, `lint:skills`,
  the snippet check, the API coverage check, `npm pack --dry-run` (no `skills/` file), the private-name grep.
- Links to GitHub (`tree/main/skills/...`) resolve once the branch is merged; checked by opening them after the merge.
