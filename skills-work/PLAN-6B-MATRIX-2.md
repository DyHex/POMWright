# PLAN-6B: the skills' rules as defaults, then matrix 2 on Opus 5.5

Written 2026-11-11 after matrix 1 (`evals/results/matrix-1/REPORT.md`). Answers 2026-11-11: Q1 yes; Q2 yes ($100),
the map-site evals in a plan of their own (`PLAN-3B-MAP-SITE.md`); Q3 (a) and (b), with the project mapped first
(step 1c); Q4 yes (PLAN-2D and PLAN-7 wait); Q5 yes (in PLAN-3B). PLAN-8 (`getByRole("main")` across the repository)
runs first.

## The maintainer's decisions (2026-11-11)

1. **The rules are defaults; the case decides.** Projects, pages, tests, users and their preferences differ, so a
   skill investigates before it applies a default, and never treats an example as a template to copy. The locator
   order is a preference: the element, the DOM and the app decide. A scope segment is deliberate (a `main` segment
   keeps the search inside main, registered `getByRole("main")` since PLAN-8; the maintainer's first wording,
   `locator("main")`, rested on not knowing `main` is a role); a dialog rendered outside main starts its own path
   (`dialog@consent.button@confirm`); an app with no main, or no need for it, has no main segment.
2. **The upgrade's items that compile: both (a) and (b)** (Q3): the list with its check, and the page itself read whole.
3. **Judges: Opus 5.5 at effort high.**
4. **Code graded from the files, with deterministic checks where a rule can be stated:** agreed.
5. **Matrix 2: Opus 5.5 only, effort high** (2026-11-11, after the effort probe in the execution notes; first
   proposed as medium and high). Each case sets `CLAUDE_CODE_EFFORT_LEVEL=high` in `execution.env`. Haiku and Sonnet
   are dropped. xhigh only where high falls short: if the first batch shows mistakes on the hardest cases (likely
   `review-project`, `upgrade-wrapped`, `decisions-from-code`), those rerun at xhigh. `max` only if xhigh clearly beats
   high. The site's recommended effort comes from the final reports, not the probe alone (agreed 2026-11-11).

## Step 1: the rules as defaults, with their reasons (skills)

