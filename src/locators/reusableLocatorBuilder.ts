import type { Page } from "@playwright/test";
import type {
	AltTextDefinition,
	FilterDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorDefinition,
	LocatorDefinitionByType,
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
import {
	assertDescription,
	assertIdValue,
	assertPrimaryValue,
	cloneLocatorStrategyDefinition,
	copyFilter,
	normalizeSteps,
} from "./utils";

export class ReusableLocatorBuilder<
	LocatorSchemaPathType extends string,
	Type extends LocatorStrategyDefinition["type"] = LocatorStrategyDefinition["type"],
> implements ReusableLocator<LocatorSchemaPathType, Type>
{
	private readonly stepsList: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[];
	private readonly definitionValue: LocatorDefinitionByType[Type];
	private descriptionValue?: LocatorDescription;

	readonly type: Type;

	constructor(
		definition: LocatorDefinitionByType[Type],
		steps: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[] = [],
	) {
		// a copy: the seed keeps no options object the caller still holds
		this.definitionValue = cloneLocatorStrategyDefinition(definition) as LocatorDefinitionByType[Type];
		this.type = definition.type as Type;
		this.stepsList = normalizeSteps<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(steps);
	}

	filter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	): ReusableLocator<LocatorSchemaPathType, Type> {
		this.stepsList.push({ kind: "filter", filter: copyFilter(filter) });
		return this;
	}

	nth(index: IndexSelector): ReusableLocator<LocatorSchemaPathType, Type> {
		this.stepsList.push({ kind: "index", index });
		return this;
	}

	describe(description: LocatorDescription): ReusableLocator<LocatorSchemaPathType, Type> {
		assertDescription(description, { method: "createReusable.describe" });
		this.descriptionValue = description;
		return this;
	}

	get definition() {
		return this.definitionValue;
	}

	get steps() {
		return normalizeSteps<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(this.stepsList);
	}

	get description() {
		return this.descriptionValue;
	}
}

export class ReusableLocatorFactory<LocatorSchemaPathType extends string> {
	getByRole(
		role: RoleDefinition["role"],
		options: RoleDefinition["options"],
	): ReusableLocator<LocatorSchemaPathType, "role">;
	getByRole(role: RoleDefinition["role"]): ReusableLocator<LocatorSchemaPathType, "role">;
	getByRole(role: RoleDefinition["role"], options?: RoleDefinition["options"]) {
		assertPrimaryValue(role, { method: "createReusable.getByRole", field: "role", allowEmpty: false });
		const definition =
			options !== undefined
				? ({ type: "role", role, options } as RoleDefinition)
				: ({ type: "role", role } as RoleDefinition);

		return this.create(definition);
	}

