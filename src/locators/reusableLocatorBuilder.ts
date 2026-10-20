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
	private readonly descriptionValue?: LocatorDescription;

	readonly type: Type;

	constructor(
		definition: LocatorDefinitionByType[Type],
		steps: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[] = [],
		description?: LocatorDescription,
	) {
		// a copy: the seed keeps no options object the caller still holds
		this.definitionValue = cloneLocatorStrategyDefinition(definition) as LocatorDefinitionByType[Type];
		this.type = definition.type as Type;
		this.stepsList = normalizeSteps<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(steps);
		this.descriptionValue = description;
	}

	/** A new seed with the filter added; this one is unchanged, as a Playwright `Locator` is by `filter`. */
	filter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	): ReusableLocator<LocatorSchemaPathType, Type> {
		return this.with([...this.stepsList, { kind: "filter", filter: copyFilter(filter) }], this.descriptionValue);
	}

	/** A new seed with the index added; this one is unchanged. */
	nth(index: IndexSelector): ReusableLocator<LocatorSchemaPathType, Type> {
		return this.with([...this.stepsList, { kind: "index", index }], this.descriptionValue);
	}

	/** A new seed with the description; this one is unchanged. */
	describe(description: LocatorDescription): ReusableLocator<LocatorSchemaPathType, Type> {
		assertDescription(description, { method: "createReusable.describe" });
		return this.with(this.stepsList, description);
	}

	get definition() {
		return cloneLocatorStrategyDefinition(this.definitionValue) as LocatorDefinitionByType[Type];
	}

	get steps() {
		return normalizeSteps<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(this.stepsList);
	}

	get description() {
		return this.descriptionValue;
	}

	private with(
		steps: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[],
		description: LocatorDescription | undefined,
	): ReusableLocator<LocatorSchemaPathType, Type> {
		return new ReusableLocatorBuilder<LocatorSchemaPathType, Type>(this.definitionValue, steps, description);
	}
}