- `SKILL.md`, *The rules for every task*: the rules are defaults, each with its reason; the agent investigates the
  case first (the project's code and `POMWRIGHT.md`, the page, what the user asked), departs from a default where its
  reason does not hold and says so; the examples show the reasoning, not a pattern to copy. Rule 3: the order is the
  usual choice, not a sequence to try blindly; a scope segment is chosen for its scope; a dialog outside main starts its
  own path; a page without main has none. SKILL.md is at 250 lines, so the words come out of the same rules.
- `guides/choosing-locators-and-paths.md`: a section on scope: what a scope segment buys, a dialog outside main
  (the practice shop's cookie dialog, which sits after `</main>`), a page with no main.
- `guides/reviewing.md`: a review reports a locator by what it does on the page (fragile, ambiguous, not what a user
  sees), never because it is not first in the order; `locator("main")` and other scope locators are not findings.
- The same pass over the other rules (4 to 11) and the guides for wording that reads as absolute where it is a default.
  Rules that are facts of the API stay absolute (registration once, synchronous resolution, `getNestedLocator` for
  acting): a list of what changes goes in the execution notes before editing.
- `pomwright-map-site/SKILL.md`: the same for its locator choice.
- **`pomwright-map-site`**: its rework (what it reads, what it needs, acting on a page) is `PLAN-3B-MAP-SITE.md`.
- **Step 1c, the upgrade guide (Q3 (a) and (b))**: `guides/upgrading-from-2x.md` lists each change that compiles with
  its search, kept true by a check against the site page (`scripts/`, run by `pnpm lint:skills` or the docs checks),
  and has the agent read the page whole: the raw Markdown at the installed version's tag
  (`https://raw.githubusercontent.com/DyHex/POMWright/v<version>/website/src/content/docs/docs/upgrading-from-2x.md`,
  present at `v3.0.2`), fetched with a tool that returns the file as it is (`curl`), since `WebFetch` returns a model's
  summary. The list says where to look; the page says what each change means. Before running the searches, the agent
  maps how the project uses POMWright: where its page objects, base classes, locator modules, registries and storage
  schemas are, whether it wraps or re-exports POMWright's classes, its folders and packages (a monorepo); then it
  adapts each search (another class name, another folder, a wrapper's method) and says which it adapted and why.
- Probe on the practice shop, three browsers, before any example is written: the cookie dialog found by
  `dialog@cookies.button@accept` without main, and `main` scoping out what lies outside it.
- Checks: `pnpm lint`, `pnpm lint:skills`, `pnpm lint:guide`, `node scripts/check-doc-snippets.mjs`,
  `pnpm pack-test tests/docs/skillsChains.spec.ts --reporter=line`. One commit.
- The site needs no change for this: its pages use `locator("main")` and state no order (checked:
  `principles.md`, `registering-locators.md`, `locator-paths.md`).

## Step 2: graders and cases

- **Judges**: `--judge-model` takes the model; the eval has no flag for the judges' effort (`claude plugin eval --help`,
  2.1.319). Probe whether the judges honor `CLAUDE_CODE_EFFORT_LEVEL` from the environment, and how a run shows the
  effort it used. If the judges' effort cannot be set or seen, stop and report.
- **Agents' effort**: a case can set `execution.env` (the case schema in the binary); probe `CLAUDE_CODE_EFFORT_LEVEL`
  there and from `run-eval.sh`'s environment, and find what shows it took effect (a debug log, the result). Matrix 1's
  effort is not in its result: whatever default it ran at is unknown, so matrix 1's Opus numbers compare with matrix 2's
  only as "the default".
- **Code graders from the files**: the decided `POMWRIGHT.md` and the prompts name the files a case writes, so an LLM
  grader reads them with `focus: {source: file, path}` instead of the elided trace. `verify.py` adds the deterministic
  checks: the base class registers the common module; no singular segment registered for every cell of a row;
  `tsc` and the tests, as now.
- `no-index`: exempt a column pick (`.nth(` on `rows.cells` in a query) on the table cases, or drop it there and count
  index uses in `verify.py`.
- **New cases for decision 1**:
  - `cookie-dialog`: accept the cookie dialog in a test on the decided project; passes if the path starts at the dialog
    (not under main), the test passes, and nothing else changes.
  - `review-scope`: the review case's project with `locator("main")` and a test-id locator where nothing user-facing
    names the element; passes if the review does not report them, and still finds the planted defects.
- Every probe here runs a case with no Bash first, to learn whether it needs the sandbox; what needs Bash waits for the
  maintainer's sysctl change (step 3).

## Step 3: matrix 2

- The maintainer opens the sandbox again (`sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`,
  `sudo apparmor_parser -R /etc/apparmor.d/bwrap-userns-restrict`), and only then.
- A calibration first: one code case, one run per effort, with the new graders and Opus judges, to measure the cost of a
  run and of its judges, and to see the graders work. Then the matrix: every case, three runs, effort medium and high,
  the arms of Q1, under the ceiling of Q2.
- Then as matrix 1: collect, re-run the code with `verify.py` (three browsers this time, not chromium only, unless it
  costs far more than it is worth), report (`results/matrix-2/REPORT.md`, medium against high, and against matrix 1's
  Opus), fix clear gaps with a recheck, tidy, and the maintainer restores the system.

## Step 4: what matrix 2 showed (the maintainer's decisions, 2026-11-11 night)

Decisions:

- **Names are a convention** the project states in POMWRIGHT.md and keeps; another convention is not wrong. The
  default kind says what the element does, in a word its like share: `input` for any field (text, email, search,
  password), `dropdown` for a select or combobox, while elements that behave differently keep their own kind (`button`, `link`,
  `checkbox`, `radio`); landmarks and read elements by the names readers know (`header`, `footer`, `navigation`,
  `text`). `@which` names what the locator picks the element by: `button@save` (`getByRole("button", { name: "Save" })`)
  and `button` (`getByRole("button")`) are different paths with different locators. When to add it is a judgment, as a
  tester's: to tell like elements apart (`button@save`, `region@delivery`, `section@delivery` picked by its heading);
  not for the only one of its kind (`main.status`), nor for rows and cards picked by their data (plural, a query or a
  helper picks one).
- **Code and POMWRIGHT.md disagree**: say so and ask which holds, then record the answer.
- **`expect…` methods**: neither place is wrong. A check of a part of the page other tests are likely to check too
  belongs in the page code, even while one test uses it; a check specific to one test stays in it; ask when unclear.
- **Ask**: where several ways are right and nothing says which, ask the user, all open questions together in one
  message, not one at a time; where no one can be asked, make the educated guess a tester would and say why.
- Probed (Playwright 1.64, all three browsers): a password field is a `textbox` to `getByRole` and in the aria
  snapshot, so the judges' and my earlier "a password field has no role" was wrong; the skills do not say it.
- No matrix at other efforts. The `storage-read` criterion concerns grading only; the code was right.

Changes: the `pomwright` skill's SKILL.md (rule 4, the rules' preamble, POMWRIGHT.md found, the example's reason),
the template's POMWRIGHT.md (segment names, assertions), `guides/project-decisions.md` (the two rows),
`guides/choosing-locators-and-paths.md` (the names), `references/paths-and-registry.md`, `guides/writing-page-objects.md`
(`expectTotal`'s reason), `skills/AGENTS.md` (the defaults; asking), `pomwright-map-site` step 1 (one message). Evals:
the shared naming criterion follows the project's convention, consistently, either side where the project contradicts
itself; `expect…` methods either place; `storage-read`'s third criterion accepts a literal quantity matching the clicks
and a whole-cart `toEqual`; after a re-grade, the shop workspace's `addToCart` assertion moves out. Checks as for
every skill change; one commit.

## Step 5: what matrix 2b showed (the maintainer's go, 2026-11-11 night)

- SKILL.md rule 11 names what two cases missed: a page object whose content arrives after it loads says what "loaded"
  means in `pageActionsToPerformAfterNavigation()`, so `navigation.goto()` and `expectThisPage()` wait for it
  (`loaded-hook`); a value read once (`count()`, `isVisible()`) and then asserted is not a web-first assertion
  (`test-id-config`).
- SKILL.md's POMWRIGHT.md *Found*: where the project's code departs from the file, say so in the reply and ask which
  holds (matrix 2b: code tasks followed the code without saying so).
- SKILL.md stays at 250 lines. Checks as for every skill change; one commit. Then matrix 2c: the two cases that fell
  back from the old skills to the new, with the skills only, 5 runs each, on the same workspaces, graded, corrected and
  compared with matrix 2b, matrix 2's runs with the skills, and without.

## Step 6: the value a test checks does not find its cell (the maintainer's go, 2026-11-11 night)

Matrix 2 and 2c: three runs with the skills checked an order's status as "the row has a cell named exactly *Shipped*",
which fails only as "not found" for a wrong status; every run without the skills read the status column
(`getByRole("cell").nth(1)`) with `toHaveText`. The run said why: position "would break if the columns are
reordered". SKILL.md's rule 3 teaches picking an item by the element inside that names it; the opposite for the value
under test was only in the guide's table example. SKILL.md's example note now says it with its reason (a moved column
fails with what it found, as a wrong value does), and the guide's table example gives the reason too. SKILL.md stays
at 250 lines (rule 9 on one line). Then a recheck: loaded-hook, the skills only, 5 runs (matrix 2d). The map-site
evals wait until this skill is done (the maintainer); their ceiling, about $55 plus grading for the cells at 2 runs
each, the xhigh sweep after, is agreed.

## Step 7: a project's names over the skill's (the maintainer's go, 2026-11-11 night)

Matrix 2e: in a project with no page code whose POMWRIGHT.md names kinds by role, every run used the skill's default
names (`input@email`, `header`) and said it followed the file; matrix 2b fell back the same way in lamp-query,
login-page-object and seed-cart. SKILL.md now says it in both places an agent reads: *Found* lists the names its
examples use among the defaults a project's decisions replace, and rule 4 gives the default with its exception
(where POMWRIGHT.md names kinds by role, a field is `textbox@…`, the header `banner`). SKILL.md stays at 250 lines.
Then matrix 2f: lamp-query, login-page-object and seed-cart, the skills only, 3 runs each.

## Step 8: the review's fixes, consistent evals, matrix 3 (the maintainer, 2026-11-11 late)

The maintainer: "pretty good" is the bar; the goal is good, maintainable POMWright code. Decisions: `@which` in a
user's words, what the element does or what it is for, as the context suits (`button@login` over `button@submit`); a
section is `section@…` whether or not it has an accessible name; the budget is reset to $200 from here.

- Skill: SKILL.md restores "not a pattern to copy" (dropped in step 4) for examples and templates, names included;
  rule 4's `@which` in a user's words; *Found* lists the templates' names too. The guide's names section and the
  template's decision say the same; `region@` paths become `section@` (the locator stays `getByRole("region")`);
  project-structure's copy step says to adapt names; `skills/AGENTS.md` follows.
- Evals: the workspaces consistent and in the maintainer's conventions (POMWRIGHT.md's names line as the template's;
  the shop's actions without assertions, with `expect…` steps beside them; helpers' comments saying what they
  return); the shared rubric's names criterion as the decisions say; `checks.py`, code checks for the conventions,
  run over every round's saved code; matrix 3: all 23 cases, both arms (the workspaces changed, so matrix 2's runs
  without the skills no longer compare), 3 runs each, then a report on the code checks first and the judges second.

## How a result is judged (the maintainer, 2026-11-11)

Four measures, each with the skills against without, per case and per effort: **correctness** (the task done right:
graders, and the code run again), **mistakes** (counted from the code and the transcript, each named), **time** (a
run's duration) and **cost** (the agent's tokens; the judges reported apart). Correctness and mistakes come first;
time and cost are weighed by what they buy.

- Worse correctness or more mistakes than without the skills is a failure, whatever the time and cost.
- Equal or slightly better: the skills must at least be cheaper or faster than without.
- Noticeably better: the same time and cost is a major win, less is better still; more is worth it in proportion to
  what the gain consists of (a much better result for twice the cost can beat a slightly better one for three times).
- Best: better on all four.

What the matrix can tell: three runs per cell show large differences only, so the report gives each cell's range
beside its mean and calls a difference noticeable only where the ranges do not overlap, or names it a tendency.

**Time under concurrency.** The eval runs up to 8 agents at once (`-j`), which share one rate limit, so a run's
duration grows with the runs beside it. Both arms of a case therefore run in the same invocation at the same
concurrency, interleaved, and time is compared only within a concurrency level; turns and the agent's API time, where
the result has it, are reported beside it. The practice shop's port is fixed (4173) in the fixture, so concurrent runs
need a port each: the scaffold sets one per run (`SHOP_PORT`) before `-j` goes above 1.

**Cases nearer real work.** Matrix 1's cases are small, and the runs with the skills often copied an example
literally. Matrix 2 adds variety where it costs little: the decided project with a page that differs from the
skills' examples (a dialog outside main, a row picked by another cell), a project whose structure differs from the
templates (its own base class name, a wrapper around `PageObject`), and the graders ask whether the agent looked at the
page or the project before deciding (a snapshot, a read of the existing code) rather than whether it matched an example.

## Questions

- **Q1. Both arms, with and without the skills, at both efforts?** Recommended: yes. Matrix 1 showed the skills'
  value in the decisions and review cases; whether that holds at medium is part of the question. Without the arm, the
  matrix costs about half.
- **Q2. The ceiling.** Matrix 1's Opus half cost $21.42 for 48 runs at the default effort, with Haiku judges at $0.52.
  Two efforts, two new cases and Opus judges at high cost more, by how much the calibration measures. Recommended: $100
  for matrix 2, with a stop after the calibration if the estimate exceeds it.
- **Q3. The upgrade's items that compile** (matrix 1, open): list each item's search in the skill's upgrade guide, kept
  true by a check against the site page; point the agent at the page's raw Markdown so it reads it whole; or keep it as
  is. Recommended: the list in the skill with a check, since it does not depend on how a fetch tool summarizes.
- **Q4. Order**: this plan before PLAN-2D and PLAN-7, since step 1 changes wording both of them touch? Recommended: yes.

- **Q5.** Answered: yes; in `PLAN-3B-MAP-SITE.md`.

## Execution notes

- 2026-11-11, the effort probe (`claude -p`, Opus 5.5, no tools, one counting puzzle, answer 7776): `--effort low`
  128,634 output tokens, 14 min, $3.28, right; `high` 412 tokens, 4 s, right; `xhigh` 439, 5 s, right;
  `CLAUDE_CODE_EFFORT_LEVEL=low` 128,199 tokens, 14 min, $3.48, no answer; the variable at `xhigh` 509, 5 s, right;
  no settings (the default) 128,726 tokens, 13.5 min, $3.31, right; `medium` three times: 2 s with no answer, then
  stopped at the 2-minute cap twice. `auto` is not an `--effort` value (the CLI: low, medium, high, xhigh, max).
  So the variable sets a run's effort, and high is the level for the evals. One puzzle with no tools is a narrow
  sample: matrix 1, most likely at the default (its runs have homes of their own, without the maintainer's settings),
  had no run over 128 s; the first batch of matrix 2 compares its per-run time and cost with matrix 1's.
- The eval tool starts each run as `claude -p --setting-sources user --model …`, with no effort flag (read from the
  2.1.319 binary).
- Each run's shop gets a free port (`scaffold-common.sh`), written over 4173 in its workspace; the prompts no longer name
  the port; `verify.py` reads the run's port from its config. Two scaffolds got 46133 and 43543.
- 2026-11-11, step 1 committed as 21f3c1d; the maintainer's blank-line default as step 1d, 12bf979, after
  it (a blank line between registrations, a *not asked* decision; 71 blank lines in 14 skill files). For step 2: the
  review workspace's locator modules are packed, so a review against the new default could report them; give the
  review case's `POMWRIGHT.md` or its modules the layout the case intends.
- 2026-11-11, step 2, the graders: an LLM grader with `focus: files` gets only the names of the files the run created
  (probed: an eval with one new and one edited file; the judge saw `hello.ts`, nothing of the edit, no content), so it
  cannot grade code. `case.yaml`'s `execution.env` takes only `EVAL_*` keys ("anything else must come from the
  operator's shell"): the effort is set in `run-eval.sh`'s environment. So the code is graded outside the eval:
  `grade.py` gives each collected run's written files and the case's rubrics (`rubrics/*.md`) to Opus 5.5 at effort
  high through `claude -p`, and keeps a verdict and a reason per criterion and the mistakes it names; the eval keeps
  the graders that need no code: tool use, the trace's regexes, and LLM graders of the last message. `no-index` is
  dropped from the table cases (the rubric judges an index with its reason).
- 2026-11-11, step 2 built (all in `evals/`, uncommitted):
  - the shop gained eval-only pages (`/orders`, `/products/<id>`, `/deals`, `/promo`; the teach skill's copy is
    unchanged), probed in three browsers (`probes/pages/`, 15 of 15): the orders arrive 0.4 to 1.2 s late behind a
    progress bar, the badge is named only by `data-qa`, the survey covers `/deals` on about half the visits (a click
    without a handler fails each time it does), `/promo` applies a JSON-encoded string and not a raw one;
  - `workspaces/shop`, the review project with its seven problems fixed, `getByRole("main")` and blank lines, and
    from it (`build-workspaces.py`) a workspace per case; each starting point checked with `try-workspace.sh`
    (compiles and passes, or fails as the case says: the flaky spec 9 of 20; the 2.x projects fail to compile);
  - reference solutions in `solutions/`: the upgrade cases' naive upgrades fail as designed ("No code applied";
    "element(s) not found") and the right ones pass; param-route, iframe and storage-read pass;
  - 15 case folders and their rubrics (`build-cases.py`); the review project's POMWRIGHT.md records its packed
    registrations, so the new default does not change that case;
  - `grade.py`, checked on matrix 1's login runs and on three reference solutions: it found what my references
    missed (no check of the cart status; a literal quantity), and two of its "mistakes" contradicted the skills, so
    the rubric now names plain kinds (`text@…`) and the project's own slots, and a mistake excludes taste;
  - `run-eval.sh` runs at high (the effort from the shell reaches the runs: probed) with Opus judges; each run's shop
    on a port of its own; `run-matrix-2.sh` runs the 23 cases one per invocation, four runs at a time, and stops
    before a case when `window.py` reads the five-hour window at 90% or more.
- To probe when the sandbox opens: whether a run's shell reaches raw.githubusercontent.com (the upgrade guide's
  `curl`); the upgrade cases also allow `WebFetch` for that domain.
