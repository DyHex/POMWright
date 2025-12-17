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

	update<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(subPath: SubPath) {
		this.ensureSubPath(subPath);
		return new LocatorUpdateBuilder<LocatorSchemaPathType, LocatorSubstring, SubPath>(this, subPath);
	}

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

	clearSteps<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
	) {
		this.ensureSubPath(subPath);
		this.steps.set(subPath, []);
		return this;
	}

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

	replace<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(subPath: SubPath) {
		this.ensureSubPath(subPath);
		return new LocatorUpdateBuilder<LocatorSchemaPathType, LocatorSubstring, SubPath>(this, subPath, "replace");
	}

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

	remove<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(subPath: SubPath) {
		this.ensureSubPath(subPath);
		this.definitions.delete(subPath);
		this.steps.delete(subPath);
		this.perPathTypeCache.delete(subPath);
		this.tombstones.add(subPath);
		return this;
	}

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
