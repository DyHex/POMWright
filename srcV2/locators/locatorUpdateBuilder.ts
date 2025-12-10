import type { Page } from "@playwright/test";
import type { LocatorQueryBuilder } from "./locatorQueryBuilder";
import type {
	DataCyDefinition,
	LocatorChainPaths,
	LocatorRegistrationConfig,
	LocatorStep,
	LocatorStrategyDefinition,
	LocatorUpdate,
	RegistryPath,
	RoleDefinition,
} from "./types";
import { isRegistrationConfig, normalizeFilters, normalizeIdValue, splitOptionsAndConfig } from "./utils";

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

type UpdateArgsWithOptions<Primary, Options, LocatorSchemaPathType extends string, AllowedPaths extends string> =
	| []
	| [LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>]
	| [Primary]
	| [Options]
	| [Primary, Options]
	| [Primary, LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>]
	| [Options, LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>]
	| [Primary, Options, LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>];

type UpdateArgsWithoutOptions<Primary, LocatorSchemaPathType extends string, AllowedPaths extends string> =
	| []
	| [LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>]
	| [Primary]
	| [Primary, LocatorRegistrationConfig<LocatorSchemaPathType, AllowedPaths>];

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
				? ({ type: "text", text, options } as LocatorStrategyDefinition)
				: ({ type: "text", text } as LocatorStrategyDefinition);
		}
		case "label": {
			const textSource = source("label");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "label" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "label", text, options } as LocatorStrategyDefinition)
				: ({ type: "label", text } as LocatorStrategyDefinition);
		}
		case "placeholder": {
			const textSource = source("placeholder");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "placeholder" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "placeholder", text, options } as LocatorStrategyDefinition)
				: ({ type: "placeholder", text } as LocatorStrategyDefinition);
		}
		case "altText": {
			const textSource = source("altText");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "altText" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "altText", text, options } as LocatorStrategyDefinition)
				: ({ type: "altText", text } as LocatorStrategyDefinition);
		}
		case "title": {
			const textSource = source("title");
			const text = updates.text ?? textSource?.text;
			if (text === undefined) {
				throw new Error(`Locator update for "${path}" of type "title" requires a "text" value.`);
			}
			const options = mergeOptions(textSource?.options, updates);
			return options !== undefined
				? ({ type: "title", text, options } as LocatorStrategyDefinition)
				: ({ type: "title", text } as LocatorStrategyDefinition);
		}
		case "locator": {
			const selectorSource = source("locator");
			const selector = updates.selector ?? selectorSource?.selector;
			if (selector === undefined) {
				throw new Error(`Locator update for "${path}" of type "locator" requires a "selector" value.`);
			}
			const options = mergeOptions(selectorSource?.options, updates);
			return options !== undefined
				? ({ type: "locator", selector, options } as LocatorStrategyDefinition)
				: ({ type: "locator", selector } as LocatorStrategyDefinition);
		}
		case "frameLocator": {
			const selectorSource = source("frameLocator");
			const selector = updates.selector ?? selectorSource?.selector;
			if (selector === undefined) {
				throw new Error(`Locator update for "${path}" of type "frameLocator" requires a "selector" value.`);
			}
			return { type: "frameLocator", selector } as LocatorStrategyDefinition;
		}
		case "testId": {
			const testIdSource = source("testId");
			const testId = updates.testId ?? testIdSource?.testId;
			if (testId === undefined) {
				throw new Error(`Locator update for "${path}" of type "testId" requires a "testId" value.`);
			}
			return { type: "testId", testId } as LocatorStrategyDefinition;
		}
		case "id": {
			const idSource = source("id");
			const rawId = updates.id ?? idSource?.id;
			const id = normalizeIdValue(rawId);
			if (id === undefined) {
				throw new Error(`Locator update for "${path}" of type "id" requires an "id" value.`);
			}
			return { type: "id", id } as LocatorStrategyDefinition;
		}
		case "dataCy": {
			const valueSource = source("dataCy");
			const value = updates.value ?? valueSource?.value;
			if (value === undefined) {
				throw new Error(`Locator update for "${path}" of type "dataCy" requires a "value" value.`);
			}
			return { type: "dataCy", value } as LocatorStrategyDefinition;
		}
		default: {
			const exhaustive: never = updates;
			return exhaustive;
		}
	}
};
export const replaceStepsWithConfig = <LocatorSchemaPathType extends string, AllowedPaths extends string>(
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

export class LocatorUpdateBuilder<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
	SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>,
> {
	constructor(
		private readonly parent: LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>,
		private readonly subPath: SubPath,
	) {}

	getByRole(
		...args: UpdateArgsWithOptions<
			RoleDefinition["role"],
			RoleDefinition["options"],
			LocatorSchemaPathType,
			LocatorSubstring
		>
	) {
		const [roleOrOptionsOrConfig, optionsOrConfig, config] = args;
		const optionsProvided =
			args.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
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
		...args: UpdateArgsWithOptions<
			Parameters<Page["getByText"]>[0],
			Parameters<Page["getByText"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>
	) {
		const [textOrOptionsOrConfig, optionsOrConfig, config] = args;
		const optionsProvided =
			args.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
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
		...args: UpdateArgsWithOptions<
			Parameters<Page["getByLabel"]>[0],
			Parameters<Page["getByLabel"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>
	) {
		const [textOrOptionsOrConfig, optionsOrConfig, config] = args;
		const optionsProvided =
			args.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
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
		...args: UpdateArgsWithOptions<
			Parameters<Page["getByPlaceholder"]>[0],
			Parameters<Page["getByPlaceholder"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>
	) {
		const [textOrOptionsOrConfig, optionsOrConfig, config] = args;
		const optionsProvided =
			args.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
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
		...args: UpdateArgsWithOptions<
			Parameters<Page["getByAltText"]>[0],
			Parameters<Page["getByAltText"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>
	) {
		const [textOrOptionsOrConfig, optionsOrConfig, config] = args;
		const optionsProvided =
			args.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
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
		...args: UpdateArgsWithOptions<
			Parameters<Page["getByTitle"]>[0],
			Parameters<Page["getByTitle"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>
	) {
		const [textOrOptionsOrConfig, optionsOrConfig, config] = args;
		const optionsProvided =
			args.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
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
		...args: UpdateArgsWithOptions<
			Parameters<Page["locator"]>[0],
			Parameters<Page["locator"]>[1],
			LocatorSchemaPathType,
			LocatorSubstring
		>
	) {
		const [selectorOrOptionsOrConfig, optionsOrConfig, config] = args;
		const optionsProvided =
			args.length >= 2 && !isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(optionsOrConfig);
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
		...args: UpdateArgsWithoutOptions<Parameters<Page["frameLocator"]>[0], LocatorSchemaPathType, LocatorSubstring>
	) {
		const [selectorOrConfig, config] = args;
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
		...args: UpdateArgsWithoutOptions<Parameters<Page["getByTestId"]>[0], LocatorSchemaPathType, LocatorSubstring>
	) {
		const [testIdOrConfig, config] = args;
		const isConfigFirst = isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(testIdOrConfig);
		const registrationConfig = (isConfigFirst ? testIdOrConfig : undefined) ?? config;
		const testId = isConfigFirst ? undefined : testIdOrConfig;

		const definition: LocatorUpdate = {
			type: "testId",
			...(testId !== undefined ? { testId } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getById(...args: UpdateArgsWithoutOptions<string | RegExp, LocatorSchemaPathType, LocatorSubstring>) {
		const [idOrConfig, config] = args;
		const isConfigFirst = isRegistrationConfig<LocatorSchemaPathType, LocatorSubstring>(idOrConfig);
		const registrationConfig = (isConfigFirst ? idOrConfig : undefined) ?? config;
		const id = isConfigFirst ? undefined : normalizeIdValue(idOrConfig);

		const definition: LocatorUpdate = {
			type: "id",
			...(id !== undefined ? { id } : {}),
		};

		return this.commit(definition, registrationConfig);
	}

	getByDataCy(...args: UpdateArgsWithoutOptions<DataCyDefinition["value"], LocatorSchemaPathType, LocatorSubstring>) {
		const [valueOrConfig, config] = args;
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

export { mergeLocatorDefinition };