- 2026-11-11, matrix 2 ran (15:31 to 16:22, 138 runs, 0 errors) and was processed by 17:39; a third, lone try of the
  `iframe` judgment that timed out twice passed in 22 s. Report: `evals/results/matrix-2/REPORT.md`. Recorded spend
  $90.87 (agents $69.04, eval judges $1.81, grade.py $20.02; the 10 judge attempts cut at 300 s report no cost).
- Fixed while processing: post-matrix-2.sh named every case to verify.py, which overrode its code-case list, so
  `decisions-first`'s with-skills runs (right to ask first, no test written) counted as failed reruns; verify.py now
  keeps only code cases, and the report counts the rerun only for them.
- Debt found (in the report's findings): the template's POMWRIGHT.md says the kind is the element's role, while the
  template, the examples, the docs and the tests write `input@…` and `header`; the eval's shop workspace (mine) adds a
  bare `main.status` and an assertion inside `addToCart` against its own decisions; the `expect…` examples give no
  reason; the `storage-read` rubric's third criterion is debatable. Waiting for the maintainer's decisions.
- 2026-11-11 night, step 4 committed (3cfebd3) after lint, lint:skills, lint:guide, the doc snippets and the skills
  chain spec on the packed build. SKILL.md stays at 250 lines: rule 1 and the example's note were tightened to make
  room, and "a row with no row header is picked by one of its `cells`" (1cf356a) was kept. Probed: Playwright 1.64 gives
  a password field the role `textbox` in all three browsers, so no skill says it has none. Evals: the shared
  conventions rubric (copied into the 14 case folders), login-page-object's follows-decisions and storage-read's
  criterion are revised; not re-graded yet. The shop workspace's `addToCart` assertion and its POMWRIGHT.md's old naming
  line stay until a new matrix, so a check run compares with matrix 2's arms on the same workspaces.
- 2026-11-11 night, the maintainer: rerun every case with the step 4 skills only (matrix 2b, `run-matrix-2b.sh`,
  `--ablation none`, `.skills-ref` 3cfebd3, its runs capped at $60, $8 a case), compared with matrix 2's arms; and
  correct the judges' errors from what is known instead of judging again. `corrections.py` lists 152 corrections for
  matrix 2 (91 with, 61 without; ten reasons), `report-matrix-2.py` applies them (`--as-graded` for the judges' own),
  `report-matrix-2b.py` compares the three. Corrected, matrix 2 is 69 of 69 correct with the skills against 46 of 69,
  0.4 mistakes per run against 0.6. Found while correcting: grade.py showed the files with the port mapped back to
  4173 but POMWRIGHT.md with the run's port, so 36 judgments flagged `env.ts` (fixed: POMWRIGHT.md is mapped too).
- 2026-11-11 night, matrix 2b ran (20:55 to 21:20, 69 runs, all eval scores 1, every rerun passing) and was processed
  by 21:42; 71 corrections (`corrections.py`). Corrected: 66 of 69 correct, against 69 of 69 (old skills) and 46 of 69
  (without); mistakes, time and cost level with the old skills. Lower: `loaded-hook` 1 of 3 (below without's 3 of 3:
  two runs left "loaded" out of `pageActionsToPerformAfterNavigation()`, which SKILL.md never names) and
  `test-id-config` 2 of 3 (a count read once and asserted, a pattern rule 11 does not name). The "say so where code
  and POMWRIGHT.md disagree" reached 3 of 63 answers, the reviews mostly. Spend $45.26; both rounds $136.13 of $200.
  Report: `evals/results/matrix-2b/REPORT.md`. Waiting for the maintainer on the fixes it suggests.
- 2026-11-11 night, step 5 committed (1860d8d) after the skill checks; matrix 2c (`run-matrix-2c.sh`: loaded-hook
  and test-id-config, 5 runs each, the step 5 skills) ran 21:51 to 21:55: 5 of 5 correct in both (2b: 1 of 3, 2 of
  3), time and cost level; 19 corrections; the revised rubric's names criterion regained the plain kinds (`card`,
  `badge`). Spend $7.00; all rounds $143.13 of $200. Report: `evals/results/matrix-2c/REPORT.md`.
- 2026-11-11 night, step 6 committed (5a828df) after the skill checks; matrix 2d (`run-matrix-2d.sh`, loaded-hook, 5
  runs, the step 6 skills) ran 22:16 to 22:18: all 5 read the status column and use the loaded hook; corrected, 5 of
  5 correct with no mistakes, 50 s and $0.41 per run (without: 3 of 3, no mistakes, 75 s, $0.46). The shop's
  `card()` comment ("A product's card", returning the heading) is mirrored by runs, so those items count as the
  project's pattern in every round and both arms (10 more corrections). Spend $3.25; all rounds $146.38 of $200.
- Debt in my eval workspace, to fix before any further round on it (fixing it now would change the baseline grade.py
  compares saved runs against): the shop's `addToCart` and `removeItem` assert inside the action against its own
  POMWRIGHT.md, its `card()` comment says it returns the card, and its POMWRIGHT.md names kinds by role while its code
  writes `input` and `header`. Suggested remedy: `build-workspaces.py` writes them consistent (an `expect…` step beside
  each action, `cardHeading()`, the step 4 naming line).
- 2026-11-11 night, the maintainer agreed: (1) the small tasks' extra cost with the skills (`one-query`,
  `test-data-fixture`, `implicit-trigger`: +$0.03 to +$0.07 a run) is the price of loading the skill, accepted;
  (2) the upgrades' time read from the runs' logs: with the skills a run reads the upgrade guide, then fetches the
  site's whole upgrade page (709 lines) with `curl` and reads it, as the guide's step 3 says; without, it skims the
  installed CHANGELOG.md and lets `tsc` show the breaks. In 2b the skills are cheaper in upgrade-2x ($0.63 against
  $0.67) and upgrade-wrapped ($0.68 against $0.77, and faster); upgrade-promo is +11 s and +$0.03. The whole-page read
  is what keeps an upgrade from missing items on a real project; my recommendation is to keep it; (3) matrix 2e:
  login-page-object, 3 runs, the step 6 skills, for the reply that names a departure from POMWRIGHT.md.
