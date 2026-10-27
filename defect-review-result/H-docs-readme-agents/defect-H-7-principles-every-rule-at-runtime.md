# H-7: *Principles* says "Every rule is checked at runtime"; `@step`'s rule (methods that return a Promise) is checked by TypeScript only, and from JavaScript a plain-value method is decorated silently

- **Kind**: documentation
- **Area**: `docs/principles.md`, *Check at runtime; types where they cost nothing* (one body: a broad claim against a
  narrower contract)
- **Severity**: Low (a broad claim with one exception; the exception is documented on *Test steps*, and the consequence
  is a Promise where a value was expected)
- **Semver of the fix**: none for the recommended docs fix; a runtime check would be a behaviour change (see options)
- **Reviewed**: `54cdada`, 2026-10-23, H reviewer
- **Status**: decided: the runtime check, with *Principles* rewritten (2026-10-26, [DECISIONS.md #40](../DECISIONS.md))

## Contract

`website/src/content/docs/docs/principles.md`, lines 43–48:

> ## Check at runtime; types where they cost nothing
>
> Every rule is checked at runtime, so a value from a variable, an environment or JavaScript code is checked like a
> literal. TypeScript adds what it can check for free: paths that are not in the union, misspelt `has` references, a
> `replace()` without its first argument. POMWright does not add a type that would make ordinary code harder to write
> in exchange for an error the runtime reports anyway.

The narrower contract: `@step` decorates methods that return a Promise (AGENTS.md §5; `docs/test-steps.md`, *Only
methods that return a Promise*; `api/errors.md`, *`@step*: "A compile error, on a method that does not return a
Promise.").

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/H/principles/zz-probe-H-step-sync.spec.ts` (the
decorator line carries `// @ts-expect-error`, standing in for JavaScript):

```ts
import { test } from "@playwright/test";
import { step } from "pomwright";

class Cart {
  // @ts-expect-error @step decorates methods that return a Promise: make the method async
  @step()
  total(): number {
    return 42;
  }
}

test("sync method under @step", async () => {
  const result: unknown = new Cart().total();
  console.log(`RESULT type=${typeof result} isPromise=${result instanceof Promise} value=${await result}`);
});
```

Copied to `test/tests/` and run from the worktree root:

```sh
pnpm exec tsc --noEmit -p test   # exit 0: the @ts-expect-error is used, so TypeScript rejects the decoration
pnpm -C test exec playwright test tests/zz-probe-H-step-sync.spec.ts --project=chromium --reporter=line   # exit 0
```

```text
RESULT type=object isPromise=true value=42
  1 passed (711ms)
```

`src/helpers/stepDecorator.ts`, lines 100–121: the decorator checks only that it decorates a method; the wrapper
returns `test.step(…)`, a Promise, whatever the method returns.

## Observed / expected

Observed: the only check of `@step`'s Promise rule is TypeScript's; from JavaScript the decorated method returns a
Promise instead of its value, without an error.

Expected: either *Principles* names the exception (the rule is about the method's return value, which exists only when
the method runs, and is checked by TypeScript), or the runtime checks it too.

## Cause

The principle was written for the value rules (paths, first arguments, URLs, options); the decorator's rule is a type
rule by nature and was not carved out.

## Fix plan

- **Intended contract**: *Principles* states what is checked where.
- **Options**:
  - (recommended) Docs: "Every rule about a value is checked at runtime … `@step`'s rule, that the method returns a
    Promise, is TypeScript's alone: the return value exists only when the method runs, and the step has already
    started by then (see [Test steps](/POMWright/docs/test-steps/#only-methods-that-return-a-promise))." Semver none.
  - Runtime: inside the step body, throw when the original returns a non-thenable (`@step decorates methods that
    return a Promise: make the method async`). A JavaScript suite that decorates such a method today, and awaits or
    ignores the Promise, would start failing: behaviour a user could rely on changes, so major by AGENTS.md §7, or
    patch if argued as enforcing the documented rule. Not recommended for a patch release.
- **Implementation steps**: `website/src/content/docs/docs/principles.md`, lines 43–48.
- **Tests**: none for the docs option.
- **Docs**: *Principles* only.
- **Changeset**: none for the docs option.
- **Decisions to tick**:
  - [x] name `@step`'s rule as the type-only exception on *Principles*: **no; a runtime check instead** (the "Runtime"
    option, as a patch: behaviour brought in line with the documented rule), and *Principles* names the rules that are
    type-only by nature (the storage pairing, the factory's type argument) ([DECISIONS.md #40](../DECISIONS.md))
- **Execution order**: independent.
