import type { Locator, Page } from "@playwright/test";
import type { PlaywrightReportLogger } from "../helpers/playwrightReportLogger";
import type {
	AltTextDefinition,
	DataCyDefinition,
	FilterDefinition,
	FilterLocatorReference,
	FrameLocatorDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorBuilderTarget,
	LocatorDefinition,
	LocatorRegistrationConfig,
	LocatorSchemaRecord,
	LocatorStrategyDefinition,
	LocatorUpdate,
	PathIndexMap,
	PlaceholderDefinition,
	PlaywrightFilterDefinition,
	ResolvedFilterDefinition,
	RoleDefinition,
	TestIdDefinition,
	TextDefinition,
	TitleDefinition,
} from "./types";
import type { LocatorChainPaths, LocatorSchemaPathValid } from "./utils";
import { cssEscape, expandSchemaPath, validateLocatorSchemaPath } from "./utils";

type RegistryPath<LocatorSchemaPathType extends string> = LocatorSchemaPathType &
	LocatorSchemaPathValid<LocatorSchemaPathType>;

const stringifyForLog = (value: unknown) => {
	const seen = new WeakSet();
	return JSON.stringify(
		value,
		(key, current) => {
			if (typeof current === "object" && current !== null) {
				if (seen.has(current)) {
					return "[Circular]";
				}
				seen.add(current);
			}
			if (current instanceof RegExp) {
				return { type: "RegExp", source: current.source, flags: current.flags };
			}
			return current;
		},
		2,
	);
};

const applyFilters = (locator: Locator, filters: PlaywrightFilterDefinition[]) => {
	let current = locator;
	for (const filter of filters) {
		current = current.filter(filter);
	}
	return current;
};

const applyIndexSelector = (locator: Locator, selector: IndexSelector | null | undefined) => {
	if (selector === undefined || selector === null) {
		return locator;
	}
	if (selector === "first") {
		return locator.first();
	}
	if (selector === "last") {
		return locator.last();
	}
	return locator.nth(selector);
};

const normalizeFilters = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	filters?:
		| FilterDefinition<LocatorSchemaPathType, AllowedPaths>
		| FilterDefinition<LocatorSchemaPathType, AllowedPaths>[],
) => {
	if (!filters) {
		return undefined;
	}
	return Array.isArray(filters)
		? ([...filters] as FilterDefinition<LocatorSchemaPathType, AllowedPaths>[])
		: ([filters] as FilterDefinition<LocatorSchemaPathType, AllowedPaths>[]);
};

const mergeOptions = <OptionsType>(
	currentOptions: OptionsType | undefined,
	updates: { options?: OptionsType } | undefined,
) => {
	if (updates && "options" in updates) {
		const updateOptions = updates.options;
		if (updateOptions && typeof updateOptions === "object") {
			return {
				...(typeof currentOptions === "object" && currentOptions !== null ? currentOptions : {}),
				...updateOptions,
			} as OptionsType;
		}
		return updateOptions as OptionsType;
	}

	return currentOptions as OptionsType;
};

type RegistrationConfig<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> = LocatorRegistrationConfig<Path, RegistryPath<LocatorSchemaPathType>>;

