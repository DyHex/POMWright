# PLAN-2C-POMWRIGHT-MD: a project's decisions in POMWRIGHT.md

Status: **done 2026-11-10 (f4f0dfb)**, from the maintainer's decisions after PLAN-2B. Amends PLAN-2B (the user's choices),
PLAN-2 (core), PLAN-3 (map-site), PLAN-4 (teach).

## The maintainer's decisions (2026-11-10)

- Every choice POMWright leaves open is the user's, asked even in a project with tests and page code when the user is
  about to implement or try POMWright: the shape, `baseURL`, test data through a fixture or not, path names, and the
  rest. The answers are kept in a file so they are not asked again.
- "The pomwright skill will always check for a POMWRIGHT.md, if there is none then the first task is to create one."
- Path names (a suggestion, the user's choice, so a decision in the file): a path that matches several elements in its
  scope is plural (`main.list@products.cards`), one that matches one is singular (`main.list@products.card`); one of
  several is picked with a filter on a path of its own (the maintainer's example `main.list@products.cards@unique`), a
  query, or `nth`.

## Why a file of its own, with a pointer from the agent instructions

`AGENTS.md` and `CLAUDE.md` load into every session, POMWright work or not, and Claude Code reads `AGENTS.md` only
when the project has no `CLAUDE.md` (`docs/repository.md`, checked 2026-10-28). A `POMWRIGHT.md` the skill always
looks for is found whichever file the agent loads; a one-line pointer in the agent instructions, offered when the file
is created, reaches agents that work without the skill.

## What changes

- `SKILL.md`: after the version, *The project's POMWRIGHT.md*: where to look (beside the Playwright config the task
  concerns, then up to the repository root), what it overrides (the defaults, never the API's facts), creating it first
  when it is missing, keeping it current. *The user's choices* folds into it. The rules say which are defaults. Rule 4:
  plural for several in the scope, singular for one.
- `guides/project-decisions.md`: the decisions, each with its options and the default, and how to ask them (an existing
  project: what its code shows, confirmed; a new one: the options with the default).
- `assets/templates/POMWRIGHT.md`: the file with the defaults, copied and edited.
- Path names in the skills: repeated segments plural (`main.table@orders.rows`, `main.list@products.cards`), the
  guide's wrong example of a singular row fixed; `skillsChains.spec.ts` follows.
- The structure, reviewing and shape guides, map-site, teach's workspace and curriculum, `skills/README.md`: they read
  the file, or create it first.

## Left to the maintainer

- The README's orders example (`main.table@orders.row`) stays as it is; it is outside the skills and ships in the
  package.
- One of several with a path of its own (maintainer, 2026-11-10, settled): named by what it matches,
  `main.list@products.card@lamp` for one lamp, `main.list@products.cards@lamp` for several; the site's
  `main.list@orders.item@first` is the same rule.

## Execution notes

- Mid-execution decision (maintainer, 2026-11-10): origins from `env.ts` are the best practice and the default; a
  project may opt in to Playwright's `baseURL`, recorded in `POMWRIGHT.md`. So the template config is back to no
  `baseURL` (9fd291d had set it), with the opt-in in its comment, and `guides/choosing-a-shape.md` takes every URL from
  `env.ts`.
- **Probe** (`probes/shapes/`): the guide's own code blocks, extracted as written, with a spec that drives the
  `PageObject`, the own class and the functions; the guide's fixture spec ran as it is. A config with no `baseURL`
  (asserted), `SHOP_URL` set to the practice shop, three browsers, parallel workers, `--repeat-each 3`: 45 of 45.
- Checks: lint 0 (the archived probe formatted); skills 4 pass (the template is linked from `SKILL.md`); guide 226
  links in 41 files; snippets 290 (63 in skills) and 14 templates; both chain specs 84 passed on three browsers, the
  skills' spec with the plural paths; private-name grep none. `SKILL.md` 237 lines.
- Not changed: the README's orders example still names the row segment `row`.
- Later decision (maintainer, 2026-11-10): the model and effort in `POMWRIGHT.md` are a recommendation; the session does
  every task itself, says so where the file names another model or effort than its own, and the user switches or tells
  it to go on. A task goes to a subagent only where the file says so for that task, or the user asks: a subagent starts
  cold and works out of the user's sight. bc28051 had made handing off the default. Changed in
  `guides/project-decisions.md`, the template (a line *Tasks done by a subagent*), `SKILL.md`, `skills/AGENTS.md` and
  `skills/README.md`. `/effort` checked in the Claude Code 2.1.319 binary. Checks: lint 0, skills 4 pass, guide 227
  links, snippets pass.
- Later decision (maintainer, 2026-11-10): the locator order is role, label, placeholder, text, alt text, title, test
  id, id, CSS, each narrowed by its options and `filter()` (`hasText`, `hasNotText`, `has`, `hasNot`, `visible`) before
  the next is tried, `nth` last; XPath never (a project that relies on it records "last, after CSS"). Title stays after
  text (Testing Library: not always read by screen readers, not visible by default), the maintainer agreeing. Sources:
  Testing Library's *Priority* (role, label, placeholder, text, display value, alt text, title, test id); Playwright's
  *Locators* (what each is for; CSS and XPath not recommended; XPath does not pierce shadow roots) and *Other locators*
  (test id over the `id=` selector; `filter()` over `xpath=..`). Changed in `SKILL.md` rule 3,
  `guides/choosing-locators-and-paths.md`, `references/registering.md`, `guides/reviewing.md`,
  `guides/project-decisions.md`, the template (a line *XPath*), map-site's `from-snapshot-to-paths.md` (test id before
  id), teach's curriculum and exercises, `skills/AGENTS.md`.
- **Probe** (`probes/xpath/`; the practice shop on 4176 and the test server's `/testids` and `/testgetby` on 9000, the
  packed build 3.0.2 from the eval fixture, Playwright 1.64.0, chromium, firefox and webkit, parallel workers,
  `--repeat-each 3`): 36 of 36. In a POMWright chain `//p` and `xpath=//p` match the 3 prices inside the list, not the
  5 `<p>` of the page; `xpath=/html/body/main/ul/li/p` matches 3 on the page and 0 in the chain; `xpath=..` reaches the
  parent. In the open shadow root CSS, `getByText` and `getById` find `<p id="in.open">`, XPath does not.
  `getByText("Email")` finds the `<label>`, `getByLabel("Email")` the `<input>`; `getByText` finds no placeholder and no
  alt text; `getByRole("textbox", { name })` finds a field by its label, and by its placeholder when it has none;
  `getByRole("img", { name })` an image by its alt. On the product cards `filter({ hasText: "Lamp" })` matches 2, with
  `hasNotText: "Desk"` 1, `has` a heading named exactly "Lamp" 1, `hasNot` the "399 kr" text 2; `getByText("Lamp",
  { exact: true })` is the `<h2>`. No stand-in. Setup found on the way: a file inside the repository that imports
  `pomwright` resolves to the repository's own `dist/` by package self-reference, with the root's Playwright, so the
  probe has a `package.json` of its own to load the packed build.
- Later decision (maintainer, 2026-11-10): narrowing starts with each method's own options, each for its situation.
  From Playwright 1.64's declarations: `getByRole` takes `name`, `exact`, `description`, `level`, `checked`, `pressed`,
  `selected`, `expanded`, `disabled`, `includeHidden`; the five text methods `exact`; `locator` `hasText`, `hasNotText`,
  `has`, `hasNot`; `getByTestId` none. Changed in `SKILL.md` rule 3 and the guide's order section (when each is for, and
  that a state option matches only while the element is in the state; assert a state with `toBeChecked()`,
  `toBeDisabled()`).
