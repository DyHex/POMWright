# PLAN-6-EVALS: measuring the skills

Status: **executing 2026-11-10**: the maintainer agreed to E1 to E4 as recommended (a calibration round first, one
model, one run per case, before the full matrix; Haiku, Sonnet and Opus for the matrix; `claude plugin eval` with Bash,
Write and Edit in its sandbox, against the local practice shop; cases in `skills-work/evals/`). E1 named no figure: the
smoke run is capped at $2 and the calibration round at $5, and the full matrix's ceiling goes to the maintainer with
the calibration's measured cost. Reports stay local (`--no-publish`): the default would publish them to claude.ai.

## What to measure

For each skill, on Claude models (P2):

1. **Triggering** (the model-invoked `pomwright` and `pomwright-map-site`): the skill loads for the requests it is for,
   and not for a plain Playwright request it is not for.
2. **Outcome**: with the skill, the work follows the rules (Playwright's locator order, `kind@which`, fixtures, test
   data through one fixture, `@step` methods, queries for one among several) and compiles and passes; without it, how
   far a capable model gets on its own. The difference is the skill's value.
3. **Fidelity**: no invented API; signatures as the installed declarations have them.

## The instrument (verified 2026-11-10, https://code.claude.com/docs/en/plugin-evals)

`claude plugin eval` (Claude Code 2.1.269 or later): cases in an `evals/` folder (`prompt.md` with `runs`, `model`,
`max_turns`, `allowed_tools`; `case.yaml` with a `scaffold_script`), graders (`regex`, `tool_used` with `tool: Skill` for
triggering, `tool_order`, `file_exists` cost nothing; `llm` and `baseline` call a judge), a with/without ablation
(`--ablation with-without`), `--runs`, `--model`, `--judge-model`, `--max-cost-usd` (stops at the ceiling, partial
results), `--allow-tools` (Bash, Write, Edit beyond the read-only set; Bash under the OS sandbox), `--keep-temp`,
`--json`. Each run is a `claude -p` child in a temporary home and working directory with only the plugin loaded. It
reports a list-price cost estimate. Not stated: whether a bare skills folder works without a `plugin.json`; there are
no custom-code graders (compiling and running the generated code is done by us afterwards, on the kept temp folders).

## Proposed setup

- An eval-only plugin, outside the repository's published paths (in `skills-work/evals/`, deleted at the audit, as
  `docs/repository.md` says evals are not kept): a `plugin.json` naming the skills, and the cases.
- A fixture project the scaffold script copies into each run: a Playwright project with POMWright from the packed build
  already installed and the practice shop (so no network and no npm install per run), its server started by the
  scaffold.
- Cases, about three per skill:
  - `pomwright`: write a page object and its fixture for the practice shop's login page; write a test that adds the
    "Lamp" (not the "Desk lamp") to the cart; review a messy spec; and a negative trigger: a plain Playwright question.
  - `pomwright-map-site`: map the practice shop's products and cart pages; the starter spec must pass.
  - `pomwright-teach`: invoked explicitly, set up the workspace and the first lesson with a passing exercise (judged by
    rubric; the interview part answered by `append_system_prompt` as the learner).
- After the runs: `tsc` and the generated specs on the kept temp folders, with the counts recorded.

## Decisions for the maintainer

- [x] **E1. Budget**: a cost ceiling for the whole first round (`--max-cost-usd`), and whether to start with one model
  and one run per case to calibrate before the full matrix.
