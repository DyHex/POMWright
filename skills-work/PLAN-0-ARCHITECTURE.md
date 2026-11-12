# PLAN-0: the architecture of POMWright's agent skills

Status: **agreed 2026-11-10**: every decision as recommended, with the order amended (`defect-review` last) and
`defect-review` user-invoked; the decisions in force are in [DECISIONS.md](DECISIONS.md) (S1-S9). Decides the skill set, how the skills share knowledge, invocation,
distribution, versioning and the checks. Every later plan builds on it. Nothing is written into `skills/` until the
decisions below are ticked.

Sources: [ecosystem.md](ecosystem.md) (standards, budgets, distribution, Playwright tooling), [practices.md](practices.md)
(external consumer projects A-D), [facts/](facts/) (POMWright itself), [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) 1-10.

## What the skills are for

POMWright users and their agents should be able to learn POMWright, start a project with a sound structure (one app or
several), turn a live site into page objects and locator modules, write tests and page objects that use the API well,
and review or refactor existing code, without the agent inventing API or practice.

## Verified constraints that shape the design

1. **Every installed skill costs context in every session.** Name + description are always loaded: Claude Code gives
   the listing about 1% of the context window and drops the least-used descriptions on overflow; Codex gives it 2% or
   8,000 characters, shortens descriptions, then omits skills. Similar descriptions compete for the same request.
2. **Only `SKILL.md` loads when a skill triggers.** Files beside it load when the agent reads them. Size limits are
   about `SKILL.md` (agentskills.io: under 500 lines, under 5,000 tokens; Claude: under 500 lines) and about each file
   the agent reads, not about the folder. References one level deep from `SKILL.md`; a table of contents in any file
   over 100 lines.
3. **No standard way for one skill to read another skill's files.** Installers copy or symlink each skill folder on its
   own. A skill can ask the agent to use another skill by name (Claude Code's Skill tool, Codex's `$name`).
4. **Frontmatter portability.** `name` + `description` work everywhere. claude.ai uploads and the Skills API reject
   keys beyond `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`; Claude Code ignores
   unknown keys; Codex reads `agents/openai.yaml` beside `SKILL.md` for its invocation policy.
5. **The exact API reference already ships with the package.** The packed declarations carry the doc comments:
   `.pack/pomwright/dist/index.d.ts` (3.0.2) holds 136 `@see` links to the API pages and 96 `@example` blocks
   (`grep -c`, 2026-11-10). An agent in a user's project can read the declarations of the version actually installed
   (`node_modules/pomwright/dist/index.d.ts`), which no skill text can match for accuracy or freshness.
