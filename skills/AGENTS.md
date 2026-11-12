# Skills

The agent skills in `skills/`: what they are for, how they are written and changed, and the checks they run under.
Claude Code loads this file when its Read tool opens a file under `skills/`; otherwise (the shell, another client), read
it before working there. Read it before changing a skill too. Part of the contributor guide that the root
[AGENTS.md](../AGENTS.md) indexes; its rules apply here too.

## Files

- One folder per skill, `skills/<name>/`, in the [Agent Skills](https://agentskills.io/specification) format: a
  `SKILL.md`, and as the skill needs them `references/` and `guides/` (Markdown it links), `assets/` (files it copies
  into a user's project; `.ts` files there are compiled), `scripts/`, and `agents/openai.yaml` (Codex's invocation
  policy, for a skill only the user starts).
- The skills about POMWright are its core, `pomwright`, which an agent uses by itself whenever code uses POMWright, and
  workflow skills that build on it; `defect-review` is a general skill, held to the format rules below but not to the
  POMWright ones. `npx skills add DyHex/POMWright` installs them from this folder, and the site's Skills section
  presents them. They are not in the npm package (`package.json#files`), and their evaluations are not in the
  repository.

## Who reads a skill

An agent in a user's project, reading the raw Markdown, nothing hidden or rendered, with whatever POMWright version the
user installed. Write for that reader:

- **One home per fact.** A skill states a rule briefly and links the page that explains it, as
  [website/AGENTS.md](../website/AGENTS.md#rules) asks of the API pages; exact signatures, options and messages come
  from the installed declarations, `node_modules/pomwright/dist/index.d.ts`, which carry the doc comments, and a skill
  sends the agent there rather than restating them. Every claim a skill makes is probed like a page's
  ([test/AGENTS.md](../test/AGENTS.md#probing)).
- **The split.** The core's reference files follow the API reference's sections, one file per section, no fact in two
  files; its guides are tasks that apply the references without restating them. A workflow skill uses the core by name
  ("use the `pomwright` skill"), never by a path into another skill or by copies of its text, and says what to do when
  the core is not installed. A skill is installed alone, so its relative links stay inside its folder.
- **Versions.** A skill states what it covers in `compatibility` (POMWright 3.x, `@playwright/test` `>=1.64.0 <2.0.0`,
  Node 20 or later) and tells the agent to read the installed version first.
- **Mirror Playwright.** What Playwright owns is linked on playwright.dev, not restated. The skills use Playwright's
  locators for what its docs say each is for, in Testing Library's priority (role, label, placeholder, text, alt text,
  title, test id), then POMWright's `getById`, then CSS; never XPath, which Playwright does not recommend and which
  does not reach into shadow DOM. A locator that matches several is narrowed by its options and `filter()` before the
  next is tried, `nth` last. The priority is a preference: the element and the page decide, and a segment may be there
  for its scope (`main`, registered `getByRole("main")`).
- **Defaults with their reasons, not templates.** Projects, pages and users differ, so a rule a skill teaches says why,
  and the skill has the agent look at the project and the page before applying it, and depart from it, saying so, where
  the reason does not hold. An example shows one page's reasoning; the eval rounds showed agents copying examples
  literally, so an example says what made each choice right there. How POMWright and Playwright behave is a fact, not a
  default.
- **Lead by example.** A skill shows the right way in its examples and says why; it does not catalogue mistakes.
- **Where the docs leave a choice, the user decides**, and a project records its decisions in `POMWRIGHT.md`, which the
  `pomwright` skill reads first and, when it is missing, writes first, asking the user
  (`pomwright/guides/project-decisions.md`, its template `pomwright/assets/templates/POMWRIGHT.md`). Its *POMWright's
  parts* names the parts of POMWright the project uses, and a skill writes code with no other (each part brings its
  types, options and helpers). The skills teach the same defaults everywhere: `PageObject` subclasses whose base class
  forwards every option with its type, origins from `env.ts` and no `baseURL`; a path segment names its kind by what the
  element does (`input` for any field, `dropdown` for a select or combobox, `button`, `link`; a region a `section`,
  whatever it looks like) and, where its locator picks it by a name, which one, in a user's words (`button@login`),
  plural for several in its scope (`main.list@products.cards`), singular for one; an `expect…` method of the page code
  for a part of the page other tests are likely to check, the spec for a check only one test makes; a blank line between
  registrations, written into `POMWRIGHT.md` without asking; files `<name>.locators.ts` and `<name>.page.ts`; a method
  with two or more parameters takes one options object, as the README's example does; test data reaches tests through
  one fixture, by dot paths such as `testData.checkout.feedback.happyForm`, holding values, data imported from files,
  generators and builders, and page code takes data as arguments; logging from page code is an option, with a child
  logger for each page object or helper so the report shows where an entry came from; the session does every task at its
  own model and effort, says so where the file recommends others, and hands a task to a subagent only where the file or
  the user says so. A new default changes the guide, the template and every skill that teaches it together. `testInfo`
  is Playwright's and not taught.
- **Ask when the context does not decide.** Where several ways are right and neither the project, its `POMWRIGHT.md` nor
  the task says which, a skill has the agent ask the user, every open question together in one message, not one at a
  time; where no one can be asked (a run without a user), the agent takes the way a tester or developer would, and says
  which and why.

## Format (`pnpm lint:skills`, `scripts/check-skills.mjs`)

- Frontmatter: `name` (the folder's name: a-z, 0-9, single hyphens, at most 64 characters) and `description` (what the
  skill does and when to use it, at most 1,024 characters, no `<` or `>`), and only `license`, `compatibility` and
  `metadata` beside them, which every agent accepts. A skill only the user starts, listed in the script's
  `USER_INVOKED` (it creates files or costs much, so no keyword may start it), also has `disable-model-invocation: true`,
  may have `argument-hint`, and has `agents/openai.yaml` with `allow_implicit_invocation: false`.
- Sizes: `SKILL.md` at most 250 lines (`defect-review` 300; `pomwright` 330, for its complete example), every other
  Markdown file at most 300, and one over 100 lines opens with a contents list linking each `##` heading. References are
  one level deep: every Markdown file of a skill is linked from its `SKILL.md` and links on to no other. Every link to
  the site names a page and heading.
- Relative links and anchors resolve: `pnpm lint:guide` reads the skills too.
- The `pomwright` skill's upgrade guide lists every item the site's *Upgrading from 2.x* marks **compiles**, in the
  page's order, with exactly the searches the page gives: those changes compile, so only a search finds them, and an
  agent that reads a summary of the page misses them. A change to those items on the page changes the list with it.

## Examples and chains

- Every `ts` block of a skill compiles as written against the packed package (`scripts/check-doc-snippets.mjs`, in
  `pnpm typecheck`): one project per Markdown file, `title="name.ts"` blocks importable by the file's other blocks, no
  example app copied in, no `// ---cut---` and no `nocheck` (an agent sees and copies everything), code in double
  quotes, two-space indentation, `*.example` hosts and descriptive paths, as on the site. The `.ts` files under
  `assets/` are compiled at their paths.
- Every locator chain a skill shows is a rendering in single quotes, in a code comment or a `text` block, and is
  rebuilt by a test of `test/tests/docs/skillsChains.spec.ts` named after the file, through `skillTest`; the spec fails
  for a rendering its test does not compare and for a file with renderings and no test.

## Changing a skill, and what changes one

- A change to anything a skill describes (an API, a behavior, a message, a rendering, a recommended practice) updates
  the skill in the same change, as it updates the pages that describe it; `src/AGENTS.md` and `website/AGENTS.md` point
  here.
- A change to what a skill does, how it starts or what it needs updates its page in the site's Skills section
  (`website/src/content/docs/skills/`) and its row in `skills/README.md` in the same change; a new skill gets both, and
  its place in `website/sidebar.mjs`.
- Commands: `pnpm lint:skills`, `pnpm lint:guide`, `pnpm typecheck` after `pnpm harness:install` (the examples), and
  `pnpm pack-test --project=chromium tests/docs/skillsChains.spec.ts --reporter=line` (the chains).

## Do not

- Link into another skill or copy its text, or give a model-invoked skill a frontmatter key beyond the portable ones.
- Hide setup with `// ---cut---`, or skip a block with `nocheck`.
- Write a signature, an option or a message from memory: read it from the declarations or a probe.
