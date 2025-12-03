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
	LocatorOverrides,
	LocatorRegistrationConfig,
	LocatorSchemaRecord,
	LocatorStep,
	LocatorStepOverride,
	LocatorStrategyDefinition,
	LocatorUpdate,
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

const normalizeSteps = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	steps?: LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
) => (steps ? steps.map((step) => ({ ...step })) : []);

const normalizeOverrideSteps = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	value?:
		| LocatorOverrides<LocatorSchemaPathType, AllowedPaths>[keyof LocatorOverrides<LocatorSchemaPathType, AllowedPaths>]
		| undefined,
) => {
	if (value === undefined) {
		return { steps: [] as LocatorStep<LocatorSchemaPathType, AllowedPaths>[], replaceIndex: false };
	}

	if (typeof value === "number" || value === "first" || value === "last" || value === null) {
		return {
			steps: [{ kind: "index", index: value }] as LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
			replaceIndex: true,
		};
	}

	const entries = Array.isArray(value) ? value : [value];
	const steps: LocatorStep<LocatorSchemaPathType, AllowedPaths>[] = [];
	let replaceIndex = false;

	for (const entry of entries as LocatorStepOverride<LocatorSchemaPathType, AllowedPaths>[]) {
		if (entry && typeof entry === "object" && "nth" in entry) {
			steps.push({ kind: "index", index: entry.nth ?? null });
			replaceIndex = true;
			continue;
		}

		if (entry && typeof entry === "object" && "filter" in entry) {
			steps.push({ kind: "filter", filter: entry.filter });
			continue;
		}

		steps.push({ kind: "filter", filter: entry as FilterDefinition<LocatorSchemaPathType, AllowedPaths> });
	}

	return { steps, replaceIndex } as const;
};

const isRegistrationConfig = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	value: unknown,
): value is LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths> => {
	if (!value || typeof value !== "object") {
		return false;
	}
	return "filters" in value || "index" in value;
};

const splitOptionsAndConfig = <OptionsType, LocatorSchemaPathType extends string, AllowedPaths extends string>(
	optionsOrConfig?: OptionsType | LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>,
	config?: LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>,
) => {
	const options = isRegistrationConfig<LocatorSchemaPathType, AllowedPaths>(optionsOrConfig)
		? undefined
		: (optionsOrConfig as OptionsType | undefined);
	const hasOptions = optionsOrConfig !== undefined && !isRegistrationConfig(optionsOrConfig);
	const registrationConfig =
		(isRegistrationConfig<LocatorSchemaPathType, AllowedPaths>(optionsOrConfig) ? optionsOrConfig : undefined) ??
		config;

	return { options, config: registrationConfig, hasOptions };
};

const stepsFromLegacyConfig = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	config?: LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>,
) => {
	const filters = normalizeFilters<LocatorSchemaPathType, AllowedPaths>(config?.filters) ?? [];
	const steps: LocatorStep<LocatorSchemaPathType, AllowedPaths>[] = filters.map((filter) => ({
		kind: "filter",
		filter,
	}));

	if (config && "index" in config) {
		steps.push({ kind: "index", index: config.index ?? null });
	}

	return steps;
};

const replaceStepsWithConfig = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	existing: LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
	config?: LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>,
) => {
	let steps = [...existing];

	if (config && "filters" in config) {
		const normalized = normalizeFilters<LocatorSchemaPathType, AllowedPaths>(config.filters) ?? [];
		steps = steps.filter((step) => step.kind !== "filter");
		steps.push(
			...normalized.map((filter) => ({ kind: "filter", filter }) as LocatorStep<LocatorSchemaPathType, AllowedPaths>),
		);
	}

	if (config && "index" in config) {
		steps = steps.filter((step) => step.kind !== "index");
		steps.push({ kind: "index", index: config.index ?? null });
	}

	return steps;
};

const extractFiltersFromSteps = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	steps: LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
) =>
	steps
		.filter((step) => step.kind === "filter")
		.map((step) => (step as { filter: unknown }).filter) as FilterDefinition<LocatorSchemaPathType, AllowedPaths>[];

const extractIndexFromSteps = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
	steps: LocatorStep<LocatorSchemaPathType, AllowedPaths>[],
) => {
	for (let i = steps.length - 1; i >= 0; i -= 1) {
		const step = steps[i]!;
		if (step.kind === "index") {
			return step.index ?? null;
		}
	}
	return null;
};

