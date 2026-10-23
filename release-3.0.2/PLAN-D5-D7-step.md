# PLAN-D5–D7 — `@step`

Three defects in [../src/helpers/stepDecorator.ts](../src/helpers/stepDecorator.ts), one commit each.

## D5 — a boxed `@step` loses its location (opus-D2)

### Intended contract

`docs/test-steps.md`: "`@step({ box: true }) async confirm() {} // an error inside points at the line that called
confirm()`". `api/step.md`: "`box` (report the step at the line that called the method)".

### What `@step` does

`@step` replaces the method with a wrapper: a new function that opens a `test.step` and runs the original method inside
it. Simplified from `createWrappedMethod`
([../src/helpers/stepDecorator.ts#L61-L74](../src/helpers/stepDecorator.ts#L61-L74)):

```ts
class CheckoutPage {
  @step({ box: true })
  async confirm() { /* … */ }
}

// what the class ends up with, in effect:
CheckoutPage.prototype.confirm = function wrapper(...args) {        // not async
  return test.step("CheckoutPage.confirm", () => originalConfirm.apply(this, args), { box: true });
};
```

### How Playwright finds a step's location

When a step opens, Playwright reads the stack *after* an internal `await`. After an `await`, the stack holds only the
**async** functions that are waiting, not plain functions (V8's async stack trace). Playwright then picks the location:

- unboxed step: the first frame on that stack;
- boxed step: it drops the first frame (assumed to be the helper that opened the step) and takes the next one, so the
  report shows the line that *called* the helper.

### Why the wrapper breaks it

The wrapper is not `async` and does not `await`, so it is never on that stack. The frame Playwright drops is the
caller's instead:

```ts
test("checkout", async ({ checkoutPage }) => {
  await checkoutPage.confirm();     // line 21
});
// stack when the step opens: [test body:21]
// boxed: drop the first frame -> nothing left -> no location
```

```ts
class CheckoutPage {
  async placeOrder() {
    await this.confirm();            // line 15
  }
}
test("checkout", async ({ checkoutPage }) => {
  await checkoutPage.placeOrder();   // line 22
});
// stack: [placeOrder:15, test body:22]
// boxed: drop placeOrder:15 -> reported at 22, one frame too far out (expected 15)
```

A hand-written step has the frame Playwright expects, because the method around it is `async`:

```ts
class CheckoutPage {
  async confirm() {                  // async, waiting in the await below
    await test.step("CheckoutPage.confirm", async () => { /* … */ }, { box: true });
  }
}
// stack: [confirm, test body:16] -> drop confirm -> reported at 16, correct
```

The navigation and session storage helpers are reported correctly for the same reason: exactly one POMWright `async`
frame sits above the caller.

Probe, 2026-10-22, chromium, the packed build, a reporter printing `step.location` and each error's location and
first spec frame:

| Call | Reported | Expected |
| --- | --- | --- |
| `@step()` method, from the test (line 20) | 20 | 20 |
| `@step({ box: true })` method, from the test (line 21) | no location | 21 |
| the same, from a helper method (line 15), helper called at line 22 | 22 | 15 |
| `@step({ box: true })` method that throws, from the test (line 25) | step and error: no location, no spec frame | 25 |
| hand-written boxed `test.step` inside an `async` method, called at line 16 | step and error: 16 | 16 |
| the same through a helper method (line 11) | step and error: 11 | 11 |

### Fix

For a boxed step, the wrapper is `async` and awaits the step, so it is the frame Playwright drops:

```ts
async function wrapper(...args) {
  return await test.step(title, () => original.apply(this, args), { box: true });
}
// stack: [wrapper, test body:21] -> drop wrapper -> reported at 21
```

Nothing changes in how `@step` is written: `@step`, `@step()`, `@step("Pay")` and `@step({ box: true })` above an
`async` method, as today. The wrapper is internal, and the decorator picks it from the `box` option.

An unboxed step keeps today's wrapper. There Playwright takes the *first* frame, which an `async` wrapper would turn
into POMWright's own bundle; the new location check (below) confirms both forms. opus probed the boxed fix as a
decorator in a spec: the step and its error at the calling line.

### Tests

Today nothing checks step locations automatically: `test/tests/step/step.spec.ts` says "These tests need to be
verified manually", and `src/helpers/stepLocations.test.ts` only checks that the helpers pass `box: true`.

A reporter that checks locations: a small reporter in `test/`, added to the harness config next to the line reporter,
collects the steps whose title starts with a marker (`LocationProbe:`) and compares each one's reported line with the
line the title names. It fails the run from `onEnd` on a mismatch. A spec under `test/tests/step/` covers `@step()`,
`@step({ box: true })` from a test and from a helper, a throwing boxed step (the error's location), and `goto` and
`set` for the helpers. CI runs it at the Playwright pin and at the latest 1.x, so a change in Playwright's stack
handling shows up there.

### Docs

`internal/call-sites.md` (one `async` frame above the caller), and R3 rewrites the `AGENTS.md` rule ("the helper that
opens the step is not `async`", which does not describe navigation).

### Changeset

`patch`: "`@step({ box: true })` reports the step, and an error thrown inside it, at the line that called the method.
Before, a call from a test had no location and an error lost its stack."

## D6 — `@step` on a call without a receiver (opus-D9)

### D6: Verified current behaviour

The wrapper reads `this.constructor` before it knows whether it needs a class name
([../src/helpers/stepDecorator.ts#L68-L71](../src/helpers/stepDecorator.ts#L68-L71)):

Decorators still apply to class members only; that does not change. "Without a receiver" means the decorated method is
called detached from its object, for example passed as a callback:

```ts
class Cart {
  @step("Add an item to the cart")
  async addItem(name: string) { await addToCartThroughTheApi(name); } // does not use `this`
}

