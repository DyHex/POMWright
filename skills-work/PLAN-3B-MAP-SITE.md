# PLAN-3B: `pomwright-map-site` reads, acts and asks; then its evals

Written 2026-11-11 from the maintainer's answers to PLAN-6B. Waits for the go and the questions below. Runs after
PLAN-8 and PLAN-6B's steps 1 and 2; its evals share PLAN-6B's sandbox window, with a ceiling of their own.

The maintainer's site is named here as "the site" only: its URL is in the agent's memory and in the eval case under
`skills-work/` (uncommitted), never in a committed file.

## The maintainer's decisions (2026-11-11)

1. The `pomwright` skill uses `pomwright-map-site` whenever a task needs a page mapped.
2. Both skills tell the user how the mapping will be done with what the machine has: `scripts/map.mjs` (Playwright as a
   library) always; `playwright-cli` or Playwright MCP when installed, asking before using them; when neither is, the
   skill advises installing one where it would do a better job, and says what it would gain.
3. The mapping reads three things: the accessibility snapshot (roles, names, states), the DOM (what the snapshot leaves
   out: test ids, ids, the elements a scope or a filter needs), and a screenshot (what a user sees: what is visible,
   what covers what, what reads as one card or row).
4. It acts on a page to reveal what a user sees: opens menus, dialogs, tabs and accordions; handles the cookie dialog
   and maps it; follows a navigation to learn where it leads and goes back.
5. It asks the user what besides the interactive elements a test should check (values, texts, states), and maps those.
6. Across pages, shared parts come from the app's source when it is available (in the repository, or a repository the
   user points to, asked for when missing); without it, from comparing the pages' snapshots and DOM.
7. Its evals run separately, against a page of the site, over combinations of tools, judged by correctness, mistakes,
   time and cost (`PLAN-6B-MATRIX-2.md`, *How a result is judged*).

## Corrections to check with the maintainer (raised 2026-11-11)

- **The recorder is for people.** Playwright's recorder (`npx playwright codegen`) opens a headed browser that a
  person clicks through while it writes the code; an agent cannot drive it. What an agent can drive is Playwright as a
  library (`map.mjs`), `playwright-cli` and Playwright MCP; the recorder's locator generation reaches an agent as
  `playwright-cli generate-locator <ref>` and MCP's `browser_generate_locator` (with `--caps=testing`). A recording the
  user makes is still useful input: the skill can take it as the flow and the elements that matter. So the eval's tool
  axis is library, `playwright-cli` and MCP, not the recorder.
- **A trial click reveals nothing.** `click({ trial: true })` runs the actionability checks (visible, stable, enabled,
  receives the click) and does not click, so no menu opens and no navigation happens. It is the right check that an
  element is clickable and not covered (by the cookie dialog, say). What makes exploring by clicks safe is: a throwaway
  browser context; every request that could change data (not `GET` or `HEAD`) aborted with `page.route` while mapping,
  a guard and not a guarantee (a `GET` that changes data, a WebSocket); the user's confirmation for any element that may
  change data; and `page.goBack()` after a navigation. To be probed before the skill says so.
- **The site's certificate.** Firefox and WebKit refuse the site's TLS certificate (`SEC_ERROR_UNKNOWN_ISSUER`;
  "Unacceptable TLS certificate"); Chromium accepts it. `map.mjs` uses Chromium, so mapping works; tests on the site in
  Firefox or WebKit need the issuer trusted on the machine or `ignoreHTTPSErrors` in the project's config, the user's
  choice. The skill says so when a browser refuses a certificate, and never turns the check off by itself.

## Step 1: probes

On the site's page and the practice shop, Chromium (and the other two where the certificate allows): what the "ai"
snapshot leaves out that a locator choice needs; a screenshot an agent can read (the `Read` tool shows images); the
cookie dialog found and dismissed; a menu opened; a navigation followed and undone; non-`GET` requests aborted by
`page.route` while a form's button is clicked; what `playwright-cli` (`snapshot`, `screenshot` if it has one,
`generate-locator`) and MCP (`browser_snapshot`, `browser_take_screenshot`, `browser_generate_locator`) give for the same
page, at pinned versions installed locally, never `@latest`.

## Step 2: the skills

