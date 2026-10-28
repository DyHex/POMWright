# Step and logging contracts

How `@step` and the helpers' steps report their location, and what the logger and the `log` fixture keep. Read it before
changing `src/helpers/stepDecorator.ts`, `callSite.ts`, `playwrightReportLogger.ts`, `thenable.ts` or `src/fixture/`,
`test/step-locations/`, or any step a helper opens. Part of the contributor guide that [AGENTS.md](../AGENTS.md)
indexes; AGENTS.md's rules apply here too.

- `@step` decorates methods that return a Promise; `test.step` always returns one. TypeScript refuses any other, and the
  wrapper checks it at run time too: a method that returns something that is not a thenable throws, in the step, a
  `TypeError` with the compile error's text. The navigation and session storage
  helpers pass `{ box: true }` to their steps, so the report shows the line that called them. Playwright takes an
  unboxed step's location from the first frame of the async stack (only `async` functions waiting in an `await`), and a
  boxed step's from the frame after it only when no ancestor step is boxed; so every boxed step (a boxed `@step`, the
  navigation and session storage helpers) passes `location`, the caller's line from `callerLocation(boundary)`, cut at
  the method the consumer called, unless the caller gave one. A boxed error's stack is still Playwright's (the async
  stack after its first frame, or the outermost boxed step's), so exactly one `async` POMWright frame sits between the
  caller and a boxed `test.step`: the navigation methods are `async` and open their steps themselves; a `SessionStorage`
  method is `async` and awaits a helper that is not; `@step`'s wrapper is `async` for a boxed step and a plain function
  otherwise. A caller awaits rather than returns such a Promise, which would cut the stack. `test/step-locations` checks
  the result, nested boxed steps included, and fails when a marked line is never reported. The logger keeps the message and
  string arguments as given, prints other arguments as `console.log` does, attaches one attachment per entry in call
  order, and names them in Playwright's `locale` and `timezoneId`, which the `log` fixture checks with Node's `Intl`
  when the test starts (`""` is no value).

## Do not

- Reintroduce `@step` on methods that do not return a Promise, a hard-coded log locale or sorted log entries, JSON
  re-formatting of log messages, or a navigation or session storage step without `box: true`.
