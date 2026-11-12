# Ecosystem

The skill standards, Playwright's agent tooling, distribution channels and Matt Pocock's skills. Fetched 2026-11-10 by
web-fetch subagents; each section names the URLs read. Where a fetcher reported that part of a page came back as a
model summary rather than verbatim, that is marked *(summary)*: re-check those lines on the live page before relying on
exact wording.

## Agent Skills open standard (agentskills.io)

Read: https://agentskills.io/specification, https://agentskills.io/home (no version or date shown).

- A skill is a directory with at least `SKILL.md`; optional `scripts/`, `references/`, `assets/`, any other files.
- Frontmatter: `name` (required; 1-64 chars; `a-z`, `0-9`, `-`; no leading/trailing or double hyphen; **must match
  the parent directory name**), `description` (required; 1-1024 chars; what it does **and when to use it**, with
  keywords), optional `license`, `compatibility` (≤500 chars, only for environment requirements), `metadata`
  (string→string map), `allowed-tools` (experimental).
- Progressive disclosure: metadata ~100 tokens loaded at startup for all skills; body "< 5000 tokens recommended",
  loaded on activation; resources loaded as needed. "Keep your main `SKILL.md` under 500 lines."
- File references: relative paths from the skill root; "Keep file references one level deep from `SKILL.md`."
  Nothing on referencing other skills.
