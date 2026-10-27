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

(filled in at execution)
