# A project's decisions: POMWRIGHT.md

POMWright leaves many choices to a project. A project records its choices once, in `POMWRIGHT.md`, so every agent and
person writes tests the same way and nobody asks again. This guide lists the decisions with their options and defaults,
and says how to ask them and keep the file current.

## Contents

- [Where the file lives](#where-the-file-lives)
- [Creating it](#creating-it)
- [The decisions](#the-decisions)
- [Models and effort](#models-and-effort)
- [Keeping it current](#keeping-it-current)

## Where the file lives

Beside the Playwright config (`playwright.config.ts`), which is the repository root in most projects. A repository
with several Playwright projects has one beside each config, or one at the root that they share. To find it, look in
the config's folder, then in each folder above it, up to the repository root.

## Creating it

When the file is missing, writing it comes first, before other work in the project, also when the project already has
tests and page code, and also when the request asks for code: ask, then stop, and write no code until the user has
answered. The decisions set where each file goes, how it is named and how data reaches it, so code written before them
is code rewritten.

1. **Look first.** In a project with tests, read the Playwright config, the env module, a base class, two page objects,
   the fixtures and two specs, and note for each decision below what the code does. Where it does two things, note
   both.
2. **Ask in one message.** List every decision with what the project does now, the default, and one line on the other
   choices, each in its own column, so the user sees what would change. The user answers only where they want
   something else. Mixed code is a question: which of the two is the decision?

   | decision | the project now | default | other choices |
   | --- | --- | --- | --- |
   | origins | `baseURL` in `playwright.config.ts` | `env.ts`, no `baseURL` | keep `baseURL`, set from `env.ts` |
   | test data | written in each spec | one `testData` fixture | data modules each spec imports |
   | shape | no page code yet | `PageObject` subclasses | own classes, functions, fixtures |

3. **Write the file.** Copy the template beside the Playwright config and fill in the answers. Add a note to a decision
   where the user gave a reason or an exception.
4. **Offer the pointer.** Offer one line in the agent instructions the project uses, so that agents working without
   this skill read the file too: `Before writing or reviewing tests, read POMWRIGHT.md: how this project uses
   POMWright.` Codex reads `AGENTS.md`. Claude Code reads `CLAUDE.md`, and reads `AGENTS.md` only when the project has
   no `CLAUDE.md`. Write the line into the file the project has, or both.

Then do the task the user asked for, by the file's decisions.

## The decisions

The default comes first; the others are what projects choose instead.

| decision | default | other choices |
| --- | --- | --- |
| shape of the page code | `PageObject` subclasses, one base class per app | own classes, functions or fixtures over `createRegistryWithAccessors` (`guides/choosing-a-shape.md`) |
| origins | in `env.ts`, one environment variable per app, read by each app's base class | another config module the project has |
| environments | each origin's variable set per environment (locally, in CI) | one variable (`TEST_ENV`) that picks every origin from a map in `env.ts` |
| Playwright's `baseURL` | not set: page code takes its origins from `env.ts` | set from the same `env.ts` value, for one app, so that Playwright's relative URLs (`page.goto("/cart")`, `expect(page).toHaveURL("/cart")`, the `request` fixture) reach it |
| layout | a folder per app in `page-objects/` and `tests/`, a file per app in `fixtures/` and `test-data/` (`guides/project-structure.md`) | the project's own layout |
| file names | `<name>.locators.ts` beside `<name>.page.ts` | the project's own names |
| imports | relative paths | path aliases (`@page-objects/*`) in `tsconfig.json` |
| where locators are registered | a locator module per page, shared parts as composed modules | inline, in `defineLocators()` |
| test id attribute | Playwright's, `data-testid` | the app's own, set with `testIdAttribute` in the config's `use`; `getByTestId` follows it |
| locator preference | role, label, placeholder, text, alt text, title, test id, id, then CSS, each narrowed by its options and `filter()` before the next; `nth` last | test ids first, where the app gives every element a stable one |
| XPath | never | last, after CSS, where existing tests rely on it |
| segment names | `kind@which`, the kind being the element's role (`button@save`) | the project's own style, applied the same way everywhere |
| plural and singular | by what a segment matches in its scope: `main.list@products.cards` for several, `main.list@products.card` for one | always singular |
| one of several | a query where it is used; a path of its own when many tests use it, named by what it matches: `main.list@products.card@lamp` for one lamp, `main.list@products.cards@lamp` for several; `nth` last | queries only, no narrowed paths |
| page code in tests | as fixtures, from one `test` that every spec imports | built in each test |
| steps | every action and check of the page code is a report step: `@step()`, or `test.step` in a function | only the methods the project names |
| step titles | `@step()`'s own, `ClassName.methodName` | a title per method, `@step("Log in")` |
| assertions | web-first, in specs, and as `expect…` steps of the page code for a check several specs repeat | only in specs |
| parameters | one options object for two or more | positional parameters |
| test data | one `testData` fixture, by `testData.<app>.<page>.<case>`, holding values, data imported from files (JSON among them), and generators, builders and helpers; page code takes data as arguments | data modules each spec imports; values in the specs; a fixture per kind of data; a data library the project already uses |
| state a test needs and does not test | set up directly: a login saved by Playwright's setup project as `storageState`, session storage seeded with `seed` before the app loads | through the UI, as a user would |
| overlays | one that is predictable (a dialog on a first visit) handled by a step or a precondition; one that appears at random by `page.addLocatorHandler()` | the project's own helper |
| logging | page code takes a child of the `log` fixture only where it logs | always, or never |
| checks while working | `npx tsc --noEmit`, then the specs the change touches on one browser project, then every project | the project's own commands |
| lint and format | the project's own commands, if it has them | none |
| `strictChains` | off | on: `verify()` requires every ancestor of every path to be registered |
| agents' model and effort | the agent session's own, for every task, each done in the session | a model and effort level the project recommends as its default, and the tasks that use another: more effort or a larger model for mapping a site or a review, less for a small edit; the tasks a subagent does, at their model and effort |

Why the defaults: they are the forms the site's guides use. The probes behind the `baseURL` row ran on Playwright 1.64:
with `baseURL` set from the page object's own origin, the relative `page.goto("/products")` reached the page object's
URL, and so did `toHaveURL("/products")` and `request.get("/products")`; without `baseURL`, the relative `page.goto`
threw `Cannot navigate to invalid URL`, and the page object still navigated.

## Models and effort

The file can name a model and effort level for the project's tasks, as a default and per task. A skill does not change
the model or effort of the session it runs in, so they are a recommendation, and the session does every task itself:
before a task the file names another model or effort for than the session's, the agent says so once, and the user
switches (in Claude Code, `/model` and `/effort`) or tells it to go on.

A task goes to a subagent only where the file says so for that task, or the user asks. A subagent starts without the
session's context, and the user sees its work only as the session reports it, so it suits a self-contained task, such
as mapping a few pages or a review pass, not page code the user shapes as it is written. Claude Code's Agent tool
starts one with a model and effort; where the agent cannot, the session does the task.

## Keeping it current

- When the user states a new preference, or changes one, update the file in the same change as the code.
- When the code and the file disagree, ask which one is right; do not change either silently.
- A review checks the code against the file. Code that follows a decision is not a finding, even when it differs from
  a default (`guides/reviewing.md`).
