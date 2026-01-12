import { test } from "@playwright/test";

type AnyMethod = (...args: unknown[]) => unknown;

type StepTitle = Parameters<typeof test.step>[0];
type StepOptions = Parameters<typeof test.step>[2];

type StepDecoratorArgs = [] | [StepTitle] | [StepOptions] | [StepTitle, StepOptions];

type LegacyMethodDecoratorArgs<T extends AnyMethod> = [object, string | symbol, TypedPropertyDescriptor<T>];

type Stage3MethodDecoratorArgs<T extends AnyMethod> = [T, ClassMethodDecoratorContext];

interface StepDecoratorFactory {
	<T extends AnyMethod>(value: T, context: ClassMethodDecoratorContext): T | undefined;
	<T extends AnyMethod>(
		target: object,
		propertyKey: string | symbol,
		descriptor: TypedPropertyDescriptor<T>,
	): TypedPropertyDescriptor<T> | undefined;
}

const isMethodDecoratorArgs = (args: unknown[]): args is LegacyMethodDecoratorArgs<AnyMethod> =>
	args.length === 3 && typeof args[0] === "object" && (typeof args[1] === "string" || typeof args[1] === "symbol");

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
	function (this: unknown, ...methodArgs: Parameters<T>) {
		const rawClassName = (this as { constructor?: { name?: string } }).constructor?.name ?? "";
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
			return createWrappedMethod(original, context.name, title, options);
		}

		if (!descriptor || typeof descriptor.value !== "function") {
			throw new Error("@step decorator can only be applied to methods.");
		}

		const original = descriptor.value;
		descriptor.value = createWrappedMethod(original, contextOrKey as string | symbol, title, options);

		return descriptor;
	};

/**
 * Wraps a method in Playwright `test.step`, defaulting the title to `ClassName.methodName`.
 *
 * Examples:
 * - `@step`
 * - `@step("title")`
 * - `@step({ box: true })`
 * - `@step("title", { timeout: 5000 })`
 */
export function step(): StepDecoratorFactory;
export function step(title: StepTitle): StepDecoratorFactory;
export function step(options: StepOptions): StepDecoratorFactory;
export function step(title: StepTitle, options: StepOptions): StepDecoratorFactory;
export function step<T extends AnyMethod>(value: T, context: ClassMethodDecoratorContext): T | undefined;
export function step(
	...args: StepDecoratorArgs | LegacyMethodDecoratorArgs<AnyMethod> | Stage3MethodDecoratorArgs<AnyMethod>
): StepDecoratorFactory | AnyMethod | undefined | TypedPropertyDescriptor<AnyMethod> {
	if (isStage3MethodDecoratorArgs(args)) {
		return createStepDecorator(normalizeStepArguments([]))(...args);
	}

	if (isMethodDecoratorArgs(args)) {
		return createStepDecorator(normalizeStepArguments([]))(...args);
	}

	return createStepDecorator(normalizeStepArguments(args as StepDecoratorArgs));
}