- [x] **E2. Models**: Haiku, Sonnet and Opus (Anthropic's guide asks for every model a skill will meet), or a subset.
- [x] **E3. Permission**: running `claude plugin eval` here, with `--allow-tools Bash Write Edit` inside its sandbox,
  against the local practice shop only.
- [x] **E4. Where the cases live**: `skills-work/evals/` (temporary) as proposed, or a folder outside the repository.

## Setup (2026-11-10)

- The instrument, read from Claude Code 2.1.319 (`claude plugin eval --help`, `init --bare`) and its docs page: a case
  is `prompt.md` (frontmatter `max_turns`, `timeout_seconds`, `allowed_tools`, `runs`, `model`,
  `append_system_prompt`, `env`; unknown keys are errors) and/or `case.yaml` (`context.scaffold_script`), with graders
  in `graders/*.md` (`regex` with `target` `last_message`, `trace`, `files` or a file; `tool_used` with `input_match`,
  `min`, `max`; `tool_order`; `file_exists` with a glob over created files; `llm` with `focus`; `baseline`). No custom
  code graders. Each run starts in an empty directory with a temporary home; the scaffold (only with `--scaffold`) runs
  as the operator, outside the sandbox, at most 120 s. In a two-arm run, `tool_used: Skill` graders are indicators,
  not scored.
- `skills-work/evals/`: `fixture/` (a Playwright project: `@playwright/test` 1.64.0, POMWright from today's packed
  build, TypeScript 6, the practice shop, a config that starts it; `tsc` and a smoke spec passed), `workspaces/<name>/`
  (files a case adds over the fixture, such as `decided/POMWRIGHT.md`, the template's defaults), `plugin/` (the eval
  plugin: `plugin.json`, `skills/` copied by `sync.sh` before each round, `evals/<case>/`), `scaffold-common.sh`
  (copies the fixture and the case's workspace, links this machine's browsers into the run's home), `runs/` (logs,
  JSON results).
- Headless runs have no user to answer questions, which shapes the cases: a project without `POMWRIGHT.md` is a case
  of its own whose pass is the agent asking the decisions first; every other case's workspace has the file.

## Execution notes

- **Smoke run** (`smoke-newsletter`, Sonnet, one run, no ablation, $2 cap; Claude Code 2.1.319): $0.20, 38 s, 29
  turns. The skill loaded (`pomwright-skills:pomwright`), read `POMWRIGHT.md`, and wrote `env.ts`, a base class, the
  home page object, locator modules, test data and a fixture. **Every Bash command failed before it started**:
  `apply-seccomp: write /proc/self/setgroups (nested userns is capability-restricted; caller must provide
  CAP_SYS_ADMIN): Permission denied`, so nothing was compiled or run, and the agent said so. Score 0.5.
- **Cause, on this machine**: Ubuntu's AppArmor profile `bwrap-userns-restrict` (`kernel.apparmor_restrict_unprivileged_userns
  = 1`) lets `bwrap` create one user namespace and denies a second inside it: `bwrap … --unshare-user … true` passes,
  the same nested in another `bwrap` fails with `No permissions to create a new namespace`. The eval's Bash sandbox
  needs the nested one. The shell the eval was started from is not sandboxed (initial user namespace, no seccomp).
  Changing it needs root: the maintainer's decision.
- Results and reports go outside the repository (the scratchpad): biome lints the generated `report.html` and JSON.
- Skill changes since the smoke (b58dfc0, bc28051) are copied into the plugin by `sync.sh` before the next round.
- Maintainer, 2026-11-10: the calibration cap rises to $10; the evals run with Bash, each run in its own throwaway
  workspace, and the kept results come into `skills-work/evals/results/<round>/` for review (a nested `biome.json`
  there, `files.includes: ["!**"]`, keeps them out of `pnpm lint`; tested with a badly formatted `.ts` and `.json`).
- The sandbox cause, refined: on this machine (Ubuntu 26.04.1, kernel 7.0.0-43) every process `bwrap` starts runs as
  `bwrap//&unpriv_bwrap (enforce)`, the stack of Ubuntu's `bwrap-userns-restrict` profile, whose `unpriv_bwrap` has
  `audit deny capability`; it attaches to `/usr/bin/bwrap` (the first `bwrap` on `PATH`) by path, whatever
  `kernel.apparmor_restrict_unprivileged_userns` says, so the sysctl alone may not be enough. Nested `bwrap
  --unshare-user` fails ("No permissions to create a new namespace"). Claude Code's sandboxing docs give two fixes: an
  AppArmor profile for `/usr/bin/bwrap` (`flags=(unconfined)`, `userns,`) or the sysctl (every program, until reboot);
  neither mentions Ubuntu's own `bwrap` profile. Docker needs root here (the user is not in the `docker` group).
  Proposed to the maintainer: the sysctl first, then, if nested `bwrap` still fails, unloading Ubuntu's profile until
  the run ends (`apparmor_parser -R`, restored with `-r` or a reboot); checked each time with nested `bwrap`, free,
  then the smoke case.
- Maintainer, 2026-11-10: ran `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`. A user namespace at the
  top level then works, but inside `bwrap` still fails (`unshare: write failed /proc/self/uid_map: Operation not
  permitted`; children still `bwrap//&unpriv_bwrap`). Then `sudo apparmor_parser -R
  /etc/apparmor.d/bwrap-userns-restrict`: children run unconfined, a user namespace inside `bwrap` and a nested `bwrap`
  both work. **To restore after the rounds**: `sudo apparmor_parser -r /etc/apparmor.d/bwrap-userns-restrict` and
  `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=1` (a reboot restores both).
- **Smoke 2** (`results/smoke-2/`, $0.28, 53 s, 30 turns, score 0.5): Bash ran (`tsc --noEmit` passed), but every write
  from Bash failed with `Read-only file system`, in the workspace and in `$TMPDIR`, so Playwright could not create its
  transform cache; `npx` was not found. The agent wrote its files with Write and stopped, reporting why. Cause, read from
  the run's generated `config/settings.json`: `sandbox.filesystem.allowWrite` holds the run's home and tmp under
  `/tmp/claude-eval-*/`, and `denyWrite` holds `//tmp`, which wins; `denyRead` holds the operator's home (`//home/<user>`) with `allowRead`
  only for the run's folders and the PATH folders, so nvm's `npx` (a link into nvm's `lib/`) and the scaffold's link to
  `~/.cache/ms-playwright` cannot be read. A Linux-specific clash in the eval command (its temp folder is in `/tmp`),
  worth reporting to Claude Code.
- Workarounds (in `skills-work/evals/`): `run-eval.sh` runs the eval with `TMPDIR` in `~/.cache/pomwright-evals/tmp`
  and **a stand-in for `npx`** first on PATH (`npx-stand-in.sh`: runs the project's own `node_modules/.bin` command,
  as npx does for an installed package; it replaced nvm's npx, which the sandbox cannot read; it could hide an agent
  that relies on npx fetching a package, which the run's lack of network would stop anyway); the scaffold copies
  Playwright 1.64's `chromium_headless_shell` into the run's home. The four other cases failed to load (`YAML parse
  failed`): their `description` had an unquoted `: `; quoted.
- **Smoke 3** (`results/smoke-3/`, with the workarounds; $0.20, 46 s, 21 turns): **score 1**. The skill loaded, the
  agent copied and adapted the templates, `npx tsc --noEmit` and `npx playwright test` ran in the sandbox through the
  stand-in, 1 passed; the judge 3 of 3. The harness works on this machine.
- Before calibration: the `lamp-query` and `login-page-object` scaffolds were one line with a literal `\n` (fixed); the
  `lamp-query` grader failed any `hasText: "Lamp"`, which the skills now teach narrowed with `hasNotText`: it now passes
  a heading's exact name, an anchored text, or `hasText` narrowed by `hasNotText`, and still fails a bare substring or an
  index.
- **Calibration 1** started: `--tag calibration` (4 cases), Sonnet, one run, with and without the plugin (8 runs), `-j
  1`, $10 cap.
- **Calibration 1 done** (`results/calibration-1/REPORT.md`): $1.33 for 8 runs (Sonnet), every with-arm 1; only
  `decisions-first` tells the arms apart (+1); without the skills Sonnet passed the decided cases from `POMWRIGHT.md`, the
  package's README and the declarations' doc comments; the code differs where the graders do not look (an index, a path
  registered twice, locators outside the module, the page's own locators past the registry). Collected with
  `collect.py` into `results/calibration-1/runs/`. Next, proposed to the maintainer: sharper graders and cases that need
  more than the decisions file, a second calibration across the three models to measure cost, then the matrix.
- Maintainer, 2026-11-10: go for sharper graders, four new cases and a second calibration on the three models, $15 cap.
- **Sharper graders** (smoke, lamp-query, login-page-object; seed-cart): `no-index` and `no-sleep` are regex graders over
  what the agent wrote (Write's `content`, Edit's `new_string`, a Bash heredoc, in the trace; a regex grader reads a
  file's contents only at a fixed path, and `files` lists paths only), checked on calibration 1's traces in Python and
  in JavaScript: the index pattern fires on the no-skill `lamp-query` run's `nth(1)` alone (a first pattern over every
  `"content"` fired on docs the agents read); `conventions`, an LLM grader with five checkable rules (one path per
  element, where locators are registered, the registry not bypassed, plural and singular, no index where a name
  identifies); `test-passed` now matches Playwright's summary line, `\d+ passed \(\d`.
- **New cases**, each workspace's project run first: `upgrade-2x` (a 2.1.0 project written from 2.1.0's own types,
  compiled and passing 2 of 2 on pomwright 2.1.0 with Playwright 1.64 against the practice shop; on 3.0.2 five compile
  errors: `setOnNextNavigation`, `UrlTypeOptions`, `waitForLoadState`, `gotoThisPage` twice; the cart then needs the
  `json` codec); `review-project` (the skill's templates plus products and cart pages with seven planted problems, 9 of
  9 passing, so the problems are latent; an `expect` without `await` was dropped as a plant because Playwright 1.64 fails
  it at the test's end, "Test ended"); `seed-cart` (the decided workspace; the cart in session storage, `seed`);
  `existing-tests` (plain Playwright specs with `baseURL` in the config and data in the specs, no POMWRIGHT.md, 6 of 6
  passing). The round grants `WebFetch(domain:dyhex.github.io)`: the upgrade guide sends the agent to the site.
- **Calibration 2** started: Sonnet first ($5 cap), then Haiku and Opus within the $15 total.
- **Calibration 2, Sonnet** (`results/calibration-2/sonnet/`): $2.71 for 16 runs, 646 s. With the skills /
  without: decisions-first 1/0, existing-tests 0.5/0, lamp-query 0.8/0.8, login-page-object 1/1, plain-playwright 1/1,
  review-project 0.67/1, seed-cart 0.5/0.75, upgrade-2x 1/1. Read run by run:
  - grader mistakes: `no-index` and `conventions` failed a cell picked by its column (`getByRole("cell").nth(1)`; a
    cell's name is its content); the `existing-tests` rubric was stricter than meant (the run with the skills showed
    the config's `baseURL` and implied the data's place). Fixed before Haiku and Opus; the pattern now has a lookbehind
    for `getByRole("cell")`, checked in JavaScript on both rounds' traces.
  - **skill gaps, to fix after the round**: the review with the skills found 6 of the 7 planted problems but not the
    substring one, and proposed `hasText: options.product` and `hasText: "Lamp"` itself: the skills never say that
    `hasText` is a case-insensitive substring; the template's "a folder per app in `fixtures/`, `test-data/`" contradicts
    the layout and templates (a file per app there), which the same review reported; the decisions question could show
    what the code does now per decision.
- **Calibration 2, Haiku** started, $2.50 cap, the same skills.
- **Calibration 2 done** (`results/calibration-2/REPORT.md`): agents $10.30 (Haiku $0.44, $0.03 a run; Sonnet $2.71,
  $0.17; Opus $7.15, $0.45) plus judges $0.49, $10.79 in all; the eval's total counts the agents only. The decisions come
  first only with the skills (Sonnet, Opus); Haiku read the rule and skipped it; Opus with the skills takes about half
  the turns on the code cases; `hasText: "Lamp"` missed in a review and used in a test, with the skills; the decisions
  question merged "now" and the default; the template's layout line contradicted the layout (a review found it).
  Fixed in 6ae2837. **Recheck 1** started (with-skills arm only): Haiku all cases twice, Sonnet all once, Opus
  `existing-tests`, within the $15.
- **Recheck 1** (`results/recheck-1/`, with-skills arm only, $2.12 with judges): Haiku decisions-first 2 of 2 and
  existing-tests 2 of 2 (0 before); review-project passes on Sonnet and on one Haiku run of two; Opus existing-tests 1.
  Left: seed-cart on Sonnet and one Haiku run still find the row with `hasText: options.product`; Haiku's conventions
  on lamp-query (one run chains `getByRole("cell")` onto `getNestedLocator("main.table@cart")`, past the registry;
  the other builds its filter's `has` from `getLocator(…).getByText(…, { exact: true })`, which rule 1 allows: a
  borderline verdict). Cause of the first: SKILL.md's main example, and the writing-tests and review examples, found
  an order's row with `hasText: options.order`; the agents copy it. Fixed in 500fae4: the examples filter the rows by
  a query of the row header with its exact name, rule 3 states the substring rule; `skillsChains.spec.ts` rebuilds
  the rendering (27 passed, three browsers). Probe `probes/xpath/rowheader.spec.ts` (a **stand-in**, `setContent`: no
  page here has row headers; could hide a table that builds its header otherwise): the exact filter matches one row
  and clicks it, `hasText: "ORD-1042"` matches two, 9 of 9 on three browsers.
- **Recheck 2** started: seed-cart and review-project, Sonnet once, Haiku twice, within the $15.
- **Recheck 2** (`results/recheck-2/`, $0.59): seed-cart passes on Sonnet and on both Haiku runs (the rows by an exact
  name now); review-project passes on Sonnet and on the Haiku run that loaded the skill; the other Haiku run did not load
  it and missed findings: triggering on a review is unsteady on Haiku. Spend in the $15 approval: calibration 2 $10.79,
  recheck 1 $2.12, recheck 2 $0.59: $13.50.
- **Proposed to the maintainer: the full matrix**, the eight calibration cases, with and without, 3 runs, on Haiku,
  Sonnet and Opus (144 runs). Measured per run, judges included: Haiku about $0.04, Sonnet $0.18, Opus $0.46: about
  $33; ceiling proposed $40; one run at a time (concurrent runs untested here; each starts the shop on port 4173),
  about 2.5 hours.
- Maintainer, 2026-11-11: the ceiling is $100; do the full run. **Matrix 1** started (`results/matrix-1/`): the eight
  calibration cases, with and without, 3 runs, Haiku ($10 cap), Sonnet ($30), Opus ($60), one at a time, the skills at
  500fae4.
- **Matrix 1 done** (`results/matrix-1/REPORT.md`): agents $31.22 (Haiku $1.26, Sonnet $8.54, Opus $21.42) plus judges
  $1.46, $32.68 in all, 2 h 17 min. With the skills: Haiku 0.83 (13 of 24 runs pass every grader), Sonnet 0.95 (19),
  Opus 0.97 (21). The decisions come first only with the skills (0 of 18 runs without); the review needs them (0 of 9
  without, 8 of 9 with); on the code cases the scores are about the same with and without, since the decided
  `POMWRIGHT.md` guides both arms, and with the skills every model costs less per run. `verify.py` (Bash, outside the
  eval): the 72 code workspaces of the three models compile and pass their tests (stand-ins: the fixture's
  `node_modules` linked, port 4190, chromium only). The judges keep votes, not reasons: every failing run read against
  its rubric; 8 of 19 judged failures were split votes; Opus existing-tests run 1 judged FAIL 3 to 0 though runs 2 and
  3, near the same, passed, and a re-ask of Haiku with the rubric (a **stand-in**: my prompt, not the eval's) passed it
  3 to 0. Two skill gaps, fixed in 7a9cf0c: `guides/writing-page-objects.md` registered `main` in the page's module and
  had no common module in its base class (5 of the 7 login runs without one failed the decisions grader, 0 of 11 with
  one); a table without row headers (10 runs named every cell `cell@product`, singular): rule 4 and the locator guide
  name a segment by its registration, and a worked table example, probed (`probes/table/`, 3 of 3 browsers). For the
  maintainer: `locator("main")` against rule 3's order (28 places in the skills, 55 on the site); how the upgrade
  reaches the items that compile (2 of 9 runs each arm kept the `[]`/`null` hooks; `WebFetch` summarizes the 709-line
  page). **Recheck 3** started: lamp-query, login-page-object, seed-cart, with the skills only, 3 runs on each model.
- **Recheck 3** (`results/recheck-3/REPORT.md`, $8.55): base class with the common module in 24 of 27 runs (18 of 27
  in matrix 1); a singular `cell…` for every cell: Haiku 1 of 6 (5 before), Sonnet 5 of 6 (5 before; it reads SKILL.md,
  not the locator guide), Opus 0. The judges grade an elided trace (the code is in the elided middle in most runs; a
  re-ask of Haiku on one run said it could not grade), with Haiku as judge where the eval's own guidance says
  Sonnet-tier: their code verdicts are a weak signal, so the gaps are counted from the code. `no-index` flags a column
  pick in a query (`rows.cells` … `.nth(1)`): a grader mistake. Fixed in 1cf356a: rule 4, "a row with no row header is
  picked by one of its `cells`".
- **Recheck 4** (`results/recheck-4/REPORT.md`, $1.93): Sonnet `rows.cells` in 6 of 6, Haiku 4 of 6. Both rechecks'
  39 workspaces compile and pass (`verify.py`). Spend: matrix 1 $32.68, rechecks 3 and 4 $10.48: **$43.16 of $100**.
  For the maintainer (matrix-1 REPORT): `locator("main")` against rule 3's order; how the upgrade reaches the items
  that compile; Sonnet-tier judges and file-based code graders for the next round.
