import { test } from "@playwright/test";
import { callerLocation } from "./callSite";
import { isThenable } from "./thenable";

type AnyMethod<This = unknown, Args extends unknown[] = unknown[], Return = unknown> = (
	this: This,
	...args: Args
) => Return;

/**
 * What TypeScript reports for a method that does not return a Promise (the parameter type of the last overloads), and
 * what the wrapper throws when such a method reaches it anyway, from JavaScript.
 */
const STEP_REQUIRES_PROMISE = "@step decorates methods that return a Promise: make the method async";
type StepRequiresPromise = typeof STEP_REQUIRES_PROMISE;

/**
 * A method `@step` can wrap: `test.step` always returns a Promise, so the method must return one too. The decorator
 * takes the method's own type, generic or not, and returns it unchanged. Its parameters are `any`, as in the constraint
 * `ClassMethodDecoratorContext` puts on a method: an `unknown[]` parameter list refuses a method with typed parameters.
 */
// biome-ignore lint/suspicious/noExplicitAny: the constraint ClassMethodDecoratorContext puts on a method, see above
type AsyncMethod<This = never> = (this: This, ...args: any) => Promise<unknown>;

/**
 * The method, when it returns a Promise. Checked on its return type, since the constraint alone lets a generic method
 * through: against `any` arguments, `<T>(value: T) => T` returns `any`. `ReturnType` reads a type parameter as its
 * constraint instead, so `unknown`, which is not a Promise.
 */
type ReturnsPromise<M extends AsyncMethod> = ReturnType<M> extends Promise<unknown> ? M : StepRequiresPromise;

type StepTitle = Parameters<typeof test.step>[0];
type StepOptions = Parameters<typeof test.step>[2];

type StepDecoratorArgs = [] | [StepTitle] | [StepOptions] | [StepTitle, StepOptions];

type LegacyMethodDecoratorArgs<T extends AnyMethod = AnyMethod> = [object, string | symbol, TypedPropertyDescriptor<T>];

type Stage3MethodDecoratorArgs<T extends AnyMethod = AnyMethod> = [T, ClassMethodDecoratorContext<unknown, T>];

/**
 * The decorator `step()` returns, with or without a title and options: write it above a method that returns a Promise,
 * or store it in a module to share one configuration, such as a boxed step, across classes.
 *
 * @example
 * ```ts
 * export const boxedStep: StepDecorator = step({ box: true });
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/step/#stepdecorator
 */
export interface StepDecorator {
	/** Runs the method as a `test.step`, with TypeScript's standard decorators; the method keeps its type. */
	<This, M extends AsyncMethod<This>>(
		value: ReturnsPromise<M>,
		context: ClassMethodDecoratorContext<This, M>,
	): M | undefined;
	/** Runs the method as a `test.step`, with `experimentalDecorators`; the method keeps its type. */
	<M extends AsyncMethod>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<ReturnsPromise<M>>,
	): TypedPropertyDescriptor<M> | undefined;
	// last, so that a method returning something else is reported with this message
	<This, Args extends unknown[], Return>(
		value: StepRequiresPromise,
		context: ClassMethodDecoratorContext<This, AnyMethod<This, Args, Return>>,
	): undefined;
	(target: object, propertyKey: string | symbol, descriptor: StepRequiresPromise): undefined;
}

// the target is the prototype for an instance method and the class itself for a static one
const isMethodDecoratorArgs = (args: unknown[]): args is LegacyMethodDecoratorArgs<AnyMethod> =>
	args.length === 3 &&
	(typeof args[0] === "object" || typeof args[0] === "function") &&
	(typeof args[1] === "string" || typeof args[1] === "symbol");

const isStage3MethodDecoratorArgs = (args: unknown[]): args is Stage3MethodDecoratorArgs<AnyMethod> =>
	args.length === 2 && typeof args[0] === "function" && args[1] !== null && typeof args[1] === "object";

const normalizeStepArguments = (args: StepDecoratorArgs) => {
	const [titleOrOptions, maybeOptions] = args;
	const title = typeof titleOrOptions === "string" ? titleOrOptions : undefined;
	const options = typeof titleOrOptions === "string" ? maybeOptions : titleOrOptions;
	return { title, options };
};

/**
 * The method `@step` puts in place of the original. Playwright takes an unboxed step's location from the first frame of
 * the async stack, so that wrapper is not `async` (the first frame is the caller's). A boxed step is given its caller's
 * line as `location`, cut at the wrapper itself: without one, Playwright skips one frame only when no ancestor step is
 * boxed, so no fixed frame is right both at the top level and inside a boxed step. The boxed wrapper stays `async` and
 * awaits the step: Playwright builds a top-level boxed error's stack from the frames after the first, the wrapper's.
 */
