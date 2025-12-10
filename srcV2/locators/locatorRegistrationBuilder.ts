import type { Page } from "@playwright/test";
import type { LocatorRegistry } from "./locatorRegistry";
import type {
	AltTextDefinition,
	DataCyDefinition,
	FilterDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorDefinition,
	LocatorRegistrationConfig,
	LocatorSchemaRecord,
	LocatorStep,
	LocatorStrategyDefinition,
	PlaceholderDefinition,
	RegistryPath,
	RoleDefinition,
	TextDefinition,
	TitleDefinition,
} from "./types";
import { normalizeIdValue, normalizeSteps, splitOptionsAndConfig, stepsFromLegacyConfig } from "./utils";

type RegistrationConfig<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> = LocatorRegistrationConfig<Path, RegistryPath<LocatorSchemaPathType>>;

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

	getById(id: string | RegExp, config?: RegistrationConfig<LocatorSchemaPathType, Path>) {
		return this.commit({ type: "id", id: normalizeIdValue(id) as IdDefinition["id"] }, config);
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
