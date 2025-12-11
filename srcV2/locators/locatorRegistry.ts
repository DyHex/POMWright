import type { Locator, Page } from "@playwright/test";
import type { PlaywrightReportLogger } from "../helpers/playwrightReportLogger";
import { LocatorQueryBuilder } from "./locatorQueryBuilder";
import { LocatorRegistrationBuilder } from "./locatorRegistrationBuilder";
import { LocatorThenable } from "./locatorThenable";
import { NestedLocatorThenable } from "./nestedLocatorThenable";
import type {
	FilterDefinition,
	FilterLocatorReference,
	IndexSelector,
	LocatorBuilderTarget,
	LocatorOverrides,
	LocatorSchemaPathErrors,
	LocatorSchemaRecord,
	LocatorStep,
	LocatorStrategyDefinition,
	PlaywrightFilterDefinition,
	RegistryPath,
	ResolvedFilterDefinition,
} from "./types";
import {
	applyIndexSelector,
	createLocator,
	expandSchemaPath,
	isFrameLocatorDefinition,
	isLocatorInstance,
	normalizeOverrideSteps,
	normalizeSteps,
	stringifyForLog,
	validateLocatorSchemaPath,
} from "./utils";

export class LocatorRegistry<LocatorSchemaPathType extends string> {
	private readonly schemas = new Map<
		RegistryPath<LocatorSchemaPathType>,
		LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>
	>();

	constructor(
		private readonly page: Page,
		private readonly log: PlaywrightReportLogger,
	) {}

	private normalizeRecord(record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>) {
		return {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: record.definition,
			steps: normalizeSteps<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(record.steps),
		} satisfies LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;
	}

	add(path: RegistryPath<LocatorSchemaPathType>) {
		return new LocatorRegistrationBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(this, path);
	}

	register(
		path: RegistryPath<LocatorSchemaPathType>,
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
	) {
		validateLocatorSchemaPath(path);
		if (this.schemas.has(path)) {
			const existing = this.schemas.get(path);
			if (!existing) {
				throw new Error(`A locator schema with the path "${path}" already exists.`);
			}
			const errorDetails = stringifyForLog({
				existing: existing,
				attempted: record,
			});
			throw new Error(`A locator schema with the path "${path}" already exists.\nExisting Schema: ${errorDetails}`);
		}
		this.schemas.set(path, this.normalizeRecord(record));
	}

	replace(
		path: RegistryPath<LocatorSchemaPathType>,
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
	) {
		validateLocatorSchemaPath(path);
		if (!this.schemas.has(path)) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
		this.schemas.set(path, this.normalizeRecord(record));
	}

	get(
		path: RegistryPath<LocatorSchemaPathType>,
	): LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>> {
		const record = this.schemas.get(path);
		if (!record) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
		return {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: record.definition,
			steps: normalizeSteps(record.steps),
		} satisfies LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;
	}

	getIfExists(
		path: RegistryPath<LocatorSchemaPathType>,
	): LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>> | undefined {
		const record = this.schemas.get(path);
		if (!record) {
			return undefined;
		}

		return {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: record.definition,
			steps: normalizeSteps(record.steps),
		} satisfies LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;
	}

	private async resolveFilterLocator(
		locatorReference: FilterLocatorReference<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
		target: LocatorBuilderTarget,
	) {
		if (isLocatorInstance(locatorReference)) {
			return locatorReference;
		}

		if (typeof locatorReference === "string") {
			return this.getLocator(locatorReference as RegistryPath<LocatorSchemaPathType>);
		}

		if ("locatorPath" in locatorReference) {
			return this.getLocator(locatorReference.locatorPath as RegistryPath<LocatorSchemaPathType>);
		}

		const definition = "locator" in locatorReference ? locatorReference.locator : locatorReference;

		if (isFrameLocatorDefinition(definition)) {
			throw new Error("Frame locators cannot be used as filter locators.");
		}

		const isFrameTarget = "owner" in target && typeof (target as { owner?: unknown }).owner === "function";
		const filterTarget = isFrameTarget ? target : this.page;
		return createLocator(filterTarget, definition) as Locator;
	}

