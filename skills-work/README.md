# skills-work: the working folder for POMWright's agent skills

Temporary. Holds the research, verified facts, notes and plans for the agent skills in `../skills/`. Uncommitted unless
the maintainer asks. Deleted before the branch merges, after an audit moves anything a later reader needs into the
skills, the site or the contributor guide (the rule of [docs/releases.md](../docs/releases.md#planning), rule 7).

**Resume here.** A new session (or one after compaction) reads this file first, then `STATUS` below, then the file the
status names.

## The task (agreed 2026-11-10)

Design and write a set of agent skills for POMWright users and their agents:

- learning POMWright (a `teach`-style skill, modeled on Matt Pocock's `/teach`, tailored to POMWright with Playwright);
- using POMWright well: when POMWright and when plain Playwright, the API method by method, page objects, locator
  modules, fixtures, session storage, `log`, `@step`, the standalone registry;
- generating a project: structure for one origin or several (expandable), fixtures, test data through a fixture, an
  example project;
- mapping a site: explore an origin, the user picks pages, generate an abstract base class per origin, page classes,
  locator modules (short unique paths from user-visible structure; `getByRole` and friends first, `getByTestId`/`getById`
  last) and starter tests;
- reviewing and refactoring tests and page objects.

Decisions by the maintainer:

1. Audience: every POMWright user **and their agents** (most users work through an agent).
2. Agents: any agent through common standards; Claude and ChatGPT/Codex first; specialize only where it measurably
   helps.
3. Branch `docs/agent-skills` (off `main` at 7aebcb1). This folder: `skills-work/`.
4. The four external consumer projects are read only; no suite runs. Learn their intent; do not catalogue their
   mistakes. A pitfall becomes a right-way example in a skill, never a list of don'ts ("lead by example").
5. At the end, after testing and benchmarking, the site gets a **SKILLS** tab presenting the skills (like
   aihero.dev's skill pages), linking to them in the repo.
6. Skill architecture: proposed in `PLAN-0-ARCHITECTURE.md` (2026-11-10). The maintainer suggested splitting by the
   API sidebar and left the choice to the agent, with skill size as the concern to weigh.

Ground rules for this folder:

- **Every fact cites its source**: a file and line (`../src/locators/locatorRegistry.ts#L120`), a site page, or a probe
  in `probes/`. No fact from memory. A claim only a stand-in backs is marked as such.
- **Never name the external consumer projects** in any file here or in the repo: they are "external consumer project
  A, B, C, D". The mapping is in the agent's private memory, not here.
- Patterns from those projects are written as intent and as the right-way example, not as copied code.

## Layout

| File | What it holds |
| --- | --- |
| `README.md` | this: the task, the decisions, the status, where to resume |
| `SOURCES.md` | everything read, at which commit or date, and what remains |
| `facts/*.md` | verified facts per area, each with its source |
| `practices.md` | good practice and the pitfalls seen (as input for right-way examples), anonymized |
| `ecosystem.md` | the skill standards (Agent Skills, Claude, Codex), Playwright's own agent tooling, Matt Pocock's skills |
| `OPEN-QUESTIONS.md` | questions for the maintainer and things still to verify |
| `DECISIONS.md` | the decisions in force, numbered, with date and reason |
| `probes/` | probe specs and scripts with their results |
| `evals/`, `map-site-reference/`, `tools/` | **moved 2026-11-12** to the eval suite, a folder outside the repo ( kept after this folder is deleted; its README says how to run it) |
| `PLAN-*.md` | the plans, written after the research (phase 2); PLAN-0 is the architecture |
| `facts/*` index | `locators.md` (runtime, cited by line), `docs-practices.md` (Getting started, Locators, README, snippets, harness), `docs-pageobjects-storage-reports.md` (page objects, navigation, storage, seed, log, step, TypeScript, signatures) |

## STATUS

- Phase: **1, research — done 2026-11-10** (deferred items in `SOURCES.md` are read when a plan needs them).
- Done: contributor guide; runtime source (locators fully, helpers by signature); every Docs page of the site, the
  API index, the README, the docs' example app; the harness's page objects; the four external consumer projects;
  the skill standards (agentskills.io, Claude Code, Codex/ChatGPT, `npx skills`, plugin marketplaces); Playwright's
  agent tooling and the official `playwright-cli` skill; Playwright's locator, fixture and POM guidance; Matt
  Pocock's `teach`; the repo's earlier migration skills.
- Facts: `facts/locators.md`, `facts/docs-practices.md`, `facts/docs-pageobjects-storage-reports.md`;
  `practices.md` (projects A-D + cross-project themes); `ecosystem.md`.
- Phase 2: PLAN-0 and PLAN-DEFECT-REVIEW **agreed 2026-11-10**; every decision in force is in `DECISIONS.md`
  (S1-S9, R1-R8, conventions C1-C8, process P1-P2).
- PLAN-1-CHECKS **done** 2026-11-10 (f82eff0, 7f97b64, 787d5ea, 3aed766, 49ac76c; full run green).
- PLAN-2-CORE **done** 2026-11-10 (039e33d..9244119; full run green). `skills/pomwright/`: SKILL.md, 9 references,
  8 guides, 13 templates.
- PLAN-3-MAP-SITE **done** 2026-11-10 (201b451): `skills/pomwright-map-site/` (SKILL.md, 2 references, `scripts/map.mjs`).
- PLAN-4-TEACH **done** 2026-11-10 (962214a; its plan file written after, says so). PLAN-5-README **done** (3aa9243,
  841806f).
- PLAN-2B-CHOICES (the maintainer's baseURL and shape corrections) done. PLAN-2C-POMWRIGHT-MD done (f4f0dfb, b58dfc0,
  bc28051, 4815d0b; subagents opt-in since 906892d).
- PLAN-6-EVALS: calibrations 1-2, rechecks 1-4 and matrix 1 (three models, with and without) **done 2026-11-11**,
  $43.16 of the $100 ceiling; fixes 6ae2837, 500fae4, 7a9cf0c, 1cf356a. Results and reports in `evals/results/`
  (`matrix-1/REPORT.md` first); the kept run folders are deleted, every run collected first. The machine's AppArmor
  settings, changed for the evals, are to be restored by the maintainer (`PLAN-6-EVALS.md`).
- System restored by the maintainer 2026-11-11 (sysctl 1, bwrap profile loaded; checked). Matrix-report decisions
  (2026-11-11): rules are defaults and the page decides (`locator("main")` scopes deliberately); Opus 5.5 high judges;
  file-based code graders; matrix 2 on Opus 5.5 only, effort medium and high: `PLAN-6B-MATRIX-2.md`.
- **2026-11-11 evening** (resume here after a compaction):
  - PLAN-6B: steps 1 and 1d committed (21f3c1d, 12bf979); step 2 built; **matrix 2 done and reported**:
    `evals/results/matrix-2/REPORT.md` (tables from `report-matrix-2.py` in `tables.md`). 60 of 69 runs correct with
    the skills against 42 of 69; mistakes level (1.4 against 1.3); 17% faster, 8% cheaper; recorded spend $90.87
    (agents $69.04, eval judges $1.81, grade.py $20.02). The `iframe` judgment that timed out twice passed alone on a
    third try (22 s). verify.py and the report now count the rerun only for the code cases.
    Findings answered (2026-11-11 night) and built as PLAN-6B step 4, committed 3cfebd3: names are the project's
    convention (default: the kind by behavior, `input`, `dropdown`, `button`, `link`; `@which` to tell like elements
    apart, as the locator picks it); `expect…` methods for parts other tests likely check; ask every open question in
    one message, a tester's guess where no one can be asked. Rubrics revised. **Matrix 2b done** (`results/matrix-2b/REPORT.md`): corrected, 66 of 69 against 69 of 69 (old) and 46
    of 69 (without). Its two drops fixed by PLAN-6B step 5 (1860d8d: rule 11 names the loaded hook and the read-once
    check; a departure from POMWRIGHT.md is said in the reply) and rechecked in matrix 2c (`results/matrix-2c/`): 5 of
    5 in both cases; PLAN-6B step 6 (5a828df: the value a test checks does not find its cell) rechecked in matrix 2d:
    loaded-hook 5 of 5, no mistakes, faster and cheaper than without. Matrix 2e found that the skills' default names
    win over a POMWRIGHT.md that names kinds by role (login-page-object 0 of 3), and that 38 of my naming corrections
    were wrong (withdrawn): matrix 2 is 66 of 69, 2b 59 of 69. Step 7 (3fb704e) rechecked in 2f (fields
    follow the project; the template's `header` copied). Then the maintainer asked for a review:
    `REVIEW-SKILLS-AFTER-MATRIX-2.md` (old against now, the scoring's limits, the docs), answered (2026-11-11 late):
    `@which` in a user's words, sections as `section`, a fresh $200. Step 8 committed (5674e5a); workspaces corrected;
    `checks.py` (code checks); **matrix 3 done 2026-11-12 00:46** (`evals/results/matrix-3/REPORT.md`): with the skills 69 of 69 runs correct against 49 of 69 without (68 of 69 as graded); code checks 51 of 51 against 47 of 51; mistakes 0.2 against 0.5 a run; 8% faster, 3% cheaper; $90.87 of the fresh $200 ($109.13 left). 57 judge findings corrected with reasons (`corrections.py`, matrix-3), each checked against code, pages or POMWright's source; `checks.py` refined twice (a `has` filter's locator allowed; `expect(value, message)` caught). Recommendation: the skill is done; follow-ups in the report (the `@which` wording, folded into PLAN-2D; eval tooling before the map-site evals). `.no-pause` deleted. Answers 2026-11-12: PLAN-2D Q3 yes, Q4 `section@` for every region (Q1, Q2 open); PLAN-7 go, built when the maintainer says; map-site at high only. Budget: a fresh $200
    (runs capped $160, grading ~$40); earlier rounds' $158.40 not counted. After the report: the map-site evals
    (ceiling ~$55 plus grading for cells M1-M7, at high only: the maintainer, 2026-11-12, no xhigh sweep), once the maintainer says this skill is done. Next (the
    maintainer): finish this skill before the map-site evals (their ceiling ~$55 plus grading for the cells agreed).
    Decided (maintainer): no matrix at other efforts; the `storage-read` criterion only concerns grading.
  - PLAN-3B: step 1 probes done; **step 2 committed** (b0d3875, after lint, lint:skills, lint:guide, the doc snippets and
    the skills chain spec on the packed build). R0 and R1 done (`map-site-reference/before|after`); R1 is the
    reference (the maintainer, 2026-11-12: the consent becomes `section@cookieConsent`, renamed in R1 before grading).
    Next: build the map-site eval cells M1 to M7
    (the site's source copied into each run's workspace by the scaffold: approved), probe the CLI's and MCP's setup in the
    eval (case `plugins:`, `--allow-real-servers`, the site's domain for the sandbox network, chromium-1247 in the
    run's home), run at high, two at a time (no xhigh sweep: the maintainer, 2026-11-12).
  - The machine: the AppArmor sandbox settings are lowered for the evals; restore after the map-site evals.
- **2026-11-12 morning** (the maintainer: "the skill is done"; resume here):
  - Deleted, at the maintainer's request: every eval round's results and reports (`evals/results/*` but its
    `biome.json`), the round-only scripts (`run-matrix-2*.sh`, `resume-matrix-3.sh`, `report-matrix-*.py`,
    `corrections.py`, `retired-graders/`) and `REVIEW-SKILLS-AFTER-MATRIX-2.md`. Kept for the map-site evals and a later
    rerun: the cases (`plugin/evals/`), rubrics, workspaces, solutions, fixture, `run-eval.sh`, `run-matrix-3.sh` (a
    runner template), `post-matrix-2.sh`, `grade.py`, `checks.py`, `collect.py`, `verify.py`, `window.py`, the plans.
  - PLAN-2D executed: 113c94b (Q1, Q2 taken as recommended at the go). PLAN-DEFECT-REVIEW steps 1-2: da4bd1b; its eval
    plan `PLAN-DEFECT-REVIEW-EVAL.md` waits for Q1-Q4. PLAN-7 widened to `defect-review` and built: d7f52dc.
  - Next: the map-site evals (PLAN-3B step 3: rename R1's consent to `section@cookieConsent` first; grade.py to list
    deleted files; cells M1-M7 at high), then restore AppArmor; the defect-review calibration once agreed; the audit of
    this folder before the merge.
- **2026-11-12 midday** (the maintainer's answers to the morning report; resume here):
  - Install commands rechecked against the skills CLI's latest, 1.8.1: unchanged but for its Node floor (22.20), which
    the index and `skills/README.md` already state (PLAN-7 notes).
  - `defect-review`: no calibration runs (the maintainer); its eval plan deleted. Two echoes of POMWright removed
    (0f7b964): "registries", "unhandled rejection"; the TypeScript example profile kept (the maintainer). PLAN-DEFECT-REVIEW done.
  - The eval suite moved out of the repo to a folder of its own (`evals/`,
    `map-site-reference/`, `tools/`), paths repointed (`POMWRIGHT_REPO`), smoke-tested (`try-workspace.sh shop`: tsc
    clean, 3 passed). Paths below that say `evals/` or `map-site-reference/` now mean that folder.
  - Order agreed: the map-site evals now; then restore AppArmor; then the maintainer's changes to `pomwright-teach` and
    its evals; the audit of this folder before the merge; after the merge, the Skills pages' GitHub links and
    `npx skills add DyHex/POMWright --list`. The maintainer replaces their installed `defect-review` copy.
  - Map-site evals built in `pomwright-skill-evals/map-site-evals/` (PLAN-3B notes, 2026-11-12: `claude -p` as R0/R1,
    not the eval tool; the grader; R1 renamed). **Blocked:** the site's name does not resolve (work network's DNS
    unreachable); nothing run, nothing spent. Resume: `getent hosts` the site, grade R1 (`grade/grade.sh
    ../map-site-reference/after`), check its specs pass, then `run-round.sh`, then grade each run and `summarize.py`.
- **2026-11-12 late morning:** the maintainer's pomwright changes built (daaae5f): *POMWright's parts* in
  POMWRIGHT.md (the skill uses only the parts a project chose; said second in SKILL.md), the complete example with a
  minimal page object, a base class forwarding every option with its type, and a page passing only its path and
  storage schema (template and page-object guide alike; SKILL.md limit 330). The maintainer did not recognize "the
  staging site" (the map-site evals' site, chosen 2026-11-11 in PLAN-3B): explained, waiting. Teach: the maintainer
  wants a choice of the standard course or a focused track, and the course in any shape; my proposal and questions
  sent; then a simulated learner (me, prompting a `claude -p` session with the teach skill in an empty folder) through
  the default curriculum, with notes and an evaluation.
- **2026-11-12 afternoon** (the maintainer's answers; resume here):
  - The machine was restarted: AppArmor is back to its defaults (sysctl 1, bwrap profile loaded), so the restore step
    is done. The map-site runs (`claude -p`, Bash by allow-list, Playwright's Chromium) need neither; probed: headless
    Chromium loads both pages of the site (200), TLS verified (the server omits its intermediate; curl fails, Chromium
    fetches it). The site resolves again (over the work network).
  - R1 graded (`map-site-reference/after/.grade`): tsc clean, 4 of 4 specs pass, fingerprints taken. Found: 13 of R1's
    paths match nothing in either graded state (the menu's navigation, cards' info parts, FAQ answers: parts a user
    opens); `gen-spec.mjs` should grade a third state with those opened before summarize.py calls them broken.
  - 42502bf: each of POMWright's parts brings its types, options and helpers (SKILL.md 324 lines; limit 330 accepted).
  - Teach (built after the map-site evals): agreed 1-4 as proposed (two ways in become three: a getting-started course
    for one sitting that ends with what it covered, to what depth, and what remains; the full course; a focused track;
    constrained generation from the units for all three); a learner project is read after confirming it is the right
    one, another project on the machine only with permission and an explanation of what reading it shares. Simulation:
    me as learner; then, when the skills are settled, two agents (teacher, learner knowing Playwright but not
    POMWright), reviewed by me; then possibly a learner new to Playwright too.
  - Map-site: before it runs, the maintainer wants the numbers (cases, models, efforts, runs) and fewer cells if
    possible; Opus 5.5 high only.
  - Map-site setups chosen (the maintainer): the skills with the library alone, + CLI, + MCP, + CLI and MCP, and one
    without the skills (library alone): L-with, LC-with, LM-with, LCM-with, L-without; 2 runs each, 4 at a time; the
    five-hour window is the budget (stop at 90%). Grading opens each part a user opens (R1: all 13 resolve).
    Chromium 1247 reinstalled for the CLI and MCP (gone after the upgrade); Claude Code now 2.1.322 (R0/R1: 2.1.319).
    Round started 2026-11-12 ~14:55. The pomwright recheck (7 cases + a parts case, with the skills) comes after the
    map-site skill is finished, iterations included; then teach.
  - **Map-site round 1 done** (14:53-15:31, $53.70, window 3% to 31%): report in
    `../pomwright-skill-evals/map-site-evals/results/round-1/REPORT.md`. Skills 8 of 8 specs green, 88% of R1 covered,
    $5.09 a run; no skills 0 of 2 green, 54%, $6.50 (they never reached the live site: allow-list refusal, then no shell).
    Findings for the next iteration: tool choice (MCP used over the script in 3 of 4, 36% dearer, 32% slower; the CLI
    never), the consent named `dialog@cookies` in all 10 (a region is a section, not stated), `main.heading` in the
    common type left unregistered on a page with no h1 (3 of 8). Grader: tab pass added; unresolved() fixed;
    run-round.sh reads the nested five-hour figure. Waiting for the maintainer on the fixes and a rerun.
  - The maintainer approved the three fixes, a rerun and a fair baseline: 83a5c53 (map with the script), 5d68610 (a
    region is a section), 07ae589 (main.heading declared by the pages that have one), 6ad7839 (rewrap). Round 2
    (`results/round-2`): L-with, LM-with, L-without x 2 at 6ad7839; start/POMWRIGHT.md's segment names synced to the
    template; the baseline with more read-only commands (BROAD_ARMS).
  - Found during round 2 (16:05): the eval's node_modules was a symlink to the fixture, outside the run's folder, and
    Claude Code in dontAsk mode refuses any command touching it (probed with Haiku: the same command passes with a
    real folder). It hit every run in rounds 1 and 2: the no-skills runs gave up the shell (never reached the site),
    the skills runs recovered through the script, LM-with-1 (round 2) went to MCP after it. Round 2's queued
    LM-with-2 and L-without-2 stopped after 19-39 s. run-cell.sh now copies node_modules. Round 3
    (`results/round-3`, started ~16:08): L-with, LM-with, L-without x 2, every arm with the same read-only list.
  - Round 3's first baseline (L-without-1) stopped at 3 min: it `cd`'d into node_modules/pomwright (now a real folder),
    and `Edit(./**)` follows the shell's working folder, so every later write was refused. Probed with Haiku: a
    `Write(path)` rule matches nothing (only `Edit` path rules cover the Write tool); `Edit(./**)` is refused after a
    `cd`; `Edit(//abs/**)` survives it. run-cell.sh now allows `Edit(//<run dir>/**)` and the run's scratch folder.
    L-without-2 held back (dummy stream); the baseline rerun as L-without-3 and -4 (16:17). L-without-1 and -2 are
    excluded from the round's summary.
  - My mistake (16:16): I edited run-cell.sh while round 3's four skills runs were executing it; when their agents
    finished, bash read the changed file at old offsets ("line 97: C: command not found"), re-ran the "before" git
    status capture, and skipped the wrap-up. The four runs completed (results intact); wrap-up finished by hand
    (`.side/<run>/note.txt`). Rule for myself: never edit a script while a copy runs; copy it first.
  - **Rounds 2-3 done (16:37), report `../pomwright-skill-evals/map-site-evals/results/REPORT.md`.** Round 3 (fixes in,
    same permissions for all): skills 4/4 green, 90% of R1, 0 unmatched, $4.57, 10.8 min; no skills 2/2 green, 92%,
    $6.12, 16.9 min (a strong baseline: POMWRIGHT.md, the package's README/types and the site's POMWright code in reach).
    So map-site's measured gain is 25% cost and 36% time, not correctness. Fixes hold in all 6 skills runs since.
    Round 1's 54% baseline was the symlink artifact (report corrected). Next: the maintainer's call on map-site, then
    the pomwright recheck (needs AppArmor lowered), then teach.
- **2026-11-12 ~16:50** (resume here after the maintainer's VS Code update):
  - **Map-site: complete** (the maintainer). Its evals' report: `../pomwright-skill-evals/map-site-evals/results/REPORT.md`.
  - **Next: the pomwright recheck, NOT started (the maintainer: wait until VS Code is updated).** The sandbox settings
    are lowered (the maintainer ran both commands; checked: sysctl 0, bwrap profile unloaded); restore after the
    recheck, or they come back on a reboot.
  - The recheck as agreed: with the skills only (`--ablation none`), 3 runs a case, skills pinned to 6ad7839
    (evals/.skills-ref still says 5674e5a: update), cases decisions-first, existing-tests, decisions-from-code,
    login-page-object, seed-cart, lamp-query, upgrade-2x, plus a new case for the parts (a project whose POMWRIGHT.md
    chose a registry of its own, fixtures over `createRegistryWithAccessors`, no `PageObject`, no `@step`: add the
    login page's locators and a test; graded: test passes, no `PageObject`/`@step`, the needed types imported).
    Pass bar: matrix 3 with the skills (every run correct, at most 0.2 mistakes a run, no casts).
  - Before running: run-eval.sh and window.py hardcode the 2.1.319 binary (gone): take the newest extension's, as
    map-site's run-cell.sh does (the update may change it again). The existing workspaces keep their POMWRIGHT.md
    without *POMWright's parts*, as in matrix 3: it tests the rule for a file written before that section.
  - Then teach (redesign agreed), then the simulation.
- **2026-11-12 ~16:55, the order from here (the maintainer):** 1. the pomwright recheck and any fixes; 2. the teach
  redesign; 3. the teach simulations; 4. then the site's Skills pages: update them for every change since d7f52dc;
  the Skills tab before Internal (Internal last); and on each skill's page a short, honest *benefits* section from our
  results (the key metrics: better, faster, cheaper or the same; what to expect on larger tasks; effort high
  recommended, with what the low/medium probe showed; skills make mistakes, and POMWRIGHT.md overrides their defaults;
  feedback welcome on the issues page), in the spirit of the Slack text but short and in English; 5. then see where we
  stand: the audit of this folder, the merge and after.
- **2026-11-12 ~17:15: the pomwright recheck started** (`../pomwright-skill-evals/evals/run-recheck.sh`, results in
  `evals/results/recheck-1/`): registry-parts (new: workspace `registry`, solution passes, `checks.py` *parts*, rubrics),
  decisions-first, existing-tests, decisions-from-code, login-page-object, seed-cart, lamp-query, upgrade-2x; skills
  only, 3 runs, pinned 6ad7839; Claude Code 2.1.322 (run-eval.sh and window.py now take the newest binary). After it:
  `ROUND=recheck-1 post-matrix-2.sh`, then checks.py, a report, fixes; then restore the sandbox settings.
- **2026-11-12 ~17:25: the pomwright recheck done** (`../pomwright-skill-evals/evals/results/recheck-1/REPORT.md`):
  24 of 24 graders, 15 of 15 reruns and code checks, 21 of 24 as graded and 24 of 24 corrected (the 3 judge fails were
  matrix 3's *which-named*: the workspaces' POMWRIGHT.md still has the old `@which` wording: eval follow-up), 2
  mistakes in 24 (0.08 a run; matrix 3 0.2), the parts 3 of 3, asked 9 of 9, no casts. $15.55; window 23%. No skill
  fixes. grade.py and map-site-reference/run.sh now take the newest binary too. Next: the maintainer restores the
  sandbox settings; the teach plan (PLAN-4B-TEACH-REDESIGN.md) waits for the go.
- **2026-11-12 ~18:50: teach redesign built (43989ad) and simulated** (notes and evaluation:
  `../pomwright-skill-evals/teach-sim/NOTES.md`; workspace `../pomwright-teach-sim/`): getting started complete (6
  lessons), the full course's first unit (frames), a focused track (logging, with the project rule); $10.42, 55 min.
  Works as designed; five fixes proposed (typescript in setup; quote POMWRIGHT.md, never paraphrase a convention;
  suggestions meet the core skill's rules; never change finished exercises; shared parts as the core template), plus
  pacing (getting started is 3.5-4 h, not 2-3). Waiting for the maintainer's go on the fixes.
- **2026-11-12 ~19:05:** the teach fixes applied (1d24d7c: typescript in setup with a tsconfig asset, quote
  POMWRIGHT.md, suggestions meet the core skill's rules, never change finished exercises, page modules as the core
  template, 20+10 min lessons). Next: the docs step (Skills pages, tab order, benefits sections; drafts to the
  maintainer before committing); defect-review's evidence from the git history (the 3.0.2 reviews).
- **2026-11-12 ~19:25: the docs step done** (2425965, not pushed): Skills tab before Internal; the index's "Using them
  well" (effort high with the probe as it was, review what they write, disagree in POMWRIGHT.md, issues); "What we
  measured" on each skill's page. Branch 52 commits ahead of origin/main, never pushed. Next (the maintainer): see where
  we stand; then the audit of this folder, the merge and after; the two-agent teach test when the maintainer wants it;
  restore the sandbox settings if not done.
