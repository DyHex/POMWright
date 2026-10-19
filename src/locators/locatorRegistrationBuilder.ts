import type { Page } from "@playwright/test";
import type { LocatorRegistryInternal } from "./locatorRegistry";
import { parseUpdateArguments } from "./locatorUpdateBuilder";
import type {
	FilterDefinition,
	IndexSelector,
	LocatorDescription,
	LocatorSchemaRecord,
	LocatorStep,
	LocatorStrategyDefinition,
	LocatorStrategyDefinitionPatch,
	OptionsPatch,
	RegistryPath,
	RoleDefinition,
} from "./types";
import {
	anyFrameStepsMessage,
	applyDefinitionPatch,
	assertDescription,
	assertStrategyPrimary,
	cloneLocatorStrategyDefinition,
	copyFilter,
	isAnyFrameDefinition,
	normalizeSteps,
	STRATEGIES,
	type StrategyMethod,
} from "./utils";

export type LocatorRegistrationPostDefinitionBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> = {
	/**
	 * Adds a `locator.filter()` step after the steps before it: Playwright's filter options, where `has` and `hasNot`
	 * also take a registered path, resolved to that path's own locator without its ancestors.
	 *
	 * @param filter `hasText`, `hasNotText`, `has`, `hasNot` and `visible`, as Playwright's `locator.filter()` takes
	 * them.
	 * @returns The registration, for more steps.
	 * @throws On a `frameLocator()` without a selector, which has no element:
	 * `filter() cannot apply to "…": frameLocator() without a selector has no element to filter, index or describe; …`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `filter() cannot apply to "…": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list.item").getByRole("listitem").filter({ hasText: "Open" });
	 * registry.add("main.section@orders").locator("section").filter({ has: "main.section.heading@orders" });
	 * ```
	 */
	filter: (
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) => LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	/**
	 * Adds an index step after the steps before it: `"first"` and `"last"` become Playwright's `first()` and `last()`, a
	 * number goes to `nth()` as given (`-1` is the last element).
	 *
	 * @param index A number, `"first"` or `"last"`.
	 * @returns The registration, for more steps.
	 * @throws On a `frameLocator()` without a selector, which has no element.
	 * @throws After the registration has ended, at the next call on the registry:
	 * `nth() cannot apply to "…": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list.item@first").getByRole("listitem").nth("first");
	 * ```
	 */
	nth: (index: IndexSelector) => LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	/**
	 * Sets the description Playwright shows for the resolved locator in the trace viewer and the HTML report, instead of
	 * the path; `""` removes it, so the locator shows as its chain. It applies where this path is resolved, not where it
	 * is an ancestor.
	 *
	 * @param description A string; `""` removes the description.
	 * @returns The registration, for more steps.
	 * @throws When the description is not a string (from JavaScript):
	 * `describe requires a string for "…"; pass "" to remove the description.`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `describe() cannot apply to "…": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.button@save").getByRole("button", { name: "Save" }).describe("Save button");
	 * ```
	 */
	describe: (description: LocatorDescription) => LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
};

type StrategyType = LocatorStrategyDefinition["type"];
/** The strategies whose first argument is a text: getByText, getByLabel, getByPlaceholder, getByAltText, getByTitle. */
type TextLikeType = {
	[Type in StrategyType]: (typeof STRATEGIES)[Type]["primary"] extends "text" ? Type : never;
}[StrategyType];
type OptionsType = "role" | "locator" | TextLikeType;
type TextLikeOptions = Parameters<Page["getByText"]>[1];

const strategyMethods = Object.values(STRATEGIES).map((spec) => spec.method);
const STRATEGY_METHODS = `${strategyMethods.slice(0, -1).join(", ")} or ${strategyMethods.at(-1)}`;

export class LocatorRegistrationBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
	Seeded extends boolean = false,