const mergeLocatorDefinition = (
	current: LocatorStrategyDefinition,
	updates: LocatorUpdate,
	path: string,
): LocatorStrategyDefinition => {
	if (!updates || typeof updates !== "object" || !("type" in updates)) {
		throw new Error(`Locator update for "${path}" requires a "type" property.`);
	}

	switch (updates.type) {
		case "role": {
			const role = updates.role ?? (current.type === "role" ? current.role : undefined);
			if (role === undefined) {
				throw new Error(`Locator update for "${path}" of type "role" requires a "role" value.`);
			}
			const options = mergeOptions(current.type === "role" ? current.options : undefined, updates);
			return options !== undefined
				? ({ type: "role", role, options } as RoleDefinition)
				: ({ type: "role", role } as RoleDefinition);
		}
		case "text": {
			const text = updates.text ?? (current.type === "text" ? current.text : undefined);
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "text" requires a "text" value.`);
			}
			const options = mergeOptions(current.type === "text" ? current.options : undefined, updates);
			return options !== undefined
				? ({ type: "text", text, options } as TextDefinition)
				: ({ type: "text", text } as TextDefinition);
		}
		case "label": {
			const text = updates.text ?? (current.type === "label" ? current.text : undefined);
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "label" requires a "text" value.`);
			}
			const options = mergeOptions(current.type === "label" ? current.options : undefined, updates);
			return options !== undefined
				? ({ type: "label", text, options } as LabelDefinition)
				: ({ type: "label", text } as LabelDefinition);
		}
		case "placeholder": {
			const text = updates.text ?? (current.type === "placeholder" ? current.text : undefined);
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "placeholder" requires a "text" value.`);
			}
			const options = mergeOptions(current.type === "placeholder" ? current.options : undefined, updates);
			return options !== undefined
				? ({ type: "placeholder", text, options } as PlaceholderDefinition)
				: ({ type: "placeholder", text } as PlaceholderDefinition);
		}
		case "altText": {
			const text = updates.text ?? (current.type === "altText" ? current.text : undefined);
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "altText" requires a "text" value.`);
			}
			const options = mergeOptions(current.type === "altText" ? current.options : undefined, updates);
			return options !== undefined
				? ({ type: "altText", text, options } as AltTextDefinition)
				: ({ type: "altText", text } as AltTextDefinition);
		}
		case "title": {
			const text = updates.text ?? (current.type === "title" ? current.text : undefined);
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "title" requires a "text" value.`);
			}
			const options = mergeOptions(current.type === "title" ? current.options : undefined, updates);
			return options !== undefined
				? ({ type: "title", text, options } as TitleDefinition)
				: ({ type: "title", text } as TitleDefinition);
		}
		case "locator": {
			const selector = updates.selector ?? (current.type === "locator" ? current.selector : undefined);
			if (selector === undefined) {
				throw new Error(`Locator update for "${path}" of type "locator" requires a "selector" value.`);
			}
			const options = mergeOptions(current.type === "locator" ? current.options : undefined, updates);
			return options !== undefined
				? ({ type: "locator", selector, options } as LocatorDefinition)
				: ({ type: "locator", selector } as LocatorDefinition);
		}
		case "frameLocator": {
			const selector = updates.selector ?? (current.type === "frameLocator" ? current.selector : undefined);
			if (selector === undefined) {
				throw new Error(`Locator update for "${path}" of type "frameLocator" requires a "selector" value.`);
			}
			return { type: "frameLocator", selector } as FrameLocatorDefinition;
		}
		case "testId": {
			const testId = updates.testId ?? (current.type === "testId" ? current.testId : undefined);
			if (testId === undefined) {
				throw new Error(`Locator update for "${path}" of type "testId" requires a "testId" value.`);
			}
			return { type: "testId", testId } as TestIdDefinition;
		}
		case "id": {
			const id = updates.id ?? (current.type === "id" ? current.id : undefined);
			if (id === undefined) {
				throw new Error(`Locator update for "${path}" of type "id" requires an "id" value.`);
			}
			return { type: "id", id } as IdDefinition;
		}
		case "dataCy": {
			const value = updates.value ?? (current.type === "dataCy" ? current.value : undefined);
			if (value === undefined) {
				throw new Error(`Locator update for "${path}" of type "dataCy" requires a "value".`);
			}
			return { type: "dataCy", value: `${value}` } as DataCyDefinition;
		}
		default: {
			const exhaustive: never = updates;
			return exhaustive;
		}
	}
};

const createLocator = (
	target: LocatorBuilderTarget,
	definition: LocatorStrategyDefinition,
): Locator | ReturnType<Page["frameLocator"]> => {
	switch (definition.type) {
		case "role":
			return target.getByRole(definition.role, definition.options);
		case "text":
			return target.getByText(definition.text, definition.options);
		case "label":
			return target.getByLabel(definition.text, definition.options);
		case "placeholder":
			return target.getByPlaceholder(definition.text, definition.options);
		case "altText":
			return target.getByAltText(definition.text, definition.options);
		case "title":
			return target.getByTitle(definition.text, definition.options);
		case "locator":
			return target.locator(definition.selector, definition.options);
		case "frameLocator":
			return target.frameLocator(definition.selector);
		case "testId":
			return target.getByTestId(definition.testId);
		case "id":
			return target.locator(`#${cssEscape(definition.id)}`);
		case "dataCy":
			return target.locator(`data-cy=${definition.value}`);
		default: {
			const exhaustive: never = definition;
			return exhaustive;
		}
	}
};

