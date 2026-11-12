# Decisions

The decisions in force for the skills work, each with its date and reason. A reversed decision is replaced, not kept
beside its successor. Plans name these numbers.

## Architecture (PLAN-0, agreed 2026-11-10)

- **S1. Three POMWright skills.** `pomwright` (core, model-invoked), `pomwright-teach` (user-invoked),
  `pomwright-map-site` (turns a running site into page objects). The API sidebar's sections become the core's reference
  files, one per section, no fact in two files; task guides apply them without restating. Limits: `SKILL.md` ≤ ~250
  lines, each other file ≤ ~300, a table of contents over 100, enforced by a check. *Reason*: every installed skill's
  description costs context in every session, and real tasks cross 4-6 API sections, so per-section skills would
  trigger together; a router picks files more reliably than descriptions compete.
- **S2. The workflow skills use the core by name**, never by file path or copies; each says what to do when the core is
  missing. *Reason*: no standard for cross-skill file access; installers copy or symlink folders separately.
- **S3. Facts at run time**: exact signatures and messages from the installed `node_modules/pomwright/dist/index.d.ts`
  (its doc comments ship: 136 `@see`, 96 `@example` in 3.0.2's declarations); concepts from the site page each section
  links; the skills state rules briefly. *Reason*: version-matched truth; one home per fact.
- **S4. Invocation and frontmatter**: `pomwright` and `pomwright-map-site` use only the portable keys (`name`,
  `description`, `license`, `compatibility`, `metadata`). `pomwright-teach` and `defect-review` are user-invoked only:
  `disable-model-invocation: true` (Claude Code) and `agents/openai.yaml` `policy.allow_implicit_invocation: false`
  (Codex); claude.ai uploads are not a target for them. *Reason*: teach creates a workspace; a defect review is heavy and
  costly, so neither may start on keywords (maintainer, 2026-11-10).
- **S5. Distribution**: `skills/` + `skills/README.md`, installed with `npx skills add DyHex/POMWright`; Claude Code
  and Codex plugin listings later. Not in the npm package.
- **S5b. `defect-review`** stays offered and is listed on the SKILLS tab apart from the POMWright skills, once
  generalized (maintainer, 2026-11-10).
- **S6. Versions**: a `compatibility` line (POMWright 3.x, `@playwright/test >=1.64.0 <2.0.0`, Node 20+); each skill
  checks the installed version first; a `skills/AGENTS.md` and a contributor-guide rule that a change to anything a
  skill describes updates the skill in the same plan.
- **S7. Checks before any skill content lands**: every TypeScript block in `skills/**` compiles against the packed
  build; every rendered chain is rebuilt by a spec; a lint script of our own (no `skills-ref`) checks frontmatter, line
  limits, tables of contents and links. Evals are a plan of their own, not CI.
- **S8. Site exploration**: `playwright-cli` when installed, then Playwright MCP, then a script the skill ships; each
  route probed in its plan.
- **S9. Order** (maintainer's amendment 2026-11-10: `defect-review` last, since its evaluation runs are long):
  1. PLAN-1-CHECKS; 2. PLAN-2-CORE; 3. PLAN-3-MAP-SITE; 4. PLAN-4-TEACH; 5. PLAN-5-README; 6. PLAN-6-EVALS;
  7. PLAN-7-SITE (the SKILLS tab); 8. PLAN-DEFECT-REVIEW (rewrite, calibration, then its entry on the tab);
  9. audit and removal of `skills-work/`.

## `defect-review` (PLAN-DEFECT-REVIEW, agreed 2026-11-10)

- **R1. Name kept; user-invoked only** (S4). The description says what it does for any kind of system (defects,
  design, tests, docs, configuration) and that it runs when the user asks for a defect review; no keyword triggering.
- **R2. A review profile first**, stated in the report's header.
- **R3. Four references** (system profiles, a probe catalog, lenses, running segments); `SKILL.md` ≤ ~300 lines.
- **R4. Lenses with evidence** (design, configuration and operations, security, performance and resources) and the
  safety rule (probes only in environments the reviewer controls).
- **R5. Impact by kind of system**: semver only for published packages.
- **R6. Standards from context, not from a built-in catalog** (maintainer, 2026-11-10): the skill does not carry every
  standard and practice. Part of the review is to map the design patterns, standards and best practices the reviewed
  system uses or that its context calls for (its language, frameworks, platform, domain, its own guide), and to hold
  the system to them, but to **ask** whether a divergence, or a standard not used, is a design choice with a reason,
  as it already treats decided design as a design question rather than a defect, while keeping room to challenge it.
- **R7. Calibration eval** (maintainer, 2026-11-10): review POMWright at the `v3.0.0` tag (9e5c43e) and compare with
  every defect fixed since, as the 3.0.1 and 3.0.2 changelog entries record them (3.0.2 includes 3.0.1's; no separate
  3.0.1 comparison). Improvements made from the results must be general: **nothing POMWright-specific is added to the
  skill** to catch a POMWright defect; each change is checked against that bias before it goes in. Other public
  repositories may follow; their plan and cost are agreed first.
- **R8. Timing**: last of the skill work (S9), and **never started without the maintainer's explicit go**: when the
  sequence reaches it, stop and ask (maintainer, 2026-11-10).

## Conventions the core teaches (agreed 2026-11-10; beyond what the docs fix)

- **C1. Path naming** `kind@which`, the kind being the element's role (`button@save`, `dialog@consent`).
- **C2. File naming**: new projects `<name>.locators.ts` + `<name>.page.ts` (the docs' form); an existing project keeps
  its own convention.
- **C3. Page-object methods with two or more parameters take one options object** (the README's form).
- **C4. `testInfo` is Playwright's**: not taught by the skills.
- **C5. Logging from page objects**: teach that a page object can take the test's `log`, and if so it is advised to
  take a child (`log.getNewChildLogger(label)`); the purpose is provenance in the HTML report, which shows which page
  object logged; a child can be passed on into a method, a helper or a util outside the page object, and further, so
  even a deeply nested log line shows where it came from. Presented as an option with a limited set of use cases, not a
  default.
- **C6. Test data through one fixture** (maintainer's preference, recommended for maintainability): all test data is
  reached through a test-data fixture, organized by dot paths (`testData.<area>.<page>.<case>`, for example
  `testData.checkout.feedback.happyForm`), page-specific data included, rather than imported in page objects or spread
  across specs. Page objects take data as arguments.
- **C7. Teach format**: short lessons in a learning workspace plus runnable exercises against a practice app (detail in
  PLAN-4).
- **C8. Names**: `pomwright-` prefix with plain nouns.

## Process (agreed 2026-11-10)

- **P1. Commits**: one commit per executed plan, with the `Co-Authored-By` trailer; the maintainer pushes;
  `skills-work/` stays uncommitted until the final audit.
- **P2. Evals on Claude only for now**; the maintainer tests Codex later by giving both agents the same cases.

## Checks (PLAN-1, agreed 2026-11-10)

- **K1 (A).** The snippet check covers `skills/**/*.md` (one project per file) and `skills/*/assets/**/*.ts`; in skills
  no `// ---cut---`, no `nocheck`, no shared example app, double quotes in code.
- **K2 (B1).** `test/tests/docs/skillsChains.spec.ts`, helpers shared with `docsChains.spec.ts` through
  `test/tests/docs/chains.ts`, and a completeness sweep: every Playwright rendering a skill shows is compared.
- **K3 (C).** `scripts/check-skills.mjs` (`pnpm lint:skills`, CI's lint job): frontmatter, sizes, contents lists, one
  level deep, links and site URLs; `defect-review` exempt until PLAN-DEFECT-REVIEW.
- **K4 (D).** `skills/AGENTS.md`, the index row, `docs/repository.md`, the trigger rule in `src/AGENTS.md` and
  `website/AGENTS.md`, the Internal pages *Tests and checks* and *Documentation*.
- **K5 (E).** Each rule proven once with a scratch skill during execution; no permanent test for the lint.
- **K6.** PLAN-1 is executed one commit per step (its execution order), stopping after each step to report.

## Open

- None.