> {
	private steps: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[] = [];
	private definition?: LocatorStrategyDefinition;
	private description?: LocatorDescription;
	private registered = false;
	private readonly reuseType?: LocatorStrategyDefinition["type"];
	private readonly seededDefinition: boolean;
	private overrideApplied = false;
	private postDefinitionView?: LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	private ended = false;

	/** Called by the registry at its next call: from then on every method of this registration throws. */
	end(): void {
		this.ended = true;
	}

	/** Checked first by every method, so a registration kept in a variable cannot change its path once it has ended. */
	private ensureOpen(method: string): void {
		if (this.ended) {
			throw new Error(
				`${method}() cannot apply to "${this.path}": its registration has ended; give a registration all its steps in its add(…) chain, or query the path for one use.`,
			);
		}
	}

	constructor(
		private readonly registry: LocatorRegistryInternal<LocatorSchemaPathType>,
		private readonly path: Path,
		seed?: {
			initialDefinition?: LocatorStrategyDefinition;
			initialSteps?: LocatorStep<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>[];
			reuseType?: LocatorStrategyDefinition["type"];
			initialDescription?: LocatorDescription;
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
		this.description = seed?.initialDescription;
	}

	/** What a reuse by path returns: the seed is registered, then `filter`, `nth` and `describe` apply to it. */
	viewAfterReuse(): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		return this.getPostDefinitionView();
	}

	persistSeededDefinition() {
		// the any-frame form takes no steps and no description, wherever its definition comes from
		if (this.definition && isAnyFrameDefinition(this.definition)) {
			if (this.steps.length > 0 || this.description !== undefined) {
				throw new Error(anyFrameStepsMessage("reuse", this.path));
			}
		}
		if (this.seededDefinition && !this.registered) {
			this.persist();
		}
		return this;
	}

	/**
	 * Adds a `locator.filter()` step after the steps before it: Playwright's filter options, where `has` and `hasNot`
	 * also take a registered path, resolved to that path's own locator without its ancestors.
	 *
	 * @param filter `hasText`, `hasNotText`, `has`, `hasNot` and `visible`, as Playwright's `locator.filter()` takes
	 * them.
	 * @returns The registration, for more steps.
	 * @throws On a `frameLocator()` without a selector, which has no element:
	 * `filter() cannot apply to "…": frameLocator() without a selector has no element to filter, index or describe; …`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `filter() cannot apply to "…": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list.item").getByRole("listitem").filter({ hasText: "Open" });
	 * registry.add("main.section@orders").locator("section").filter({ has: "main.section.heading@orders" });
	 * ```
	 */
	filter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.applyFilter(filter);
		return this.getPostDefinitionView();
	}

	/**
	 * Adds an index step after the steps before it: `"first"` and `"last"` become Playwright's `first()` and `last()`, a
	 * number goes to `nth()` as given (`-1` is the last element).
	 *
	 * @param index A number, `"first"` or `"last"`.
	 * @returns The registration, for more steps.
	 * @throws On a `frameLocator()` without a selector, which has no element.
	 * @throws After the registration has ended, at the next call on the registry:
	 * `nth() cannot apply to "…": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list.item@first").getByRole("listitem").nth("first");
	 * ```
	 */
	nth(index: IndexSelector): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.applyIndex(index);
		return this.getPostDefinitionView();
	}

	/**
	 * Sets the description Playwright shows for the resolved locator in the trace viewer and the HTML report, instead of
	 * the path; `""` removes it, so the locator shows as its chain. It applies where this path is resolved, not where it
	 * is an ancestor.
	 *
	 * @param description A string; `""` removes the description.
	 * @returns The registration, for more steps.
	 * @throws When the description is not a string (from JavaScript):
	 * `describe requires a string for "…"; pass "" to remove the description.`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `describe() cannot apply to "…": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.button@save").getByRole("button", { name: "Save" }).describe("Save button");
	 * ```
	 */
	describe(description: LocatorDescription): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.applyDescription(description);
		return this.getPostDefinitionView();
	}

	/**
	 * Registers the path's locator as Playwright's `page.getByRole()` does: by ARIA role, accessible name and state.
	 * An empty role is rejected; which strings are roles is Playwright's own type.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given first argument replaces the seed's, the options merge key by key, a `null` key deletes one, a lone
	 * `null` clears them, and no argument keeps the seed as it is.
	 *
	 * @param role The ARIA role, as Playwright's type lists them.
	 * @param options Playwright's `getByRole` options, such as `name`, `exact` and `level`.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the role is missing (`getByRole requires a role value for "main.button@save".`) or empty
	 * (`getByRole requires a non-empty role for "main.button@save".`).
	 * @throws After the registration has ended, at the next call on the registry:
	 * `getByRole() cannot apply to "main.button@save": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.button@save").getByRole("button", { name: "Save" });
	 * ```
	 */
	getByRole(
		role: RoleDefinition["role"],
		options: Seeded extends true
			? OptionsPatch<RoleDefinition["options"]> | null | undefined
			: RoleDefinition["options"],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByRole(role: RoleDefinition["role"]): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByRole(
		options: Seeded extends true ? OptionsPatch<RoleDefinition["options"]> | null : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByRole(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByRole(
		roleOrOptions?: RoleDefinition["role"] | RoleDefinition["options"] | OptionsPatch<RoleDefinition["options"]> | null,
		options?: RoleDefinition["options"] | OptionsPatch<RoleDefinition["options"]> | null,
	) {
		this.ensureOpen("getByRole");
		if (this.seededDefinition) {
			return this.commitSeededOverride("role", "getByRole", roleOrOptions, options);
		}
		const role = typeof roleOrOptions === "string" ? roleOrOptions : undefined;
		const resolvedOptions = (typeof roleOrOptions === "string" ? options : roleOrOptions) as RoleDefinition["options"];
		assertStrategyPrimary("role", role, { method: "getByRole", path: this.path });
		return this.commit(
			resolvedOptions !== undefined ? { type: "role", role, options: resolvedOptions } : { type: "role", role },
		);
	}

	/**
	 * Registers the path's locator as Playwright's `page.getByText()` does: by the text an element contains.
	 * An empty string is a value Playwright matches and is stored as given.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given first argument replaces the seed's, the options merge key by key, a `null` key deletes one, a lone
	 * `null` clears them, and no argument keeps the seed as it is.
	 *
	 * @param text The text: a string, matched as a case-insensitive substring unless `exact: true`, or a RegExp.
	 * @param options Playwright's `getByText` options: `exact`.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the text is missing: `getByText requires a text value for "main.alert@error".`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `getByText() cannot apply to "main.alert@error": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.alert@error").getByText(/failed/i);
	 * ```
	 */
	getByText(
		text: Parameters<Page["getByText"]>[0],
		options: Seeded extends true
			? OptionsPatch<Parameters<Page["getByText"]>[1]> | null | undefined
			: Parameters<Page["getByText"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(
		text: Parameters<Page["getByText"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(
		options: Seeded extends true ? OptionsPatch<Parameters<Page["getByText"]>[1]> | null : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(
		textOrOptions?:
			| Parameters<Page["getByText"]>[0]
			| Parameters<Page["getByText"]>[1]
			| OptionsPatch<Parameters<Page["getByText"]>[1]>
			| null,
		options?: Parameters<Page["getByText"]>[1] | OptionsPatch<Parameters<Page["getByText"]>[1]> | null,
	) {
		return this.commitTextLike("text", "getByText", textOrOptions, options);
	}

	/**
	 * Registers the path's locator as Playwright's `page.getByLabel()` does: an input by its `<label>`, `aria-labelledby`
	 * or `aria-label`. An empty string is a value Playwright matches and is stored as given.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given first argument replaces the seed's, the options merge key by key, a `null` key deletes one, a lone
	 * `null` clears them, and no argument keeps the seed as it is.
	 *
	 * @param text The label text: a string or a RegExp.
	 * @param options Playwright's `getByLabel` options: `exact`.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the text is missing: `getByLabel requires a text value for "main.form.input@email".`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `getByLabel() cannot apply to "main.form.input@email": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.form.input@email").getByLabel("Email", { exact: true });
	 * ```
	 */
	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
		options: Seeded extends true
			? OptionsPatch<Parameters<Page["getByLabel"]>[1]> | null | undefined
			: Parameters<Page["getByLabel"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		options: Seeded extends true ? OptionsPatch<Parameters<Page["getByLabel"]>[1]> | null : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		textOrOptions?:
			| Parameters<Page["getByLabel"]>[0]
			| Parameters<Page["getByLabel"]>[1]
			| OptionsPatch<Parameters<Page["getByLabel"]>[1]>
			| null,
		options?: Parameters<Page["getByLabel"]>[1] | OptionsPatch<Parameters<Page["getByLabel"]>[1]> | null,
	) {
		return this.commitTextLike("label", "getByLabel", textOrOptions, options);
	}

	/**
	 * Registers the path's locator as Playwright's `page.getByPlaceholder()` does: an input by its placeholder.
	 * An empty string is a value Playwright matches and is stored as given.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given first argument replaces the seed's, the options merge key by key, a `null` key deletes one, a lone
	 * `null` clears them, and no argument keeps the seed as it is.
	 *
	 * @param text The placeholder text: a string or a RegExp.
	 * @param options Playwright's `getByPlaceholder` options: `exact`.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the text is missing: `getByPlaceholder requires a text value for "main.input@search".`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `getByPlaceholder() cannot apply to "main.input@search": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.input@search").getByPlaceholder("Search");
	 * ```
	 */
	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
		options: Seeded extends true
			? OptionsPatch<Parameters<Page["getByPlaceholder"]>[1]> | null | undefined
			: Parameters<Page["getByPlaceholder"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		options: Seeded extends true ? OptionsPatch<Parameters<Page["getByPlaceholder"]>[1]> | null : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		textOrOptions?:
			| Parameters<Page["getByPlaceholder"]>[0]
			| Parameters<Page["getByPlaceholder"]>[1]
			| OptionsPatch<Parameters<Page["getByPlaceholder"]>[1]>
			| null,
		options?: Parameters<Page["getByPlaceholder"]>[1] | OptionsPatch<Parameters<Page["getByPlaceholder"]>[1]> | null,
	) {
		return this.commitTextLike("placeholder", "getByPlaceholder", textOrOptions, options);
	}

	/**
	 * Registers the path's locator as Playwright's `page.getByAltText()` does: an element, usually an image, by its alt
	 * text. An empty string is a value Playwright matches and is stored as given.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given first argument replaces the seed's, the options merge key by key, a `null` key deletes one, a lone
	 * `null` clears them, and no argument keeps the seed as it is.
	 *
	 * @param text The alt text: a string or a RegExp.
	 * @param options Playwright's `getByAltText` options: `exact`.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the text is missing: `getByAltText requires a text value for "header.image@logo".`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `getByAltText() cannot apply to "header.image@logo": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("header.image@logo").getByAltText("Shop logo");
	 * ```
	 */
	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
		options: Seeded extends true
			? OptionsPatch<Parameters<Page["getByAltText"]>[1]> | null | undefined
			: Parameters<Page["getByAltText"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		options: Seeded extends true ? OptionsPatch<Parameters<Page["getByAltText"]>[1]> | null : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		textOrOptions?:
			| Parameters<Page["getByAltText"]>[0]
			| Parameters<Page["getByAltText"]>[1]
			| OptionsPatch<Parameters<Page["getByAltText"]>[1]>
			| null,
		options?: Parameters<Page["getByAltText"]>[1] | OptionsPatch<Parameters<Page["getByAltText"]>[1]> | null,
	) {
		return this.commitTextLike("altText", "getByAltText", textOrOptions, options);
	}

	/**
	 * Registers the path's locator as Playwright's `page.getByTitle()` does: an element by its `title` attribute.
	 * An empty string is a value Playwright matches and is stored as given.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given first argument replaces the seed's, the options merge key by key, a `null` key deletes one, a lone
	 * `null` clears them, and no argument keeps the seed as it is.
	 *
	 * @param text The title text: a string or a RegExp.
	 * @param options Playwright's `getByTitle` options: `exact`.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the text is missing: `getByTitle requires a text value for "main.icon@info".`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `getByTitle() cannot apply to "main.icon@info": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.icon@info").getByTitle("More information");
	 * ```
	 */
	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
		options: Seeded extends true
			? OptionsPatch<Parameters<Page["getByTitle"]>[1]> | null | undefined
			: Parameters<Page["getByTitle"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		options: Seeded extends true ? OptionsPatch<Parameters<Page["getByTitle"]>[1]> | null : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		textOrOptions?:
			| Parameters<Page["getByTitle"]>[0]
			| Parameters<Page["getByTitle"]>[1]
			| OptionsPatch<Parameters<Page["getByTitle"]>[1]>
			| null,
		options?: Parameters<Page["getByTitle"]>[1] | OptionsPatch<Parameters<Page["getByTitle"]>[1]> | null,
	) {
		return this.commitTextLike("title", "getByTitle", textOrOptions, options);
	}

	/**
	 * Registers the path's locator as Playwright's `page.locator()` does: by a CSS or other Playwright selector.
	 * An empty selector is rejected: Playwright cannot parse it.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given first argument replaces the seed's, the options merge key by key, a `null` key deletes one, a lone
	 * `null` clears them, and no argument keeps the seed as it is.
	 *
	 * @param selector A CSS or other Playwright selector.
	 * @param options Playwright's `locator` options, such as `hasText` and `has`.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the selector is missing (`locator requires a selector value for "main.list".`) or empty
	 * (`locator requires a non-empty selector for "main.list".`).
	 * @throws After the registration has ended, at the next call on the registry:
	 * `locator() cannot apply to "main.list": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list").locator("ul.orders");
	 * ```
	 */
	locator(
		selector: Parameters<Page["locator"]>[0],
		options: Seeded extends true
			? OptionsPatch<Parameters<Page["locator"]>[1]> | null | undefined
			: Parameters<Page["locator"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	locator(
		selector: Parameters<Page["locator"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	locator(
		options: Seeded extends true ? OptionsPatch<Parameters<Page["locator"]>[1]> | null : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	locator(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	locator(
		selectorOrOptions?:
			| Parameters<Page["locator"]>[0]
			| Parameters<Page["locator"]>[1]
			| OptionsPatch<Parameters<Page["locator"]>[1]>
			| null,
		options?: Parameters<Page["locator"]>[1] | OptionsPatch<Parameters<Page["locator"]>[1]> | null,
	) {
		this.ensureOpen("locator");
		if (this.seededDefinition) {
			return this.commitSeededOverride("locator", "locator", selectorOrOptions, options);
		}
		const selector = typeof selectorOrOptions === "string" ? selectorOrOptions : undefined;
		const resolvedOptions = (typeof selectorOrOptions === "string" ? options : selectorOrOptions) as Parameters<
			Page["locator"]
		>[1];
		assertStrategyPrimary("locator", selector, { method: "locator", path: this.path });
		return this.commit(
			resolvedOptions !== undefined
				? { type: "locator", selector, options: resolvedOptions }
				: { type: "locator", selector },
		);
	}

	/**
	 * Registers a frame segment. With a selector, the segment is the `<iframe>` element, `locator(selector)` with any
	 * steps, and the paths below it resolve inside the frame through `contentFrame()`; as the last segment of a path it
	 * resolves to the element. Without a selector it is Playwright's any-frame `page.frameLocator()`: the paths below it
	 * resolve in whichever single frame holds them, the main frame included. The any-frame form must be the first segment
	 * of its chain, takes no steps, cannot be resolved on its own, and returns nothing to chain.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given argument replaces the seed's, and no argument keeps the seed as it is.
	 *
	 * @param selector The `<iframe>` element's selector; without it, the any-frame form.
	 * @returns The registration, for `filter`, `nth` and `describe` steps; nothing for the any-frame form.
	 * @throws When the selector is empty: `frameLocator requires a non-empty selector for "shell.frame".`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `frameLocator() cannot apply to "shell.frame": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("shell.frame@payment").frameLocator("iframe#payment");
	 * registry.add("shell.frame@payment.button@pay").getByRole("button", { name: "Pay" });
	 * registry.add("consent").frameLocator();
	 * registry.add("consent.button@accept").getByRole("button", { name: "Accept" });
	 * ```
	 */
	frameLocator(): Seeded extends true
		? LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>
		: undefined;
	frameLocator(
		selector: Seeded extends true ? Parameters<Page["locator"]>[0] | undefined : Parameters<Page["locator"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	frameLocator(
		selector?: Parameters<Page["locator"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> | undefined {
		this.ensureOpen("frameLocator");
		if (selector === undefined) {
			if (this.seededDefinition) {
				return this.commit({ type: "frameLocator" });
			}
			const definition: LocatorStrategyDefinition = { type: "frameLocator" };
			this.ensureDefinitionAllowed(definition);
			this.definition = definition;
			this.persist();
			return undefined;
		}
		assertStrategyPrimary("frameLocator", selector, { method: "frameLocator", path: this.path });
		return this.commit({ type: "frameLocator", selector });
	}

	/**
	 * Registers the path's locator as Playwright's `page.getByTestId()` does: by the attribute the project's
	 * `testIdAttribute` names. An empty string is a value Playwright matches (`data-testid=""`) and is stored as given.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given argument replaces the seed's, and no argument keeps the seed as it is.
	 *
	 * @param testId The test id: a string or a RegExp.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the test id is missing (from JavaScript): `getByTestId requires a testId value for "main.row@order".`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `getByTestId() cannot apply to "main.row@order": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.row@order").getByTestId("order-row");
	 * ```
	 */
	getByTestId(
		testId: Seeded extends true ? Parameters<Page["getByTestId"]>[0] | undefined : Parameters<Page["getByTestId"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTestId(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTestId(
		testId?: Parameters<Page["getByTestId"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.ensureOpen("getByTestId");
		if (testId === undefined && this.seededDefinition) {
			return this.commit({ type: "testId" });
		}
		assertStrategyPrimary("testId", testId, { method: "getByTestId", path: this.path });
		return this.commit({ type: "testId", testId });
	}

	/**
	 * Registers a locator by the `id` attribute, which Playwright has no method for. A string matches the id exactly and
	 * case-sensitively, as `[id="…"]`, so ids with `.`, `:`, `[`, spaces or quotes work as written; there is no `#` or
	 * `id=` prefix. A RegExp is tested against each element's id with its flags; an unanchored pattern matches part of
	 * the id, so anchor it with `^` and `$` to match all of it.
	 *
	 * When the path was added with a seed (`{ reuse: seed }`), this call is optional and patches the seed as `update()`
	 * patches: a given argument replaces the seed's, and no argument keeps the seed as it is.
	 *
	 * @param id The id as written, or a pattern.
	 * @returns The registration, for `filter`, `nth` and `describe` steps.
	 * @throws When the id is empty or missing: `getById requires a non-empty id for "main.panel@settings".`
	 * @throws After the registration has ended, at the next call on the registry:
	 * `getById() cannot apply to "main.panel@settings": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.panel@settings").getById("settings.panel");
	 * registry.add("main.button@submit").getById(/^button\.submit\.[a-z0-9]{4}$/i);
	 * ```
	 */
	getById(
		id: Seeded extends true ? string | RegExp | undefined : string | RegExp,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getById(
		...inherit: Seeded extends true ? [] : [never]
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getById(id?: string | RegExp): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.ensureOpen("getById");
		if (id === undefined && this.seededDefinition) {
			return this.commit({ type: "id" });
		}
		assertStrategyPrimary("id", id, { method: "getById", path: this.path });
		return this.commit({ type: "id", id });
	}

	private commitTextLike(type: TextLikeType, method: string, textOrOptions: unknown, options: unknown) {
		this.ensureOpen(method);
		if (this.seededDefinition) {
			return this.commitSeededOverride(type, method, textOrOptions, options);
		}
		const text = typeof textOrOptions === "string" || textOrOptions instanceof RegExp ? textOrOptions : undefined;
		const resolvedOptions = (text === undefined ? textOrOptions : options) as TextLikeOptions;
		assertStrategyPrimary(type, text, { method, path: this.path });
		return this.commit(
			(resolvedOptions !== undefined
				? { type, text, options: resolvedOptions }
				: { type, text }) as LocatorStrategyDefinitionPatch,
		);
	}

	/**
	 * A seeded override of a strategy with options takes `update`'s argument shapes: with two arguments the
	 * first is the primary (`null` there throws), a lone object or `null` is the options patch, and the
	 * options follow JSON Merge Patch over the seed's.
	 */
	private commitSeededOverride(type: OptionsType, method: string, primaryOrOptions: unknown, options: unknown) {
		const parsed = parseUpdateArguments<string | RegExp, OptionsPatch<object>>(
			primaryOrOptions as string | RegExp | OptionsPatch<object> | null | undefined,
			options as OptionsPatch<object> | null | undefined,
		);
		if (parsed.primary !== undefined) {
			assertStrategyPrimary(type, parsed.primary, { method, path: this.path });
		}
		return this.commit({
			type,
			...(parsed.primary !== undefined ? { [STRATEGIES[type].primary]: parsed.primary } : {}),
			...(parsed.hasOptions ? { options: parsed.options } : {}),
		} as LocatorStrategyDefinitionPatch);
	}

	private commit(
		definition: LocatorStrategyDefinition | LocatorStrategyDefinitionPatch,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.ensureDefinitionAllowed(definition as LocatorStrategyDefinition);
		const mergedDefinition = this.seededDefinition
			? applyDefinitionPatch(this.definition as LocatorStrategyDefinition, definition)
			: (definition as LocatorStrategyDefinition);
		// a copy: a later filter, nth or describe re-registers from it, and the caller may still hold the original
		this.definition = cloneLocatorStrategyDefinition(mergedDefinition);
		if (this.reuseType && this.seededDefinition) {
			this.overrideApplied = true;
		}
		this.persist();
		return this.getPostDefinitionView();
	}

	private applyFilter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) {
		this.ensureOpen("filter");
		this.ensureDefinition("filter");
		this.steps.push({ kind: "filter", filter: copyFilter(filter) });
		this.persist();
	}

	private applyIndex(index: IndexSelector) {
		this.ensureOpen("nth");
		this.ensureDefinition("nth");
		this.steps.push({ kind: "index", index });
		this.persist();
	}

	private applyDescription(description: LocatorDescription) {
		this.ensureOpen("describe");
		this.ensureDefinition("describe");
		assertDescription(description, { method: "describe", path: this.path });
		this.description = description;
		this.persist();
	}

	/**
	 * A failed call leaves the registry as it was: a seeded path keeps its seed, a path with a first
	 * strategy or override keeps it. Nothing is unregistered.
	 */
	private ensureDefinitionAllowed(definition: LocatorStrategyDefinition) {
		if (this.seededDefinition) {
			if (definition.type !== this.reuseType) {
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

	private ensureDefinition(method: "filter" | "nth" | "describe") {
		if (!this.definition) {
			throw new Error(
				`${method}() needs a locator strategy first for "${this.path}"; call ${STRATEGY_METHODS} before it.`,
			);
		}
		if (isAnyFrameDefinition(this.definition)) {
			throw new Error(anyFrameStepsMessage(`${method}()`, this.path));
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
			...(this.description !== undefined ? { description: this.description } : {}),
		};

		if (this.registered) {
			this.registry.replace(this.path, record);
		} else {
			this.registry.register(this.path, record);
			this.registered = true;
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
			describe: (description: LocatorDescription) => {
				this.applyDescription(description);
				return view;
			},
		};

		this.postDefinitionView = view;
		return view;
	}
}

/**
 * The builder returned by `add(path)`: the ten strategy methods and nothing else. `filter`, `nth`
 * and `describe` appear once a strategy has been chosen.
 */
export type LocatorRegistrationPreDefinitionBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> = Pick<LocatorRegistrationBuilder<LocatorSchemaPathType, Path, false>, StrategyMethod>;

type LocatorMethodForType<Type extends StrategyType> = (typeof STRATEGIES)[Type]["method"];

export type LocatorRegistrationSeededBuilderForType<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
	SeededType extends LocatorStrategyDefinition["type"],
> = LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> &
	Pick<LocatorRegistrationBuilder<LocatorSchemaPathType, Path, true>, LocatorMethodForType<SeededType>>;
