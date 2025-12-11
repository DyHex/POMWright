import type { Locator } from "@playwright/test";
import type { LocatorRegistry } from "./locatorRegistry";
import { LocatorUpdateBuilder, mergeLocatorDefinition } from "./locatorUpdateBuilder";
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
import { expandSchemaPath, normalizeSteps } from "./utils";

export class LocatorQueryBuilder<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
> {
	private readonly definitions = new Map<string, LocatorStrategyDefinition>();
	private readonly steps = new Map<
		string,
		LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]
	>();

	constructor(
		private readonly registry: LocatorRegistry<LocatorSchemaPathType>,
		private readonly path: LocatorSubstring,
	) {
		const chain = expandSchemaPath(path);
		let hasTerminal = false;
		for (const part of chain) {
			const record = this.registry.getIfExists(part as RegistryPath<LocatorSchemaPathType>);
			if (!record) {
				continue;
			}
			this.definitions.set(part, { ...record.definition });
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
		const current = this.definitions.get(subPath);
		if (!current) {
			throw new Error(`No locator schema registered for sub-path "${subPath}".`);
		}
		const baseline = this.registry.get(subPath as RegistryPath<LocatorSchemaPathType>).definition;
		const merged = mergeLocatorDefinition(current, updates, subPath, baseline);
		this.definitions.set(subPath, merged);
		return this;
	}

	async getLocator() {
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

		const { locator } = await this.registry.buildLocatorChain(this.path, definitions, steps);
		if (!locator) {
			throw new Error(`Unable to resolve direct locator for path "${this.path}".`);
		}
		return locator as Locator;
	}

	async getNestedLocator(
		overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		const { locator } = await this.resolve(overrides);
		if (!locator) {
			throw new Error(`Unable to resolve nested locator for path "${this.path}".`);
		}
		return locator;
	}

	private ensureSubPath(subPath: string) {
		if (!this.definitions.has(subPath)) {
			throw new Error(`"${subPath}" is not a valid sub-path of "${this.path}".`);
		}
	}

	private async resolve(
		overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		return this.registry.buildLocatorChain(this.path, this.definitions, this.steps, overrides);
	}
}