- **Probe** (`probes/xpath/options.spec.ts`, same setup, 36 of 36), each option registered in a POMWright chain. Real
  pages: `level: 1` is "Products" and `level: 2` the three card headings (practice shop); `pressed: false` finds the
  test server's `/iframe/a` toggle and matches nothing once it is clicked, `pressed: true` then finds it;
  `includeHidden: true` finds the cookie dialog that `hidden` hides once consent is in session storage, which plain
  `getByRole` does not. **Stand-in** (`page.setContent`, because no page of the practice shop or the test server has
  these states): `checked`, `selected`, `expanded` and `description` pick the right element; `disabled` matches a
  button in a disabled `fieldset` and one under an `aria-disabled` ancestor. It holds for native HTML and plain ARIA
  attributes and could hide how a framework's own widgets set those attributes.
- Later decision (maintainer, 2026-11-10): test data through one fixture is the recommended approach and the user's
  choice; what sits at its paths is whatever a case needs: values, data imported from files (JSON among them),
  generators, builders and helpers. Changed in `guides/fixtures-and-test-data.md` (the list, an example with a builder
  and a generator, data the app must hold created by a fixture of its own through `request`), `SKILL.md` rule 10, the
  decisions table (alternatives: a fixture per kind of data, a data library the project uses), the template,
  `skills/AGENTS.md`.
- **Probe** (`probes/test-data/` and `probes/test-data-esm/`; the practice shop, the packed build 3.0.2, Playwright
  1.64.0, three browsers, parallel workers, `--repeat-each 3`): through one `testData` fixture, a generator
  (`randomUUID`) gives each call a new email and the newsletter accepts it; a builder gives the default and a case's
  change and the login form submits it; products from a JSON file reach the test and add the lamp: 27 of 27 in each
  project. JSON imports, tsconfig `nodenext` with `resolveJsonModule`: in a CommonJS project the plain import passes
  `tsc` and the runner, and `with { type: "json" }` fails `tsc` (TS2856) though the runner passes; in a project with
  `"type": "module"` the plain import fails `tsc` (TS1543) and the runner (Node: needs an import attribute), and
  `with { type: "json" }` passes both. Not probed: a fixture creating data through `request` (no API in the practice
  shop); the guide states it as a practice and links Playwright's API testing page.