const parseUpdateArguments = <Primary, OptionsType, LocatorSchemaPathType extends string, AllowedPaths extends string>(
	primaryOrOptionsOrConfig?: Primary | OptionsType | LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>,
	optionsOrConfig?: OptionsType | LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>,
	config?: LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>,
	optionsProvided?: boolean,
) => {
	let primary: Primary | undefined;
	let options: OptionsType | undefined;
	let hasOptions = optionsProvided ?? false;
	let registrationConfig: LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths> | undefined;

	if (isRegistrationConfig<LocatorSchemaPathType, AllowedPaths>(primaryOrOptionsOrConfig)) {
		registrationConfig = primaryOrOptionsOrConfig;
	} else if (primaryOrOptionsOrConfig !== undefined) {
		if (typeof primaryOrOptionsOrConfig === "object") {
			options = primaryOrOptionsOrConfig as OptionsType;
			hasOptions = true;
		} else {
			primary = primaryOrOptionsOrConfig as Primary;
		}
	}

	const {
		options: parsedOptions,
		config: parsedConfig,
		hasOptions: parsedHasOptions,
	} = splitOptionsAndConfig<OptionsType, LocatorSchemaPathType, AllowedPaths>(optionsOrConfig, config);

	if (options === undefined && parsedOptions !== undefined) {
		options = parsedOptions;
	}
	registrationConfig ??= parsedConfig;
	hasOptions = hasOptions || parsedHasOptions;

	return { primary, options, config: registrationConfig, hasOptions };
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
	baseline?: LocatorStrategyDefinition,
): LocatorStrategyDefinition => {
	if (!updates || typeof updates !== "object" || !("type" in updates)) {
		throw new Error(`Locator update for "${path}" requires a "type" property.`);
	}

	const source = <TType extends LocatorStrategyDefinition["type"]>(targetType: TType) => {
		if (current.type === targetType) {
			return current as Extract<LocatorStrategyDefinition, { type: TType }>;
		}
		if (baseline?.type === targetType) {
			return baseline as Extract<LocatorStrategyDefinition, { type: TType }>;
		}
		return undefined;
	};

	switch (updates.type) {
		case "role": {
			const roleSource = source("role");
			const role = updates.role ?? roleSource?.role;
			if (role === undefined) {
				throw new Error(`Locator update for "${path}" of type "role" requires a "role" value.`);
			}
			const options = mergeOptions(roleSource?.options, updates);
			return options !== undefined
				? ({ type: "role", role, options } as RoleDefinition)
				: ({ type: "role", role } as RoleDefinition);
		}
		case "text": {
			const textSource = source("text");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "text" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "text", text, options } as TextDefinition)
				: ({ type: "text", text } as TextDefinition);
		}
		case "label": {
			const textSource = source("label");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "label" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "label", text, options } as LabelDefinition)
				: ({ type: "label", text } as LabelDefinition);
		}
		case "placeholder": {
			const textSource = source("placeholder");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "placeholder" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "placeholder", text, options } as PlaceholderDefinition)
				: ({ type: "placeholder", text } as PlaceholderDefinition);
		}
		case "altText": {
			const textSource = source("altText");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "altText" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "altText", text, options } as AltTextDefinition)
				: ({ type: "altText", text } as AltTextDefinition);
		}
		case "title": {
			const textSource = source("title");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "title" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "title", text, options } as TitleDefinition)
				: ({ type: "title", text } as TitleDefinition);
		}
		case "locator": {
			const selectorSource = source("locator");
			const selector = updates.selector ?? selectorSource?.selector;
			if (selector === undefined) {
				throw new Error(`Locator update for "${path}" of type "locator" requires a "selector" value.`);
			}
			const options = mergeOptions(selectorSource?.options, updates);
			return options !== undefined
				? ({ type: "locator", selector, options } as LocatorDefinition)
				: ({ type: "locator", selector } as LocatorDefinition);
		}
		case "frameLocator": {
			const selectorSource = source("frameLocator");
			const selector = updates.selector ?? selectorSource?.selector;
			if (selector === undefined) {
				throw new Error(`Locator update for "${path}" of type "frameLocator" requires a "selector" value.`);
			}
			return { type: "frameLocator", selector } as FrameLocatorDefinition;
		}
		case "testId": {
			const testIdSource = source("testId");
			const testId = updates.testId ?? testIdSource?.testId;
			if (testId === undefined) {
				throw new Error(`Locator update for "${path}" of type "testId" requires a "testId" value.`);
			}
			return { type: "testId", testId } as TestIdDefinition;
		}
		case "id": {
			const idSource = source("id");
			const id = updates.id ?? idSource?.id;
			if (id === undefined) {
				throw new Error(`Locator update for "${path}" of type "id" requires an "id" value.`);
			}
			return { type: "id", id } as IdDefinition;
		}
		case "dataCy": {
			const valueSource = source("dataCy");
			const value = updates.value ?? valueSource?.value;
			if (value === undefined) {
				throw new Error(`Locator update for "${path}" of type "dataCy" requires a "value" value.`);
			}
			return { type: "dataCy", value } as DataCyDefinition;
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
	private steps: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[] = [];
	private definition?: LocatorStrategyDefinition;
	private registered = false;

	constructor(
		private readonly registry: LocatorRegistry<LocatorSchemaPathType>,
		private readonly path: Path,
	) {}

	filter(filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>) {
		this.ensureDefinition();
		this.steps.push({ kind: "filter", filter });
		this.persist();
		return this;
	}

	nth(index: IndexSelector) {
		this.ensureDefinition();
		this.steps.push({ kind: "index", index });
		this.persist();
		return this;
	}

	getByRole(
		role: RoleDefinition["role"],
		options: RoleDefinition["options"],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByRole(
		role: RoleDefinition["role"],
		options?: RoleDefinition["options"],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByRole(
		role: RoleDefinition["role"],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByRole(role: RoleDefinition["role"]): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByRole(
		role: RoleDefinition["role"],
		optionsOrConfig?: RoleDefinition["options"] | RegistrationConfig<LocatorSchemaPathType, Path>,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		const {
			options,
			config: registrationConfig,
			hasOptions,
		} = splitOptionsAndConfig<RoleDefinition["options"], LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(
			optionsOrConfig,
			config,
		);

		const definition = hasOptions
			? ({ type: "role", role, options } as RoleDefinition)
			: ({ type: "role", role } as RoleDefinition);

		return this.commit(definition, registrationConfig);
	}

	getByText(
		text: string,
		options: Parameters<Page["getByText"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByText(
		text: string,
		options?: Parameters<Page["getByText"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByText(
		text: string,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByText(
		text: string,
		optionsOrConfig?: Parameters<Page["getByText"]>[1] | RegistrationConfig<LocatorSchemaPathType, Path>,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		const {
			options,
			config: registrationConfig,
			hasOptions,
		} = splitOptionsAndConfig<
			Parameters<Page["getByText"]>[1],
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		>(optionsOrConfig, config);

		const definition = hasOptions
			? ({ type: "text", text, options } as TextDefinition)
			: ({ type: "text", text } as TextDefinition);

		return this.commit(definition, registrationConfig);
	}

	getByLabel(
		text: string,
		options: Parameters<Page["getByLabel"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		text: string,
		options?: Parameters<Page["getByLabel"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		text: string,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		text: string,
		optionsOrConfig?: Parameters<Page["getByLabel"]>[1] | RegistrationConfig<LocatorSchemaPathType, Path>,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		const {
			options,
			config: registrationConfig,
			hasOptions,
		} = splitOptionsAndConfig<
			Parameters<Page["getByLabel"]>[1],
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		>(optionsOrConfig, config);

		const definition = hasOptions
			? ({ type: "label", text, options } as LabelDefinition)
			: ({ type: "label", text } as LabelDefinition);

		return this.commit(definition, registrationConfig);
	}

	getByPlaceholder(
		text: string,
		options: Parameters<Page["getByPlaceholder"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		text: string,
		options?: Parameters<Page["getByPlaceholder"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		text: string,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		text: string,
		optionsOrConfig?: Parameters<Page["getByPlaceholder"]>[1] | RegistrationConfig<LocatorSchemaPathType, Path>,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		const {
			options,
			config: registrationConfig,
			hasOptions,
		} = splitOptionsAndConfig<
			Parameters<Page["getByPlaceholder"]>[1],
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		>(optionsOrConfig, config);

		const definition = hasOptions
			? ({ type: "placeholder", text, options } as PlaceholderDefinition)
			: ({ type: "placeholder", text } as PlaceholderDefinition);

		return this.commit(definition, registrationConfig);
	}

	getByAltText(
		text: string,
		options: Parameters<Page["getByAltText"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		text: string,
		options?: Parameters<Page["getByAltText"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		text: string,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		text: string,
		optionsOrConfig?: Parameters<Page["getByAltText"]>[1] | RegistrationConfig<LocatorSchemaPathType, Path>,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		const {
			options,
			config: registrationConfig,
			hasOptions,
		} = splitOptionsAndConfig<
			Parameters<Page["getByAltText"]>[1],
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		>(optionsOrConfig, config);

		const definition = hasOptions
			? ({ type: "altText", text, options } as AltTextDefinition)
			: ({ type: "altText", text } as AltTextDefinition);

		return this.commit(definition, registrationConfig);
	}

	getByTitle(
		text: string,
		options: Parameters<Page["getByTitle"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		text: string,
		options?: Parameters<Page["getByTitle"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		text: string,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		text: string,
		optionsOrConfig?: Parameters<Page["getByTitle"]>[1] | RegistrationConfig<LocatorSchemaPathType, Path>,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		const {
			options,
			config: registrationConfig,
			hasOptions,
		} = splitOptionsAndConfig<
			Parameters<Page["getByTitle"]>[1],
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		>(optionsOrConfig, config);

		const definition = hasOptions
			? ({ type: "title", text, options } as TitleDefinition)
			: ({ type: "title", text } as TitleDefinition);

		return this.commit(definition, registrationConfig);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	locator(
		selector: Parameters<Page["locator"]>[0],
		options?: Parameters<Page["locator"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	locator(
		selector: Parameters<Page["locator"]>[0],
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	locator(
		selector: Parameters<Page["locator"]>[0],
		optionsOrConfig?: Parameters<Page["locator"]>[1] | RegistrationConfig<LocatorSchemaPathType, Path>,
		config?: RegistrationConfig<LocatorSchemaPathType, Path>,
	) {
		const {
			options,
			config: registrationConfig,
			hasOptions,
		} = splitOptionsAndConfig<
			Parameters<Page["locator"]>[1],
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		>(optionsOrConfig, config);

		const definition = hasOptions
			? ({ type: "locator", selector, options } as LocatorDefinition)
			: ({ type: "locator", selector } as LocatorDefinition);

		return this.commit(definition, registrationConfig);
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
		this.definition = definition;
		const configSteps = stepsFromLegacyConfig<Path, RegistryPath<LocatorSchemaPathType>>(config);
		this.steps.push(...configSteps);
		this.persist();
		return this;
	}

	private ensureDefinition() {
		if (!this.definition) {
			throw new Error(`A locator definition must be provided before applying filters or indices for "${this.path}".`);
		}
	}

	private persist() {
		if (!this.definition) {
			throw new Error(`No locator schema definition provided for path "${this.path}".`);
		}

		const record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>> = {
			locatorSchemaPath: this.path,
			definition: this.definition,
			steps: normalizeSteps<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(this.steps),
		};

		if (this.registered) {
			this.registry.replace(this.path, record);
		} else {
			this.registry.register(this.path, record);
			this.registered = true;
		}
	}
}
class LocatorUpdateBuilder<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
	SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>,
> {
	constructor(
		private readonly parent: LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>,
		private readonly subPath: SubPath,
	) {}

	getByRole(
		role: RoleDefinition["role"],
		options: RoleDefinition["options"],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByRole(
		role: RoleDefinition["role"],
		options?: RoleDefinition["options"],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByRole(
		role: RoleDefinition["role"],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByRole(
		options: RoleDefinition["options"],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByRole(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByRole(
		roleOrOptionsOrConfig?:
			| RoleDefinition["role"]
			| RoleDefinition["options"]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		optionsOrConfig?: RoleDefinition["options"] | LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const optionsProvided =
			arguments.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
		const {
			primary: role,
			options,
			config: registrationConfig,
			hasOptions,
		} = parseUpdateArguments<
			RoleDefinition["role"],
			RoleDefinition["options"],
			LocatorSchemaPathType,
			LocatorSubstring
		>(roleOrOptionsOrConfig, optionsOrConfig, config, optionsProvided);

		const definition: LocatorUpdate = {
			type: "role",
			...(role !== undefined ? { role } : {}),
			...(hasOptions ? { options } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getByText(
		text: Parameters<Page["getByText"]>[0],
		options: Parameters<Page["getByText"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByText(
		text: Parameters<Page["getByText"]>[0],
		options?: Parameters<Page["getByText"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByText(
		text: Parameters<Page["getByText"]>[0],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByText(
		options: Parameters<Page["getByText"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByText(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByText(
		textOrOptionsOrConfig?:
			| Parameters<Page["getByText"]>[0]
			| Parameters<Page["getByText"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		optionsOrConfig?:
			| Parameters<Page["getByText"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const optionsProvided =
			arguments.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
		const {
			primary: text,
			options,
			config: registrationConfig,
			hasOptions,
		} = parseUpdateArguments<
			Parameters<Page["getByText"]>[0],
			Parameters<Page["getByText"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>(textOrOptionsOrConfig, optionsOrConfig, config, optionsProvided);

		const definition: LocatorUpdate = {
			type: "text",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
		options: Parameters<Page["getByLabel"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
		options?: Parameters<Page["getByLabel"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByLabel(
		options: Parameters<Page["getByLabel"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByLabel(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByLabel(
		textOrOptionsOrConfig?:
			| Parameters<Page["getByLabel"]>[0]
			| Parameters<Page["getByLabel"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		optionsOrConfig?:
			| Parameters<Page["getByLabel"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const optionsProvided =
			arguments.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
		const {
			primary: text,
			options,
			config: registrationConfig,
			hasOptions,
		} = parseUpdateArguments<
			Parameters<Page["getByLabel"]>[0],
			Parameters<Page["getByLabel"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>(textOrOptionsOrConfig, optionsOrConfig, config, optionsProvided);

		const definition: LocatorUpdate = {
			type: "label",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
		options: Parameters<Page["getByPlaceholder"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
		options?: Parameters<Page["getByPlaceholder"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByPlaceholder(
		options: Parameters<Page["getByPlaceholder"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByPlaceholder(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByPlaceholder(
		textOrOptionsOrConfig?:
			| Parameters<Page["getByPlaceholder"]>[0]
			| Parameters<Page["getByPlaceholder"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		optionsOrConfig?:
			| Parameters<Page["getByPlaceholder"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const optionsProvided =
			arguments.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
		const {
			primary: text,
			options,
			config: registrationConfig,
			hasOptions,
		} = parseUpdateArguments<
			Parameters<Page["getByPlaceholder"]>[0],
			Parameters<Page["getByPlaceholder"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>(textOrOptionsOrConfig, optionsOrConfig, config, optionsProvided);

		const definition: LocatorUpdate = {
			type: "placeholder",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
		options: Parameters<Page["getByAltText"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
		options?: Parameters<Page["getByAltText"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByAltText(
		options: Parameters<Page["getByAltText"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByAltText(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByAltText(
		textOrOptionsOrConfig?:
			| Parameters<Page["getByAltText"]>[0]
			| Parameters<Page["getByAltText"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		optionsOrConfig?:
			| Parameters<Page["getByAltText"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const optionsProvided =
			arguments.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
		const {
			primary: text,
			options,
			config: registrationConfig,
			hasOptions,
		} = parseUpdateArguments<
			Parameters<Page["getByAltText"]>[0],
			Parameters<Page["getByAltText"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>(textOrOptionsOrConfig, optionsOrConfig, config, optionsProvided);

		const definition: LocatorUpdate = {
			type: "altText",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
		options: Parameters<Page["getByTitle"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
		options?: Parameters<Page["getByTitle"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByTitle(
		options: Parameters<Page["getByTitle"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByTitle(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByTitle(
		textOrOptionsOrConfig?:
			| Parameters<Page["getByTitle"]>[0]
			| Parameters<Page["getByTitle"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		optionsOrConfig?:
			| Parameters<Page["getByTitle"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const optionsProvided =
			arguments.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
		const {
			primary: text,
			options,
			config: registrationConfig,
			hasOptions,
		} = parseUpdateArguments<
			Parameters<Page["getByTitle"]>[0],
			Parameters<Page["getByTitle"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>(textOrOptionsOrConfig, optionsOrConfig, config, optionsProvided);

		const definition: LocatorUpdate = {
			type: "title",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	locator(
		selector: Parameters<Page["locator"]>[0],
		options?: Parameters<Page["locator"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	locator(
		selector: Parameters<Page["locator"]>[0],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	locator(
		options: Parameters<Page["locator"]>[1],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	locator(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	locator(
		selectorOrOptionsOrConfig?:
			| Parameters<Page["locator"]>[0]
			| Parameters<Page["locator"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		optionsOrConfig?:
			| Parameters<Page["locator"]>[1]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const optionsProvided =
			arguments.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
		const {
			primary: selector,
			options,
			config: registrationConfig,
			hasOptions,
		} = parseUpdateArguments<
			Parameters<Page["locator"]>[0],
			Parameters<Page["locator"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>(selectorOrOptionsOrConfig, optionsOrConfig, config, optionsProvided);

		const definition: LocatorUpdate = {
			type: "locator",
			...(selector !== undefined ? { selector } : {}),
			...(hasOptions ? { options } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	frameLocator(
		selector: Parameters<Page["frameLocator"]>[0],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	frameLocator(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	frameLocator(
		selectorOrConfig?:
			| Parameters<Page["frameLocator"]>[0]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const isConfigFirst = isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(selectorOrConfig);
		const registrationConfig = (isConfigFirst ? selectorOrConfig : undefined) ?? config;
		const selector = isConfigFirst ? undefined : selectorOrConfig;

		const definition: LocatorUpdate = {
			type: "frameLocator",
			...(selector !== undefined ? { selector } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getByTestId(
		testId: Parameters<Page["getByTestId"]>[0],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByTestId(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByTestId(
		testIdOrConfig?:
			| Parameters<Page["getByTestId"]>[0]
			| LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const isConfigFirst = isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(testIdOrConfig);
		const registrationConfig = (isConfigFirst ? testIdOrConfig : undefined) ?? config;
		const testId = isConfigFirst ? undefined : testIdOrConfig;

		const definition: LocatorUpdate = {
			type: "testId",
			...(testId !== undefined ? { testId } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getById(
		id: string,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getById(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getById(
		idOrConfig?: string | LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const isConfigFirst = isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(idOrConfig);
		const registrationConfig = (isConfigFirst ? idOrConfig : undefined) ?? config;
		const id = isConfigFirst ? undefined : idOrConfig;

		const definition: LocatorUpdate = {
			type: "id",
			...(id !== undefined ? { id } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getByDataCy(
		value: DataCyDefinition["value"],
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByDataCy(
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	getByDataCy(
		valueOrConfig?: DataCyDefinition["value"] | LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		const isConfigFirst = isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(valueOrConfig);
		const registrationConfig = (isConfigFirst ? valueOrConfig : undefined) ?? config;
		const value = isConfigFirst ? undefined : valueOrConfig;

		const definition: LocatorUpdate = {
			type: "dataCy",
			...(value !== undefined ? { value } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	private commit(
		definition: LocatorUpdate,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		return this.parent.applyUpdate(this.subPath, definition, config);
	}
}

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
			const recordSteps = record.steps
				? normalizeSteps<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(record.steps)
				: stepsFromLegacyConfig<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>({
						filters: record.filters,
						index: record.index,
					});
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
		return locator;
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

	applyUpdate<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		updates: LocatorUpdate,
		config?: LocatorRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>,
	) {
		this.ensureSubPath(subPath);
		const current = this.definitions.get(subPath);
		if (!current) {
			throw new Error(`No locator schema registered for sub-path "${subPath}".`);
		}
		const baseline = this.registry.get(subPath as RegistryPath<LocatorSchemaPathType>).definition;
		const merged = mergeLocatorDefinition(current, updates, subPath, baseline);
		this.definitions.set(subPath, merged);

		if (config) {
			const existingSteps = this.steps.get(subPath) ?? [];
			const replaced = replaceStepsWithConfig<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(
				existingSteps,
				config,
			);
			this.steps.set(subPath, replaced);
		}
		return this;
	}

	private async resolve(
		overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		return this.registry.buildLocatorChain(this.path, this.definitions, this.steps, overrides);
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

	private normalizeRecord(record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>) {
		const legacyConfig: LocatorSchemaRecord<
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		> = {} as LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;

		if (record.filters) {
			legacyConfig.filters = record.filters;
		}

		if (record.index !== undefined) {
			legacyConfig.index = record.index;
		}

		const steps = normalizeSteps<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(
			record.steps ??
				stepsFromLegacyConfig<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(
					Object.keys(legacyConfig).length > 0 ? legacyConfig : undefined,
				),
		);

		const extractedFilters = extractFiltersFromSteps<
			RegistryPath<LocatorSchemaPathType>,
			RegistryPath<LocatorSchemaPathType>
		>(steps);
		const extractedIndex = extractIndexFromSteps<
			RegistryPath<LocatorSchemaPathType>,
			RegistryPath<LocatorSchemaPathType>
		>(steps);

		return {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: record.definition,
			steps,
			filters: extractedFilters.length > 0 ? extractedFilters : undefined,
			index: extractedIndex,
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
			const existing = this.schemas.get(path)!;
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
			steps: record.steps ? normalizeSteps(record.steps) : undefined,
			filters: record.filters ? [...record.filters] : undefined,
			index: record.index ?? null,
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
			steps: record.steps ? normalizeSteps(record.steps) : undefined,
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
		const registry = this;
		return function getLocator<Path extends RegistryPath<LocatorSchemaPathType>>(path: Path) {
			return new LocatorThenable<LocatorSchemaPathType, Path>(registry, path);
		};
	}

	/**
	 * Creates a bound accessor that returns a thenable fluent wrapper for nested locator chains.
	 * The wrapper supports filter/nth/update/clearSteps chaining with ordered step replay.
	 */
	createGetNestedLocator() {
		const registry = this;
		return function getNestedLocator<Path extends RegistryPath<LocatorSchemaPathType>>(
			path: Path,
			overrides?: LocatorOverrides<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
		) {
			return new NestedLocatorThenable<LocatorSchemaPathType, Path>(registry, path, overrides);
		};
	}
}

type PublicUpdateBuilder<Builder> = Omit<Builder, keyof Builder & ("commit" | "parent" | "subPath")>;

type UpdateProxy<Builder, Return> = {
	[Key in keyof PublicUpdateBuilder<Builder>]: PublicUpdateBuilder<Builder>[Key] extends (
		...args: infer Args
	) => LocatorQueryBuilder<any, any>
		? (...args: Args) => Return
		: never;
};

const createUpdateProxy = <Builder, Return>(builder: Builder, returnValue: Return) =>
	new Proxy(builder as object, {
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

type NestedOverrides<LocatorSchemaPathType extends string> = LocatorOverrides<
	RegistryPath<LocatorSchemaPathType>,
	RegistryPath<LocatorSchemaPathType>
>;

class NestedLocatorThenable<LocatorSchemaPathType extends string, Path extends RegistryPath<LocatorSchemaPathType>>
	implements PromiseLike<Locator>
{
	private readonly queryBuilder: LocatorQueryBuilder<LocatorSchemaPathType, Path>;
	private readonly overrides?: NestedOverrides<LocatorSchemaPathType>;
	private resolvePromise?: Promise<Locator>;

	constructor(
		registry: LocatorRegistry<LocatorSchemaPathType>,
		private readonly path: Path,
		overrides?: NestedOverrides<LocatorSchemaPathType>,
	) {
		this.queryBuilder = registry.getLocatorSchema(path);
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
		return createUpdateProxy(
			builder as unknown as Record<string, (...args: any[]) => LocatorQueryBuilder<any, any>>,
			this,
		);
	}

	clearSteps<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>>(subPath: SubPath) {
		this.queryBuilder.clearSteps(subPath);
		return this;
	}

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

class LocatorThenable<LocatorSchemaPathType extends string, Path extends RegistryPath<LocatorSchemaPathType>>
	implements PromiseLike<Locator>
{
	private readonly queryBuilder: LocatorQueryBuilder<LocatorSchemaPathType, Path>;
	private resolvePromise?: Promise<Locator>;

	constructor(
		registry: LocatorRegistry<LocatorSchemaPathType>,
		private readonly path: Path,
	) {
		this.queryBuilder = registry.getLocatorSchema(path);
	}

	update() {
		const builder = this.queryBuilder.update(this.path as LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>);
		return createUpdateProxy(
			builder as unknown as Record<string, (...args: any[]) => LocatorQueryBuilder<any, any>>,
			this,
		);
	}

	clearSteps() {
		this.queryBuilder.clearSteps(this.path as LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>);
		return this;
	}

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

export const bindLocatorAccessors = <LocatorSchemaPathType extends string>(
	registry: LocatorRegistry<LocatorSchemaPathType>,
) => {
	const getLocator = registry.createGetLocator();
	const getNestedLocator = registry.createGetNestedLocator();
	const getLocatorSchema = registry.createGetLocatorSchema();
	return { getLocator, getNestedLocator, getLocatorSchema } as const;
};
