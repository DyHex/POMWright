import type { Locator, Page } from "@playwright/test";
import { LocatorQueryBuilder } from "./locatorQueryBuilder";
import {
	LocatorRegistrationBuilder,
	type LocatorRegistrationPreDefinitionBuilder,
	type LocatorRegistrationSeededBuilderForType,
} from "./locatorRegistrationBuilder";
import { ReusableLocatorFactory } from "./reusableLocatorBuilder";
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
	ReusableLocator,
} from "./types";
import {
	applyIndexSelector,
	cloneLocatorStrategyDefinition,
	createLocator,
	expandSchemaPath,
	isFrameLocatorDefinition,
	isLocatorInstance,
	normalizeOverrideSteps,
	normalizeSteps,
	stringifyForLog,
	validateLocatorSchemaPath,
} from "./utils";

type LocatorTypeForPath<LocatorPathTypes, Path extends RegistryPath<string>> = NonNullable<
	Path extends keyof LocatorPathTypes ? LocatorPathTypes[Path] : LocatorStrategyDefinition["type"]
>;

export class LocatorRegistry<
	LocatorSchemaPathType extends string,
	LocatorPathTypes extends Partial<Record<LocatorSchemaPathType, LocatorStrategyDefinition["type"]>> = Record<
		LocatorSchemaPathType,
		LocatorStrategyDefinition["type"]
	>,
> {
	private readonly schemas = new Map<
		RegistryPath<LocatorSchemaPathType>,
		LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>
	>();

	readonly createReusable: ReusableLocatorFactory<LocatorSchemaPathType>;

	constructor(private readonly page: Page) {
		this.createReusable = new ReusableLocatorFactory<LocatorSchemaPathType>();
	}

	private normalizeRecord(record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>) {
		return {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: record.definition,
			steps: normalizeSteps<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(record.steps),
		} satisfies LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;
	}

	private cloneRecordForReuse(
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
		path: RegistryPath<LocatorSchemaPathType>,
	) {
		return {
			locatorSchemaPath: path,
			definition: cloneLocatorStrategyDefinition(record.definition),
			steps: normalizeSteps<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(record.steps),
		} satisfies LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;
	}

	add(
		path: RegistryPath<LocatorSchemaPathType>,
	): LocatorRegistrationPreDefinitionBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, false>;
	add<ReusePath extends RegistryPath<LocatorSchemaPathType>>(
		path: RegistryPath<LocatorSchemaPathType>,
		options: {
			reuse: ReusePath;
		},
	): LocatorRegistrationSeededBuilderForType<
		LocatorSchemaPathType,
		RegistryPath<LocatorSchemaPathType>,
		LocatorTypeForPath<LocatorPathTypes, ReusePath>
	>;
	add<
		Reuse extends ReusableLocator<
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>,
			LocatorStrategyDefinition["type"]
		>,
	>(
		path: RegistryPath<LocatorSchemaPathType>,
		options: { reuse: Reuse },
	): LocatorRegistrationSeededBuilderForType<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, Reuse["type"]>;
	add(
		path: RegistryPath<LocatorSchemaPathType>,
		options?: {
			reuse?:
				| RegistryPath<LocatorSchemaPathType>
				| ReusableLocator<
						LocatorSchemaPathType,
						RegistryPath<LocatorSchemaPathType>,
						LocatorStrategyDefinition["type"]
				  >;
		},
	):
		| LocatorRegistrationPreDefinitionBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, false>
		| LocatorRegistrationSeededBuilderForType<
				LocatorSchemaPathType,
				RegistryPath<LocatorSchemaPathType>,
				LocatorTypeForPath<LocatorPathTypes, RegistryPath<LocatorSchemaPathType>>
		  > {
		const reuse = options?.reuse;

		if (!reuse) {
			return new LocatorRegistrationBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, false>(
				this,
				path,
			);
		}

		const reusedRecord: LocatorSchemaRecord<
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		> = typeof reuse === "string"
			? this.cloneRecordForReuse(this.get(reuse as RegistryPath<LocatorSchemaPathType>), path)
			: this.cloneRecordForReuse(
					{
						locatorSchemaPath: path,
						definition: reuse.definition,
						steps: reuse.steps,
					},
					path,
				);

		return new LocatorRegistrationBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, true>(
			this,
			path,
			{
				initialDefinition: reusedRecord.definition,
				initialSteps: reusedRecord.steps,
				reuseType: reusedRecord.definition.type,
			},
		).persistSeededDefinition();
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

	unregister(path: RegistryPath<LocatorSchemaPathType>) {
		this.schemas.delete(path);
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

	private resolveFilterLocator(
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

	private resolveFiltersForTarget(
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
					normalizedFilter.has = this.resolveFilterLocator(has, target);
				}

				if (hasNot !== undefined) {
					normalizedFilter.hasNot = this.resolveFilterLocator(hasNot, target);
				}

				resolved.push(normalizedFilter);
				continue;
			}

			resolved.push(filter as ResolvedFilterDefinition);
		}

		return resolved;
	}

	getLocatorSchema<Path extends RegistryPath<LocatorSchemaPathType>>(
		path: Path,
	): LocatorQueryBuilder<LocatorSchemaPathType, Path> {
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

	getLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path): Locator {
		return this.getLocatorSchema(path).getLocator();
	}

	getNestedLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path): Locator {
		return this.getLocatorSchema(path).getNestedLocator();
	}

	buildLocatorChain(
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
					const [resolvedFilter] = this.resolveFiltersForTarget([step.filter], resolvedLocator);
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

		return { locator: lastLocator, steps: debugSteps };
	}

	/**
	 * Creates a bound accessor that returns the resolved terminal locator for a given path.
	 * The returned function mirrors BasePage ergonomics while being attachable to any consumer.
	 */
	createGetLocator() {
		const registry = this;
		return function getLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path) {
			return registry.getLocator(path);
		};
	}

	/**
	 * Creates a bound accessor that returns the resolved nested locator chain for a given path.
	 */
	createGetNestedLocator() {
		const registry = this;
		return function getNestedLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path) {
			return registry.getNestedLocator(path);
		};
	}
}

export type GetLocatorAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
) => Locator;

export type AddAccessor<LocatorSchemaPathType extends string> = LocatorRegistry<LocatorSchemaPathType>["add"];

export type GetLocatorSchemaAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
) => LocatorQueryBuilder<LocatorSchemaPathType, Path>;

export type GetNestedLocatorAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
) => Locator;

export const createRegistryWithAccessors = <
	Paths extends string,
	LocatorPathTypes extends Partial<Record<Paths, LocatorStrategyDefinition["type"]>> = Record<
		Paths,
		LocatorStrategyDefinition["type"]
	>,
>(
	page: Page,
) => {
	type PathErrors = LocatorSchemaPathErrors<Paths>;
	const _assertValidPaths: PathErrors extends never ? true : never = true as PathErrors extends never ? true : never;
	const registry = new LocatorRegistry<Paths, LocatorPathTypes>(page);
	const add: LocatorRegistry<Paths, LocatorPathTypes>["add"] = registry.add.bind(registry);
	const getLocator: GetLocatorAccessor<Paths> = registry.getLocator.bind(registry);
	const getNestedLocator: GetNestedLocatorAccessor<Paths> = registry.getNestedLocator.bind(registry);
	const getLocatorSchema: GetLocatorSchemaAccessor<Paths> = registry.getLocatorSchema.bind(registry);
	return { registry, add, getLocator, getNestedLocator, getLocatorSchema } as const;
};
