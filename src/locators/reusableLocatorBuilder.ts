import type { Page } from "@playwright/test";
import type {
	FilterDefinition,
	IndexSelector,
	LocatorDefinitionByType,
	LocatorDescription,
	LocatorStep,
	LocatorStrategyDefinition,
	RegistryPath,
	ReusableLocator,
	RoleDefinition,
} from "./types";
import {
	assembleDefinition,
	assertDescription,
	assertStrategyPrimary,
	cloneLocatorStrategyDefinition,
	copyFilter,
	normalizeSteps,
	STRATEGIES,
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
		return this.create("role", role, options);
	}

	getByText(
		text: Parameters<Page["getByText"]>[0],
		options: Parameters<Page["getByText"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "text">;
	getByText(text: Parameters<Page["getByText"]>[0]): ReusableLocator<LocatorSchemaPathType, "text">;
	getByText(text: Parameters<Page["getByText"]>[0], options?: Parameters<Page["getByText"]>[1]) {
		return this.create("text", text, options);
	}

	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
		options: Parameters<Page["getByLabel"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "label">;
	getByLabel(text: Parameters<Page["getByLabel"]>[0]): ReusableLocator<LocatorSchemaPathType, "label">;
	getByLabel(text: Parameters<Page["getByLabel"]>[0], options?: Parameters<Page["getByLabel"]>[1]) {
		return this.create("label", text, options);
	}

	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
		options: Parameters<Page["getByPlaceholder"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "placeholder">;
	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
	): ReusableLocator<LocatorSchemaPathType, "placeholder">;
	getByPlaceholder(text: Parameters<Page["getByPlaceholder"]>[0], options?: Parameters<Page["getByPlaceholder"]>[1]) {
		return this.create("placeholder", text, options);
	}

	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
		options: Parameters<Page["getByAltText"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "altText">;
	getByAltText(text: Parameters<Page["getByAltText"]>[0]): ReusableLocator<LocatorSchemaPathType, "altText">;
	getByAltText(text: Parameters<Page["getByAltText"]>[0], options?: Parameters<Page["getByAltText"]>[1]) {
		return this.create("altText", text, options);
	}

	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
		options: Parameters<Page["getByTitle"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "title">;
	getByTitle(text: Parameters<Page["getByTitle"]>[0]): ReusableLocator<LocatorSchemaPathType, "title">;
	getByTitle(text: Parameters<Page["getByTitle"]>[0], options?: Parameters<Page["getByTitle"]>[1]) {
		return this.create("title", text, options);
	}

	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "locator">;
	locator(selector: Parameters<Page["locator"]>[0]): ReusableLocator<LocatorSchemaPathType, "locator">;
	locator(selector: Parameters<Page["locator"]>[0], options?: Parameters<Page["locator"]>[1]) {
		return this.create("locator", selector, options);
	}

	/**
	 * Seeds a frame segment. The selector is required: the any-frame form of `add(path).frameLocator()`
	 * has no element and no steps, so there is nothing a seed could carry.
	 */
	frameLocator(selector: Parameters<Page["locator"]>[0]): ReusableLocator<LocatorSchemaPathType, "frameLocator"> {
		return this.create("frameLocator", selector);
	}

	getByTestId(testId: Parameters<Page["getByTestId"]>[0]): ReusableLocator<LocatorSchemaPathType, "testId"> {
		return this.create("testId", testId);
	}

	/**
	 * Seeds an `id` locator. The value is stored verbatim: strings match the `id` attribute exactly,
	 * RegExps are evaluated as patterns with their flags. An empty string throws.
	 */
	getById(id: string | RegExp): ReusableLocator<LocatorSchemaPathType, "id"> {
		return this.create("id", id);
	}

	private create<Type extends LocatorStrategyDefinition["type"]>(
		type: Type,
		primary: unknown,
		options?: object,
	): ReusableLocator<LocatorSchemaPathType, Type> {
		assertStrategyPrimary(type, primary, { method: `createReusable.${STRATEGIES[type].method}` });
		return new ReusableLocatorBuilder<LocatorSchemaPathType, Type>(
			assembleDefinition(type, primary, options) as unknown as LocatorDefinitionByType[Type],
		);
	}
}
