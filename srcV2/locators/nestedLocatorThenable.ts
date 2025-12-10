import type { Locator } from "@playwright/test";
import type { LocatorQueryBuilder } from "./locatorQueryBuilder";
import { createUpdateProxy, type UpdateProxy } from "./locatorThenable";
import type { LocatorUpdateBuilder } from "./locatorUpdateBuilder";
import type { FilterDefinition, IndexSelector, LocatorChainPaths, LocatorOverrides, RegistryPath } from "./types";

type NestedOverrides<LocatorSchemaPathType extends string> = LocatorOverrides<
	RegistryPath<LocatorSchemaPathType>,
	RegistryPath<LocatorSchemaPathType>
>;

export class NestedLocatorThenable<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> implements PromiseLike<Locator>
{
	private readonly queryBuilder: LocatorQueryBuilder<LocatorSchemaPathType, Path>;
	private readonly overrides?: NestedOverrides<LocatorSchemaPathType>;
	private resolvePromise?: Promise<Locator>;

	constructor(
		getLocatorSchema: (path: Path) => LocatorQueryBuilder<LocatorSchemaPathType, Path>,
		path: Path,
		overrides?: NestedOverrides<LocatorSchemaPathType>,
	) {
		this.queryBuilder = getLocatorSchema(path);
		this.overrides = overrides;
	}

	filter<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>>(
		subPath: SubPath,
		filter: FilterDefinition<
			RegistryPath<LocatorSchemaPathType>,
			LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>
		>,
	) {
		this.queryBuilder.filter(subPath, filter);
		return this;
	}

	nth<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>>(
		subPath: SubPath,
		index: IndexSelector,
	) {
		this.queryBuilder.nth(subPath, index);
		return this;
	}

	update<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>>(subPath: SubPath) {
		const builder = this.queryBuilder.update(subPath);
		return createUpdateProxy(builder, this) as UpdateProxy<
			LocatorUpdateBuilder<LocatorSchemaPathType, Path, SubPath>,
			this
		>;
	}

	clearSteps<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>>(subPath: SubPath) {
		this.queryBuilder.clearSteps(subPath);
		return this;
	}

	// biome-ignore lint/suspicious/noThenProperty: Promise-like wrapper enables await on the fluent locator helpers.
	then<TResult1 = Locator, TResult2 = never>(
		onfulfilled?: ((value: Locator) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	) {
		if (!this.resolvePromise) {
			const overrides = this.overrides as
				| LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>
				| undefined;

			this.resolvePromise = this.queryBuilder.getNestedLocator(overrides);
		}
		return this.resolvePromise.then(onfulfilled, onrejected);
	}
}
