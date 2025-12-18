import type { Locator, Page } from "@playwright/test";
import { LocatorQueryBuilder, type LocatorQueryBuilderPublic } from "./locatorQueryBuilder";
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

export class LocatorRegistryInternal<LocatorSchemaPathType extends string> {
	private readonly schemas = new Map<
		RegistryPath<LocatorSchemaPathType>,
		LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>
	>();

	/**
	 * Factory for reusable locator seeds that capture a locator strategy plus any chained
	 * `filter`/`nth` steps without registering them. Pass the resulting seed to
	 * {@link LocatorRegistryInternal.add} via `{ reuse }` to register a path that inherits the
	 * stored definition and steps.
	 *
	 * @example
	 * ```ts
	 * const seed = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });
	 * registry.add("hero.title", { reuse: seed }).getByRole({ name: "Summary" });
	 * ```
	 */
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

	/**
	 * Registers a locator schema at the provided dot-delimited path.
	 * Accepts exactly one locator strategy (`getByRole`, `locator`, etc.) and any number of
	 * `filter`/`nth` steps chained in call order. When `{ reuse }` is supplied, the seeded
	 * definition is applied first and one matching override is allowed as a PATCH of the seed;
	 * otherwise, calling multiple locator strategies will throw.
	 *
	 * @example
	 * ```ts
	 * registry
	 *   .add("list.item")
	 *   .getByRole("listitem", { name: /Row/ })
	 *   .filter({ hasText: "Row" })
	 *   .nth("last");
	 * ```
	 */
	add(
		path: RegistryPath<LocatorSchemaPathType>,
	): LocatorRegistrationPreDefinitionBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, false>;
	add(path: RegistryPath<LocatorSchemaPathType>, options: { reuse: RegistryPath<LocatorSchemaPathType> }): void;
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
				| ReusableLocator<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, LocatorStrategyDefinition["type"]>
				| RegistryPath<LocatorSchemaPathType>;
		},
	):
		| LocatorRegistrationPreDefinitionBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, false>
		| LocatorRegistrationSeededBuilderForType<
				LocatorSchemaPathType,
				RegistryPath<LocatorSchemaPathType>,
				LocatorStrategyDefinition["type"]
		  >
		| undefined {
		const reuse = options?.reuse;

		if (!reuse) {
			return new LocatorRegistrationBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, false>(
				this,
				path,
			);
		}

		if (typeof reuse === "string") {
			const sourceRecord = this.get(reuse as RegistryPath<LocatorSchemaPathType>);
			const cloned = this.cloneRecordForReuse(sourceRecord, path);

			this.register(path, cloned);
			return undefined;
		}

		const reusedRecord: LocatorSchemaRecord<
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		> = this.cloneRecordForReuse(
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

	/**
	 * Returns a mutable query builder clone for the provided path. Use the builder to add or clear
	 * `filter`/`nth` steps, or to `update`/`replace` locator definitions before resolving locators.
	 * Changes affect only the builder clone; the registry’s stored schema remains untouched.
	 *
	 * @example
	 * ```ts
	 * const builder = registry
	 *   .getLocatorSchema("section.button")
	 *   .filter("section.button", { hasText: /Save/ })
	 *   .nth("section", 0);
	 * const locator = builder.getNestedLocator();
	 * ```
	 */
	getLocatorSchema<Path extends RegistryPath<LocatorSchemaPathType>>(
		path: Path,
	): LocatorQueryBuilderPublic<LocatorSchemaPathType, Path> {
		return new LocatorQueryBuilder<LocatorSchemaPathType, Path>(this, path);
	}

	/**
	 * Resolves the Playwright {@link Locator} for the provided path, applying only the terminal
	 * definition and its recorded steps (no ancestor chaining). Throws if the path is not registered.
	 *
	 * @example
	 * ```ts
	 * const button = registry.getLocator("form.submit");
	 * await button.click();
	 * ```
	 */
	getLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path): Locator {
		return this.getLocatorSchema(path).getLocator();
	}

	/**
	 * Resolves a chained Playwright {@link Locator} for a nested path, traversing each registered
	 * segment and applying their steps in order. Throws if any segment in the chain is missing.
	 *
	 * @example
	 * ```ts
	 * const nested = registry.getNestedLocator("list.item");
	 * await expect(nested).toBeVisible();
	 * ```
	 */
	getNestedLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path): Locator {
		return this.getLocatorSchema(path).getNestedLocator();
	}

	buildLocatorChain(
		path: RegistryPath<LocatorSchemaPathType>,
		definitions: Map<string, LocatorStrategyDefinition>,
		steps: Map<string, LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]>,
		overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
		tombstones?: Set<string>,
	) {
		const chain = expandSchemaPath(path);
		const registeredChain = chain.filter((part) => definitions.has(part));

		if (tombstones?.has(path) || !definitions.has(path)) {
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
			const isTerminalStep = index === lastIndex;
			const definition = definitions.get(part);
			if (tombstones?.has(part)) {
				if (isTerminalStep) {
					throw new Error(`No locator schema registered for path "${path}".`);
				}
				continue;
			}

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
}

export type GetLocatorAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
) => Locator;

export type AddAccessor<LocatorSchemaPathType extends string> = LocatorRegistryInternal<LocatorSchemaPathType>["add"];

export type GetLocatorSchemaAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
) => LocatorQueryBuilderPublic<LocatorSchemaPathType, Path>;

export type GetNestedLocatorAccessor<LocatorSchemaPathType extends string> = <
	Path extends RegistryPath<LocatorSchemaPathType>,
>(
	path: Path,
) => Locator;

export type LocatorRegistry<LocatorSchemaPathType extends string> = Pick<
	LocatorRegistryInternal<LocatorSchemaPathType>,
	"add" | "createReusable" | "getLocator" | "getLocatorSchema" | "getNestedLocator"
>;

/**
 * Creates a v2 locator registry bound to a Playwright {@link Page} and returns the registry plus
 * pre-bound helpers for ergonomic use in page objects and tests. Path unions are validated at
 * compile time and runtime. The returned `add`/`getLocator`/`getNestedLocator`/`getLocatorSchema`
 * accessors are pre-bound to the registry instance for dependency injection.
 *
 * @example
 * ```ts
 * const { registry, add, getNestedLocator, getLocatorSchema } =
 *   createRegistryWithAccessors<"root" | "root.child">(page);
 *
 * registry.add("root").locator("section");
 * registry.add("root.child").getByRole("heading", { level: 2 });
 *
 * const nested = getNestedLocator("root.child");
 * const patched = getLocatorSchema("root.child").filter("root.child", { hasText: /Docs/ }).getNestedLocator();
 * ```
 */
export const createRegistryWithAccessors = <Paths extends string>(page: Page) => {
	type PathErrors = LocatorSchemaPathErrors<Paths>;
	const _assertValidPaths: PathErrors extends never ? true : never = true as PathErrors extends never ? true : never;
	const registryInstance = new LocatorRegistryInternal<Paths>(page);
	const add: LocatorRegistryInternal<Paths>["add"] = registryInstance.add.bind(registryInstance);
	const getLocator: GetLocatorAccessor<Paths> = registryInstance.getLocator.bind(registryInstance);
	const getNestedLocator: GetNestedLocatorAccessor<Paths> = registryInstance.getNestedLocator.bind(registryInstance);
	const getLocatorSchema: GetLocatorSchemaAccessor<Paths> = registryInstance.getLocatorSchema.bind(registryInstance);
	const registry: LocatorRegistry<Paths> = registryInstance;
	return { registry, add, getLocator, getNestedLocator, getLocatorSchema } as const;
};