6. **The site is the home of every fact** ([website/AGENTS.md](../website/AGENTS.md#rules): "one home per fact"), and
   its examples are compiled and its chains rebuilt by the harness. A skill that restates the site at length goes stale.

## Decision 1: how the knowledge is split into skills

The question: one skill per method, one per API section (the API sidebar: page objects, the locator classes,
navigation, session storage, reports, types, errors), or something else.

| option | what it gives | what it costs |
| --- | --- | --- |
| A. one skill per method | small files | ~30 descriptions in every session; near-identical triggers; a page object touches ~10 methods, so ~10 skills load for one task |
| B. one skill per API section | no fact repeated, mirrors the API | ~8 descriptions; every real task (a page object, a test, a review) crosses 4-6 sections, so most trigger together and compete; triggering by description is less reliable than a router choosing a file |
| **C. one core skill whose reference files mirror the API sections, plus a separate skill only where invocation or workflow differs** | the API-section split without its cost: one file per section, no fact in two files, `SKILL.md` routes by task to exactly the files it needs | the core's description must cover a broad area (fits in 1,024 characters); one folder to keep current |
| D. one skill for everything | one description | impossible: teaching is user-invoked and creates a workspace, the core is model-invoked |

**Recommendation: C.** Your API-sidebar idea is kept, as the core skill's reference files rather than as skills: the
split that guarantees no repetition lives where it costs nothing. Skills are separated only by **how they are
invoked and what workflow they run**, which is what decides triggering:

| skill | invoked | does |
| --- | --- | --- |
| `pomwright` | by the model, when code uses or should use POMWright | the core: what POMWright adds to Playwright, the rules, the API by section, the task guides (page objects, locator modules, fixtures and test data, project structure, tests, review and refactoring), templates |
| `pomwright-teach` | by the user only | a learning workspace for POMWright, lessons and exercises, built on the core skill and the site |
| `pomwright-map-site` | by the user, or the model on a request to generate page objects from a running site | explore an origin with Playwright's tooling, let the user pick pages, generate the base class, page objects, locator modules and starter tests, following the core skill |

Size control, so the core never becomes too large where it matters: `SKILL.md` stays a router of at most ~250 lines
(what POMWright adds to Playwright, the rules that hold for every task, one complete canonical example, and a table of
which file to read for which task); each reference or guide at most ~300 lines, with a table of contents over 100; a
check fails past those limits. An agent reads `SKILL.md` plus the two or three files its task names. A new section that
does not fit is a new file, not a longer one; a new skill only when evals show the core misrouting or mistriggering.

Where each of your proposed skills lands:

| proposed | lands in |
| --- | --- |
| teach-me-pomwright | `pomwright-teach` |
| playwright-with-pomwright (when to use which) | `pomwright/SKILL.md`, its first section |
| pomwright-pom | `pomwright/guides/writing-page-objects.md` + `references/page-objects.md` |
| pomwright-locator-modules | `pomwright/guides/locator-modules.md` |
| pomwright-fixtures, test data through fixtures | `pomwright/guides/fixtures-and-test-data.md` |
| pomwright-sessionstorage | `pomwright/references/session-storage.md` |
| pomwright-log, pomwright-step | `pomwright/references/reports.md` |
| pomwright-locator-registry, standalone registry | `pomwright/references/paths-and-registry.md` |
| one per registry method (add, reuse, createReusable, getLocator, getNestedLocator, getLocatorSchema, …) | `pomwright/references/{registering, resolving-and-queries, reusing}.md`, a section per method |
| evaluate a page / map an origin, generate page objects | `pomwright-map-site` |
| POMWright with Playwright MCP | `pomwright-map-site` (its exploration step) |
| generating an example project | `pomwright-teach` (its practice project) and `pomwright/guides/project-structure.md` + `assets/templates/` |
| project structure, one or several apps | `pomwright/guides/project-structure.md` |
| review, refactor | `pomwright/guides/reviewing.md` |

Proposed layout of the core (file names to settle in PLAN-1):

```text
skills/pomwright/
  SKILL.md
  references/                        one file per API section, as the API sidebar groups them; no fact in two files
    paths-and-registry.md            paths and their rules, LocatorRegistry, createRegistryWithAccessors, verify, strictChains
    registering.md                   add(path), the ten locator methods, filter, nth, describe, getById, frames
    resolving-and-queries.md         getNestedLocator, getLocator, LocatorQueryBuilder, LocatorUpdateBuilder
    reusing.md                       reuse by path, createReusable, ReusableLocator
    page-objects.md                  PageObject, its options and lifecycle, actions after navigation
    navigation.md                    baseUrl, urlPath, fullUrl, NavigationFor, UrlMatcher
    session-storage.md               SessionStorage, codecs, seed
    reports.md                       the log fixture, PlaywrightReportLogger, @step
    typescript.md                    the exported types, generic base classes, declaration: true
  guides/                            one file per task; they apply the references and never restate them
    choosing-locators-and-paths.md   Playwright's locator priority, kind@which naming, how much to chain
    writing-page-objects.md
    locator-modules.md
    fixtures-and-test-data.md
    project-structure.md             one app, several apps, a monorepo package
    writing-tests.md
    reviewing.md
  assets/templates/                  files a scaffold copies: env module, base class, fixtures, a page + module, a spec, config
```

- [x] **1.** Option C: three skills, `pomwright` (core), `pomwright-teach`, `pomwright-map-site`; the API-section
  split as the core's reference files; size limits enforced by a check.

## Decision 2: how the two workflow skills use the core

- **a. By name (recommended).** `pomwright-teach` and `pomwright-map-site` tell the agent to use the `pomwright` skill
  for every rule and API fact, and never copy its content. The install instructions always install the set. Each
  says what to do when the core is missing: install it, or fall back to the site and the installed declarations.
- b. By relative path (`../pomwright/references/…`): works when installed side by side, breaks under some installers;
  not part of any standard.
- c. Each workflow skill carries copies of what it needs: robust, but the copies drift.

- [x] **2.** Option a.

## Decision 3: where facts come from at run time

The skills teach practice and route; exact facts come from sources the agent can read:

- exact signatures, options and error messages: the **installed** declarations, `node_modules/pomwright/dist/index.d.ts`
  (searched, not read whole: 167 KB), which match the user's version;
- concepts and the full rules: the site page each reference section links (one home per fact);
- what POMWright does not change: playwright.dev, linked.

The references state each rule briefly, with a compiled example, and link the page that explains it.

- [x] **3.** As above.

## Decision 4: invocation and frontmatter

- `pomwright` and `pomwright-map-site`: `name`, `description`, `license: Apache-2.0`, `compatibility` (Decision 6),
  nothing else, so they load in Claude Code, claude.ai, the Skills API, Codex and the `npx skills` agents.
- `pomwright-teach`: user-invoked, since it creates files in a workspace: `disable-model-invocation: true` for Claude
  Code and `agents/openai.yaml` with `policy.allow_implicit_invocation: false` for Codex, as Matt Pocock's `teach` does.
  The first key fails a claude.ai upload; claude.ai has no persistent local workspace for it anyway, so claude.ai is
  not a target for `pomwright-teach`, and its README says so.

- [x] **4.** As above.

## Decision 5: distribution

- The skills stay in the repo's `skills/` folder, which `npx skills add DyHex/POMWright` already discovers (Claude
  Code, Codex, Cursor, Copilot, Gemini CLI and others), with a `skills/README.md` (what each skill does, its triggers,
  how to install for each agent, as the earlier migration skills' README did). Not in the npm package, as now.
- Later, if wanted: a `.claude-plugin/marketplace.json` (Claude Code plugin) and a Codex plugin listing, so updates
  arrive by themselves. Not in the first release of the skills.
- `defect-review` is a general skill, not about POMWright, and `npx skills add DyHex/POMWright` would offer it too.
  Options: keep it offered and list it apart on the SKILLS tab (recommended: it is useful, and you chose to keep it in
  `skills/`); hide it with `metadata: { internal: "true" }`; or move it to `.claude/skills/` for contributors only.

- [x] **5a.** `skills/` + `skills/README.md` + `npx skills`; plugins later.
- [x] **5b.** `defect-review`: kept, and listed on the SKILLS tab apart from the POMWright skills, once it is
  generalized into a true generalist (decided by the maintainer 2026-11-10; see
  [PLAN-DEFECT-REVIEW.md](PLAN-DEFECT-REVIEW.md)).

## Decision 6: versions

- Each skill's `compatibility` line: `POMWright 3.x, @playwright/test >=1.64.0 <2.0.0, Node 20+` (the standard's field
  for environment requirements).
- Each skill tells the agent to read the installed `pomwright` version first and, when it is not 3.x, to say so and
  point at *Upgrading from 2.x* rather than apply 3.x rules.
- Contributor guide: a `skills/AGENTS.md` (the folder's rules, the checks below) and a rule where changes start
  (`src/AGENTS.md`, `website/AGENTS.md`): a change to anything a skill describes updates the skill in the same plan,
  as it updates the pages. `docs/repository.md`'s `skills/` row and the guide's index gain the new file.

- [x] **6.** As above.

## Decision 7: checks

1. **Compile every TypeScript block** in `skills/**` against the packed build, by extending
   `scripts/check-doc-snippets.mjs` to `skills/` with the site's rules (`title=`, `// ---cut---`, `nocheck`,
   `@ts-expect-error`), so it runs in `pnpm typecheck`, every harness job and the `site` job.
2. **Rebuild every rendered chain** a skill shows, as `test/tests/docs/docsChains.spec.ts` does for the site.
3. **Lint the skills**: frontmatter rules (name, length, folder match, allowed keys per skill), line limits, a table of
   contents over 100 lines, relative links and anchors that resolve, links to the site that exist (as
   `check-api-coverage.mjs` checks `@see` URLs). Either `skills-ref validate` (pinned, downloaded like attw) plus a
   script for the rest, or one script of ours. In CI's `lint` job.
4. **Evals** (PLAN-6): scenarios per skill run with and without the skill on the models we target; their results
   decide changes. Not in CI (they need a model).

- [x] **7.** Checks 1-3 in CI before any skill content is merged; evals as their own plan.

## Decision 8: exploring a live site (detail in the `pomwright-map-site` plan)

Prefer the official `playwright-cli` and its `generate-locator` when installed (Playwright's README recommends it for
coding agents, and it is token-efficient), else Playwright MCP, else a script the skill ships that prints each page's
aria snapshot through the user's own `@playwright/test`. Each route checked before the plan commits to it.

- [x] **8.** As above, to be detailed and probed in its plan.

## Order of the plans

Checks first, so every later plan runs under them (as *From a review's findings* in
[docs/releases.md](../docs/releases.md#from-a-reviews-findings) did):

1. **PLAN-1-CHECKS**: the snippet, chain and lint checks for `skills/**`; `skills/AGENTS.md`; the guide's rules.
2. **PLAN-2-CORE**: `skills/pomwright`: `SKILL.md`, then the references section by section, then the guides and
   templates; every example probed and compiled.
3. **PLAN-3-MAP-SITE**: `skills/pomwright-map-site`.
4. **PLAN-4-TEACH**: `skills/pomwright-teach`, with its practice project.
5. **PLAN-5-README**: `skills/README.md`, install instructions per agent.
6. **PLAN-6-EVALS**: scenarios, baselines, runs on Claude models (Codex later, by the maintainer: P2), fixes.
7. **PLAN-7-SITE**: the SKILLS tab (a fourth topic in `website/sidebar.mjs`), presenting each skill and linking it.
8. **PLAN-DEFECT-REVIEW** (amended: last, since its calibration runs are long): rewrite, calibrate, list it on the tab.
9. Audit and removal of `skills-work/` (rule 7 of [docs/releases.md](../docs/releases.md#planning)).

Versioning: the skills are not in the npm package, so they need no changeset; the contributor-guide and check changes
need none either. The SKILLS tab changes the site only.

- [x] **9.** This order, amended by the maintainer: `defect-review` last (DECISIONS.md S9).
