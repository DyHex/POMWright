# Code conventions

The rules for every change to the runtime: style, types, messages, call sites and dependencies. Read it before any
change under `src/` or to `index.ts`, together with the contracts file of the area you change. Part of the contributor
guide that [AGENTS.md](../AGENTS.md) indexes; AGENTS.md's rules apply here too.

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
  plan (see [release planning](release-planning.md)), never in silently. A fix enforces what the code already promises; it never adds a capability that
  keeps a failing test going (a navigation to a seeded origin that fails fails the test; no retry is made to apply the
  seed, since that would rest on browser behavior without a guarantee).
- No new runtime dependencies. A new dev dependency is recorded, with its reason, in the plan or the commit that adds
  it, and in the working folder's decisions log while one exists (see [release planning](release-planning.md)).
- Considered and not planned: a punctuation convention for error messages (each is punctuated as reads best for
  it, and a convention would change about two dozen messages for no reader's benefit).

## Do not

- Filter stack frames by file name, other than POMWright's own bundle.
- Re-export a class as a public type, return `this` from a public builder step, or hide internals with `@internal`
  and `stripInternal`.