- `pomwright-map-site/SKILL.md`: *What it needs* (the minimum: Node 20 or later, `@playwright/test` 1.64 or later with
  Chromium, `pomwright` 3.x, the origin reachable, a saved `storageState` for pages behind a login; recommended, with
  what each adds, from step 1's probes); step 1 says what it will use and asks; the snapshot, the DOM and the screenshot
  read together; acting to reveal states, under the safety rules (`references/safety.md`); the user asked what to check
  beyond the interactive elements; shared parts from the source, or by comparing pages.
- `scripts/map.mjs`: `snapshot` also writes the DOM and a full-page screenshot to files; `reveal <url> <ref>…`, which
  clicks the refs the user confirmed, with non-`GET` requests aborted, and snapshots what each revealed; a dismiss of
  the cookie dialog as one such ref.
- `pomwright/SKILL.md` and its guides: a task that needs a page mapped uses `pomwright-map-site` when it is installed,
  and says how to install it when not.
- Checks as every skill change; one commit.

## Step 3: the evals

Tools: **L**, Playwright as a library (with the skills `map.mjs`, which ships with the skill, so every with-skills
cell has it; without them the agent writes its own scripts); **C**, `playwright-cli` with its official skill; **M**,
Playwright MCP (a real server through the eval's `--allow-real-servers`, which runs it outside the sandbox).

| cell | tools | arms | why |
| --- | --- | --- | --- |
| 1 | L | with, without | the bare minimum, and the baseline every user has |
| 2 | C | without | the official tool alone: what the skills must beat |
| 3 | M | without | the same for MCP |
| 4 | L+C | with | the likely good case |
| 5 | L+M | with | MCP instead of the CLI |
| 6 | L+C+M | with | everything: whether more tools buy more |

"MCP only" with the skills is cell 5 with the skill free to choose; forcing it off `map.mjs` would test a setup no user
has. Runs at effort high only (2026-11-11, after the effort probe; the maintainer, 2026-11-12: no sweep at xhigh or
other efforts). The task: map
the page (pages picked in the prompt, so a crawl does not decide the cost), write its locator module, page object,
fixture and a starter spec; the user's answers given in the prompt (what to check beyond the interactive elements).

Graded from the files and a ground truth I build by hand from the page first (every interactive element a user sees,
the cookie dialog, the shared parts), probed: elements mapped and missed, each locator matching exactly one element
(the starter specs run again on the site in Chromium), paths by the conventions, locators by what the page offers
(role and name where they exist, a test id or CSS where nothing user-facing does), mistakes named one by one; with
time, turns and cost. Concurrency 2 at most against the site, a staging server.

Feasibility first, each a probe with no agent cost where it can: the eval's sandbox reaching the site from `Bash`;
the MCP server started for a case; `playwright-cli` and its skill on a run's `PATH` and in its workspace.

## Answers (2026-11-11)

Q1 the cells as proposed; Q2 the ceiling set after the reference run; Q3 the site's source is the repository of
external consumer project B, read in place and read-only, never changed; Q4 the evals may hit the site. The reference
runs twice: before the rework, as a baseline, and after it. The reference uses the skills' conventions
(`*.locators.ts`, the same kind of file as the site source's locator files). The corrections on the recorder and
the trial click: agreed. Every case is listed in `evals/CASES.md`. Nothing runs until every question is answered.

## Questions

- **Q1. The cells.** As above (6 cells, 7 arms, 21 runs at one effort), or another set? Answered: as above.
- **Q2. The ceiling** for these evals, measured first by one run of cells 1 and 6. A guess before that is not worth
  much: a mapping run reads large snapshots, so it costs more than matrix 1's code runs ($0.45 a run on Opus).
- **Q3. The site's source.** Is the source of the site's pages available, and may the eval's workspaces hold a copy
  (under `skills-work/`, uncommitted, deleted after)? Without it, the shared parts are found by comparing pages.
- **Q4. The site as a fixture.** It is a staging server: may the evals hit it for about 30 runs, at most 2 at a time,
  with clicks limited to menus, dialogs, tabs, the cookie dialog and links (non-`GET` requests aborted)?

## Execution notes

- 2026-11-11, R0 (`map-site-reference/before/`, `run.sh`, the skill as at 78130ba): `claude -p`, Opus 5.5,
  `--effort high`, the three POMWright skills as a plugin, the site's source read-only by `--add-dir` (its HEAD and status the
  same before and after), Bash by an allow-list (unsandboxed, a stand-in for the eval's sandbox: it could hide a
  command the sandbox would refuse). 94 turns, **$3.72**, 9.6 min (8.7 min in the API); 58,428 output tokens, 5.59 M
  cache reads, 179 k cache writes; the five-hour window at 19% after it, no overage. Tools: 43 Read, 21 Write, 10 Bash
  (two `map.mjs snapshot`, `tsc` twice, the specs four times, once 4 x on 4 workers), 8 Grep, 4 Glob, 3 Edit, 2 Skill.
  Two Bash calls denied (a chained `ls && cat`, an `ls` of node_modules), worked around with Read. It wrote a base
  class, header, footer and cookie-consent modules composed in `common.locators.ts`, a page object and module per
  page, fixtures, test data and three specs (two map specs, one of the products' names, prices and content), and
  chose a keyboard Enter for "Vis mer" because a click area lies over it (read from the site's SCSS). My rerun: `tsc`
  clean, 3 of 3 specs pass on the site in Chromium.
- Estimate for M1 to M7 from R0 (one run, the minimum tools, the current skill): about $3.70 and 10 min a run, so
  21 runs about $80 and, two at a time, about 1 h 45 min; the sweep's 6 runs about $22; R1 about $4; Opus judges on
  top. The CLI and MCP arms may cost more or less: their first runs measure it.
- 2026-11-11, the maintainer reviewed R0 ("pretty solid") and asked for a blank line between each `add` call: 63 blank
  lines added in the six locator modules (each registration's comment kept above it; the composed modules' calls in
  `common.locators.ts` separated too), the packed originals in `map-site-reference/before-packed-backup/`; its
  `POMWRIGHT.md` gained *Registrations*. `tsc` clean and 3 of 3 specs pass on the site again.
- 2026-11-11, the maintainer on R0's age switch: the current choice should have been uncovered by selecting another
  and checking whether the page changed. Probed (Chromium, non-`GET` requests aborted): on `/mobilabonnement/` the
  current choice, "29 år eller eldre", is an `<a aria-hidden="true">` (hidden from `getByRole`), the other two are
  links; clicking "Under 29 år" navigates to `/mobilabonnement/under-29/` (the same heading), where "29 år eller
  eldre" is a link and "Under 29 år" the hidden one. So the switch is three links, each choice a URL of its own (one
  template, several pages), and the hidden current choice is missing accessibility worth reporting. For step 2: the
  skill explores a control's other states (select another choice, see whether the URL or the page changed, map what
  appears, go back); for the grading: the age switch's three links and its URLs are in the reference.
- 2026-11-11, step 1, the tools (installed pinned in `skills-work/tools/`, the newest releases at least two weeks
  old, both 2026-09-28; both on Playwright 1.64.0-alpha-1790635538000):
  - `@playwright/cli` 0.1.22 (`playwright-cli --help`): `open`, `goto`, `snapshot [target]`, `find`, `screenshot
    [target]`, `click`, `fill`, `go-back`, `eval <func> [target]` (the DOM), `generate-locator <target>`, `route
    <pattern>` (mock requests), `requests`, `state-load`/`state-save`, `recording-start`/`recording-stop` ("record user
    actions" and print them as Playwright code: the recorder, for a person), and its own skill at
    `node_modules/playwright-core/lib/tools/skills/playwright-cli/SKILL.md`.
  - `@playwright/mcp` 0.0.83 (tools listed over MCP, `tools/list`): `browser_snapshot`, `browser_take_screenshot`,
    `browser_click`, `browser_navigate`, `browser_navigate_back`, `browser_evaluate`, `browser_find`,
    `browser_run_code_unsafe`, `browser_network_requests`, and more; `--caps=testing` adds `browser_generate_locator`
    and `browser_verify_*` (not named in `--help`, which lists `vision`, `pdf`, `devtools`); `--caps=vision` adds
    coordinate mouse tools; `--blocked-origins` and `--allowed-origins` say they are not a security boundary.
- 2026-11-11, step 1 on the site (`/mobilabonnement/`, Chromium, every request but `GET` and `HEAD` aborted):
  - the AI-mode snapshot is 22 k characters, the DOM 385 k (17 times): the skill reads the snapshot whole and the DOM
    by search (test ids, ids, attributes of the elements the snapshot leaves unnamed), never whole. The DOM has 6
    test-id elements, 39 ids and 46 `aria-hidden` elements in `main`; the snapshot marks hidden ones
    (`generic [aria-hidden]: 29 år eller eldre`), so the age switch's current choice is in it, not findable by role;
  - the cookie consent (Cookiebot, "Kun nødvendige cookies" / "Tillat alle cookies") has no `dialog` role and covers
    the page: until it is answered, clicks time out (two did); after it, the age link navigates to
    `/mobilabonnement/under-29/` and `goBack()` returns;
  - "Legg til" sent nothing to the site's origin; the aborted requests were third parties' (Sentry, Google ads, a chat
    widget): aborting every request but `GET` and `HEAD` while mapping costs the map nothing here;
  - a full-page screenshot (1280 px wide, 276 kB) reads well and shows what the snapshot does not: the consent covering
    the top, a broken image on the "Usikker?" card, the visual grouping of the two product lists and the footer's four
    columns.
- 2026-11-11, step 2 (`skills/pomwright-map-site/`, uncommitted while matrix 2 runs on the pinned 12bf979):
  `map.mjs` aborts every request but `GET` and `HEAD` in every command and lists them; `snapshot` saves the snapshot,
  the DOM and a full-page screenshot (to a temp folder by default) and prints test ids, ids in `main` and hidden text;
  `--consent "<button>"` answers the cookie dialog; `--wait-for "<role>=<name>"` waits for late content; `reveal`
  clicks confirmed `role=name` targets, says whether the URL changed, prints what appeared, goes back, and reports a
  click another element intercepts (on the site: `<label class="subscription-card__clickarea …">` over "Vis mer").
  Probed on the practice shop and the site: "Under 29 år" leads to `/mobilabonnement/under-29/` with other products
  (iceUng …) and campaign prices ("Førpris … Tilbudspris …"), "29 år eller eldre" a link there. SKILL.md: what it
  needs and what helps, the three readings, revealing, what to check, shared parts from the source; safety.md: click
  only to reveal, abort writes, report what blocks a click; from-snapshot-to-paths.md: `[aria-hidden]`, the DOM and the
  screenshot. `playwright-cli` 0.1.22 drives Chrome by default; `--browser chromium` needs its Chrome for Testing
  build (chromium-1247, installed with `install-browser chrome-for-testing`); its `run-code` route aborted a POST
  ("Failed to fetch") while a GET reached 200 (probed on the practice shop).
- 2026-11-11, step 3, the eval tool's limits (read from the 2.1.319 binary): a case's `add_dirs` must resolve inside the
  case or plugin ("add_dirs resolves outside case/plugin"), so the runs cannot read the site's source in place; the only way
  is a copy (the scaffold, which runs as the operator, copying the source into the run's temporary workspace, deleted
  with it): asked of the maintainer, who approved reading in place, not a copy. A plugin's MCP servers start for real
  with `--allow-real-servers` (as the operator, outside the sandbox); a case can name plugins (`plugins:` in
  case.yaml), to be probed for the CLI's skill and the MCP server. The site's domain must be allowed for the
  sandbox's network the same way raw.githubusercontent.com was (`WebFetch(domain:…)`).
- 2026-11-11, the maintainer: the map-site eval runs may have a temporary copy of the site's source's source (the scaffold
  copies it into the run's workspace; deleted with the run; the repository untouched). Review of R1: "quite good"; the
  cookie consent should be mapped open and then answered (R1's `home.map.spec.ts` does: 11 paths before answering,
  then `acceptOnlyNecessaryCookies()` and hidden), and the maintainer proposed `dialog@cookieConsent` with
  `getByRole("dialog")`. Probed while open: Cookiebot's element is `<div id="CybotCookiebotDialog" role="region"
  aria-labelledby="…Title">`, `getByRole("dialog")` 0 (also with `includeHidden`), `alertdialog` 0; so the role is
  region, and the name (`region@` by the rule, or `dialog@` as users see it) is asked.
- 2026-11-12, the maintainer: the consent is `section@cookieConsent`, as the convention says (a region is a section,
  whatever its tag); R1's `region@cookieConsent` is renamed before map-site runs are graded against it, and R1's `tsc`
  and specs run again.
- 2026-11-11, the maintainer: the consent stays `region@cookieConsent` (it is a region; superseded 2026-11-12, above); its paths resolve while it is
  open (`home.map.spec.ts` checks all 11 before answering it; passes on the site). R1 (`map-site-reference/after/`)
  is the reference the map-site eval runs are graded against, as it stands.
- 2026-11-12, step 3 built (in the eval suite's `map-site-evals/`, outside the repo):
  - **Harness: `claude -p`, as R0 and R1, not `claude plugin eval`.** Why: the runs are compared with R0 and R1, which
    ran that way; the eval tool cannot `--add-dir` the site's source (it must be copied), needs the site's domain and
    the CLI's browser opened in its sandbox, and its judges cannot read the code anyway (grading is my own here). A
    user's session is `claude` with permissions, not the eval sandbox. Stand-in, disclosed in the report: Bash by an
    allow-list, not a sandbox. So these runs do not need AppArmor lowered.
  - `run-cell.sh <arm> <n>`: a fresh copy of `start/` (R1's starting files; `POMWRIGHT.md`'s *Segment names* now the
    template's at 66128a6: kind by what it does, `section`, `@which` in a user's words), node_modules linked to the
    fixture's, the skills pinned by `.skills-ref` (66128a6). C: playwright-cli 0.1.22 on PATH (alone in its bin), its
    official skill as a plugin, `.playwright/cli.config.json` (headless Chromium, isolated, `abort-writes.ts` as
    `initPage`). M: `@playwright/mcp` 0.0.83 by `--mcp-config` (headless, Chromium, isolated, `--init-page
    abort-writes.ts`). Probed on a local server: both abort a `POST` ("Failed to fetch") and pass a `GET` (200); CLI
    sessions are per working directory (two folders, two browsers), so two runs in parallel do not share one. The
    stream is written outside the run's folder while it runs (R0 and R1 could see theirs).
  - The prompt: R1's, plus one sentence ("Only look: … never submit a form, add anything to the cart or send any
    data"), the same for every arm, because L-without writes its own scripts and nothing aborts its writes (Q4's
    condition); the other arms abort writes mechanically.
  - R1 renamed (the maintainer's decision): `region@cookieConsent` to `section@cookieConsent`, and by the same rule
    (a region is a section) `main.list@faq.regions@answer` to `sections@answer`; the pre-rename copy in
    `map-site-reference/after-pre-rename/`. `tsc` clean. Its specs could not run: the site does not resolve (below).
  - Grading (`grade/`): `paths.mjs` lists each concrete `PageObject` subclass and its paths through the TypeScript
    compiler (the constraint of `getNestedLocator`'s type parameter); `gen-spec.mjs` writes a spec that opens each
    page with the class's own `goto()`, resolves every path with the consent open and after the grader answers it,
    and records counts, the chain (`locator.describe("")`, as the repo's chain specs) and element fingerprints (DOM
    position, and tag, role, href, text); `grade.sh` adds `tsc` and the run's own specs rerun (JSON);
    `summarize.py` compares with R1 graded the same way: R1's paths covered (Jaccard >= 0.5), partly, missed; extra
    paths; broken; singular names matching several; strategies of each path's own step; `nth`; role-named kinds;
    cost, time, turns, tools; the site's source untouched. Tested on the practice shop (3 page objects, 29 paths).
  - `run-round.sh`: 7 arms x 2 runs, every arm's first run before any second, two at a time; stops before a start when
    the site does not resolve, the five-hour window is at 90%, or spend + $4.50 would pass $55.
  - **Blocked 2026-11-12 08:30:** the site's name does not resolve: the resolver that answered it (the work network's
    split DNS) times out, public DNS does not know it. R1's specs fail with `ERR_ABORTED`. It
    resolved on 2026-11-11 (R1's specs passed). Waits for the maintainer to reconnect to the network that serves it.