export class ReusableLocatorFactory<LocatorSchemaPathType extends string> {
	/**
	 * Makes a seed whose locator is Playwright's `page.getByRole()`. Returns a seed: register it with `add(path, { reuse:
	 * seed })`, and derive others with its `filter`, `nth` and `describe`.
	 *
	 * @param role The ARIA role.
	 * @param options Playwright's `getByRole` options, such as `name` and `level`.
	 * @returns A seed.
	 * @throws When the role is missing (`createReusable.getByRole requires a role value.`) or empty
	 * (`createReusable.getByRole requires a non-empty role.`).
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.getByRole("heading", { level: 2 });
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
	getByRole(
		role: RoleDefinition["role"],
		options: RoleDefinition["options"],
	): ReusableLocator<LocatorSchemaPathType, "role">;
	getByRole(role: RoleDefinition["role"]): ReusableLocator<LocatorSchemaPathType, "role">;
	getByRole(role: RoleDefinition["role"], options?: RoleDefinition["options"]) {
		return this.create("role", role, options);
	}

	/**
	 * Makes a seed whose locator is Playwright's `page.getByText()`. Returns a seed: register it with `add(path, { reuse:
	 * seed })`, and derive others with its `filter`, `nth` and `describe`.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's `getByText` options (`exact`).
	 * @returns A seed.
	 * @throws When the text is missing: `createReusable.getByText requires a text value.`
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.getByText(/Total/);
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
	getByText(
		text: Parameters<Page["getByText"]>[0],
		options: Parameters<Page["getByText"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "text">;
	getByText(text: Parameters<Page["getByText"]>[0]): ReusableLocator<LocatorSchemaPathType, "text">;
	getByText(text: Parameters<Page["getByText"]>[0], options?: Parameters<Page["getByText"]>[1]) {
		return this.create("text", text, options);
	}

	/**
	 * Makes a seed whose locator is Playwright's `page.getByLabel()`. Returns a seed: register it with `add(path, {
	 * reuse: seed })`, and derive others with its `filter`, `nth` and `describe`.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's `getByLabel` options (`exact`).
	 * @returns A seed.
	 * @throws When the text is missing: `createReusable.getByLabel requires a text value.`
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.getByLabel("Quantity");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
		options: Parameters<Page["getByLabel"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "label">;
	getByLabel(text: Parameters<Page["getByLabel"]>[0]): ReusableLocator<LocatorSchemaPathType, "label">;
	getByLabel(text: Parameters<Page["getByLabel"]>[0], options?: Parameters<Page["getByLabel"]>[1]) {
		return this.create("label", text, options);
	}

	/**
	 * Makes a seed whose locator is Playwright's `page.getByPlaceholder()`. Returns a seed: register it with `add(path, {
	 * reuse: seed })`, and derive others with its `filter`, `nth` and `describe`.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's `getByPlaceholder` options (`exact`).
	 * @returns A seed.
	 * @throws When the text is missing: `createReusable.getByPlaceholder requires a text value.`
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.getByPlaceholder("Search");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
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

	/**
	 * Makes a seed whose locator is Playwright's `page.getByAltText()`. Returns a seed: register it with `add(path, {
	 * reuse: seed })`, and derive others with its `filter`, `nth` and `describe`.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's `getByAltText` options (`exact`).
	 * @returns A seed.
	 * @throws When the text is missing: `createReusable.getByAltText requires a text value.`
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.getByAltText("Product photo");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
		options: Parameters<Page["getByAltText"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "altText">;
	getByAltText(text: Parameters<Page["getByAltText"]>[0]): ReusableLocator<LocatorSchemaPathType, "altText">;
	getByAltText(text: Parameters<Page["getByAltText"]>[0], options?: Parameters<Page["getByAltText"]>[1]) {
		return this.create("altText", text, options);
	}

	/**
	 * Makes a seed whose locator is Playwright's `page.getByTitle()`. Returns a seed: register it with `add(path, {
	 * reuse: seed })`, and derive others with its `filter`, `nth` and `describe`.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's `getByTitle` options (`exact`).
	 * @returns A seed.
	 * @throws When the text is missing: `createReusable.getByTitle requires a text value.`
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.getByTitle("Remove");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
		options: Parameters<Page["getByTitle"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "title">;
	getByTitle(text: Parameters<Page["getByTitle"]>[0]): ReusableLocator<LocatorSchemaPathType, "title">;
	getByTitle(text: Parameters<Page["getByTitle"]>[0], options?: Parameters<Page["getByTitle"]>[1]) {
		return this.create("title", text, options);
	}

	/**
	 * Makes a seed whose locator is Playwright's `page.locator()`. Returns a seed: register it with `add(path, { reuse:
	 * seed })`, and derive others with its `filter`, `nth` and `describe`.
	 *
	 * @param selector A selector; an empty one is rejected.
	 * @param options Playwright's `locator` options, such as `hasText`.
	 * @returns A seed.
	 * @throws When the selector is missing (`createReusable.locator requires a selector value.`) or empty
	 * (`createReusable.locator requires a non-empty selector.`).
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.locator("tr");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
	): ReusableLocator<LocatorSchemaPathType, "locator">;
	locator(selector: Parameters<Page["locator"]>[0]): ReusableLocator<LocatorSchemaPathType, "locator">;
	locator(selector: Parameters<Page["locator"]>[0], options?: Parameters<Page["locator"]>[1]) {
		return this.create("locator", selector, options);
	}

	/**
	 * Makes a seed of a frame segment: the `<iframe>` element whose descendants resolve inside the frame. The selector is
	 * required: the any-frame `add(path).frameLocator()` takes no steps, so a seed could carry nothing for it.
	 *
	 * @param selector The `<iframe>` element's selector; an empty one is rejected.
	 * @returns A seed.
	 * @throws When the selector is missing (`createReusable.frameLocator requires a selector value.`) or empty
	 * (`createReusable.frameLocator requires a non-empty selector.`).
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.frameLocator("iframe.checkout");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
	frameLocator(selector: Parameters<Page["locator"]>[0]): ReusableLocator<LocatorSchemaPathType, "frameLocator"> {
		return this.create("frameLocator", selector);
	}

	/**
	 * Makes a seed whose locator is Playwright's `page.getByTestId()`. Returns a seed: register it with `add(path, {
	 * reuse: seed })`, and derive others with its `filter`, `nth` and `describe`. An empty string is a value Playwright
	 * matches and is kept.
	 *
	 * @param testId The test id: a string or a RegExp.
	 * @returns A seed.
	 * @throws When the test id is missing: `createReusable.getByTestId requires a testId value.`
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.getByTestId("order-row");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
	 */
	getByTestId(testId: Parameters<Page["getByTestId"]>[0]): ReusableLocator<LocatorSchemaPathType, "testId"> {
		return this.create("testId", testId);
	}

	/**
	 * Makes a seed of an `id` locator: a string matches the `id` attribute exactly, a RegExp is tested against each
	 * element's id with its flags. Returns a seed: register it with `add(path, { reuse: seed })`, and derive others with
	 * its `filter`, `nth` and `describe`.
	 *
	 * @param id A string or a RegExp; an empty string is rejected.
	 * @returns A seed.
	 * @throws When the id is missing or empty: `createReusable.getById requires a non-empty id.`
	 *
	 * @example
	 * ```ts
	 * registry.createReusable.getById(/^order-\d+$/);
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-reusablelocator/#createreusable
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