const isFrameLocatorDefinition = (definition: LocatorStrategyDefinition): definition is FrameLocatorDefinition =>
	definition.type === "frameLocator";

const isLocatorInstance = (value: unknown): value is Locator => {
	return !!value && typeof value === "object" && typeof (value as Locator).filter === "function";
};

export class LocatorRegistrationBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> {
	constructor(
		private readonly registry: LocatorRegistry<LocatorSchemaPathType>,
		private readonly path: Path,
	) {}

	getByRole(
		role: RoleDefinition["role"],
		options?: RoleDefinition["options"],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		return this.commit({ type: "role", role, options }, config);
	}

	getByText(
		text: string,
		options?: Parameters<Page["getByText"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		return this.commit({ type: "text", text, options }, config);
	}

	getByLabel(
		text: string,
		options?: Parameters<Page["getByLabel"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		return this.commit({ type: "label", text, options }, config);
	}

	getByPlaceholder(
		text: string,
		options?: Parameters<Page["getByPlaceholder"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		return this.commit({ type: "placeholder", text, options }, config);
	}

	getByAltText(
		text: string,
		options?: Parameters<Page["getByAltText"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		return this.commit({ type: "altText", text, options }, config);
	}

	getByTitle(
		text: string,
		options?: Parameters<Page["getByTitle"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		return this.commit({ type: "title", text, options }, config);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options?: Parameters<Page["locator"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		return this.commit({ type: "locator", selector, options }, config);
	}

	frameLocator(
		selector: Parameters<Page["frameLocator"]>[0],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		return this.commit({ type: "frameLocator", selector }, config);
	}

	getByTestId(testId: Parameters<Page["getByTestId"]>[0], config?: RegistrationConfig<LocatorSchemaPathType, Path>) {
		return this.commit({ type: "testId", testId }, config);
	}

	getById(id: string, config?: RegistrationConfig<LocatorSchemaPathType, Path>) {
		return this.commit({ type: "id", id }, config);
	}

	getByDataCy(value: DataCyDefinition["value"], config?: RegistrationConfig<LocatorSchemaPathType, Path>) {
		return this.commit({ type: "dataCy", value }, config);
	}

	private commit(definition: LocatorStrategyDefinition, config?: RegistrationConfig<LocatorSchemaPathType, Path>) {
		this.registry.register(this.path, {
			locatorSchemaPath: this.path,
			definition,
			filters: normalizeFilters<Path, RegistryPath<LocatorSchemaPathType>>(config?.filters),
			index: config?.index ?? null,
		});
		return this.registry;
	}
}

export class LocatorQueryBuilder<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
> {
	private readonly definitions = new Map<string, LocatorStrategyDefinition>();
	private readonly filters = new Map<
		string,
		FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]
	>();
	private readonly indices = new Map<string, IndexSelector | null>();

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
			const recordFilters = record.filters ? [...record.filters] : [];
			this.filters.set(part, recordFilters);
			this.indices.set(part, record.index ?? null);
			if (part === path) {
				hasTerminal = true;
			}
		}

		if (!hasTerminal) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
	}

	update<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		updates: LocatorUpdate,
	) {
		this.ensureSubPath(subPath);
		const current = this.definitions.get(subPath);
		if (!current) {
			throw new Error(`No locator schema registered for sub-path "${subPath}".`);
		}
		const merged = mergeLocatorDefinition(current, updates, subPath);
		this.definitions.set(subPath, merged);
		return this;
	}

	addFilter<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		this.ensureSubPath(subPath);
		const existing = this.filters.get(subPath) ?? [];
		existing.push(filter);
		this.filters.set(subPath, existing);
		return this;
	}

	removeFilters<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
	) {
		this.ensureSubPath(subPath);
		this.filters.set(subPath, []);
		return this;
	}

