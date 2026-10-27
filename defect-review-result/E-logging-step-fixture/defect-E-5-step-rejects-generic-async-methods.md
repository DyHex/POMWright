# E-5: `@step` does not compile on a generic `async` method, in either decorator mode; under `experimentalDecorators` the error tells the user to make the already `async` method `async`

- **Kind**: defect
- **Area**: `step` public types (inventory §1 `step`; §6 *Types*, "`@step` under standard and legacy decorators")
- **Severity**: Medium (a documented use, `@step` on a method that returns a Promise, is refused by the compiler for a
  plausible kind of page-object method, `async read<T>(...): Promise<T>`; the only workarounds are dropping the type
  parameter or wrapping the body in `test.step` by hand. Under `experimentalDecorators` the readable error is wrong for
  this case. No runtime effect: the runtime decorates such a method correctly)
- **Semver of the fix**: patch (a type corrected to what the docs promise and the runtime does; AGENTS.md §7. Code that
  compiles today keeps compiling: shown below with the repository's own type tests)
- **Reviewed**: `54cdada`, 2026-10-23, Claude (claude-opus-5-5), scope E
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #11](../DECISIONS.md))

## Contract

- `website/src/content/docs/api/step.md`, *Returns*: "A method decorator, for a method that returns a Promise, as an
  `async` method does. TypeScript rejects any other".
- `website/src/content/docs/docs/test-steps.md`: "`@step` works on any class, page object or not, and on static
  methods"; *Only methods that return a Promise*: TypeScript rejects `@step` on a method that returned a plain value.
- `src/helpers/stepDecorator.ts:124-131` (doc comment): "The method must return a Promise, as an `async` method does
  [...] a decorated method that returns a plain value is a compile error, `@step decorates methods that return a
  Promise: make the method async`."
- `website/src/content/docs/api/errors.md`, *`@step`*: that message is "A compile error, on a method that does not return
  a Promise. Make the method `async`."

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/types/generic.typecheck.ts`, compiled against the packed
package by `types/run-generic.sh` (copies it to `test/tests/zz-probe-E-generic.typecheck.ts` with a tsconfig per
decorator mode, runs `tsc`, removes them):

```ts
import { step } from "pomwright";

export class Generic {
	@step()
	async echo<T>(value: T): Promise<T> {           // line 5
		return value;
	}

	@step
	async echoBare<T>(value: T): Promise<T> {       // line 10
		return value;
	}

	@step({ box: true })
	async pick<K extends "a" | "b">(key: K): Promise<K> {   // line 15
		return key;
	}

	async overloaded(a: string): Promise<string>;
	async overloaded(a: number): Promise<number>;
	@step()
	async overloaded(a: string | number): Promise<string | number> {
		return a;
	}

	@step()
	async returnsThis(): Promise<this> {
		return this;
	}
}
```

```sh
bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/E/types/run-generic.sh
# the same against v3.0.1:
WT=/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/v3.0.1 \
  bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/E/types/run-generic.sh
```

Exit code 2 in both modes, at `54cdada` (`generic.out`) and at `v3.0.1` (`generic.v3.0.1.out`). With 2.1.0's types
(`types/v2.1.0-stepDecorator.ts`, the same probe, `generic.v2.1.0.out`) the generic methods fail the same way, so this
is not a 3.x regression.

## Observed / expected

Standard decorators (the harness's `test/tsconfig.json`):

```text
test/tests/zz-probe-E-generic.typecheck.ts(5,3): error TS1270: Decorator function return type 'AsyncMethod<Generic, [value: unknown], unknown> | undefined' is not assignable to type 'void | (<T>(value: T) => Promise<T>)'.
test/tests/zz-probe-E-generic.typecheck.ts(10,3): error TS1270: Decorator function return type 'AsyncMethod<Generic, [value: unknown], unknown> | undefined' is not assignable to type 'void | (<T>(value: T) => Promise<T>)'.
test/tests/zz-probe-E-generic.typecheck.ts(15,3): error TS1270: Decorator function return type 'AsyncMethod<Generic, [key: "a" | "b"], "a" | "b"> | undefined' is not assignable to type 'void | (<K extends "a" | "b">(key: K) => Promise<K>)'.
```

`experimentalDecorators: true`:

```text
test/tests/zz-probe-E-generic.typecheck.ts(5,3): error TS1241: Unable to resolve signature of method decorator when called as an expression.
  No overload matches this call.
    The last overload gave the following error.
      Argument of type 'TypedPropertyDescriptor<(<T>(value: T) => Promise<T>)>' is not assignable to parameter of type '"@step decorates methods that return a Promise: make the method async"'.
test/tests/zz-probe-E-generic.typecheck.ts(5,3): error TS1270: Decorator function return type 'TypedPropertyDescriptor<AsyncMethod<unknown, [value: unknown], unknown>> | undefined' is not assignable to type 'void | TypedPropertyDescriptor<(<T>(value: T) => Promise<T>)>'.
```

(the same for lines 10 and 15). The overloaded method and the `Promise<this>` method compile in both modes.

Expected: the three generic `async` methods compile, as the docs promise for any method that returns a Promise, and
keep their generic signatures for callers.

## Cause

`src/helpers/stepDecorator.ts:27-43` and `:145-164`: the method's type is taken apart into `This`, `Args` and `Return`
(`AsyncMethod<This, Args, Return>`) and the decorator returns `AsyncMethod<This, Args, Return>`. For a generic method,
inference fixes the type parameter at its constraint (`unknown`, `"a" | "b"`), and the returned non-generic function
type is not assignable back to the generic method type, which TypeScript requires of a method decorator's return type
(TS1270). Under `experimentalDecorators` every overload then fails, and TypeScript reports the last one, the message
overload.

## Fix plan

Per AGENTS.md §6, to be confirmed before any code changes.

- **Intended contract**: `@step` compiles on every method that returns a Promise, generic ones included, in both
  decorator modes, and the decorated method keeps its exact type; a method that does not return a Promise keeps the
  readable error in both modes.
- **Options**:
  1. *(recommended)* Make the method's own type the type parameter, constrained the way `ClassMethodDecoratorContext`
     constrains a method, plus a Promise:
     `type AsyncMethodLike<This = never> = (this: This, ...args: any) => Promise<unknown>` (with a `biome-ignore` and its
     reason); the standard overloads `<This, M extends AsyncMethodLike<This>>(value: M, context:
     ClassMethodDecoratorContext<This, M>): M | undefined`; the legacy ones `<M extends AsyncMethodLike>(target,
     propertyKey, descriptor: TypedPropertyDescriptor<M>): TypedPropertyDescriptor<M> | undefined`; the same in
     `StepDecoratorFactory`; the message overloads unchanged. Sketched in
     `/home/magdys/workspace/dyhex/POMWright-final-review-probes/E/types/fixedStep.ts` (declarations only) and checked by
     `types/run-fixed.sh` (output `fixed.out`): in both modes the generic probe compiles (exit 0), the probe of what must
     stay rejected (`stepForms.typecheck.ts`: getter, setter, field, `PromiseLike`, `Promise | number`, non-Promise
     static and titled methods, bad direct calls) still fails on every `@ts-expect-error` line (exit 0), the repository's
     own `src/helpers/stepDecorator.test-d.ts` and `test/tests/packaging/stepLegacyDecorators.typecheck.ts` pass against
     it (exit 0), and all four forms of a non-Promise method still show `@step decorates methods that return a Promise:
     make the method async` in both modes.
  2. Docs only (`none`): say that a generic method cannot be decorated. Leaves the refusal and the wrong hint.
- **Implementation steps**: the types in `src/helpers/stepDecorator.ts` (`AsyncMethod` users, `StepDecoratorFactory`,
  the `step` overloads); the implementation signature stays `(...args: unknown[]): unknown`.
- **Tests**: `src/helpers/stepDecorator.test-d.ts` gains a generic method (and `expectTypeOf` that a call keeps its
  type argument); `test/tests/packaging/stepLegacyDecorators.typecheck.ts` the same under `experimentalDecorators`;
  `test/tests/packaging/publicTypes.typecheck.ts` and `publicTypes.emit.ts` if they cover `step`'s signature.
- **Docs**: none needed beyond a changeset; optionally a generic method in the `test-steps.md` example.
- **Changeset**: patch. "`@step` compiles on generic `async` methods, with standard decorators and with
  `experimentalDecorators`; before, TypeScript refused them, and under `experimentalDecorators` asked to make the
  already `async` method `async`."
- **Decisions to tick**:
  - [x] Option 1, with `any` in the method constraint as `ClassMethodDecoratorContext` itself has it, behind a
    `// biome-ignore` whose reason says so.
  - [x] (added) Tests as listed above (the E-5 part of test gap #5).
  - [x] (added) A generic method in the `test-steps.md` example, so the snippet check keeps the promise compiling.
  - [x] (added) A new patch changeset, as above.
- **Execution order**: independent of E-1 (types only); before any change to the `@step` docs.
