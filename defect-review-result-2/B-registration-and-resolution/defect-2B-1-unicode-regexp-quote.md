# 2B-1: a `u`- or `v`-flag RegExp with a quote, a backtick or `>>` fails at the first action once POMWright resolves it

- **Kind**: defect
- **Area**: B-18 `getById`, B-17 the `STRATEGIES` table against Playwright, B-22 resolution (the terminal's `describe`)
- **Severity**: Low (a rare input: a unicode-mode RegExp holding `"`, `'`, `` ` `` or `>>`, such as `/don't save/iu`; it
  fails loudly, at the first action, with Playwright's selector parse error, never silently)
- **Semver of the fix**: patch for `getById` (brings it in line with *Locating by id*: every flag goes to Playwright and
  the id is matched); none for the other strategies (a documented limitation, and an issue upstream)
- **Pass**: 1
- **First review**: missed by the first review (the escaper and the always-on description predate `54cdada`; the unit
  test that pins the failing output, `utils.test.ts:93`, too)
- **Reviewed**: `d850405`, 2026-10-28T15:02:38+01:00, Opus 5.5, second review, segment 2B

## Contract

- `website/src/content/docs/docs/locating-by-id.md`, *A RegExp: a pattern* and *Flags*: "A RegExp is evaluated against
  each element's `id` with its flags, through the attribute engine Playwright's own `getByTestId(RegExp)` uses";
  "Every flag goes to Playwright unchanged, as with Playwright's locators". *Validation*: "A RegExp is never rejected or
  rewritten."
- `src/locators/AGENTS.md`, *Contracts*: "`getById` stores values verbatim: … RegExps as
  `internal:attr=[id=/source/flags]` with every flag passed through."
- `website/src/content/docs/docs/registering-locators.md`, *The ten methods*: "A registration resolves to what
  Playwright's method returns". `AGENTS.md`, *How to work*: mirror Playwright.

## Reproduction

Probe `/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/p02/2B-1.mjs` (loads `dist/index.mjs` and chromium
from the root package; exits 1 when a `getById` case finds nothing):

```sh
node /home/magdys/workspace/dyhex/POMWright-second-review-probes/B/p02/2B-1.mjs chromium   # also firefox, webkit
```

Exit code 1 on all three browsers. Supporting probes in the same folder: `quote-chain.mjs` (Playwright alone, three
browsers), `quote-u.mjs` (every strategy), `unicode.mjs`, `hex-concept.mjs` (the fix's selector form).

## Observed / expected

```text
getById(/a"b/u)        getNestedLocator: ERROR locator.count: InvalidSelectorError: Error while parsing selector `[id=/a"b/u] >> internal:describe="main.p@0" | getLocator: ERROR …
getById(/it's/v)       getNestedLocator: ERROR locator.count: InvalidSelectorError: Error while parsing selector `[id=/it's/v] >> internal:describe="main.p@1 | getLocator: ERROR …
getById(/a>>b/u)       getNestedLocator: ERROR locator.count: Unexpected token "/" while parsing css selector "b/u]". Did you mean to CSS.escape it? | getLocator: ERROR …
getByRole name /don't save/iu  POMWright getNestedLocator: ERROR locator.count: InvalidSelectorError: Error while parsing selector `button[name=/don't save/iu] >> internal:des
                               Playwright page.getByRole: 1
                               Playwright ...getByRole(…).first(): ERROR locator.count: InvalidSelectorError: Error while parsing selector `button[name=/don't save/iu] >> nth=0` - une
```

Expected: each `getById` finds its one element, as the same RegExp without the `u` flag does (`/a"b/`, `/it's/`, `/a>>b/`
all match, `ids.mjs`), and a registered `getByRole("button", { name: /don't save/iu })` resolves to a locator that works
where `page.getByRole("button", { name: /don't save/iu })` works.

What happens: Playwright's `escapeRegexForSelector` (playwright-core 1.64.0 and 1.64.1, `lib/coreBundle.js:573`) returns
a unicode-mode RegExp unescaped, because `\"` is not a valid escape there. An odd quote or backtick then makes
Playwright's selector parser misread whatever follows the RegExp in the selector (`>> nth=0`, `>> internal:describe=…`),
and `>>` inside the RegExp splits the selector. In Playwright alone this fails only when something is chained after the
RegExp's locator (`.first()`, `.locator()`, `.describe()`); a bare `page.getByRole(…)` works. POMWright always chains
something after it: every resolved locator ends with `describe(path)`, and every ancestor has its descendants after it,
so a registered unicode RegExp with a quote never works, in any segment, with `getNestedLocator` or `getLocator`. The
same RegExp without `u`/`v` works on all three browsers.

For `getById`, the failing selector is POMWright's own: `buildIdSelector` uses POMWright's port of the escaper
(`escapeRegExpForSelector`), and `utils.test.ts:93-96` pins the unescaped output (`'/say"hi/u'`). No harness spec
runs a unicode-mode RegExp in a browser.

## Cause

`src/locators/utils.ts:131-138`: `escapeRegExpForSelector` returns `String(re)` for `u`/`v`, mirroring Playwright's
escaper; `src/locators/locatorRegistry.ts:656` describes every resolved terminal, which appends
`>> internal:describe="…"` to the selector.

## Fix plan

- **Intended contract**: `getById` with any RegExp, every flag included, matches as *Locating by id* says; for the
  strategies Playwright builds, POMWright documents the limitation it inherits.
- **Options**:
  1. *(recommended, patch)* In unicode mode, write `"`, `'`, `` ` `` as `\x22`, `\x27`, `\x60` and the second `>` of
     `>>` as `\x3e`: unicode mode accepts hex escapes, they match the same characters, and the selector parser then sees
     no quote and no `>>`. Checked with Playwright alone on all three browsers (`hex-concept.mjs`:
     `internal:attr=[id=/a\x22b/u] >> internal:describe="x"` and the other three forms each find their element). A
     quote cannot be backslash-escaped in a valid unicode-mode RegExp, so a plain replace is exact. It changes the
     selector text only, not the RegExp, so "never rejected or rewritten" still holds for the value.
  2. For `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId`, the `name` of
     `getByRole` and `filter({ hasText })`: Playwright builds the selector. Either document the limitation (*Registering
     locators*, *The first argument*; *Locating by id* for `getByTestId`'s engine) with the workaround (drop `u`, or
     write the quote as `\x27`), and report it upstream; or rewrite such a RegExp into the equivalent hex-escaped one
     before handing it to Playwright, which changes the rendering (`getByRole('button', { name: /don\x27t save/iu })`)
     and adds POMWright behavior: a design question, not recommended here.
- **Implementation**: `escapeRegExpForSelector` in `src/locators/utils.ts`; its doc comment.
- **Tests**: unit, `utils.test.ts` *escapeRegExpForSelector* (replace the case that pins the unescaped output); harness,
  `test/tests/locatorRegistry/add/add.getById.spec.ts` and `testIds.spec.ts`: `getById(/…"…/u)`, `/…'…/v`, `/…>>…/u` found
  through `getNestedLocator`, on all three browsers.
- **Docs**: *Locating by id*, *Flags* (unicode mode works, quotes included); `src/locators/AGENTS.md` if the escaper's
  description is kept there; the limitation for the other strategies (option 2) in *Registering locators*.
- **Changeset**: patch, "`getById` with a `u` or `v` RegExp that holds a quote, a backtick or `>>` finds its element; it
  failed with a selector parse error."
- **Sketch proposed**: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/sketch/2B-1.diff` (the escaper and
  its unit test) and `2B-1.run.sh` (unit test, build, the probe on three browsers; exits 0 when every `getById` case
  finds its element). `git apply --check` passes at `d850405`; the run rebuilds `dist/`.
- **Decisions to tick**: whether the other strategies' half is documented, reported upstream, or both.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`): the run script at `d850405`, then `git apply` of the diff and `pnpm harness:install`, the run script again, `pnpm test:unit`, and the area's specs on chromium; then `git checkout -- .`, and at the end the baseline package rebuilt (`dist/index.js` matches the baseline byte for byte) and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/B/sketch/2B-1.gate.out`.

- At `d850405`: `2B-1.run.sh` exit 1 (`getById(/a"b/u)`, `getById(/it's/v)` and `getById(/a>>b/u)` fail to parse through `getNestedLocator` and `getLocator`). With the sketch: exit 0 (every `getById` case finds its element on chromium, firefox and webkit; the escaper's unit tests pass). The `getByRole` row with `/don't save/iu` still fails after the sketch, for POMWright and for Playwright's own `page.getByRole(…).first()` alike: that part is Playwright's escaper, as the finding says, and the sketch does not claim it. Unit tests 904 passed; the registry specs (`tests/locatorRegistry`, `testIds`, `iframe`, `testPage`) on chromium 347 passed.
- **Verdict: approved for `getById`; the cause is confirmed.**
