import type { Locator } from "@playwright/test";
import type { LocatorQueryBuilder } from "./locatorQueryBuilder";
import type { LocatorUpdateBuilder } from "./locatorUpdateBuilder";
import type { LocatorChainPaths, RegistryPath } from "./types";

export type PublicUpdateBuilder<Builder> = Omit<Builder, keyof Builder & ("commit" | "parent" | "subPath")>;

export type UpdateProxy<Builder, Return> = {
	[Key in keyof PublicUpdateBuilder<Builder>]: PublicUpdateBuilder<Builder>[Key] extends (
		...args: infer Args
	) => infer Result
		? Result extends LocatorQueryBuilder<infer SchemaPath, infer SubPath>
			? SchemaPath extends string
				? SubPath extends RegistryPath<SchemaPath>
					? (...args: Args) => Return
					: never
				: never
			: never
		: never;
};

export const createUpdateProxy = <Builder extends object, Return>(builder: Builder, returnValue: Return) =>
	new Proxy(builder, {
		get(_target, property, receiver) {
			const value = Reflect.get(builder as object, property, receiver) as unknown;

			if (typeof value === "function") {
				return (...args: unknown[]) => {
					(value as (...args: unknown[]) => unknown).apply(builder, args);
					return returnValue;
				};
			}

			return value;
		},
	}) as UpdateProxy<Builder, Return>;

export class LocatorThenable<LocatorSchemaPathType extends string, Path extends RegistryPath<LocatorSchemaPathType>>
	implements PromiseLike<Locator>
{
	private readonly queryBuilder: LocatorQueryBuilder<LocatorSchemaPathType, Path>;
	private resolvePromise?: Promise<Locator>;

	constructor(
		getLocatorSchema: (path: Path) => LocatorQueryBuilder<LocatorSchemaPathType, Path>,
		private readonly path: Path,
	) {
		this.queryBuilder = getLocatorSchema(path);
	}

	update() {
		const builder = this.queryBuilder.update(this.path as LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>);
		return createUpdateProxy(builder, this) as UpdateProxy<
			LocatorUpdateBuilder<LocatorSchemaPathType, Path, LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>>,
			this
		>;
	}

	clearSteps() {
		this.queryBuilder.clearSteps(this.path as LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>);
		return this;
	}

	// biome-ignore lint/suspicious/noThenProperty: Promise-like wrapper enables await on the fluent locator helpers.
	then<TResult1 = Locator, TResult2 = never>(
		onfulfilled?: ((value: Locator) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	) {
		if (!this.resolvePromise) {
			this.resolvePromise = this.queryBuilder.getLocator();
		}
		return this.resolvePromise.then(onfulfilled, onrejected);
	}
}
