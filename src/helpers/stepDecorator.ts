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

const createWrappedMethod = <T extends AnyMethod>(
	original: T,
	methodName: string | symbol,
	title?: StepTitle,
	options?: StepOptions,
) =>
	function (this: ThisParameterType<T>, ...methodArgs: Parameters<T>) {
		// in a static method `this` is the class itself
		const owner = typeof this === "function" ? this : (this as { constructor?: { name?: string } }).constructor;
		const rawClassName = owner?.name ?? "";
		const className = rawClassName && rawClassName !== "Object" ? rawClassName : "Anonymous";
		const resolvedTitle = title ?? `${className}.${String(methodName)}`;
		return test.step(resolvedTitle, () => original.apply(this, methodArgs), options) as ReturnType<T>;
	} as T;

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
 * @returns The decorator.
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
export function step(
	...args:
		| StepDecoratorArgs
		| LegacyMethodDecoratorArgs<AnyMethod>
		| Stage3MethodDecoratorArgs<AnyMethod>
		// the message overload exists for the compiler only; at runtime the first argument is the method
		| [StepRequiresPromise, ClassMethodDecoratorContext]
): StepDecoratorFactory | AnyMethod | undefined | TypedPropertyDescriptor<AnyMethod> {
	if (isStage3MethodDecoratorArgs(args)) {
		return createStepDecorator(normalizeStepArguments([]))(...args);
	}

	if (isMethodDecoratorArgs(args)) {
		return createStepDecorator(normalizeStepArguments([]))(...args);
	}

	// the message signatures of the factory are never called with a message at runtime
	return createStepDecorator(normalizeStepArguments(args as StepDecoratorArgs)) as StepDecoratorFactory;
}