await Promise.all(["Tea", "Cake"].map(cart.addItem)); // passed without its object: `this` is undefined in each call
// without @step: works
// with @step today: TypeError: Cannot read properties of undefined (reading 'constructor')
```

A method that does use `this` fails when called this way, with or without `@step`; that is JavaScript, and stays so.

Probe, 2026-10-22, Node, the built `dist/index.js`: that `TypeError`, before `test.step` is reached. Without `@step`,
the same call runs.

### D6: Fix

Compute the owner only when no title was given, and accept `this == null` (title `Anonymous.<method>`, as for a plain
object). The method then fails or not on its own, as an undecorated one does.

### D6: Tests

Unit (`src/helpers/stepDecorator.test.ts`): an unbound call with and without a title.

### D6: Changeset

`patch`: "A `@step` method called without a receiver runs, titled `Anonymous.<method>` or with its own title, instead
of throwing a `TypeError`."

## D7 — bare `@step` with `experimentalDecorators` (codex-D4)

### D7: Intended contract

`api/step.md` promises the standard form and `experimentalDecorators: true`, with and without parentheses; the doc
comment repeats it.

### D7: Verified current behaviour

```ts
// tsconfig: "experimentalDecorators": true
class Example {
  @step          // TS1241, TS1270
  async bare(): Promise<void> {}
  @step()        // compiles
  async called(): Promise<void> {}
}
```

The runtime handles the legacy bare call ([../src/helpers/stepDecorator.ts#L131-L143](../src/helpers/stepDecorator.ts#L131-L143)),
but the overloads ([#L119-L130](../src/helpers/stepDecorator.ts#L119-L130)) have no legacy three-argument form. Probe,
2026-10-22, `tsc` 6.0.3 against the packed build: as above. The unit tests cast the legacy call, and
`stepDecorator.test-d.ts` runs in standard mode only, so nothing caught it.

### D7: Fix

Add the legacy method-decorator overload `(target, key, descriptor: TypedPropertyDescriptor<AsyncMethod>)`, keeping
the Promise-only rule (a non-async method still gets the readable message).

### D7: Tests

A compile-only probe with `experimentalDecorators: true` against the packed declarations (a second tsconfig under
`test/`, run by `pnpm typecheck`): bare and called forms compile, a non-async method does not (`@ts-expect-error`).

### D7: Changeset

`patch`: "Bare `@step` compiles with `experimentalDecorators: true`, as `@step()` already did."

## Decisions

- [x] D5: the fix above (async wrapper for boxed steps only) (2026-10-22)
- [x] D5: an automated location check with a reporter (2026-10-22)
- [x] D6: fix as above (2026-10-22)
- [x] D7: fix as above (2026-10-22)
