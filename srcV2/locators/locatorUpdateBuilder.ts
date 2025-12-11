import type { Page } from "@playwright/test";
import type { LocatorQueryBuilder } from "./locatorQueryBuilder";
import type {
	DataCyDefinition,
	LocatorChainPaths,
	LocatorStrategyDefinition,
	LocatorUpdate,
	RegistryPath,
	RoleDefinition,
} from "./types";
import { normalizeIdValue } from "./utils";

const parseUpdateArguments = <Primary, OptionsType>(
	primaryOrOptions?: Primary | OptionsType,
	options?: OptionsType,
	optionsProvided?: boolean,
) => {
	let primary: Primary | undefined;
	let parsedOptions: OptionsType | undefined;
	let hasOptions = optionsProvided ?? false;

	if (options !== undefined) {
		parsedOptions = options;
		hasOptions = true;
	}

	if (primaryOrOptions !== undefined) {
		const treatAsOptions =
			!hasOptions &&
			options === undefined &&
			typeof primaryOrOptions === "object" &&
			!(primaryOrOptions instanceof RegExp);

		if (treatAsOptions) {
			parsedOptions = primaryOrOptions as OptionsType;
			hasOptions = true;
		} else {
			primary = primaryOrOptions as Primary;
		}
	}

	return { primary, options: parsedOptions, hasOptions };
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

type UpdateArgsWithOptions<Primary, Options> = [] | [Primary] | [Options] | [Primary, Options];

type UpdateArgsWithoutOptions<Primary> = [] | [Primary];

const mergeLocatorDefinition = (
	current: LocatorStrategyDefinition,
	updates: LocatorUpdate,
	path: string,
	preferredSource?: LocatorStrategyDefinition,
	baseline?: LocatorStrategyDefinition,
): LocatorStrategyDefinition => {
	if (!updates || typeof updates !== "object" || !("type" in updates)) {
		throw new Error(`Locator update for "${path}" requires a "type" property.`);
	}

	const source = <TType extends LocatorStrategyDefinition["type"]>(targetType: TType) => {
		if (current.type === targetType) {
			return current as Extract<LocatorStrategyDefinition, { type: TType }>;
		}
		if (preferredSource?.type === targetType) {
			return preferredSource as Extract<LocatorStrategyDefinition, { type: TType }>;
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
export class LocatorUpdateBuilder<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
	SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>,
> {
	constructor(
		private readonly parent: LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>,
		private readonly subPath: SubPath,
	) {}

	getByRole(...args: UpdateArgsWithOptions<RoleDefinition["role"], RoleDefinition["options"]>) {
		const [roleOrOptions, options] = args;
		const {
			primary: role,
			options: parsedOptions,
			hasOptions,
		} = parseUpdateArguments<RoleDefinition["role"], RoleDefinition["options"]>(
			roleOrOptions,
			options,
			args.length >= 2,
		);

		const definition: LocatorUpdate = {
			type: "role",
			...(role !== undefined ? { role } : {}),
			...(hasOptions ? { options: parsedOptions } : {}),
		};

		return this.commit(definition);
	}

	getByText(...args: UpdateArgsWithOptions<Parameters<Page["getByText"]>[0], Parameters<Page["getByText"]>[1]>) {
		const [textOrOptions, options] = args;
		const {
			primary: text,
			options: parsedOptions,
			hasOptions,
		} = parseUpdateArguments<Parameters<Page["getByText"]>[0], Parameters<Page["getByText"]>[1]>(
			textOrOptions,
			options,
			args.length >= 2,
		);

		const definition: LocatorUpdate = {
			type: "text",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options: parsedOptions } : {}),
		};

		return this.commit(definition);
	}

	getByLabel(...args: UpdateArgsWithOptions<Parameters<Page["getByLabel"]>[0], Parameters<Page["getByLabel"]>[1]>) {
		const [textOrOptions, options] = args;
		const {
			primary: text,
			options: parsedOptions,
			hasOptions,
		} = parseUpdateArguments<Parameters<Page["getByLabel"]>[0], Parameters<Page["getByLabel"]>[1]>(
			textOrOptions,
			options,
			args.length >= 2,
		);

		const definition: LocatorUpdate = {
			type: "label",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options: parsedOptions } : {}),
		};

		return this.commit(definition);
	}

	getByPlaceholder(
		...args: UpdateArgsWithOptions<Parameters<Page["getByPlaceholder"]>[0], Parameters<Page["getByPlaceholder"]>[1]>
	) {
		const [textOrOptions, options] = args;
		const {
			primary: text,
			options: parsedOptions,
			hasOptions,
		} = parseUpdateArguments<Parameters<Page["getByPlaceholder"]>[0], Parameters<Page["getByPlaceholder"]>[1]>(
			textOrOptions,
			options,
			args.length >= 2,
		);

		const definition: LocatorUpdate = {
			type: "placeholder",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options: parsedOptions } : {}),
		};

		return this.commit(definition);
	}

	getByAltText(
		...args: UpdateArgsWithOptions<Parameters<Page["getByAltText"]>[0], Parameters<Page["getByAltText"]>[1]>
	) {
		const [textOrOptions, options] = args;
		const {
			primary: text,
			options: parsedOptions,
			hasOptions,
		} = parseUpdateArguments<Parameters<Page["getByAltText"]>[0], Parameters<Page["getByAltText"]>[1]>(
			textOrOptions,
			options,
			args.length >= 2,
		);

		const definition: LocatorUpdate = {
			type: "altText",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options: parsedOptions } : {}),
		};

		return this.commit(definition);
	}

	getByTitle(...args: UpdateArgsWithOptions<Parameters<Page["getByTitle"]>[0], Parameters<Page["getByTitle"]>[1]>) {
		const [textOrOptions, options] = args;
		const {
			primary: text,
			options: parsedOptions,
			hasOptions,
		} = parseUpdateArguments<Parameters<Page["getByTitle"]>[0], Parameters<Page["getByTitle"]>[1]>(
			textOrOptions,
			options,
			args.length >= 2,
		);

		const definition: LocatorUpdate = {
			type: "title",
			...(text !== undefined ? { text } : {}),
			...(hasOptions ? { options: parsedOptions } : {}),
		};

		return this.commit(definition);
	}

	locator(...args: UpdateArgsWithOptions<Parameters<Page["locator"]>[0], Parameters<Page["locator"]>[1]>) {
		const [selectorOrOptions, options] = args;
		const {
			primary: selector,
			options: parsedOptions,
			hasOptions,
		} = parseUpdateArguments<Parameters<Page["locator"]>[0], Parameters<Page["locator"]>[1]>(
			selectorOrOptions,
			options,
			args.length >= 2,
		);

		const definition: LocatorUpdate = {
			type: "locator",
			...(selector !== undefined ? { selector } : {}),
			...(hasOptions ? { options: parsedOptions } : {}),
		};

		return this.commit(definition);
	}

	frameLocator(...args: UpdateArgsWithoutOptions<Parameters<Page["frameLocator"]>[0]>) {
		const [selector] = args;

		const definition: LocatorUpdate = {
			type: "frameLocator",
			...(selector !== undefined ? { selector } : {}),
		};

		return this.commit(definition);
	}

	getByTestId(...args: UpdateArgsWithoutOptions<Parameters<Page["getByTestId"]>[0]>) {
		const [testId] = args;

		const definition: LocatorUpdate = {
			type: "testId",
			...(testId !== undefined ? { testId } : {}),
		};

		return this.commit(definition);
	}

	getById(...args: UpdateArgsWithoutOptions<string | RegExp>) {
		const [idValue] = args;
		const id = idValue !== undefined ? normalizeIdValue(idValue) : undefined;

		const definition: LocatorUpdate = {
			type: "id",
			...(id !== undefined ? { id } : {}),
		};

		return this.commit(definition);
	}

	getByDataCy(...args: UpdateArgsWithoutOptions<DataCyDefinition["value"]>) {
		const [value] = args;

		const definition: LocatorUpdate = {
			type: "dataCy",
			...(value !== undefined ? { value } : {}),
		};

		return this.commit(definition);
	}

	private commit(definition: LocatorUpdate) {
		return this.parent.applyUpdate(this.subPath, definition);
	}
}

export { mergeLocatorDefinition };
