# Plan 14: `@step` on generic methods

- **Decisions**: [DECISIONS.md](DECISIONS.md) #11
- **Findings**: [E-5](E-logging-step-fixture/defect-E-5-step-rejects-generic-async-methods.md) (Medium); test gap #5's
  `@step` part
- **Bump**: patch
- **Stop**: no
- **Depends on**: nothing; before plan 15 (F-1 exports this interface under a new name, so its type is final first)

## Contract

`@step` compiles on every method that returns a Promise, generic ones included, with standard decorators and with
`experimentalDecorators`, and the decorated method keeps its exact type. A method that does not return a Promise
(a getter, setter, field, `PromiseLike`, `Promise | number`, a plain method) keeps the readable compile error `@step
decorates methods that return a Promise: make the method async` in both modes.

## Current behaviour

`src/helpers/stepDecorator.ts:3-44,145-164`: the overloads take `This, Args extends unknown[], Return` and rebuild the
method type, which a generic method's type cannot match; TypeScript refuses it in both modes, and under
`experimentalDecorators` asks to make the already `async` method `async` (also in 2.1.0 and 3.0.1;
`…-probes/E/types/generic.out`).

## Steps

1. From scope E's sketch (`…-probes/E/types/fixedStep.ts`, checked by `run-fixed.sh`, `fixed.out`): a method-like type
   `(this: This, ...args: any) => Promise<unknown>` behind a `// biome-ignore lint/suspicious/noExplicitAny:` whose
   one-line reason is that `ClassMethodDecoratorContext` uses `any` there and an `unknown[]` parameter list rejects
   methods with typed parameters; the standard overloads `<This, M extends …>(value: M, context:
   ClassMethodDecoratorContext<This, M>): M | undefined`; the legacy ones `<M extends …>(target, propertyKey,
   descriptor: TypedPropertyDescriptor<M>): TypedPropertyDescriptor<M> | undefined`; the same in the interface `step(…)`
   returns (`StepDecoratorFactory`, renamed in plan 15); the message overloads unchanged; the implementation signature
   unchanged.
2. **Tests**:
   - `src/helpers/stepDecorator.test-d.ts`: a generic method, with `expectTypeOf` that a call keeps its type argument;
     the rejections stay (`stepForms.typecheck.ts`'s cases where the file has none);
   - `test/tests/packaging/stepLegacyDecorators.typecheck.ts`: the same generic method under `experimentalDecorators`;
   - `test/tests/packaging/publicTypes.typecheck.ts` and `publicTypes.emit.ts` where they cover `step`'s signature.
3. **Docs**: *Test steps*: the example gains a generic method, so the snippet check keeps it compiling. The doc comments
   of `step` unchanged in substance.
4. **Changeset** `step-generic-methods.md` (`patch`): "`@step` compiles on generic `async` methods, with standard
   decorators and with `experimentalDecorators`; before, TypeScript refused them, and under `experimentalDecorators`
   asked to make the already `async` method `async`."

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`. Run `…-probes/E/types/run-fixed.sh`'s checks against the
built package once more (the rejection probe must still fail on every `@ts-expect-error` line), recorded in
*Execution notes*.

## Commit

```text
fix: @step compiles on generic async methods

The decorator's types rebuilt the method's type from its this, arguments and
return type, which a generic method cannot match, so TypeScript refused it in
both decorator modes. They now take the method's own type, constrained as
ClassMethodDecoratorContext constrains a method, and keep every rejection.

Plan: defect-review-result/PLAN-E-5-generic-step.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

- As planned: `AsyncMethod<This = never>` is now `(this: This, ...args: any) => Promise<unknown>`, behind a
  `biome-ignore` whose reason points at its doc comment (the constraint `ClassMethodDecoratorContext` puts on a method;
  an `unknown[]` parameter list refuses typed parameters); the standard overloads take `<This, M extends
  AsyncMethod<This>>` and return `M | undefined`, the legacy ones `<M extends AsyncMethod>` and return
  `TypedPropertyDescriptor<M> | undefined`, in `step` and in `StepDecoratorFactory`; the message overloads and the
  implementation signature are unchanged.
- **Deviation: the sketch let a generic method that does not return a Promise through.** The new test-d case
  `plainGeneric<T>(value: T): T` compiled under `@step()`: checked against the constraint's `any` arguments, a generic
  signature is instantiated with `T = any`, so it returns `any`, which passes as a Promise. A probe of 13 accepted and 13
  rejected forms in both modes (scratch copies of `…-probes/E/types/` plus new cases) found five forms the sketch
  accepted that the plan's contract rejects: `<T>(value: T): T` (called and bare), `<T extends number>(value: T): T`,
  `<T>(): T` and `<T>(value: T): T | Promise<T>`. Two alternatives with `never` parameters let the same five through
  and break `ClassMethodDecoratorContext`'s own constraint. The fix adopted: the value (standard) and the descriptor
  (legacy) are typed `ReturnsPromise<M>`, `ReturnType<M> extends Promise<unknown> ? M : StepRequiresPromise`.
  `ReturnType` reads a type parameter as its constraint (`unknown`, not a Promise), so the five are refused with the
  readable message in both modes, and `M` is still inferred from the context or the descriptor and returned unchanged.
  Every accepted form of the probe still compiles (generic called, bare and boxed; a constrained type parameter;
  overloads; `Promise<this>`; a `this` parameter; typed, optional and rest parameters; a non-`async` Promise; a static
  and a private method; a generic returning `Promise<number>`), and a call keeps its type arguments.
- Probes against the built package, both modes (`…-probes/E/types/` `generic`, `stepForms`, `messages`, and the new
  cases): `generic`, `stepForms` and the cases exit 0, every `@ts-expect-error` used; `messages` exits 2 with its 8
  expected errors, the message in each (as the sketch's `fixed.out`).
- Tests: `src/helpers/stepDecorator.test-d.ts`, a `Generic` class (called, bare, boxed, constrained, overloaded,
  `Promise<this>`, a `this` parameter) with `expectTypeOf` on its calls and two `@ts-expect-error` calls (a type
  argument and a constraint still hold), and a `Rejected` class with the getter, setter, field, `PromiseLike`,
  `Promise | number` and plain generic forms; `stepLegacyDecorators.typecheck.ts`, a constrained and a boxed generic
  method, a plain generic one refused, calls keeping their types; `publicTypes.typecheck.ts` and
  `publicTypes.emit.ts`, a generic method in their `Steps` classes. Beyond the plan: `scripts/consumer/consumer.ts`
  gains a generic `@step` method and a refused plain generic one, so TypeScript 5.0 to the latest release checks the
  new types in both decorator modes (the `consumer` job runs it; the script itself is unchanged).
- Docs: *Test steps* (generic methods keep their type parameters; the `Checkout` example gains `choose<Method>()`);
  `api/step.md`'s summary names generic methods too. The doc comments of `step` unchanged. Changeset
  `step-generic-methods.md`, which also says a generic method that does not return a Promise is still refused.
- Checks: `pnpm lint` 0; `pnpm test:unit` 828 passed; `pnpm pack-test --reporter=line` exit 0 (1,524 passed, 3
  skipped; doc snippets 218; api coverage 0 problems; step locations 7); `consumer-check.sh` 18 `ok` (TypeScript 5.0 to
  the latest release, both decorator modes, with the generic method and the refused one); `pnpm docs:build` 0.
