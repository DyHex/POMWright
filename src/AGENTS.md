# The runtime

The conventions for every change to the runtime in `src/` and its entry `index.ts`, and the `PageObject` lifecycle.
`src/locators/` and `src/helpers/` have an AGENTS.md of their own. Claude Code loads this file when it reads a file
under `src/`; with another client, read it before working there. Read it before changing `index.ts` too. Part of the
contributor guide that the root [AGENTS.md](../AGENTS.md) indexes; its rules apply here too.

## Files

- `src/`: Runtime, plus colocated vitest unit tests (`**/*.test.ts`, beside the file each tests), the type-only
  `helpers/stepDecorator.test-d.ts` (decorator syntax, which vitest's runtime cannot load), and `locators/fakePage.ts`,
  test support only: a page whose locators record the chain they were built from, never imported by the runtime and so
  never bundled.
- `src/pageObject.ts`, `src/fixture/base.fixtures.ts`: Abstract `PageObject` (constructor options `label`, `navOptions`, `sessionStorage`, `locators: { strictChains }`):
  `defineLocators()` and `verify()` run once, right after construction (a check scheduled with `queueMicrotask`) or at
  the first locator call, through a facade on `locatorRegistry`; labeled, sticky errors with the construction site; the
  optional actions hook, evaluated per run. The `test` fixture that provides `log`.

## Conventions

- Tabs, width 2, line width 120 (biome). TypeScript strict with `noUncheckedIndexedAccess`. `verbatimModuleSyntax`
  is on, so types are imported with `import type`.
- There are no thenables anywhere in `src`; do not add any.
- A deferred error (the page object's scheduled check, a pending `seed`) points at the consumer's call through
  `src/helpers/callSite.ts`, which cuts the stack at a boundary function with V8's `Error.captureStackTrace`. Never
  filter stack frames by file name: a consumer's file may share a POMWright file name. The one exception is the frames
  of POMWright's own published bundle (`/pomwright/dist/index.(js|mjs|cjs)`), which `atCallSite` drops so the report's
  code frame is the consumer's line.
- Public types are type aliases declared under their public name (`LocatorQueryBuilder` over
  `LocatorQueryBuilderInternal`), never a class re-exported as a type: tsup's bundle writes such a class into the
  export list as a value. Every public method returns a type a consumer can import from the root, except the
  registration builders of `add(path)`; a builder step returns the public alias, not `this`. Internals are
  TypeScript-`private`, never hidden with `@internal` and `stripInternal`.
- Error messages name the registry path (`formatLocatorSchemaPathForError`) and the DSL method the user called.
  Validate DSL input at the boundary, before anything is registered; `assertIdValue` is the pattern.
- Descriptive path names in docs and tests. No anonymous segments.
- `// biome-ignore` only with a one-line justification. No `try/catch` around imports.
- Prefer behavior-preserving refactors. A contract change (anything documented behavior relies on) goes through a
  plan (see [docs/releases.md](../docs/releases.md)), never in silently. A fix enforces what the code already promises; it never adds a capability that
  keeps a failing test going (a navigation to a seeded origin that fails fails the test; no retry is made to apply the
  seed, since that would rest on browser behavior without a guarantee).
- No new runtime dependencies. A new dev dependency is recorded, with its reason, in the plan or the commit that adds
  it, and in the working folder's decisions log while one exists (see [docs/releases.md](../docs/releases.md)).
- Considered and not planned: a punctuation convention for error messages (each is punctuated as reads best for
  it, and a convention would change about two dozen messages for no reader's benefit).

## The page object

- `PageObject` never calls `defineLocators()` from its constructor: it registers synchronously and runs, followed by
  `verify()`, once per instance, right after construction (a check scheduled as the constructor's last statement) or at
  the first locator call if that comes earlier; a registry mistake still fails the fixture, labeled `<label>: …` with
  the original as `cause` and the construction site (the `new` line) in the stack; a definition that returns a Promise
  (an `async` one) fails the page object the same way, without a `cause`, and its own rejection is handled.
  `pageActionsToPerformAfterNavigation()` is optional and called each time the actions run. A standalone registry calls
  `verify()` itself. Never move either hook back into the constructor.

## Rules held elsewhere

- A doc comment, and a message, chain or rendering a page shows, follow [website/AGENTS.md](../website/AGENTS.md): a change to one
  updates the pages and doc comments that show it.
- A consumer-facing change needs a changeset: [docs/versioning.md](../docs/versioning.md).
- The `log` fixture (`src/fixture/`) and the URLs and navigation of `pageObject.ts` follow [src/helpers/AGENTS.md](helpers/AGENTS.md).
- Specs go in `test/`: [test/AGENTS.md](../test/AGENTS.md).

## Do not

- Filter stack frames by file name, other than POMWright's own bundle.
- Re-export a class as a public type, return `this` from a public builder step, or hide internals with `@internal`
  and `stripInternal`.
- Reintroduce a call to `defineLocators()` or `pageActionsToPerformAfterNavigation()` from the `PageObject`
  constructor, or the `UrlTypeOptions` name.