	nth<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		index: IndexSelector,
	) {
		this.ensureSubPath(subPath);
		this.indices.set(subPath, index);
		return this;
	}

	async getLocator() {
		const definition = this.definitions.get(this.path);

		if (!definition) {
			throw new Error(`No locator schema registered for path "${this.path}".`);
		}

		const filtersForPath = this.filters.get(this.path) ?? [];
		const indicesForPath = this.indices.get(this.path) ?? null;

		const definitions = new Map<string, LocatorStrategyDefinition>([[this.path, definition]]);
		const filters = new Map<
			string,
			FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]
		>([[this.path, [...filtersForPath]]]);
		const indices = new Map<string, IndexSelector | null>([[this.path, indicesForPath]]);

		const { locator } = await this.registry.buildLocatorChain(this.path, definitions, filters, indices);
		if (!locator) {
			throw new Error(`Unable to resolve direct locator for path "${this.path}".`);
		}
		return locator;
	}

	async getNestedLocator(overrides?: PathIndexMap) {
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

	private async resolve(overrides?: PathIndexMap) {
		return this.registry.buildLocatorChain(this.path, this.definitions, this.filters, this.indices, overrides);
	}
}

export class LocatorRegistry<LocatorSchemaPathType extends string> {
	private readonly schemas = new Map<
		RegistryPath<LocatorSchemaPathType>,
		LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>
	>();

	constructor(
		private readonly page: Page,
		private readonly log: PlaywrightReportLogger,
	) {}

	add(path: RegistryPath<LocatorSchemaPathType>) {
		return new LocatorRegistrationBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(this, path);
	}

	register(
		path: RegistryPath<LocatorSchemaPathType>,
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
	) {
		validateLocatorSchemaPath(path);
		if (this.schemas.has(path)) {
			const existing = this.schemas.get(path)!;
			const errorDetails = stringifyForLog({
				existing: existing,
				attempted: record,
			});
			throw new Error(`A locator schema with the path "${path}" already exists.\nExisting Schema: ${errorDetails}`);
		}
		this.schemas.set(path, {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: record.definition,
			filters: record.filters ? [...record.filters] : undefined,
			index: record.index ?? null,
		});
	}

	get(
		path: RegistryPath<LocatorSchemaPathType>,
	): LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>> {
		const record = this.schemas.get(path);
		if (!record) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
		return record;
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
			filters: record.filters
				? ([...record.filters] as FilterDefinition<
						RegistryPath<LocatorSchemaPathType>,
						RegistryPath<LocatorSchemaPathType>
					>[])
				: undefined,
			index: record.index ?? null,
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

	async getLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path) {
		const record = this.get(path);
		const definitions = new Map<string, LocatorStrategyDefinition>([[path, record.definition]]);
		const filters = new Map<
			string,
			FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]
		>([[path, record.filters ? [...record.filters] : []]]);
		const indices = new Map<string, IndexSelector | null>([[path, record.index ?? null]]);

		const { locator, steps } = await this.buildLocatorChain(path, definitions, filters, indices);
		if (!locator) {
			throw new Error(`Unable to resolve direct locator for path "${path}".`);
		}

		if (this.log.isLogLevelEnabled("debug")) {
			this.log.debug(
				"Resolved direct locator",
				stringifyForLog({
					path,
					steps,
				}),
			);
		}

		return locator;
	}

	async getNestedLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path, overrides?: PathIndexMap) {
		return this.getLocatorSchema(path).getNestedLocator(overrides);
	}

	async buildLocatorChain(
		path: RegistryPath<LocatorSchemaPathType>,
		definitions: Map<string, LocatorStrategyDefinition>,
		filters: Map<string, FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]>,
		indices: Map<string, IndexSelector | null>,
		overrides?: PathIndexMap,
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

				debugSteps.push({ path: part, definition, appliedFilters: [] });
				continue;
			}

			const locatorResult = createLocator(currentTarget, definition) as Locator;
			const combinedFilters = await this.resolveFiltersForTarget(filters.get(part), currentTarget);
			let resolvedLocator = locatorResult;
			if (combinedFilters.length > 0) {
				resolvedLocator = applyFilters(resolvedLocator, combinedFilters);
			}
			const explicitIndex = overrides?.[part] ?? indices.get(part);
			const indexedLocator = applyIndexSelector(resolvedLocator, explicitIndex ?? undefined);
			currentTarget = indexedLocator;
			lastLocator = indexedLocator;
			debugSteps.push({ path: part, definition, appliedFilters: combinedFilters, index: explicitIndex });
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
}