const createWrappedMethod = <T extends AnyMethod>(
	original: T,
	methodName: string | symbol,
	title?: StepTitle,
	options?: StepOptions,
) => {
	const titleFor = (self: unknown): StepTitle => {
		if (title !== undefined) {
			return title;
		}
		// in a static method `this` is the class itself; a method called without its object has none
		const owner =
			typeof self === "function"
				? self
				: self === null || self === undefined
					? undefined
					: (self as { constructor?: { name?: string } }).constructor;
		const rawClassName = owner?.name ?? "";
		const className = rawClassName && rawClassName !== "Object" ? rawClassName : "Anonymous";
		return `${className}.${String(methodName)}`;
	};
	// the step's body: from JavaScript a method that returns a plain value gets here, and test.step would resolve it
	const run = (self: ThisParameterType<T>, methodArgs: Parameters<T>) => {
		const result: unknown = original.apply(self, methodArgs);
		if (!isThenable(result)) {
			throw new TypeError(STEP_REQUIRES_PROMISE);
		}
		return result;
	};
	if (options?.box) {
		const boxed = async function (this: ThisParameterType<T>, ...methodArgs: Parameters<T>) {
			const location = options.location ?? callerLocation(boxed);
			return await test.step(titleFor(this), () => run(this, methodArgs), { ...options, location });
		};
		return boxed as T;
	}
	return function (this: ThisParameterType<T>, ...methodArgs: Parameters<T>) {
		return test.step(titleFor(this), () => run(this, methodArgs), options) as ReturnType<T>;
	} as T;
};

const createStepDecorator =
	({ title, options }: { title?: StepTitle; options?: StepOptions }) =>
	<T extends AnyMethod>(
		valueOrTarget: T | LegacyMethodDecoratorArgs<T>[0],
		contextOrKey: ClassMethodDecoratorContext | LegacyMethodDecoratorArgs<T>[1],
		descriptor?: LegacyMethodDecoratorArgs<T>[2],
	): T | undefined | TypedPropertyDescriptor<T> => {
		if (typeof valueOrTarget === "function" && isStage3MethodDecoratorArgs([valueOrTarget, contextOrKey])) {
			const [original, context] = [valueOrTarget, contextOrKey] as Stage3MethodDecoratorArgs<T>;
			if (context.kind !== "method") {
				throw new Error("@step decorator can only be applied to methods.");
			}
			return createWrappedMethod(original, context.name, title, options);
		}

		if (!descriptor || typeof descriptor.value !== "function") {
			throw new Error("@step decorator can only be applied to methods.");
		}

		const original = descriptor.value;
		descriptor.value = createWrappedMethod(original, contextOrKey as string | symbol, title, options);

		return descriptor;
	};

// no @example block: TypeScript reads a decorator at the start of a comment line as a JSDoc tag
/**
 * A decorator that runs a method as Playwright's `test.step`, titled `ClassName.methodName` (for a static method too,
 * by its class) unless given a title. Works with TypeScript's standard decorators and with `experimentalDecorators`.
 * The method must return a Promise, as an `async` method does: `test.step` always returns one, so a decorated method
 * that returns a plain value is a compile error, `@step decorates methods that return a Promise: make the method
 * async`. Write it above an `async` method as `@step()`, `@step("Pay with the test card")`, `@step({ box: true })` or
 * `@step("Pay", { timeout: 10_000 })`.
 *
 * @param title The step's title. Defaults to `ClassName.methodName`.
 * @param options `test.step`'s options, such as `box` and `timeout`.
 * @param value The method, when `@step` is written without parentheses.
 * @param context The decorator context, when `@step` is written without parentheses.
 * @param target With `experimentalDecorators` and without parentheses: the class's prototype, or the class itself for a
 * static method.
 * @param propertyKey With `experimentalDecorators` and without parentheses: the method's name.
 * @param descriptor With `experimentalDecorators` and without parentheses: the method's property descriptor.
 * @returns The decorator, a `StepDecorator`.
 * @throws From JavaScript, on something that is not a method: `@step decorator can only be applied to methods.` From
 * JavaScript, when the decorated method returns something that is not a Promise, its call rejects with
 * `TypeError: @step decorates methods that return a Promise: make the method async`, the compile error's text.
 *
 * @see https://dyhex.github.io/POMWright/api/step/
 */
export function step(): StepDecorator;
export function step(title: StepTitle): StepDecorator;
export function step(options: StepOptions): StepDecorator;
export function step(title: StepTitle, options: StepOptions): StepDecorator;
export function step<This, M extends AsyncMethod<This>>(
	value: ReturnsPromise<M>,
	context: ClassMethodDecoratorContext<This, M>,
): M | undefined;
export function step<This, Args extends unknown[], Return>(
	value: StepRequiresPromise,
	context: ClassMethodDecoratorContext<This, AnyMethod<This, Args, Return>>,
): undefined;
// experimentalDecorators: a bare @step is called with the target, the key and the descriptor; after the two-argument
// forms, so a standard decorator's error still comes from the message overload above
export function step<M extends AsyncMethod>(
	target: object,
	propertyKey: string | symbol,
	descriptor: TypedPropertyDescriptor<ReturnsPromise<M>>,
): TypedPropertyDescriptor<M> | undefined;
export function step(target: object, propertyKey: string | symbol, descriptor: StepRequiresPromise): undefined;
// the overloads above are what a caller passes and gets; the implementation tells the forms apart with its type guards
export function step(...args: unknown[]): unknown {
	if (isStage3MethodDecoratorArgs(args)) {
		return createStepDecorator(normalizeStepArguments([]))(...args);
	}

	if (isMethodDecoratorArgs(args)) {
		return createStepDecorator(normalizeStepArguments([]))(...args);
	}

	// the message signatures of the factory are never called with a message at runtime
	return createStepDecorator(normalizeStepArguments(args as StepDecoratorArgs)) as StepDecorator;
}
