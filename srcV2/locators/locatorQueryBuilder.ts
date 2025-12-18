import type { Locator } from "@playwright/test";
import type { LocatorRegistryInternal } from "./locatorRegistry";
import { buildReplacementDefinition, LocatorUpdateBuilder, mergeLocatorDefinition } from "./locatorUpdateBuilder";
import type {
	FilterDefinition,
	IndexSelector,
	LocatorChainPaths,
	LocatorOverrides,
	LocatorStep,
	LocatorStrategyDefinition,
	LocatorUpdate,
	RegistryPath,
} from "./types";
import { cloneLocatorStrategyDefinition, expandSchemaPath, normalizeSteps } from "./utils";

export type LocatorQueryBuilderPublic<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
> = Pick<
	LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>,
	"filter" | "clearSteps" | "nth" | "update" | "replace" | "remove" | "getLocator" | "getNestedLocator"
>;

export class LocatorQueryBuilder<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
> {
	private readonly definitions = new Map<string, LocatorStrategyDefinition>();
	private readonly perPathTypeCache = new Map<
		string,
		Map<LocatorStrategyDefinition["type"], LocatorStrategyDefinition>
	>();
	private readonly steps = new Map<
		string,
		LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]
	>();
	private readonly tombstones = new Set<string>();

	constructor(
		private readonly registry: LocatorRegistryInternal<LocatorSchemaPathType>,
		private readonly path: LocatorSubstring,
	) {
		const chain = expandSchemaPath(path);
		let hasTerminal = false;
		for (const part of chain) {
			const record = this.registry.getIfExists(part as RegistryPath<LocatorSchemaPathType>);
			if (!record) {
				continue;
			}
			const clonedDefinition = cloneLocatorStrategyDefinition(record.definition);
			this.definitions.set(part, clonedDefinition);
			this.ensureTypeCache(part, clonedDefinition);
			const recordSteps = normalizeSteps<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(
				record.steps,
			);
			this.steps.set(part, recordSteps);
			if (part === path) {
				hasTerminal = true;
			}
		}
		if (!hasTerminal) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
	}

	/**
	 * Starts a PATCH-style update for the locator definition at the given `subPath` within this
	 * builder. Returns a builder exposing the same locator-type methods as `registry.add`, with all
	 * arguments optional to merge with the existing definition. The registry remains unchanged until
	 * you resolve with `getLocator`/`getNestedLocator`.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("form.button")
	 *   .update("form.button")
	 *   .getByRole({ name: "Submit" })
	 *   .getNestedLocator();
	 * ```
	 */
	update<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(subPath: SubPath) {
		this.ensureSubPath(subPath);
		return new LocatorUpdateBuilder<LocatorSchemaPathType, LocatorSubstring, SubPath>(this, subPath);
	}

	/**
	 * Records a Playwright-style filter for the specified `subPath` within this builder. Unlike
	 * `registry.add`, `subPath` must be provided to indicate which segment receives the filter.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("list.item")
	 *   .filter("list", { hasText: "List" })
	 *   .filter("list.item", { hasText: "Row" });
	 * ```
	 */
	filter<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		this.ensureSubPath(subPath);
		const existing = this.steps.get(subPath) ?? [];
		existing.push({ kind: "filter", filter });
		this.steps.set(subPath, existing);
		return this;
	}

	/**
	 * Clears all recorded `filter`/`nth` steps for the specified `subPath` in this builder, leaving
	 * the locator definition intact.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("list.item").clearSteps("list.item").getNestedLocator();
	 * ```
	 */
	clearSteps<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
	) {
		this.ensureSubPath(subPath);
		this.steps.set(subPath, []);
		return this;
	}

	/**
	 * Records an index selector for the specified `subPath` in this builder. Indices are applied in
	 * the order they are chained and require that the subPath already exists on the builder.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("list.item").nth("list.item", 2).getNestedLocator();
	 * ```
	 */
	nth<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		index: IndexSelector,
	) {
		this.ensureSubPath(subPath);
		const existing = this.steps.get(subPath) ?? [];
		existing.push({ kind: "index", index });
		this.steps.set(subPath, existing);
		return this;
	}

	/** @internal */
	applyUpdate<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		updates: LocatorUpdate,
	) {
		this.ensureSubPath(subPath);
		if (!this.definitions.has(subPath) && this.tombstones.has(subPath)) {
			const baseline = this.registry.get(subPath as RegistryPath<LocatorSchemaPathType>).definition;
			const baselineClone = cloneLocatorStrategyDefinition(baseline);
			this.definitions.set(subPath, baselineClone);
			this.steps.set(subPath, []);
			this.tombstones.delete(subPath);
		}

		const current = this.definitions.get(subPath);
		if (!current) {
			throw new Error(`No locator schema registered for sub-path "${subPath}".`);
		}
		const baseline = this.registry.get(subPath as RegistryPath<LocatorSchemaPathType>).definition;
		const cacheForPath = this.ensureTypeCache(subPath, cloneLocatorStrategyDefinition(baseline));
		const cachedDefinition = cacheForPath.get(updates.type);
		const merged = mergeLocatorDefinition(current, updates, subPath, cachedDefinition, baseline);
		const mergedClone = cloneLocatorStrategyDefinition(merged);
		cacheForPath.set(mergedClone.type, mergedClone);
		this.definitions.set(subPath, mergedClone);
		return this;
	}

	/**
	 * Starts a POST-style replacement for the locator definition at the given `subPath` within this
	 * builder. Returns a builder exposing the same locator-type methods as `registry.add`, requiring
	 * primary arguments where Playwright does. Registry state is unchanged; the replacement applies
	 * to the builder clone when resolved.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("section.button")
	 *   .replace("section.button")
	 *   .getByRole("button", { name: "Save" })
	 *   .getNestedLocator();
	 * ```
	 */
	replace<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(subPath: SubPath) {
		this.ensureSubPath(subPath);
		return new LocatorUpdateBuilder<LocatorSchemaPathType, LocatorSubstring, SubPath>(this, subPath, "replace");
	}

	/** @internal */
	applyReplacement<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		updates: LocatorUpdate,
	) {
		this.ensureSubPath(subPath);
		if (this.tombstones.has(subPath) && !this.definitions.has(subPath)) {
			this.steps.set(subPath, []);
			this.tombstones.delete(subPath);
		}
		const nextDefinition = buildReplacementDefinition(updates, subPath);
		const cloned = cloneLocatorStrategyDefinition(nextDefinition);
		const cacheForPath = this.ensureTypeCache(subPath, cloned);
		cacheForPath.set(cloned.type, cloneLocatorStrategyDefinition(cloned));
		this.definitions.set(subPath, cloned);
		return this;
	}

	/**
	 * Soft-deletes the definition and steps for the given `subPath` on this builder clone, adding a
	 * tombstone. Non-terminal removals are skipped during resolution; terminal removals throw unless
	 * repopulated with `update`/`replace` before resolving.
	 *
	 * @example
	 * ```ts
	 * const builder = getLocatorSchema("section.button");
	 * builder.remove("section.button");
	 * expect(() => builder.getNestedLocator()).toThrow();
	 * ```
	 */
	remove<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(subPath: SubPath) {
		this.ensureSubPath(subPath);
		this.definitions.delete(subPath);
		this.steps.delete(subPath);
		this.perPathTypeCache.delete(subPath);
		this.tombstones.add(subPath);
		return this;
	}

	/**
	 * Resolves and returns the Playwright {@link Locator} for the terminal path of this builder,
	 * applying only the terminal definition and its steps. Throws if the terminal path has been
	 * removed or is otherwise missing.
	 *
	 * @example
	 * ```ts
	 * const locator = getLocatorSchema("form.submit").getLocator();
	 * ```
	 */
	getLocator() {
		const definition = this.definitions.get(this.path);

		if (!definition) {
			throw new Error(`No locator schema registered for path "${this.path}".`);
		}

		const stepsForPath = this.steps.get(this.path) ?? [];

		const definitions = new Map<string, LocatorStrategyDefinition>([[this.path, definition]]);
		const steps = new Map<
			string,
			LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]
		>([
			[
				this.path,
				normalizeSteps<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(stepsForPath),
			],
		]);

		const { locator } = this.registry.buildLocatorChain(this.path, definitions, steps, undefined, this.tombstones);
		if (!locator) {
			throw new Error(`Unable to resolve direct locator for path "${this.path}".`);
		}
		return locator as Locator;
	}

	/**
	 * Resolves the chained Playwright {@link Locator} for this builder’s root path, traversing each
	 * registered segment and applying steps/overrides. Optional overrides can supply per-segment
	 * filters or indices. Throws if any required segment is missing.
	 *
	 * @example
	 * ```ts
	 * const nested = getLocatorSchema("list.item")
	 *   .filter("list", { hasText: "List" })
	 *   .getNestedLocator();
	 * ```
	 */
	getNestedLocator(
		overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		const { locator } = this.resolve(overrides);
		if (!locator) {
			throw new Error(`Unable to resolve nested locator for path "${this.path}".`);
		}
		return locator;
	}

	private ensureSubPath(subPath: string) {
		if (!this.definitions.has(subPath) && !this.tombstones.has(subPath)) {
			throw new Error(`"${subPath}" is not a valid sub-path of "${this.path}".`);
		}
	}

	private resolve(
		overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		return this.registry.buildLocatorChain(this.path, this.definitions, this.steps, overrides, this.tombstones);
	}

	private ensureTypeCache(subPath: string, baseline: LocatorStrategyDefinition) {
		if (!this.perPathTypeCache.has(subPath)) {
			this.perPathTypeCache.set(
				subPath,
				new Map<LocatorStrategyDefinition["type"], LocatorStrategyDefinition>([
					[baseline.type, cloneLocatorStrategyDefinition(baseline)],
				]),
			);
		}

		return this.perPathTypeCache.get(subPath) as Map<LocatorStrategyDefinition["type"], LocatorStrategyDefinition>;
	}
}
