import { test } from "@playwright/test";

type AnyMethod<This = unknown, Args extends unknown[] = unknown[], Return = unknown> = (
	this: This,
	...args: Args
) => Return;

/** What TypeScript reports for a method that does not return a Promise (the parameter type of the last overloads). */
type StepRequiresPromise = "@step decorates methods that return a Promise: make the method async";

/** A method `@step` can wrap: `test.step` always returns a Promise, so the method must return one too. */
type AsyncMethod<This = unknown, Args extends unknown[] = unknown[], Return = unknown> = AnyMethod<
	This,
	Args,
	Promise<Return>
>;

type StepTitle = Parameters<typeof test.step>[0];
type StepOptions = Parameters<typeof test.step>[2];

type StepDecoratorArgs = [] | [StepTitle] | [StepOptions] | [StepTitle, StepOptions];

type LegacyMethodDecoratorArgs<T extends AnyMethod = AnyMethod> = [object, string | symbol, TypedPropertyDescriptor<T>];

type Stage3MethodDecoratorArgs<T extends AnyMethod = AnyMethod> = [T, ClassMethodDecoratorContext<unknown, T>];

interface StepDecoratorFactory {
	<This, Args extends unknown[], Return>(
		value: AsyncMethod<This, Args, Return>,
		context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
	): AsyncMethod<This, Args, Return> | undefined;
	<This, Args extends unknown[], Return>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<AsyncMethod<This, Args, Return>>,
	): TypedPropertyDescriptor<AsyncMethod<This, Args, Return>> | undefined;
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
 * The method `@step` puts in place of the original. Playwright takes a step's location from the async stack when the
 * step opens: an unboxed step at its first frame, a boxed one at the frame after it. So an unboxed step's wrapper is not
 * `async` (the first frame is the caller's), and a boxed step's wrapper is, and awaits the step (its frame is the one a
 * box leaves out), as the navigation and session storage helpers are.
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
	if (options?.box) {
		return async function (this: ThisParameterType<T>, ...methodArgs: Parameters<T>) {
			return await test.step(titleFor(this), () => original.apply(this, methodArgs), options);
		} as T;
	}
	return function (this: ThisParameterType<T>, ...methodArgs: Parameters<T>) {
		return test.step(titleFor(this), () => original.apply(this, methodArgs), options) as ReturnType<T>;
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
 * @returns The decorator.
 * @throws From JavaScript, on something that is not a method: `@step decorator can only be applied to methods.`
 *
 * @see https://dyhex.github.io/POMWright/api/step/
 */
export function step(): StepDecoratorFactory;
export function step(title: StepTitle): StepDecoratorFactory;
export function step(options: StepOptions): StepDecoratorFactory;
export function step(title: StepTitle, options: StepOptions): StepDecoratorFactory;
export function step<This, Args extends unknown[], Return>(
	value: AsyncMethod<This, Args, Return>,
	context: ClassMethodDecoratorContext<This, AsyncMethod<This, Args, Return>>,
): AsyncMethod<This, Args, Return> | undefined;
export function step<This, Args extends unknown[], Return>(
	value: StepRequiresPromise,
	context: ClassMethodDecoratorContext<This, AnyMethod<This, Args, Return>>,
): undefined;
// experimentalDecorators: a bare @step is called with the target, the key and the descriptor; after the two-argument
// forms, so a standard decorator's error still comes from the message overload above
export function step<This, Args extends unknown[], Return>(
	target: object,
	propertyKey: string | symbol,
	descriptor: TypedPropertyDescriptor<AsyncMethod<This, Args, Return>>,
): TypedPropertyDescriptor<AsyncMethod<This, Args, Return>> | undefined;
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
	return createStepDecorator(normalizeStepArguments(args as StepDecoratorArgs)) as StepDecoratorFactory;
}
