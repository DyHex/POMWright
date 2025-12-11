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
	LocatorSchemaRecord,
	LocatorStep,
	LocatorStrategyDefinition,
	PlaceholderDefinition,
	RegistryPath,
	RoleDefinition,
	TextDefinition,
	TitleDefinition,
} from "./types";
import { normalizeIdValue, normalizeSteps } from "./utils";

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
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByRole(role: RoleDefinition["role"]): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByRole(role: RoleDefinition["role"], options?: RoleDefinition["options"]) {
		const definition =
			options !== undefined
				? ({ type: "role", role, options } as RoleDefinition)
				: ({ type: "role", role } as RoleDefinition);

		return this.commit(definition);
	}

	getByText(
		text: string,
		options: Parameters<Page["getByText"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByText(text: string): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByText(text: string, options?: Parameters<Page["getByText"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "text", text, options } as TextDefinition)
				: ({ type: "text", text } as TextDefinition);

		return this.commit(definition);
	}

	getByLabel(
		text: string,
		options: Parameters<Page["getByLabel"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByLabel(text: string): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByLabel(text: string, options?: Parameters<Page["getByLabel"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "label", text, options } as LabelDefinition)
				: ({ type: "label", text } as LabelDefinition);

		return this.commit(definition);
	}

	getByPlaceholder(
		text: string,
		options: Parameters<Page["getByPlaceholder"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(text: string): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(text: string, options?: Parameters<Page["getByPlaceholder"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "placeholder", text, options } as PlaceholderDefinition)
				: ({ type: "placeholder", text } as PlaceholderDefinition);

		return this.commit(definition);
	}

	getByAltText(
		text: string,
		options: Parameters<Page["getByAltText"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByAltText(text: string): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByAltText(text: string, options?: Parameters<Page["getByAltText"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "altText", text, options } as AltTextDefinition)
				: ({ type: "altText", text } as AltTextDefinition);

		return this.commit(definition);
	}

	getByTitle(
		text: string,
		options: Parameters<Page["getByTitle"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByTitle(text: string): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	getByTitle(text: string, options?: Parameters<Page["getByTitle"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "title", text, options } as TitleDefinition)
				: ({ type: "title", text } as TitleDefinition);

		return this.commit(definition);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
	): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	locator(selector: Parameters<Page["locator"]>[0]): LocatorRegistrationBuilder<LocatorSchemaPathType, Path>;
	locator(selector: Parameters<Page["locator"]>[0], options?: Parameters<Page["locator"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "locator", selector, options } as LocatorDefinition)
				: ({ type: "locator", selector } as LocatorDefinition);

		return this.commit(definition);
	}

	frameLocator(selector: Parameters<Page["frameLocator"]>[0]) {
		return this.commit({ type: "frameLocator", selector });
	}

	getByTestId(testId: Parameters<Page["getByTestId"]>[0]) {
		return this.commit({ type: "testId", testId });
	}

	getById(id: string | RegExp) {
		return this.commit({ type: "id", id: normalizeIdValue(id) as IdDefinition["id"] });
	}

	getByDataCy(value: DataCyDefinition["value"]) {
		return this.commit({ type: "dataCy", value });
	}

	private commit(definition: LocatorStrategyDefinition) {
		this.definition = definition;
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
