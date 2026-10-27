# H-2: *Error messages* says it lists every message, and misses two that other pages document: `goto()` with a URL object, and a hand-made seed without its first argument

- **Kind**: documentation
- **Area**: `api/errors.md` as a whole (inventory §3, §8)
- **Severity**: Low (both are JavaScript-only paths, and each message names its fix; the page that claims completeness
  does not find them)
- **Semver of the fix**: none (docs only)
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided (2026-10-26, [DECISIONS.md #36](../DECISIONS.md))
- **Merged with**: A-6, B-7, C-4, D-3 (see report.md)

## Contract

- `website/src/content/docs/api/errors.md`, front matter: "Every message POMWright throws, by the call that throws it".
- `website/src/content/docs/api/index.md`, line 69: "[Error messages] lists every message, by the call that throws it."
- AGENTS.md §9: "say what fails and how (concept pages show the common errors, API pages and doc comments every one per
  member, *Error messages* all of them)".

## Reproduction

Every `throw` in `src/` (88 `throw`/`Error(` sites, `grep -rn 'throw \|Error(' src --include=*.ts`, test files
excluded) was matched against the page. Two messages a user can reach through the public API are not on it, though
other pages show them:

| Message (probed) | Thrown at | Shown on | On `errors.md` |
| --- | --- | --- | --- |
| `LoginPage: goto() takes a URL string or options; received a URL object; pass its href.` | `src/helpers/navigation.ts:217` (3.0.2, `fa424ad`) | `api/class-navigation.md:151`, doc comment `src/helpers/navigation.ts:102` | no: *Navigation* lists three `goto()` messages, not this one |
| `reuse requires a role value for "main.button@save".` (a seed object made by hand, from JavaScript) | `src/locators/locatorRegistry.ts:255` (`assertStrategyPrimary` with method `reuse`) | `docs/reusing-locators.md:152` (`reuse requires a non-empty selector for "main.list".`) | no: *Reusing* lists `reuse requires a registered path or a seed …` only, and *A first argument that is missing or empty* names `add`, `createReusable`, `replace`, `update` and a seeded `add`, not `reuse` |

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/errors/zz-probe-H-errors.spec.ts`, copied to
`test/tests/` and run from the worktree root with
`pnpm -C test exec playwright test tests/zz-probe-H-errors.spec.ts --project=chromium --reporter=line` (exit 0; the
output is in `run.log` beside it):

```text
MSG1<<LoginPage: goto() takes a URL string or options; received a URL object; pass its href.>>
MSG2<<reuse requires a role value for "main.button@save".>>
```

`grep -n "takes a URL string\|reuse requires a role\|reuse requires a non-empty" website/src/content/docs/api/errors.md`
prints nothing.

The other throw sites not on the page are internal invariants no public call reaches (for example
`utils.ts:365`, `:387`, `:413`, `:510`, `locatorRegistrationBuilder.ts:851`, `locatorUpdateBuilder.ts:66`, `:106`,
`sessionStorageSeed.ts:165`); they are not counted here.

## Observed / expected

Observed: two reachable messages, each documented on its own API or concept page, are missing from the page that says
it has all of them.

Expected: *Navigation* lists the `goto()` URL-object message with its fix ("pass its `href`", from JavaScript), and
*Reusing* (or *A first argument that is missing or empty*) lists the hand-made seed's message with `reuse` among the
callers.

## Cause

`fa424ad` (3.0.2, plan D10) added the `goto()` message to `class-navigation.md` and the doc comment only. The
hand-made seed check (method `reuse`) was documented on *Reusing locators* and not carried to *Error messages*.

## Fix plan

- **Intended contract**: unchanged; *Error messages* lists every reachable message.
- **Options**:
  - (recommended) Add both lines: the `goto()` message to the *Navigation* `text` block with "and, from JavaScript, for
    a URL object: pass its `href`"; the `reuse` message to *Reusing* ("a seed object made by hand without its first
    argument, checked as a builder's").
  - Add a check that every `throw` message template in `src/` has a line on `errors.md` (a script beside
    `check-api-coverage.mjs`). More work; it would catch the next omission. Not needed for this fix.
- **Implementation steps**: `website/src/content/docs/api/errors.md`, sections *Navigation* (lines 271–278) and
  *Reusing* (lines 106–113).
- **Tests**: none (the blocks are `text`).
- **Docs**: that page only.
- **Changeset**: none (site only).
- **Decisions to tick**:
  - [x] add both messages to *Error messages*
  - [x] (optional) a message-coverage check: **yes, in this branch**, `scripts/check-error-messages.mjs` in `pnpm
    typecheck` ([DECISIONS.md #36](../DECISIONS.md)).
- **Execution order**: independent; if scope D's or scope B's own findings touch these sections, fix together.