- 2026-11-11 22:30, matrix 2e (login-page-object, 3 runs, step 6 skills): 0 of 3 correct. The decided workspace has no
  page code and a POMWRIGHT.md that names kinds by role; every run used the skill's default `input@email` and
  `header` and said it followed POMWRIGHT.md. So my "naming" corrections for lamp-query, login-page-object and
  seed-cart were wrong ("the project's code writes `input`" held only for the shop workspaces): 38 withdrawn
  (`corrections.py` WITHDRAWN). Corrected anew: matrix 2 66 of 69 with the skills against 46 of 69; matrix 2b 59 of 69
  (lamp-query 1/3, login-page-object 0/3, seed-cart 1/3, below the old skills): step 4's default names win over a
  role-based POMWRIGHT.md. Spend $2.99; all rounds $149.37 of $200. Waiting for the maintainer on the fix.
- 2026-11-11 22:50, step 7 committed (3fb704e); matrix 2f (the three decided-workspace cases, 3 runs each, step 7
  skills): fields follow the project (`input@` in 1 of 9 runs, against 3 of 9 before), the banner mostly not
  (`header` in 5 of 9): every run copied the template's common header module, which names it `header` and its "Shop"
  link `link@home`. Corrected 5 of 9 correct (2b 2 of 9, old 6 of 9, without 0 of 9). Spend $9.03; all rounds $158.40
  of $200. My withdrawal filter had first applied to every round; limited to matrix 2 and 2b.
- 2026-11-11 23:20, step 8's skill changes committed (5674e5a) after the skill checks. Evals: the base workspaces
  (shop, decided, review, upgrade-2x) carry the template's names and assertions lines (the shop's adds that an action
  waits for its own effect), the shop's `card()` comment says it returns the heading, variants rebuilt (shop,
  shop-twoqueries, decided compile; the shop's tests pass); the shared names criterion as decided; `checks.py` (names,
  main-once, no-sleep, no-xpath, web-first, registry, loaded-hook, value-cell) over every round's saved code: it found
  what the judges missed (2c: 4 of 5 loaded-hook runs found the status cell by its value, the judges flagged one).
  Matrix 3 started 23:20 (`run-matrix-3.sh`, both arms, $160 for runs of a fresh $200), then processing and the checks;
  report by `report-matrix-3.py`.
