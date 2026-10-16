import type { Page } from "@playwright/test";
import type { LocatorRegistryInternal } from "./locatorRegistry";
import type {
	FilterDefinition,
	IndexSelector,
	LocatorDescription,
	LocatorSchemaRecord,
	LocatorStep,
	LocatorStrategyDefinition,
	LocatorStrategyDefinitionPatch,
	RegistryPath,
	RoleDefinition,
} from "./types";
import {
	applyDefinitionPatch,
	assertDescription,
	assertStrategyPrimary,
	copyFilter,
	normalizeSteps,
	STRATEGIES,
	type StrategyMethod,
} from "./utils";

export type LocatorRegistrationPostDefinitionBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> = {
	filter: (
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	) => LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	nth: (index: IndexSelector) => LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	describe: (description: LocatorDescription) => LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
};

type StrategyType = LocatorStrategyDefinition["type"];
/** The strategies whose first argument is a text: `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`. */
type TextLikeType = {
	[Type in StrategyType]: (typeof STRATEGIES)[Type]["primary"] extends "text" ? Type : never;
}[StrategyType];
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

	persistSeededDefinition() {
		if (this.seededDefinition && !this.registered) {
			this.persist();
		}
		return this;
	}

	/**
	 * Records a Playwright-style filter on the locator being registered. Filters are applied in the
	 * order they are chained and can include `has`/`hasNot` locator references. Requires that a
	 * locator strategy has already been set for this registration; the type of `add(path)` exposes
	 * this method only after one.
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

	describe(description: LocatorDescription): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.ensureDefinition("describe");
		this.applyDescription(description);
		return this.getPostDefinitionView();
	}

	/**
	 * Uses Playwright `getByRole` semantics to define the locator strategy. Accepts a role and
	 * optional options; when seeded via `{ reuse }`, an options-only call patches the seeded role.
	 * The role is required otherwise, and which strings are roles is Playwright's own type.
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
		const role = typeof roleOrOptions === "string" ? roleOrOptions : undefined;
		const resolvedOptions = typeof roleOrOptions === "string" ? options : roleOrOptions;
		if (role === undefined && this.seededDefinition) {
			return this.commit(resolvedOptions !== undefined ? { type: "role", options: resolvedOptions } : { type: "role" });
		}
		assertStrategyPrimary("role", role, { method: "getByRole", path: this.path });
		return this.commit(
			resolvedOptions !== undefined ? { type: "role", role, options: resolvedOptions } : { type: "role", role },
		);
	}

	/**
	 * Uses Playwright `getByText` semantics to define the locator strategy. Accepts string/RegExp
	 * text and optional options; when seeded, an options-only call patches the seeded text. An empty
	 * string is a value Playwright matches and is stored as given.
	 *
	 * @example
	 * ```ts
	 * registry.add("alert.error").getByText(/failed/i);
	 * ```
	 */
	getByText(
		text: Parameters<Page["getByText"]>[0],
		options: Parameters<Page["getByText"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(
		text: Parameters<Page["getByText"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(
		options: Seeded extends true ? Parameters<Page["getByText"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByText(
		textOrOptions: Parameters<Page["getByText"]>[0] | Parameters<Page["getByText"]>[1],
		options?: Parameters<Page["getByText"]>[1],
	) {
		return this.commitTextLike("text", "getByText", textOrOptions, options);
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
		text: Parameters<Page["getByLabel"]>[0],
		options: Parameters<Page["getByLabel"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		text: Parameters<Page["getByLabel"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		options: Seeded extends true ? Parameters<Page["getByLabel"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByLabel(
		textOrOptions: Parameters<Page["getByLabel"]>[0] | Parameters<Page["getByLabel"]>[1],
		options?: Parameters<Page["getByLabel"]>[1],
	) {
		return this.commitTextLike("label", "getByLabel", textOrOptions, options);
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
		text: Parameters<Page["getByPlaceholder"]>[0],
		options: Parameters<Page["getByPlaceholder"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		text: Parameters<Page["getByPlaceholder"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		options: Seeded extends true ? Parameters<Page["getByPlaceholder"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByPlaceholder(
		textOrOptions: Parameters<Page["getByPlaceholder"]>[0] | Parameters<Page["getByPlaceholder"]>[1],
		options?: Parameters<Page["getByPlaceholder"]>[1],
	) {
		return this.commitTextLike("placeholder", "getByPlaceholder", textOrOptions, options);
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
		text: Parameters<Page["getByAltText"]>[0],
		options: Parameters<Page["getByAltText"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		text: Parameters<Page["getByAltText"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		options: Seeded extends true ? Parameters<Page["getByAltText"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByAltText(
		textOrOptions: Parameters<Page["getByAltText"]>[0] | Parameters<Page["getByAltText"]>[1],
		options?: Parameters<Page["getByAltText"]>[1],
	) {
		return this.commitTextLike("altText", "getByAltText", textOrOptions, options);
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
		text: Parameters<Page["getByTitle"]>[0],
		options: Parameters<Page["getByTitle"]>[1],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		text: Parameters<Page["getByTitle"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		options: Seeded extends true ? Parameters<Page["getByTitle"]>[1] : never,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path>;
	getByTitle(
		textOrOptions: Parameters<Page["getByTitle"]>[0] | Parameters<Page["getByTitle"]>[1],
		options?: Parameters<Page["getByTitle"]>[1],
	) {
		return this.commitTextLike("title", "getByTitle", textOrOptions, options);
	}

	/**
	 * Uses Playwright `locator` semantics to define the locator strategy. Accepts a selector and
	 * optional options; when seeded, an options-only call patches the seeded selector by merging
	 * options while inheriting the selector. An empty selector is rejected: Playwright cannot parse it.
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
		const selector = typeof selectorOrOptions === "string" ? selectorOrOptions : undefined;
		const resolvedOptions = typeof selectorOrOptions === "string" ? options : selectorOrOptions;
		if (selector === undefined && this.seededDefinition) {
			return this.commit(
				resolvedOptions !== undefined ? { type: "locator", options: resolvedOptions } : { type: "locator" },
			);
		}
		assertStrategyPrimary("locator", selector, { method: "locator", path: this.path });
		return this.commit(
			resolvedOptions !== undefined
				? { type: "locator", selector, options: resolvedOptions }
				: { type: "locator", selector },
		);
	}

	/**
	 * Registers a frame segment. With a selector the segment is the `<iframe>` element
	 * (`locator(selector)` plus any chained `filter`/`nth` steps), and the descendants registered
	 * below it resolve inside the frame through `contentFrame()`; as the last segment of a path it
	 * resolves to the element itself. Without a selector it is Playwright's any-frame
	 * `page.frameLocator()`: the descendants resolve in whichever single frame holds them, the main
	 * frame included. The any-frame form must be the first segment of its chain, has no element to
	 * step on or to resolve to, and therefore returns nothing to chain. When seeded, omitting the
	 * selector inherits the seeded one instead.
	 *
	 * @example
	 * ```ts
	 * registry.add("frame.login").frameLocator("iframe.auth");
	 * registry.add("frame.login.submit").getByRole("button", { name: "Log in" });
	 * registry.add("anyFrame").frameLocator();
	 * registry.add("anyFrame.consent").getByRole("button", { name: "Accept" });
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
	 * Uses Playwright `getByTestId` semantics to define the locator strategy. When seeded, omitting
	 * the argument inherits the seeded `testId`. An empty string is a value Playwright matches
	 * (`data-testid=""`) and is stored as given.
	 *
	 * @example
	 * ```ts
	 * registry.add("card.title").getByTestId("card-title");
	 * ```
	 */
	getByTestId(
		testId: Seeded extends true ? Parameters<Page["getByTestId"]>[0] | undefined : Parameters<Page["getByTestId"]>[0],
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		if (testId === undefined && this.seededDefinition) {
			return this.commit({ type: "testId" });
		}
		assertStrategyPrimary("testId", testId, { method: "getByTestId", path: this.path });
		return this.commit({ type: "testId", testId });
	}

	/**
	 * Targets elements by `id`. A string is matched verbatim and case-sensitively against the `id`
	 * attribute; there is no `#` or `id=` prefix handling, and the resolved selector is `[id="…"]`,
	 * so ids containing `.`, `:`, `[`, spaces or quotes work as written. A RegExp is evaluated as a
	 * pattern against each element's `id` with its flags passed through unchanged; an unanchored
	 * pattern is a substring match, so anchor with `^` and `$` for a whole-id match. An empty string
	 * throws at registration. When seeded, the argument can be omitted to inherit the seeded id.
	 *
	 * @example
	 * ```ts
	 * registry.add("modal.close").getById("close-modal");
	 * registry.add("settings.panel").getById("settings.panel");
	 * registry.add("button.submit").getById(/^button\.submit\.[a-z0-9]{4}$/);
	 * ```
	 */
	getById(
		id: Seeded extends true ? string | RegExp | undefined : string | RegExp,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		if (id === undefined && this.seededDefinition) {
			return this.commit({ type: "id" });
		}
		assertStrategyPrimary("id", id, { method: "getById", path: this.path });
		return this.commit({ type: "id", id });
	}

	private commitTextLike(
		type: TextLikeType,
		method: string,
		textOrOptions: string | RegExp | TextLikeOptions,
		options: TextLikeOptions,
	) {
		const text = typeof textOrOptions === "string" || textOrOptions instanceof RegExp ? textOrOptions : undefined;
		const resolvedOptions = text === undefined ? (textOrOptions as TextLikeOptions) : options;
		if (text === undefined && this.seededDefinition) {
			return this.commit(
				(resolvedOptions !== undefined
					? { type, options: resolvedOptions }
					: { type }) as LocatorStrategyDefinitionPatch,
			);
		}
		assertStrategyPrimary(type, text, { method, path: this.path });
		return this.commit(
			(resolvedOptions !== undefined
				? { type, text, options: resolvedOptions }
				: { type, text }) as LocatorStrategyDefinitionPatch,
		);
	}

	private commit(
		definition: LocatorStrategyDefinition | LocatorStrategyDefinitionPatch,
	): LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, Path> {
		this.ensureDefinitionAllowed(definition as LocatorStrategyDefinition);
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
		this.ensureDefinition("filter");
		this.steps.push({ kind: "filter", filter: copyFilter(filter) });
		this.persist();
	}

	private applyIndex(index: IndexSelector) {
		this.ensureDefinition("nth");
		this.steps.push({ kind: "index", index });
		this.persist();
	}

	private applyDescription(description: LocatorDescription) {
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
