# Scope E: Logging, `@step` and the fixture

Segment E of the final whole-project review at `54cdada`. First read [../scopes.md](../scopes.md) (where things are,
probing, the finding format, finishing), [../inventory.md](../inventory.md) (lines tagged E) and
[../baseline.md](../baseline.md). Probes go to `/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/`.

Review it as an *area* in the skill's terms. Also treat the commits since `v3.0.1` listed below as a *change set*: for
each one, list every path its promise applies to, including the paths it did not touch, and probe them through the
public API. Where a regression is possible, run the same probe on `v3.0.1` too, in a second worktree in your probes
folder: `git -C /home/magdys/workspace/dyhex/POMWright-final-review worktree add --detach <probes>/<scope>/v3.0.1 v3.0.1`,
then `pnpm install --frozen-lockfile` and `pnpm build` there (add `pnpm harness:install` only if you need its harness), and
`git worktree remove` at the end. It uses port 9000 too, so never run the two at the same time.

Step locations and runner behaviour can only be seen inside Playwright's runner. Probe them with temporary specs, or
with a temporary spec plus a reporter as `test/step-locations/` does, never with a Node script.

## What is in scope

- **Source**: `src/helpers/playwrightReportLogger.ts`, `src/helpers/stepDecorator.ts`, `src/fixture/base.fixtures.ts`.
  Read all of it, with its doc comments. Also read how the navigation and session storage helpers open their boxed
  steps (AGENTS.md §5, the `@step` bullet). The mechanism is yours, the helpers are scopes A and D.
- **Unit tests**: `src/helpers/playwrightReportLogger.test.ts`, `stepDecorator.test.ts`, `stepDecorator.test-d.ts`,
  `stepLocations.test.ts`.
- **Harness**: `test/tests/logging/`, `test/tests/step/`, `test/step-locations/` with `test/playwright.steps.config.ts`,
  `test/tests/packaging/stepLegacyDecorators.typecheck.ts` with `test/tsconfig.legacyDecorators.json`.
- **Docs**: `docs/logging.md`, `test-steps.md`, and the `log` fixture part of `docs/page-objects-in-tests.md`;
  `api/class-playwrightreportlogger.md`, `step.md`, `fixtures.md`; the *`@step`* section of `api/errors.md`;
  *Steps at the test's line* in `internal/call-sites.md`; the *Reports* section of `docs/upgrading-from-2x.md`; the
  logger and `@step` lines of AGENTS.md §5 and §8.

## Changes since v3.0.1 in this scope

```
d91fa33 fix: step's implementation signature accepts the legacy overload
4f80b37 fix: bare @step compiles with experimentalDecorators
d807acb fix: a @step method called without its object runs
333a928 fix: a boxed @step is reported at the line that called the method
```

## Known and decided

- AGENTS.md §8: no `@step` on methods that do not return a Promise; no hard-coded log locale or sorted log entries; no
  JSON re-formatting of log messages; no navigation or session storage step without `box: true`. The comment of `@step`
  has no example block, because a decorator at the start of a comment line reads as a JSDoc tag (§9).

## Questions to answer

- **Step locations.** Is the step, and an error thrown in it, reported at the calling line for every form? Cover boxed
  and unboxed, bare and with a title or options, standard and `experimentalDecorators`, instance and static methods, a
  detached call, a method that throws synchronously, a method returning a non-native thenable, a method awaited
  against one returned from another `async` function, and a decorated method that calls another decorated method.
- **The decorator's contract.** What happens with a getter, a field, a class decorator position, or a method that does
  not return a Promise? Do the types reject what the runtime rejects, under both decorator modes? Does `d91fa33`'s
  signature still reject what it should?
- **Logger.** How do levels behave across a parent and its children (`setLogLevel` and `resetLogLevel` on either)?
  Check arguments of every kind (objects, `Error` with `cause`, cyclic values, symbols, `BigInt`, `undefined`), the
  attachment names in Playwright's `locale` and `timezoneId`, attachment order with several child loggers, and
  `attachLogsToTest` called twice, or by the user and by the fixture. What happens to entries logged after the test
  body, during teardown?
- **Fixture.** Check `log` when POMWright's `test` is extended with other fixtures, combined with `mergeTests`, and
  used in a `test.describe` with `test.use({ locale })`.
- **Docs.** Does every attachment name, step title and message a page shows match what a probe produces at 1.64.0?

## Neighbours

The navigation and session storage helpers themselves are scopes D and A. Packaging of the decorator's declarations is
scope F. Report what you meet there under *outside the scope* in `summary.md`.