	getByText(
		text: Parameters<Page["getByText"]>[0],
		options: Parameters<Page["getByText"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "text">;
	getByText(text: Parameters<Page["getByText"]>[0]): ReusableLocator<LocatorSchemaPathType, "text">;
	getByText(text: Parameters<Page["getByText"]>[0], options?: Parameters<Page["getByText"]>[1]) {
		assertPrimaryValue(text, { method: "createReusable.getByText", field: "text", allowEmpty: true });
		const definition =
			options !== undefined
				? ({ type: "text", text, options } as TextDefinition)
				: ({ type: "text", text } as TextDefinition);

		return this.create(definition);
	}

	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
		options: Parameters<Page["getByLabel"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "label">;
	getByLabel(text: Parameters<Page["getByLabel"]>[0]): ReusableLocator<LocatorSchemaPathType, "label">;
	getByLabel(text: Parameters<Page["getByLabel"]>[0], options?: Parameters<Page["getByLabel"]>[1]) {
		assertPrimaryValue(text, { method: "createReusable.getByLabel", field: "text", allowEmpty: true });
		const definition =
			options !== undefined
				? ({ type: "label", text, options } as LabelDefinition)
				: ({ type: "label", text } as LabelDefinition);

		return this.create(definition);
	}

	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
		options: Parameters<Page["getByPlaceholder"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "placeholder">;
	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
	): ReusableLocator<LocatorSchemaPathType, "placeholder">;
	getByPlaceholder(text: Parameters<Page["getByPlaceholder"]>[0], options?: Parameters<Page["getByPlaceholder"]>[1]) {
		assertPrimaryValue(text, { method: "createReusable.getByPlaceholder", field: "text", allowEmpty: true });
		const definition =
			options !== undefined
				? ({ type: "placeholder", text, options } as PlaceholderDefinition)
				: ({ type: "placeholder", text } as PlaceholderDefinition);

		return this.create(definition);
	}

	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
		options: Parameters<Page["getByAltText"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "altText">;
	getByAltText(text: Parameters<Page["getByAltText"]>[0]): ReusableLocator<LocatorSchemaPathType, "altText">;
	getByAltText(text: Parameters<Page["getByAltText"]>[0], options?: Parameters<Page["getByAltText"]>[1]) {
		assertPrimaryValue(text, { method: "createReusable.getByAltText", field: "text", allowEmpty: true });
		const definition =
			options !== undefined
				? ({ type: "altText", text, options } as AltTextDefinition)
				: ({ type: "altText", text } as AltTextDefinition);

		return this.create(definition);
	}

	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
		options: Parameters<Page["getByTitle"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "title">;
	getByTitle(text: Parameters<Page["getByTitle"]>[0]): ReusableLocator<LocatorSchemaPathType, "title">;
	getByTitle(text: Parameters<Page["getByTitle"]>[0], options?: Parameters<Page["getByTitle"]>[1]) {
		assertPrimaryValue(text, { method: "createReusable.getByTitle", field: "text", allowEmpty: true });
		const definition =
			options !== undefined
				? ({ type: "title", text, options } as TitleDefinition)
				: ({ type: "title", text } as TitleDefinition);

		return this.create(definition);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "locator">;
	locator(selector: Parameters<Page["locator"]>[0]): ReusableLocator<LocatorSchemaPathType, "locator">;
	locator(selector: Parameters<Page["locator"]>[0], options?: Parameters<Page["locator"]>[1]) {
		assertPrimaryValue(selector, { method: "createReusable.locator", field: "selector", allowEmpty: false });
		const definition =
			options !== undefined
				? ({ type: "locator", selector, options } as LocatorDefinition)
				: ({ type: "locator", selector } as LocatorDefinition);

		return this.create(definition);
	}

	/**
	 * Seeds a frame segment. The selector is required: the any-frame form of `add(path).frameLocator()`
	 * has no element and no steps, so there is nothing a seed could carry.
	 */
	frameLocator(selector: Parameters<Page["locator"]>[0]): ReusableLocator<LocatorSchemaPathType, "frameLocator"> {
		assertPrimaryValue(selector, { method: "createReusable.frameLocator", field: "selector", allowEmpty: false });
		return this.create({ type: "frameLocator", selector });
	}

	getByTestId(testId: Parameters<Page["getByTestId"]>[0]): ReusableLocator<LocatorSchemaPathType, "testId"> {
		assertPrimaryValue(testId, { method: "createReusable.getByTestId", field: "testId", allowEmpty: true });
		return this.create({ type: "testId", testId });
	}

	/**
	 * Seeds an `id` locator. The value is stored verbatim: strings match the `id` attribute exactly,
	 * RegExps are evaluated as patterns with their flags. An empty string throws.
	 */
	getById(id: string | RegExp): ReusableLocator<LocatorSchemaPathType, "id"> {
		assertIdValue(id, { method: "createReusable.getById" });
		return this.create({ type: "id", id });
	}

	private create<Definition extends LocatorStrategyDefinition>(
		definition: Definition,
	): ReusableLocator<LocatorSchemaPathType, Definition["type"]> {
		return new ReusableLocatorBuilder<LocatorSchemaPathType, Definition["type"]>(
			definition as unknown as LocatorDefinitionByType[Definition["type"]],
		);
	}
}
