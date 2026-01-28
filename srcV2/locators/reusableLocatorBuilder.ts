import type { Page } from "@playwright/test";
import type {
	AltTextDefinition,
	FilterDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorDefinition,
	LocatorDescription,
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
	Type extends LocatorStrategyDefinition["type"] = LocatorStrategyDefinition["type"],
> implements ReusableLocator<LocatorSchemaPathType, AllowedPaths, Type>
{
	private readonly stepsList: LocatorStep<LocatorSchemaPathType, AllowedPaths>[];
	private readonly definitionValue: Extract<LocatorStrategyDefinition, { type: Type }>;
	private descriptionValue?: LocatorDescription;

	readonly type: Type;

	constructor(
		definition: Extract<LocatorStrategyDefinition, { type: Type }>,
		steps: LocatorStep<LocatorSchemaPathType, AllowedPaths>[] = [],
	) {
		this.definitionValue = definition;
		this.type = definition.type;
		this.stepsList = normalizeSteps<LocatorSchemaPathType, AllowedPaths>(steps);
	}

	filter(filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, AllowedPaths>) {
		this.stepsList.push({ kind: "filter", filter });
		return this;
	}

	nth(index: IndexSelector) {
		this.stepsList.push({ kind: "index", index });
		return this;
	}

	describe(description: LocatorDescription) {
		this.descriptionValue = description;
		return this;
	}

	get definition() {
		return this.definitionValue;
	}

	get steps() {
		return normalizeSteps<LocatorSchemaPathType, AllowedPaths>(this.stepsList);
	}

	get description() {
		return this.descriptionValue;
	}
}

export class ReusableLocatorFactory<LocatorSchemaPathType extends string> {
	getByRole(
		role: RoleDefinition["role"],
		options: RoleDefinition["options"],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "role">;
	getByRole(
		role: RoleDefinition["role"],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "role">;
	getByRole(role: RoleDefinition["role"], options?: RoleDefinition["options"]) {
		const definition =
			options !== undefined
				? ({ type: "role", role, options } as RoleDefinition)
				: ({ type: "role", role } as RoleDefinition);

		return this.create(definition);
	}

	getByText(
		text: Parameters<Page["getByText"]>[0],
		options: Parameters<Page["getByText"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "text">;
	getByText(
		text: Parameters<Page["getByText"]>[0],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "text">;
	getByText(text: Parameters<Page["getByText"]>[0], options?: Parameters<Page["getByText"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "text", text, options } as TextDefinition)
				: ({ type: "text", text } as TextDefinition);

		return this.create(definition);
	}

	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
		options: Parameters<Page["getByLabel"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "label">;
	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "label">;
	getByLabel(text: Parameters<Page["getByLabel"]>[0], options?: Parameters<Page["getByLabel"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "label", text, options } as LabelDefinition)
				: ({ type: "label", text } as LabelDefinition);

		return this.create(definition);
	}

	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
		options: Parameters<Page["getByPlaceholder"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "placeholder">;
	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "placeholder">;
	getByPlaceholder(text: Parameters<Page["getByPlaceholder"]>[0], options?: Parameters<Page["getByPlaceholder"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "placeholder", text, options } as PlaceholderDefinition)
				: ({ type: "placeholder", text } as PlaceholderDefinition);

		return this.create(definition);
	}

	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
		options: Parameters<Page["getByAltText"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "altText">;
	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "altText">;
	getByAltText(text: Parameters<Page["getByAltText"]>[0], options?: Parameters<Page["getByAltText"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "altText", text, options } as AltTextDefinition)
				: ({ type: "altText", text } as AltTextDefinition);

		return this.create(definition);
	}

	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
		options: Parameters<Page["getByTitle"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "title">;
	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "title">;
	getByTitle(text: Parameters<Page["getByTitle"]>[0], options?: Parameters<Page["getByTitle"]>[1]) {
		const definition =
			options !== undefined
				? ({ type: "title", text, options } as TitleDefinition)
				: ({ type: "title", text } as TitleDefinition);

		return this.create(definition);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "locator">;
	locator(
		selector: Parameters<Page["locator"]>[0],
	): ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, "locator">;
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

	private create<Type extends LocatorStrategyDefinition["type"]>(
		definition: Extract<LocatorStrategyDefinition, { type: Type }>,
	) {
		return new ReusableLocatorBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, Type>(definition);
	}
}