- Validation: `skills-ref validate ./my-skill` (https://github.com/agentskills/agentskills/tree/main/skills-ref).
- Client list page loads dynamically; not captured.

## Claude Code and Claude's skill best practices

Read: https://code.claude.com/docs/en/skills (partly *(summary)* past ~40k chars),
https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices (verbatim).

- Locations: personal `~/.claude/skills/<name>/SKILL.md`; project `.claude/skills/<name>/SKILL.md` (start dir and
  parents up to repo root; commit to share); nested `<subdir>/.claude/skills/`; plugin `<plugin>/skills/<name>/SKILL.md`
  (shown as `/plugin-name:skill-name`); enterprise; claude.ai account skills synced to `~/.claude/skills/synced/`.
  Same-name precedence: enterprise > personal > project; plugin skills are namespaced.
- Frontmatter in Claude Code: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`,
  `disable-model-invocation` (true = only the user invokes), `user-invocable` (false = only Claude invokes),
  `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `background`, `hooks`, `paths`
  (globs: auto-load only for matching files), `shell`, `metadata`, `license`, `compatibility`. Unknown keys ignored.
- **Portability trap**: outside Claude Code (claude.ai uploads, the Skills API) only `name`, `description`,
  `license`, `compatibility`, `metadata`, `allowed-tools` are allowed; other keys fail with
  "Unexpected key(s) in SKILL.md frontmatter".
- Listing: `description` + `when_to_use` truncated at 1,536 chars in the listing; the listing budget is 1% of the
  context window *(summary)*; on overflow Claude Code drops descriptions of the least-invoked skills first, names stay
  *(summary)*. Body loaded on invocation and stays in context; after compaction the first 5,000 tokens of each
  re-attached skill, 25,000 combined.
- Invocation: automatic by description; `/skill-name`. Substitutions `$ARGUMENTS`, `${CLAUDE_SKILL_DIR}`, …; `` !`cmd` ``
  dynamic context. One skill invoking another in its body: not described (only the Skill tool and its permissions).
- Best practices (verbatim page): concise ("The context window is a public good"; assume Claude is smart); SKILL.md
  body under 500 lines; degrees of freedom (high/medium/low); progressive disclosure, references one level deep; a TOC
  in reference files over 100 lines; names: gerund form suggested (`processing-pdfs`), noun phrases acceptable, avoid
  `helper`/`utils`/`tools`, no `anthropic`/`claude`; `name` ≤64, `description` ≤1,024 chars, third person, what +
  when; avoid time-sensitive info (or an "Old patterns" section); consistent terminology; input/output examples;
  checklists and validate-fix loops; forward slashes; evaluations first (at least three scenarios, a baseline without
  the skill; no built-in runner); test with every model you target (Haiku: enough guidance? Sonnet: clear? Opus: not
  over-explaining?); "Claude A writes, Claude B tests" iteration.

## OpenAI Codex and ChatGPT

Read: https://learn.chatgpt.com/docs/build-skills (redirect target of developers.openai.com/codex/skills),
https://developers.openai.com/plugins/concepts/skills. The ChatGPT help article returned 403.

- Codex locations: repo `.agents/skills` (from CWD up to repo root), user `~/.agents/skills`, admin
  `/etc/codex/skills`, system (bundled `skill-creator`, `skill-installer`). Symlinks followed. `.codex/skills` not
  mentioned. Same-name skills are not merged; both may show.
- Format: `SKILL.md` with `name` and `description` (other fields and limits not stated); optional `scripts/`,
  `references/`, `assets/`, and **`agents/openai.yaml`**: `interface` (`display_name`, `short_description`, icons,
  `brand_color`, `default_prompt`), `policy.allow_implicit_invocation` (default true; false = only explicit `$skill`),
  `dependencies.tools` (e.g. an MCP server).
- Invocation: `$skill` or `/skills` in Codex CLI/IDE, `@skill` in ChatGPT; implicit by description. Metadata budget:
  2% of the context window or 8,000 chars (configurable up to 10,000 tokens); descriptions shortened first, then skills
  omitted with a warning.
- "Skills build on the open agent skills standard (agentskills.io)."
- ChatGPT: standalone skills in the ChatGPT desktop app, Codex CLI and IDE; skills bundled in plugins also in Chat and
  Work on web, desktop and mobile. "For installable distribution, prefer plugins"; a plugin directory shared by ChatGPT
  and Codex.

## Playwright's official agent tooling

Read: https://playwright.dev/docs/test-agents, https://github.com/microsoft/playwright-mcp (partly *(summary)*),
https://github.com/microsoft/playwright-cli (README), https://github.com/microsoft/playwright (README).

- **There is an official Playwright skill**: `microsoft/playwright-cli` ships `skills/playwright-cli/SKILL.md` (+
  `references/`), installed with `npm install -g @playwright/cli@latest` then `playwright-cli install --skills`. Its
  README says it covers running/debugging tests, request mocking, running Playwright code, sessions, storage state,
  "Test generation (plan / generate / heal)", tracing, video, attaching to PRs, inspecting elements. Its SKILL.md was read later the same day: see
  *The official `playwright-cli` skill* below.
- Playwright MCP README: "If you are using a coding agent, you might benefit from using the CLI+SKILLS instead"; MCP
  remains for persistent, introspective loops (exploration, self-healing). Accessibility-snapshot based; refs like
  `[ref=e5]`; `--caps=testing` adds `browser_generate_locator` *(summary)*; `--test-id-attribute`. Setup:
  `claude mcp add playwright npx @playwright/mcp@latest`; `codex mcp add playwright npx "@playwright/mcp@latest"`.
- CLI: "more token-efficient: they avoid loading large tool schemas and verbose accessibility trees"; commands
  include `snapshot --depth=N`, `find`, `generate-locator <ref>`, `run-code`, tracing, `show`.
- Test Agents: planner (explores, writes `specs/*.md`), generator (plan -> tests, "verifies selectors and assertions
  live"), healer (replays failures, patches). `npx playwright init-agents --loop=claude|codex|vscode|opencode`;
  regenerate on each Playwright update. Generated tests use `getByRole` and web-first assertions; page objects not
  mentioned. A seed test (`tests/seed.spec.ts`) bootstraps the page, and may import from `./fixtures`.
- Playwright README "Get started": Playwright Test, Playwright CLI for "Coding agents (Claude Code, Copilot)", MCP for
  "AI agents and LLM-driven automation".
- Read later the same day: see *Playwright's own guidance* below.

## Distribution

Read: https://skills.sh, https://skills.sh/docs/cli, https://skills.sh/docs/faq, https://github.com/vercel-labs/skills
(+ docs/commands.md, agents.md, creating-skills.md, troubleshooting.md), https://code.claude.com/docs/en/plugin-marketplaces,
https://code.claude.com/docs/en/plugins/components.md.

- `npx skills add <owner/repo>` (Node 22.20+) discovers `skills/<name>/SKILL.md` (also one or two category levels,
  agent dirs, and skills declared in `.claude-plugin/marketplace.json`/`plugin.json`); `-s` picks skills, `-a` agents
  (`claude-code`, `codex`, `cursor`, `github-copilot`, …), `-g` global; symlink or copy; writes `skills-lock.json`.
  Install dirs: Claude Code `.claude/skills/`; Codex, Cursor, Copilot, Gemini CLI, OpenCode and others
  `.agents/skills/`. `metadata.internal: true` hides a skill unless `INSTALL_INTERNAL_SKILLS=1`.
- skills.sh lists skills by install telemetry from `npx skills add` (public repos only); no stated crawling.
- Claude Code plugin marketplace: a repo with `.claude-plugin/marketplace.json` (`name`, `owner`, `plugins[]` with
  `name`, `source`); a plugin = `.claude-plugin/plugin.json` + `skills/<name>/SKILL.md`; users run
  `claude plugin marketplace add <owner>/<repo>` and `claude plugin install <plugin>@<marketplace>`; skills then show
  as `/<plugin>:<skill>`. `claude plugin validate`. One repo can serve both the skills CLI and a marketplace.
- Matt Pocock's README installs the same repo as a Claude plugin, a Codex plugin marketplace
  (`codex plugin marketplace add mattpocock/skills`), a Copilot plugin, Gemini CLI skills, or `npx skills@latest add`,
  and warns: "Pick one per agent, because installing both gives you every skill twice."

## Matt Pocock's skills (github.com/mattpocock/skills, MIT)

Read: README, `skills/productivity/teach/{SKILL.md, MISSION-FORMAT.md, RESOURCES-FORMAT.md, LEARNING-RECORD-FORMAT.md, GLOSSARY-FORMAT.md, agents/openai.yaml}`,
`skills/productivity/grill-me/SKILL.md`, `skills/engineering/tdd/SKILL.md` (verbatim, in the fetcher's report of
2026-11-10; re-fetch for exact text when writing).

- `teach` frontmatter: `name: teach`, `description: Teach the user a new skill or concept, within this workspace.`,
  `disable-model-invocation: true`, `argument-hint: "What would you like to learn about?"`; plus
  `agents/openai.yaml` with `policy.allow_implicit_invocation: false`.
- Structure: SKILL.md (the method) + four `*-FORMAT.md` files beside it (templates and rules for MISSION, RESOURCES,
  LEARNING-RECORD, GLOSSARY). Workspace files resolve from the directory `/teach` runs in; FORMAT links from the
  skill folder.
- Method, key instructions: treat the current directory as a teaching workspace (`MISSION.md`, `RESOURCES.md`,
  `lessons/NNNN-*.html`, `reference/*.html`, `learning-records/NNNN-*.md`, `assets/`, `NOTES.md`); knowledge from
  high-trust resources, "Never trust your parametric knowledge", lessons "littered with citations"; fluency vs storage
  strength (retrieval practice, spacing, interleaving); a lesson = one short self-contained beautiful HTML file, one
  tangible win, tied to the mission, in the zone of proximal development, links to other lessons and references,
  recommends one primary source, reminds the user to ask follow-up questions; reusable components in `assets/` (a
  shared stylesheet first); interview for the mission when missing; skills through tight feedback loops; quiz answers
  all the same length, correct position varied; wisdom delegated to communities; reference docs as compressed essence
  (glossaries adhered to once made); NOTES.md for preferences.
- Learning records = ADR-like, written only on evidence (demonstrated understanding, disclosed prior knowledge,
  corrected misconception, mission shift); "Coverage is not learning."
- Repo conventions: user-invoked skills (`disable-model-invocation: true`) vs model-invoked ones; "A user-invoked skill
  may invoke model-invoked skills, but never another user-invoked one." `grill-me`'s body is one line:
  `Call the Skill tool with "grilling".` (thin user-invoked wrapper over a model-invoked primitive). Descriptions of
  model-invoked skills carry trigger phrases ("Use when …"). Has `writing-for-agents` and `ask-matt` (a router).

## Prior art in this repository

- `git show d2da6e9:skills/` (Feb 2026, by a contributor): `skills/README.md` (per skill: "Triggered by", "Covers",
  install by copying to `~/.claude/skills/`, "For other AI assistants" adapt), `pomwright-v1-5-bridge-migration/` and
  `pomwright-v2-migration/` (SKILL.md with a workflow and key rules + `references/*.md`). Removed with the 1.x/2.x docs
  in 88493f2.
- `skills/defect-review/SKILL.md` (358 lines): a model-invoked general skill, folded description with trigger
  phrases, American spelling, no references folder, a `scripts/` helper.

## Playwright's own guidance (what POMWright skills must mirror)

Read 2026-11-10: https://playwright.dev/docs/locators, /docs/best-practices, /docs/pom, /docs/test-fixtures,
/docs/test-parameterize, /docs/api/class-page#page-add-locator-handler, /docs/auth (quotes kept short by the fetcher).

- **Locator priority**: "These are the recommended built-in locators": `getByRole`, `getByText`, `getByLabel`,
  `getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId`; "we recommend prioritizing user-facing attributes
  and explicit contracts such as page.getByRole()"; with a role, "usually pass the accessible name as well"; text
  locators for non-interactive elements, role locators for interactive ones; labels for form fields; placeholder when
  there is no label. Test ids: "the most resilient way of testing" but "not user facing"; use them "when you choose to
  use the test id methodology or when you can't locate by role or text". "CSS and XPath are not recommended as the DOM
  can often change." `first()`/`last()`/`nth()` are "not recommended" (strictness opt-outs). `locator.filter`,
  `locator.and`, `locator.or` (or can match both -> strict violation), lists via `toHaveCount`, `toHaveText([...])`.
  => Matches the maintainer's brief: roles first, `getByTestId`/`getById` last. `getById` is POMWright's own and sits
  with test ids and CSS (`[id="…"]` is an attribute selector).
- **Best practices**: test user-visible behavior; isolate tests; don't test third-party deps (`page.route`); control
  your data; use locators with chaining and filtering; prefer user-facing attributes; generate locators (codegen
  prioritizes "role, text and test id locators"); web-first assertions, never `expect(await x.isVisible())`; trace
  `on-first-retry`, not `on`; test all browsers; keep Playwright current; lint with
  `@typescript-eslint/no-floating-promises` and `tsc --noEmit`; parallelism and sharding; soft assertions.
- **POM guide**: class with `readonly page` and `readonly` `Locator` fields built in the constructor, async action
  methods, an `expect` inside a method; tests `new` it per test (no fixture on that page). POMWright's site goes
  further: page objects as fixtures.
- **Fixtures**: `test.extend`; per test, on demand; teardown after `use`; worker scope `[fn, { scope: "worker" }]`;
  `{ auto: true }`; `{ timeout }`; **option fixtures** `[default, { option: true }]` set per project in `use` or per
  file with `test.use` (declarative, type-safe configuration, e.g. a per-project `person`); `{ box: true }`,
  `{ title }`; `mergeTests`; global hooks as auto fixtures. No general rule on test data beyond options and
  `storageState`.
- **Parameterize**: `forEach` over cases creating uniquely named tests (hooks outside the loop); parameterized
  projects via option fixtures; env vars and `dotenv` in the config; CSV-driven tests. "not to store your secrets in
  the source code."
- **`page.addLocatorHandler(locator, handler, { times?, noWaitAfter? })`** (v1.42; options v1.44): for overlays
  that appear unpredictably; checked only before actions and auto-waiting assertions; handler time counts toward the
  action's timeout; "we recommend explicitly waiting for it in your test" when it appears predictably.
- **Auth**: a setup project saving `storageState` to `playwright/.auth/user.json` (gitignored) with `dependencies:
  ['setup']`; one account per worker via a worker-scoped `workerStorageState`; POM fixtures per role; "Playwright
  provides no API to persist session storage" (the page uses `addInitScript`) — exactly where POMWright's
  `sessionStorage.seed` fits.

## The official `playwright-cli` skill (microsoft/playwright-cli)

Read 2026-11-10: `skills/playwright-cli/SKILL.md` (15.7k chars) and all 10 `references/*.md`, `.claude/skills/{dev, playwright-triage}`.

- Frontmatter: `name: playwright-cli`, `description: Automate browser interactions, test web pages and work with
  Playwright tests.`, `allowed-tools: Bash(playwright-cli:*) Bash(npx playwright:*) Bash(npx --no-install playwright:*)`.
  No license/version field.
- Body: quick start, commands by group, snapshots ("After each command, playwright-cli provides a snapshot"),
  targeting ("By default, use refs from the snapshot"), sessions, installation, examples, and a "Specific tasks" list
  linking 10 references (element-attributes, playwright-tests, pr-attachments, request-mocking, running-code,
  session-management, storage-state, test-generation, tracing, video-recording).
- `references/test-generation.md`: plan (write `specs/<feature>.plan.md`, scenarios independent, from a seed
  `tests/seed.spec.ts`; "push navigation into a fixture"), generate (one scenario at a time, one test per file,
  `// N. step` comments, each `- expect:` becomes an assertion; generated code "uses role-based locators when
  possible"), heal (no sleeps, "Never use `networkidle`", ask the user, last resort `test.fixme` with a reason).
  Explore through the seed test, `snapshot` for the inventory, act on refs (`click e5`), and
  `playwright-cli --raw generate-locator e5` -> `getByRole('button', { name: 'Submit' })`. **Page objects: never
  mentioned.** Output is flat `page.getBy…` specs importing from `@playwright/test`.
- Implication for POMWright skills: the site-mapping skill can use `playwright-cli` (or Playwright MCP) to explore a
  page and to generate each element's locator, then turn the snapshot's landmark structure into paths and
  `defineLocators()` registrations. The POMWright skill supplies what the official one lacks: page objects, paths,
  locator modules, fixtures, test data. It should say "if `playwright-cli` is installed, use it; otherwise Playwright
  MCP; otherwise a short Playwright script that prints `page.accessibility`/aria snapshots" (to verify each route).