	private async resolveFiltersForTarget(
		filters: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[] | undefined,
		target: LocatorBuilderTarget,
	) {
		if (!filters || filters.length === 0) {
			return [] as ResolvedFilterDefinition[];
		}

		const resolved: ResolvedFilterDefinition[] = [];
		for (const filter of filters) {
			if (filter && typeof filter === "object" && ("has" in filter || "hasNot" in filter)) {
				const { has, hasNot, ...rest } = filter as FilterDefinition<
					RegistryPath<LocatorSchemaPathType>,
					RegistryPath<LocatorSchemaPathType>
				> & {
					has?: FilterLocatorReference<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>;
					hasNot?: FilterLocatorReference<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>;
				};

				const normalizedFilter: ResolvedFilterDefinition = {
					...(rest as PlaywrightFilterDefinition),
				} as ResolvedFilterDefinition;

				if (has !== undefined) {
					normalizedFilter.has = await this.resolveFilterLocator(has, target);
				}

				if (hasNot !== undefined) {
					normalizedFilter.hasNot = await this.resolveFilterLocator(hasNot, target);
				}

				resolved.push(normalizedFilter);
				continue;
			}

			resolved.push(filter as ResolvedFilterDefinition);
		}

		return resolved;
	}

	getLocatorSchema<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path) {
		return new LocatorQueryBuilder<LocatorSchemaPathType, Path>(this, path);
	}

	/**
	 * Creates a bound accessor that returns a LocatorQueryBuilder for a given path.
	 * This mirrors BasePage ergonomics and can be attached to any consumer.
	 */
	createGetLocatorSchema() {
		const registry = this;
		return function getLocatorSchema<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path) {
			return registry.getLocatorSchema(path);
		};
	}

	async getLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path) {
		const record = this.get(path);
		const definitions = new Map<string, LocatorStrategyDefinition>([[path, record.definition]]);
		const steps = new Map<
			string,
			LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]
		>([[path, normalizeSteps(record.steps)]]);

		const { locator, steps: debugSteps } = await this.buildLocatorChain(path, definitions, steps);
		if (!locator) {
			throw new Error(`Unable to resolve direct locator for path "${path}".`);
		}

		if (this.log.isLogLevelEnabled("debug")) {
			this.log.debug(
				"Resolved direct locator",
				stringifyForLog({
					path,
					steps: debugSteps,
				}),
			);
		}

		return locator;
	}

	async getNestedLocator<Path extends RegistryPath<LocatorSchemaPathType>>(
		path: Path,
		overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		return this.getLocatorSchema(path).getNestedLocator(overrides);
	}

	async buildLocatorChain(
		path: RegistryPath<LocatorSchemaPathType>,
		definitions: Map<string, LocatorStrategyDefinition>,
		steps: Map<string, LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]>,
		overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		const chain = expandSchemaPath(path);
		const registeredChain = chain.filter((part) => definitions.has(part));

		if (!definitions.has(path)) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}

		if (overrides) {
			for (const overrideKey of Object.keys(overrides)) {
				if (!definitions.has(overrideKey)) {
					throw new Error(`Missing locator definition for "${overrideKey}" while resolving "${path}".`);
				}
			}
		}

		let currentTarget: LocatorBuilderTarget = this.page;
		let lastLocator: Locator | null = null;
		const debugSteps: {
			path: string;
			definition: LocatorStrategyDefinition;
			appliedFilters: ResolvedFilterDefinition[];
			index?: IndexSelector | null | undefined;
			recordedSteps: LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[];
		}[] = [];

		const lastIndex = registeredChain.length - 1;

		for (const [index, part] of registeredChain.entries()) {
			const definition = definitions.get(part);
			if (!definition) {
				throw new Error(`Missing locator definition for "${part}" while resolving "${path}".`);
			}

			if (isFrameLocatorDefinition(definition)) {
				const frameLocator = createLocator(currentTarget, definition) as ReturnType<Page["frameLocator"]>;
				const isTerminalStep = index === lastIndex;

				if (isTerminalStep) {
					const ownerLocator = frameLocator.owner();
					currentTarget = ownerLocator;
					lastLocator = ownerLocator;
				} else {
					currentTarget = frameLocator as LocatorBuilderTarget;
					lastLocator = frameLocator as unknown as Locator;
				}

				debugSteps.push({ path: part, definition, appliedFilters: [], recordedSteps: [] });
				continue;
			}

			const locatorResult = createLocator(currentTarget, definition) as Locator;
			const recordedSteps = steps.get(part) ?? [];
			const overrideValue = (overrides as Record<string, unknown> | undefined)?.[part] as
				| LocatorOverrides<
						RegistryPath<LocatorSchemaPathType>,
						RegistryPath<LocatorSchemaPathType>
				  >[RegistryPath<LocatorSchemaPathType>]
				| undefined;
			const { steps: overrideSteps, replaceIndex } = normalizeOverrideSteps<
				RegistryPath<LocatorSchemaPathType>,
				RegistryPath<LocatorSchemaPathType>
			>(overrideValue);
			const effectiveSteps =
				overrideSteps.length === 0
					? recordedSteps
					: [
							...(replaceIndex ? recordedSteps.filter((step) => step.kind !== "index") : recordedSteps),
							...overrideSteps,
						];

			let resolvedLocator = locatorResult;
			const appliedFilters: ResolvedFilterDefinition[] = [];
			let appliedIndex: IndexSelector | null | undefined;

			for (const step of effectiveSteps) {
				if (step.kind === "filter") {
					const [resolvedFilter] = await this.resolveFiltersForTarget([step.filter], resolvedLocator);
					if (resolvedFilter) {
						resolvedLocator = resolvedLocator.filter(resolvedFilter);
						appliedFilters.push(resolvedFilter);
					}
				} else {
					appliedIndex = step.index ?? null;
					resolvedLocator = applyIndexSelector(resolvedLocator, appliedIndex ?? undefined);
				}
			}

			currentTarget = resolvedLocator;
			lastLocator = resolvedLocator;
			debugSteps.push({
				path: part,
				definition,
				appliedFilters,
				index: appliedIndex,
				recordedSteps: effectiveSteps,
			});
		}

		if (this.log.isLogLevelEnabled("debug")) {
			this.log.debug(
				"Resolved locator chain",
				stringifyForLog({
					path,
					steps: debugSteps,
				}),
			);
		}

		return { locator: lastLocator, steps: debugSteps };
	}

	/**
	 * Creates a bound accessor that returns a thenable fluent wrapper for terminal locators.
	 * The returned function mirrors BasePage ergonomics while being attachable to any consumer.
	 */
	createGetLocator() {
		const getLocatorSchema = this.createGetLocatorSchema();
		return function getLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path) {
			return new LocatorThenable<LocatorSchemaPathType, Path>(getLocatorSchema, path);
		};
	}

	/**
	 * Creates a bound accessor that returns a thenable fluent wrapper for nested locator chains.
	 * The wrapper supports filter/nth/update/clearSteps chaining with ordered step replay.
	 */
	createGetNestedLocator() {
		const getLocatorSchema = this.createGetLocatorSchema();
		return function getNestedLocator<Path extends RegistryPath<LocatorSchemaPathType>>(
			path: Path,
			overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
		) {
			return new NestedLocatorThenable<LocatorSchemaPathType, Path>(getLocatorSchema, path, overrides);
		};
	}
}

export type GetLocatorAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
) => LocatorThenable<LocatorSchemaPathType, Path>;

export type GetLocatorSchemaAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
) => LocatorQueryBuilder<LocatorSchemaPathType, Path>;

export type GetNestedLocatorAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
	overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
) => NestedLocatorThenable<LocatorSchemaPathType, Path>;

export const createRegistryWithAccessors = <Paths extends string>(page: Page, logger: PlaywrightReportLogger) => {
	type PathErrors = LocatorSchemaPathErrors<Paths>;
	const _assertValidPaths: PathErrors extends never ? true : never = true as PathErrors extends never ? true : never;
	const registry = new LocatorRegistry<Paths>(page, logger);
	const getLocator = registry.createGetLocator();
	const getNestedLocator = registry.createGetNestedLocator();
	const getLocatorSchema = registry.createGetLocatorSchema();
	return { registry, getLocator, getNestedLocator, getLocatorSchema } as const;
};
