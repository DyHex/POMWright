import type { Page } from "@playwright/test";
import type { LocatorRegistryInternal } from "./locatorRegistry";
import type {
	AltTextDefinition,
	FilterDefinition,
	IdDefinition,
	IndexSelector,
	LabelDefinition,
	LocatorDefinition,
	LocatorSchemaRecord,
	LocatorStep,
	LocatorStrategyDefinition,
	LocatorStrategyDefinitionPatch,
	PlaceholderDefinition,
	RegistryPath,
	RoleDefinition,
	TextDefinition,
	TitleDefinition,
} from "./types";
import { applyDefinitionPatch, normalizeIdValue, normalizeSteps } from "./utils";

export type LocatorRegistrationPostDefinitionBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> = {
	filter: (
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) => LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	nth: (index: IndexSelector) => LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
};

export class LocatorRegistrationBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
	Seeded extends boolean = false,
> {
	private steps: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[] = [];
	private definition?: LocatorStrategyDefinition;
	private registered = false;
	private readonly reuseType?: LocatorStrategyDefinition["type"];
	private readonly seededDefinition: boolean;
	private overrideApplied = false;
	private postDefinitionView?: LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;

	constructor(
		private readonly registry: LocatorRegistryInternal<LocatorSchemaPathType>,
		private readonly path: Path,
		seed?: {
			initialDefinition?: LocatorStrategyDefinition;
			initialSteps?: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[];
			reuseType?: LocatorStrategyDefinition["type"];
		},
	) {
		if (seed?.initialSteps) {
			this.steps = normalizeSteps<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(seed.initialSteps);
		}

		if (seed?.initialDefinition) {
			this.definition = seed.initialDefinition;
			this.seededDefinition = true;
		} else {
			this.seededDefinition = false;
		}

		this.reuseType = seed?.reuseType;
	}

	persistSeededDefinition() {
		if (this.seededDefinition && !this.registered) {
			this.persist();
		}
		return this;
	}

	/**
	 * Records a Playwright-style filter on the locator being registered. Filters are applied in the
	 * order they are chained and can include `has`/`hasNot` locator references. Requires that a
	 * locator strategy has already been set for this registration.
	 *
	 * @example
	 * ```ts
	 * registry.add("list.item").locator("li").filter({ hasText: /Row/ });
	 * ```
	 */
	filter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.applyFilter(filter);
		return this.getPostDefinitionView();
	}

	/**
	 * Adds an index selector for the locator being registered. Indices are applied in the order they
	 * are chained and require a locator definition to have been set first.
	 *
	 * @example
	 * ```ts
	 * registry.add("table.rows").locator("tr").nth(0);
	 * ```
	 */
	nth(index: IndexSelector): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.applyIndex(index);
		return this.getPostDefinitionView();
	}

	/**
	 * Uses Playwright `getByRole` semantics to define the locator strategy. Accepts a role and
	 * optional options; when seeded via `{ reuse }`, an options-only call patches the seeded role.
	 *
	 * @example
	 * ```ts
	 * registry.add("nav.home").getByRole("link", { name: "Home" });
	 * ```
	 */
	getByRole(
		role: RoleDefinition["role"],
		options: RoleDefinition["options"],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByRole(role: RoleDefinition["role"]): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByRole(
		options: Seeded extends true ? RoleDefinition["options"] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByRole(roleOrOptions: RoleDefinition["role"] | RoleDefinition["options"], options?: RoleDefinition["options"]) {
		const definition: LocatorStrategyDefinitionPatch =
			typeof roleOrOptions === "string"
				? options !== undefined
					? { type: "role", role: roleOrOptions, options }
					: { type: "role", role: roleOrOptions }
				: { type: "role", options: roleOrOptions };

		return this.commit(definition);
	}

	/**
	 * Uses Playwright `getByText` semantics to define the locator strategy. Accepts string/RegExp
	 * text and optional options; when seeded, an options-only call patches the seeded text.
	 *
	 * @example
	 * ```ts
	 * registry.add("alert.error").getByText(/failed/i);
	 * ```
	 */
	getByText(
		text: string,
		options: Parameters<Page["getByText"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(text: string): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(
		options: Seeded extends true ? Parameters<Page["getByText"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(textOrOptions: string | Parameters<Page["getByText"]>[1], options?: Parameters<Page["getByText"]>[1]) {
		const definition: LocatorStrategyDefinitionPatch =
			typeof textOrOptions === "string" || textOrOptions instanceof RegExp
				? options !== undefined
					? ({ type: "text", text: textOrOptions, options } as TextDefinition)
					: ({ type: "text", text: textOrOptions } as TextDefinition)
				: { type: "text", options: textOrOptions };

		return this.commit(definition);
	}

	/**
	 * Uses Playwright `getByLabel` semantics to define the locator strategy. Accepts label text and
	 * optional options; when seeded, an options-only call patches the seeded text.
	 *
	 * @example
	 * ```ts
	 * registry.add("form.email").getByLabel("Email", { exact: true });
	 * ```
	 */
	getByLabel(
		text: string,
		options: Parameters<Page["getByLabel"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(text: string): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		options: Seeded extends true ? Parameters<Page["getByLabel"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(textOrOptions: string | Parameters<Page["getByLabel"]>[1], options?: Parameters<Page["getByLabel"]>[1]) {
		const definition: LocatorStrategyDefinitionPatch =
			typeof textOrOptions === "string"
				? options !== undefined
					? ({ type: "label", text: textOrOptions, options } as LabelDefinition)
					: ({ type: "label", text: textOrOptions } as LabelDefinition)
				: { type: "label", options: textOrOptions };

		return this.commit(definition);
	}

	/**
	 * Uses Playwright `getByPlaceholder` semantics to define the locator strategy. Accepts placeholder
	 * text and optional options; when seeded, an options-only call patches the seeded text.
	 *
	 * @example
	 * ```ts
	 * registry.add("form.search").getByPlaceholder("Search", { exact: true });
	 * ```
	 */
	getByPlaceholder(
		text: string,
		options: Parameters<Page["getByPlaceholder"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(text: string): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		options: Seeded extends true ? Parameters<Page["getByPlaceholder"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		textOrOptions: string | Parameters<Page["getByPlaceholder"]>[1],
		options?: Parameters<Page["getByPlaceholder"]>[1],
	) {
		const definition: LocatorStrategyDefinitionPatch =
			typeof textOrOptions === "string"
				? options !== undefined
					? ({ type: "placeholder", text: textOrOptions, options } as PlaceholderDefinition)
					: ({ type: "placeholder", text: textOrOptions } as PlaceholderDefinition)
				: { type: "placeholder", options: textOrOptions };

		return this.commit(definition);
	}

	/**
	 * Uses Playwright `getByAltText` semantics to define the locator strategy. Accepts alt text and
	 * optional options; when seeded, an options-only call patches the seeded text.
	 *
	 * @example
	 * ```ts
	 * registry.add("image.logo").getByAltText(/brand/);
	 * ```
	 */
	getByAltText(
		text: string,
		options: Parameters<Page["getByAltText"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(text: string): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		options: Seeded extends true ? Parameters<Page["getByAltText"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		textOrOptions: string | Parameters<Page["getByAltText"]>[1],
		options?: Parameters<Page["getByAltText"]>[1],
	) {
		const definition: LocatorStrategyDefinitionPatch =
			typeof textOrOptions === "string"
				? options !== undefined
					? ({ type: "altText", text: textOrOptions, options } as AltTextDefinition)
					: ({ type: "altText", text: textOrOptions } as AltTextDefinition)
				: { type: "altText", options: textOrOptions };

		return this.commit(definition);
	}

	/**
	 * Uses Playwright `getByTitle` semantics to define the locator strategy. Accepts title text and
	 * optional options; when seeded, an options-only call patches the seeded text.
	 *
	 * @example
	 * ```ts
	 * registry.add("icon.info").getByTitle("Info");
	 * ```
	 */
	getByTitle(
		text: string,
		options: Parameters<Page["getByTitle"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(text: string): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		options: Seeded extends true ? Parameters<Page["getByTitle"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(textOrOptions: string | Parameters<Page["getByTitle"]>[1], options?: Parameters<Page["getByTitle"]>[1]) {
		const definition: LocatorStrategyDefinitionPatch =
			typeof textOrOptions === "string"
				? options !== undefined
					? ({ type: "title", text: textOrOptions, options } as TitleDefinition)
					: ({ type: "title", text: textOrOptions } as TitleDefinition)
				: { type: "title", options: textOrOptions };

		return this.commit(definition);
	}

	/**
	 * Uses Playwright `locator` semantics to define the locator strategy. Accepts a selector and
	 * optional options; when seeded, an options-only call patches the seeded selector by merging
	 * options while inheriting the selector.
	 *
	 * @example
	 * ```ts
	 * registry.add("list.items").locator("ul > li");
	 * ```
	 */
	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Parameters<Page["locator"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	locator(
		selector: Parameters<Page["locator"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	locator(
		options: Seeded extends true ? Parameters<Page["locator"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	locator(
		selectorOrOptions: Parameters<Page["locator"]>[0] | Parameters<Page["locator"]>[1],
		options?: Parameters<Page["locator"]>[1],
	) {
		const definition: LocatorStrategyDefinitionPatch =
			typeof selectorOrOptions === "string"
				? options !== undefined
					? ({ type: "locator", selector: selectorOrOptions, options } as LocatorDefinition)
					: ({ type: "locator", selector: selectorOrOptions } as LocatorDefinition)
				: { type: "locator", options: selectorOrOptions };

		return this.commit(definition);
	}

	/**
	 * Uses Playwright `frameLocator` semantics to define the locator strategy, entering the targeted
	 * frame for subsequent chained locators. When seeded, `selector` may be omitted to retain the
	 * existing selector while overriding options elsewhere.
	 *
	 * @example
	 * ```ts
	 * registry.add("frame.login").frameLocator("iframe.auth");
	 * ```
	 */
	frameLocator(
		selector: Seeded extends true
			? Parameters<Page["frameLocator"]>[0] | undefined
			: Parameters<Page["frameLocator"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		const definition: LocatorStrategyDefinitionPatch = selector
			? { type: "frameLocator", selector }
			: { type: "frameLocator" };
		return this.commit(definition);
	}

	/**
	 * Uses Playwright `getByTestId` semantics to define the locator strategy. When seeded, omitting
	 * the argument inherits the seeded `testId` while allowing options from other overrides.
	 *
	 * @example
	 * ```ts
	 * registry.add("card.title").getByTestId("card-title");
	 * ```
	 */
	getByTestId(
		testId: Seeded extends true ? Parameters<Page["getByTestId"]>[0] | undefined : Parameters<Page["getByTestId"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		const definition: LocatorStrategyDefinitionPatch = testId ? { type: "testId", testId } : { type: "testId" };
		return this.commit(definition);
	}

	/**
	 * Targets elements by `id`, normalizing string or RegExp input. When seeded, the argument can be
	 * omitted to inherit the seeded id.
	 *
	 * @example
	 * ```ts
	 * registry.add("modal.close").getById("close-modal");
	 * ```
	 */
	getById(
		id: Seeded extends true ? string | RegExp | undefined : string | RegExp,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		const definition: LocatorStrategyDefinitionPatch = id
			? { type: "id", id: normalizeIdValue(id) as IdDefinition["id"] }
			: { type: "id" };
		return this.commit(definition);
	}

	private commit(
		definition: LocatorStrategyDefinition | LocatorStrategyDefinitionPatch,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.ensureDefinitionAllowedWithRollback(definition as LocatorStrategyDefinition);
		const mergedDefinition = this.seededDefinition
			? applyDefinitionPatch(this.definition as LocatorStrategyDefinition, definition)
			: (definition as LocatorStrategyDefinition);
		this.definition = mergedDefinition;
		if (this.reuseType && this.seededDefinition) {
			this.overrideApplied = true;
		}
		this.persist();
		return this.getPostDefinitionView();
	}

	private applyFilter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		this.ensureDefinition();
		this.steps.push({ kind: "filter", filter });
		this.persist();
	}

	private applyIndex(index: IndexSelector) {
		this.ensureDefinition();
		this.steps.push({ kind: "index", index });
		this.persist();
	}

	private ensureDefinitionAllowedWithRollback(definition: LocatorStrategyDefinition) {
		if (this.seededDefinition) {
			if (definition.type !== this.reuseType) {
				this.rollbackSeededRegistration();
				throw new Error(
					`The locator definition for "${this.path}" must use the "${this.reuseType}" strategy when reusing a locator.`,
				);
			}

			if (this.overrideApplied) {
				throw new Error(
					`A locator definition for "${this.path}" was already provided from reuse; only one matching override is allowed.`,
				);
			}

			return;
		}

		if (this.definition) {
			throw new Error(
				`A locator definition for "${this.path}" has already been provided; only one locator type can be set for a registration.`,
			);
		}
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

	private rollbackSeededRegistration() {
		if (this.seededDefinition && this.registered) {
			this.registry.unregister(this.path);
			this.registered = false;
		}
	}

	private getPostDefinitionView(): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		if (this.postDefinitionView) {
			return this.postDefinitionView;
		}

		const view: LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> = {
			filter: (filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>) => {
				this.applyFilter(filter);
				return view;
			},
			nth: (index: IndexSelector) => {
				this.applyIndex(index);
				return view;
			},
		};

		this.postDefinitionView = view;
		return view;
	}
}

export type LocatorRegistrationPreDefinitionBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
	Seeded extends boolean = false,
> = LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> &
	Pick<
		LocatorRegistrationBuilder<LocatorSchemaPathType, Path, Seeded>,
		| "getByRole"
		| "getByText"
		| "getByLabel"
		| "getByPlaceholder"
		| "getByAltText"
		| "getByTitle"
		| "locator"
		| "frameLocator"
		| "getByTestId"
		| "getById"
	>;

type LocatorMethodForType<Type extends LocatorStrategyDefinition["type"]> = Type extends "role"
	? "getByRole"
	: Type extends "text"
		? "getByText"
		: Type extends "label"
			? "getByLabel"
			: Type extends "placeholder"
				? "getByPlaceholder"
				: Type extends "altText"
					? "getByAltText"
					: Type extends "title"
						? "getByTitle"
						: Type extends "locator"
							? "locator"
							: Type extends "frameLocator"
								? "frameLocator"
								: Type extends "testId"
									? "getByTestId"
									: Type extends "id"
										? "getById"
										: never;

export type LocatorRegistrationSeededBuilderForType<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
	SeededType extends LocatorStrategyDefinition["type"],
> = LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> &
	Pick<LocatorRegistrationBuilder<LocatorSchemaPathType, Path, true>, LocatorMethodForType<SeededType>>;
