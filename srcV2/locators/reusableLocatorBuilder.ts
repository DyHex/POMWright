import type { Page } from "@playwright/test";
import type {
	AltTextDefinition,
	DataCyDefinition,
	FilterDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorDefinition,
	LocatorStep,
	LocatorStrategyDefinition,
	PlaceholderDefinition,
	RegistryPath,
	ReusableLocator,
	RoleDefinition,
	TextDefinition,
	TitleDefinition,
} from "./types";
import { normalizeIdValue, normalizeSteps } from "./utils";

export class ReusableLocatorBuilder<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = RegistryPath<LocatorSchemaPathType>,
> implements ReusableLocator<LocatorSchemaPathType, AllowedPaths>
{
	private readonly stepsList: LocatorStep<LocatorSchemaPathType, AllowedPaths>[] = [];
	private readonly definitionValue: LocatorStrategyDefinition;

	readonly type: LocatorStrategyDefinition["type"];

	constructor(definition: LocatorStrategyDefinition) {
		this.definitionValue = definition;
		this.type = definition.type;
	}

	filter(filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, AllowedPaths>) {
		this.stepsList.push({ kind: "filter", filter });
		return this;
	}

	nth(index: IndexSelector) {
		this.stepsList.push({ kind: "index", index });
		return this;
	}

	get definition() {
		return this.definitionValue;
	}

	get steps() {
		return normalizeSteps<LocatorSchemaPathType, AllowedPaths>(this.stepsList);
	}
}

export class ReusableLocatorFactory<LocatorSchemaPathType extends string> {
	getByRole(
		role: RoleDefinition["role"],
		options: RoleDefinition["options"],
	): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByRole(role: RoleDefinition["role"]): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByRole(role: RoleDefinition["role"], options?: RoleDefinition["options"]) {
		const definition =
			options !== undefined
				? ({ type: "role", role, options } as RoleDefinition)
				: ({ type: "role", role } as RoleDefinition);

		return this.create(definition);
	}

	getByText(text: string, options: Parameters<Page["getByText"]>[1]): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByText(text: string): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByText(text: string, options?: Parameters<Page["getByText"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "text", text, options } as TextDefinition)
				: ({ type: "text", text } as TextDefinition);

		return this.create(definition);
	}

	getByLabel(text: string, options: Parameters<Page["getByLabel"]>[1]): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByLabel(text: string): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByLabel(text: string, options?: Parameters<Page["getByLabel"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "label", text, options } as LabelDefinition)
				: ({ type: "label", text } as LabelDefinition);

		return this.create(definition);
	}

	getByPlaceholder(
		text: string,
		options: Parameters<Page["getByPlaceholder"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByPlaceholder(text: string): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByPlaceholder(text: string, options?: Parameters<Page["getByPlaceholder"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "placeholder", text, options } as PlaceholderDefinition)
				: ({ type: "placeholder", text } as PlaceholderDefinition);

		return this.create(definition);
	}

	getByAltText(
		text: string,
		options: Parameters<Page["getByAltText"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByAltText(text: string): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByAltText(text: string, options?: Parameters<Page["getByAltText"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "altText", text, options } as AltTextDefinition)
				: ({ type: "altText", text } as AltTextDefinition);

		return this.create(definition);
	}

	getByTitle(text: string, options: Parameters<Page["getByTitle"]>[1]): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByTitle(text: string): ReusableLocatorBuilder<LocatorSchemaPathType>;
	getByTitle(text: string, options?: Parameters<Page["getByTitle"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "title", text, options } as TitleDefinition)
				: ({ type: "title", text } as TitleDefinition);

		return this.create(definition);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType>;
	locator(selector: Parameters<Page["locator"]>[0]): ReusableLocatorBuilder<LocatorSchemaPathType>;
	locator(selector: Parameters<Page["locator"]>[0], options?: Parameters<Page["locator"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "locator", selector, options } as LocatorDefinition)
				: ({ type: "locator", selector } as LocatorDefinition);

		return this.create(definition);
	}

	frameLocator(selector: Parameters<Page["frameLocator"]>[0]) {
		return this.create({ type: "frameLocator", selector });
	}

	getByTestId(testId: Parameters<Page["getByTestId"]>[0]) {
		return this.create({ type: "testId", testId });
	}

	getById(id: string | RegExp) {
		return this.create({ type: "id", id: normalizeIdValue(id) as IdDefinition["id"] });
	}

	getByDataCy(value: DataCyDefinition["value"]) {
		return this.create({ type: "dataCy", value });
	}

	private create(definition: LocatorStrategyDefinition) {
		return new ReusableLocatorBuilder<LocatorSchemaPathType>(definition);
	}
}
