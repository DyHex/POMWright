import type { Locator, Page } from "@playwright/test";
import type { PlaywrightReportLogger } from "../helpers/playwrightReportLogger";
import type {
	DataCyDefinition,
	FilterDefinition,
	FrameLocatorDefinition,
	IndexSelector,
	LocatorBuilderTarget,
	LocatorRegistrationConfig,
	LocatorSchemaRecord,
	LocatorStrategyDefinition,
	PathIndexMap,
	RoleDefinition,
} from "./types";
import type { LocatorChainPaths } from "./utils";
import { cssEscape, expandSchemaPath, validateLocatorSchemaPath } from "./utils";

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

const applyFilters = (locator: Locator, filters: FilterDefinition[]) => {
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

const normalizeFilters = (filters?: FilterDefinition | FilterDefinition[]) => {
	if (!filters) {
		return undefined;
	}
	return Array.isArray(filters) ? [...filters] : [filters];
};

const hasOptions = (
	definition: Partial<LocatorStrategyDefinition> | undefined,
): definition is Partial<LocatorStrategyDefinition> & { options?: unknown } => {
	if (!definition || typeof definition !== "object") {
		return false;
	}
	return "options" in definition;
};

const mergeLocatorDefinition = (
	current: LocatorStrategyDefinition,
	updates: Partial<LocatorStrategyDefinition>,
): LocatorStrategyDefinition => {
	if (!updates || Object.keys(updates).length === 0) {
		return current;
	}

	const next = { ...current, ...updates } as LocatorStrategyDefinition;

	if (hasOptions(current) || hasOptions(updates)) {
		const nextWithOptions = next as LocatorStrategyDefinition & { options?: unknown };
		const existingOptions = hasOptions(current) ? current.options : undefined;
		if (hasOptions(updates)) {
			if (updates.options && typeof updates.options === "object") {
				nextWithOptions.options = {
					...(typeof existingOptions === "object" && existingOptions !== null ? existingOptions : {}),
					...updates.options,
				} as typeof nextWithOptions.options;
			} else {
				nextWithOptions.options = updates.options as typeof nextWithOptions.options;
			}
		} else {
			nextWithOptions.options = existingOptions as typeof nextWithOptions.options;
		}
	}

	return next;
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

export class LocatorRegistrationBuilder<LocatorSchemaPathType extends string> {
	constructor(
		private readonly registry: LocatorRegistry<LocatorSchemaPathType>,
		private readonly path: LocatorSchemaPathType,
	) {}

	getByRole(role: RoleDefinition["role"], options?: RoleDefinition["options"], config?: LocatorRegistrationConfig) {
		return this.commit({ type: "role", role, options }, config);
	}

	getByText(text: string, options?: Parameters<Page["getByText"]>[1], config?: LocatorRegistrationConfig) {
		return this.commit({ type: "text", text, options }, config);
	}

	getByLabel(text: string, options?: Parameters<Page["getByLabel"]>[1], config?: LocatorRegistrationConfig) {
		return this.commit({ type: "label", text, options }, config);
	}

	getByPlaceholder(
		text: string,
		options?: Parameters<Page["getByPlaceholder"]>[1],
		config?: LocatorRegistrationConfig,
	) {
		return this.commit({ type: "placeholder", text, options }, config);
	}

	getByAltText(text: string, options?: Parameters<Page["getByAltText"]>[1], config?: LocatorRegistrationConfig) {
		return this.commit({ type: "altText", text, options }, config);
	}

	getByTitle(text: string, options?: Parameters<Page["getByTitle"]>[1], config?: LocatorRegistrationConfig) {
		return this.commit({ type: "title", text, options }, config);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options?: Parameters<Page["locator"]>[1],
		config?: LocatorRegistrationConfig,
	) {
		return this.commit({ type: "locator", selector, options }, config);
	}

	frameLocator(selector: Parameters<Page["frameLocator"]>[0], config?: LocatorRegistrationConfig) {
		return this.commit({ type: "frameLocator", selector }, config);
	}

	getByTestId(testId: Parameters<Page["getByTestId"]>[0], config?: LocatorRegistrationConfig) {
		return this.commit({ type: "testId", testId }, config);
	}

	getById(id: string, config?: LocatorRegistrationConfig) {
		return this.commit({ type: "id", id }, config);
	}

	getByDataCy(value: DataCyDefinition["value"], config?: LocatorRegistrationConfig) {
		return this.commit({ type: "dataCy", value }, config);
	}

	private commit(definition: LocatorStrategyDefinition, config?: LocatorRegistrationConfig) {
		this.registry.register(this.path, {
			locatorSchemaPath: this.path,
			definition,
			filters: normalizeFilters(config?.filters),
			index: config?.index ?? null,
		});
		return this.registry;
	}
}

export class LocatorQueryBuilder<LocatorSchemaPathType extends string, LocatorSubstring extends LocatorSchemaPathType> {
	private readonly definitions = new Map<string, LocatorStrategyDefinition>();
	private readonly filters = new Map<string, FilterDefinition[]>();
	private readonly indices = new Map<string, IndexSelector | null>();

	constructor(
		private readonly registry: LocatorRegistry<LocatorSchemaPathType>,
		private readonly path: LocatorSubstring,
	) {
		const chain = expandSchemaPath(path);
		let hasTerminal = false;
		for (const part of chain) {
			const record = this.registry.getIfExists(part as LocatorSchemaPathType);
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

	update<SubPath extends LocatorChainPaths<LocatorSchemaPathType, LocatorSubstring>>(
		subPath: SubPath,
		updates: Partial<LocatorStrategyDefinition>,
	) {
		this.ensureSubPath(subPath);
		const current = this.definitions.get(subPath);
		if (!current) {
			throw new Error(`No locator schema registered for sub-path "${subPath}".`);
		}
		const merged = mergeLocatorDefinition(current, updates);
		this.definitions.set(subPath, merged);
		return this;
	}

	addFilter<SubPath extends LocatorChainPaths<LocatorSchemaPathType, LocatorSubstring>>(
		subPath: SubPath,
		filter: FilterDefinition,
	) {
		this.ensureSubPath(subPath);
		const existing = this.filters.get(subPath) ?? [];
		existing.push(filter);
		this.filters.set(subPath, existing);
		return this;
	}

	nth<SubPath extends LocatorChainPaths<LocatorSchemaPathType, LocatorSubstring>>(
		subPath: SubPath,
		index: IndexSelector,
	) {
		this.ensureSubPath(subPath);
		this.indices.set(subPath, index);
		return this;
	}

	async getLocator() {
		const { locator } = await this.resolve();
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
	private readonly schemas = new Map<LocatorSchemaPathType, LocatorSchemaRecord>();

	constructor(
		private readonly page: Page,
		private readonly log: PlaywrightReportLogger,
	) {}

	add<Path extends LocatorSchemaPathType>(path: Path) {
		return new LocatorRegistrationBuilder<LocatorSchemaPathType>(this, path);
	}

	register(path: LocatorSchemaPathType, record: LocatorSchemaRecord) {
		validateLocatorSchemaPath(path);
		this.schemas.set(path, {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: record.definition,
			filters: record.filters ? [...record.filters] : undefined,
			index: record.index ?? null,
		});
	}

	get<Path extends LocatorSchemaPathType>(path: Path): LocatorSchemaRecord {
		const record = this.schemas.get(path);
		if (!record) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
		return record;
	}

	getIfExists<Path extends LocatorSchemaPathType>(path: Path): LocatorSchemaRecord | undefined {
		const record = this.schemas.get(path);
		if (!record) {
			return undefined;
		}

		return {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: record.definition,
			filters: record.filters ? [...record.filters] : undefined,
			index: record.index ?? null,
		};
	}

	getLocatorSchema<Path extends LocatorSchemaPathType>(path: Path) {
		return new LocatorQueryBuilder<LocatorSchemaPathType, Path>(this, path);
	}

	async getLocator<Path extends LocatorSchemaPathType>(path: Path) {
		const record = this.get(path);
		const { definition } = record;

		if (isFrameLocatorDefinition(definition)) {
			throw new Error(`Locator schema path "${path}" resolves to a frameLocator. Use getNestedLocator() instead.`);
		}

		let locator = createLocator(this.page, definition) as Locator;
		const combinedFilters = [...(record.filters ?? [])];
		if (combinedFilters.length > 0) {
			locator = applyFilters(locator, combinedFilters);
		}
		if (record.index !== null && record.index !== undefined) {
			locator = applyIndexSelector(locator, record.index);
		}

		if (this.log.isLogLevelEnabled("debug")) {
			this.log.debug(
				"Resolved direct locator",
				stringifyForLog({
					path,
					definition,
					filters: combinedFilters,
					index: record.index ?? null,
				}),
			);
		}

		return locator;
	}

	async getNestedLocator<Path extends LocatorSchemaPathType>(path: Path, overrides?: PathIndexMap) {
		return this.getLocatorSchema(path).getNestedLocator(overrides);
	}

	async buildLocatorChain(
		path: LocatorSchemaPathType,
		definitions: Map<string, LocatorStrategyDefinition>,
		filters: Map<string, FilterDefinition[]>,
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
			appliedFilters: FilterDefinition[];
			index?: IndexSelector | null | undefined;
		}[] = [];

		for (const part of registeredChain) {
			const definition = definitions.get(part);
			if (!definition) {
				throw new Error(`Missing locator definition for "${part}" while resolving "${path}".`);
			}

			if (isFrameLocatorDefinition(definition)) {
				const frameLocator = createLocator(currentTarget, definition) as ReturnType<Page["frameLocator"]>;
				const ownerLocator = frameLocator.owner();
				// Provide a readable chain string while keeping the FrameLocator usable for subsequent steps.
				(frameLocator as unknown as { toString: () => string }).toString = () => `${ownerLocator}.contentFrame()`;
				currentTarget = frameLocator as LocatorBuilderTarget;
				lastLocator = frameLocator as unknown as Locator;
				debugSteps.push({ path: part, definition, appliedFilters: [] });
				continue;
			}

			const locatorResult = createLocator(currentTarget, definition) as Locator;
			const combinedFilters = [...(filters.get(part) ?? [])];
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
