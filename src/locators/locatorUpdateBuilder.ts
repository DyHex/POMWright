import type { Page } from "@playwright/test";
import type { LocatorQueryBuilder } from "./locatorQueryBuilder";
import type {
	LocatorChainPaths,
	LocatorStrategyDefinition,
	LocatorUpdate,
	OptionsPatch,
	RegistryPath,
	RoleDefinition,
} from "./types";
import {
	assembleDefinition,
	assertStrategyPrimary,
	definitionFields,
	mergeOptions,
	methodForStrategy,
	strategyOf,
} from "./utils";

export { mergeOptions };

/**
 * Separates the primary argument of an `update`/`replace` call from its options. `undefined` means
 * "not provided" for both, as in any JavaScript call; `null` is the options form that deletes every
 * option. An object first argument (or `null`) is the options-only form.
 */
export const parseUpdateArguments = <Primary, Patch>(
	primaryOrOptions?: Primary | Patch | null,
	options?: Patch | null,
) => {
	if (options !== undefined) {
		return { primary: primaryOrOptions as Primary | undefined, options, hasOptions: true as const };
	}
	if (primaryOrOptions === null || (typeof primaryOrOptions === "object" && !(primaryOrOptions instanceof RegExp))) {
		return { primary: undefined, options: primaryOrOptions as Patch | null, hasOptions: true as const };
	}
	return { primary: primaryOrOptions as Primary | undefined, options: undefined, hasOptions: false as const };
};

// `undefined` as the primary means "not provided", as in any JavaScript call: the registered one is kept
type UpdateArgsWithOptions<Primary, Options> =
	| []
	| [Primary | undefined]
	| [OptionsPatch<Options> | null]
	| [Primary | undefined, OptionsPatch<Options> | null | undefined];

type UpdateArgsWithoutOptions<Primary> = [] | [Primary | undefined];

/** `update` patches the registered definition; `replace` installs a complete one of any strategy. */
export type LocatorUpdateMode = "update" | "replace";

/**
 * The arguments of a strategy method in each mode: in `replace` mode Playwright's own parameter list
 * (the first argument required, Playwright's option types), in `update` mode the patch shapes.
 */
type ArgsFor<
	Mode extends LocatorUpdateMode,
	ReplaceArgs extends unknown[],
	UpdateArgs extends unknown[],
> = Mode extends "replace" ? ReplaceArgs : UpdateArgs;

type OptionsDefinition = Extract<LocatorStrategyDefinition, { options?: unknown }>;

const requireType = (updates: LocatorUpdate, verb: "update" | "replace", path: string) => {
	if (!updates || typeof updates !== "object" || !("type" in updates)) {
		throw new Error(`Locator ${verb} for "${path}" requires a "type" property.`);
	}
};

/**
 * PATCH semantics for `update`: the registered strategy is kept, a provided primary replaces the
 * primary, and the options follow JSON Merge Patch. Another strategy throws and names `replace`.
 */
const mergeLocatorDefinition = (
	current: LocatorStrategyDefinition,
	updates: LocatorUpdate,
	path: string,
): LocatorStrategyDefinition => {
	requireType(updates, "update", path);
	if (updates.type !== current.type) {
		throw new Error(
			`update("${path}") cannot change the strategy from "${current.type}" to "${updates.type}"; use replace("${path}").${methodForStrategy[updates.type]}(…) instead.`,
		);
	}
	const spec = strategyOf(updates.type);
	const base = definitionFields(current);
	const given = definitionFields(updates);
	const options = spec.options
		? mergeOptions(base.options ?? undefined, given.options as OptionsPatch<object> | null | undefined)
		: undefined;
	return assembleDefinition(updates.type, given[spec.primary] ?? base[spec.primary], options);
};

/**
 * PUT semantics for `replace`: a complete definition of any strategy. The primary is required
 * except for `frameLocator`, where its absence is the any-frame form; the options are taken as
 * given, so a `null` has no delete meaning here and equals omission.
 */
const buildReplacementDefinition = (updates: LocatorUpdate, path: string): LocatorStrategyDefinition => {
	requireType(updates, "replace", path);
	const spec = strategyOf(updates.type);
	const given = definitionFields(updates);
	const primary = given[spec.primary];
	if (primary === undefined && !spec.optionalPrimary) {
		const article = /^[aeiou]/i.test(spec.primary) ? "an" : "a";
		throw new Error(
			`Locator replace for "${path}" of type "${updates.type}" requires ${article} "${spec.primary}" value.`,
		);
	}
	const options = spec.options
		? mergeOptions(undefined, given.options as OptionsPatch<object> | null | undefined)
		: undefined;
	return assembleDefinition(updates.type, primary, options);
};

/**
 * What a query's `update(subPath?)` and `replace(subPath?)` return: the ten locator methods, each of which changes the
 * segment's locator in the query and returns the query.
 *
 * - `update` (`Mode` `"update"`) keeps the registered strategy: call the method of that strategy with a patch in JSON
 *   Merge Patch form. A given first argument replaces the registered one; the options merge key by key, a `null` key
 *   deletes one, a lone `null` deletes them all, and an omitted value keeps what is registered. Another strategy's
 *   method throws and names `replace`.
 * - `replace` (`Mode` `"replace"`) installs a locator of any strategy, with the arguments of Playwright's own method:
 *   the first argument required, Playwright's options.
 *
 * @example
 * ```ts
 * registry.getLocatorSchema("main.button@save").update().getByRole({ name: "Cancel" }).getNestedLocator();
 * registry.getLocatorSchema("main.button@save").replace().getByText("Save").getNestedLocator();
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/
 */
export type LocatorUpdateBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
	SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>,
	Mode extends LocatorUpdateMode = "update",
> = LocatorUpdateBuilderInternal<LocatorSchemaPathType, Path, SubPath, Mode>;

export class LocatorUpdateBuilderInternal<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
	SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>,
	Mode extends LocatorUpdateMode = "update",
> {
	constructor(
		private readonly subPath: SubPath,
		private readonly mode: Mode,
		private readonly apply: (definition: LocatorUpdate) => LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>,
	) {}

	/**
	 * Changes the segment's locator to Playwright's `page.getByRole()`. In `update` mode the segment must be registered
	 * with `getByRole`: the role is optional and the options follow JSON Merge Patch. In `replace` mode the arguments are
	 * those of `page.getByRole()`, the role required.
	 *
	 * @param role The ARIA role.
	 * @param options Playwright's options, such as `name` and `exact`; in `update` mode a patch, where `{ name: null }`
	 * deletes one option and a lone `null` all of them.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "text" to "role"; use replace("main.button@save").getByRole(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.update().getByRole({ name: "Cancel" });
	 * query.update().getByRole("button", null); // clears every option
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#getbyrole
	 */
	getByRole(
		...args: ArgsFor<
			Mode,
			[role: RoleDefinition["role"], options?: RoleDefinition["options"]],
			UpdateArgsWithOptions<RoleDefinition["role"], RoleDefinition["options"]>
		>
	) {
		return this.commitWithOptions("role", args);
	}

	/**
	 * Changes the segment's locator to Playwright's `page.getByText()`. In `update` mode the segment must be registered
	 * with `getByText`: the text is optional and the options follow JSON Merge Patch. In `replace` mode the arguments are
	 * those of `page.getByText()`, the text required.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's options (`exact`); in `update` mode a patch, where `null` deletes.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "text"; use replace("main.button@save").getByText(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.replace().getByText(/Updated/, { exact: false });
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#getbytext
	 */
	getByText(
		...args: ArgsFor<
			Mode,
			[text: Parameters<Page["getByText"]>[0], options?: Parameters<Page["getByText"]>[1]],
			UpdateArgsWithOptions<Parameters<Page["getByText"]>[0], Parameters<Page["getByText"]>[1]>
		>
	) {
		return this.commitWithOptions("text", args);
	}

	/**
	 * Changes the segment's locator to Playwright's `page.getByLabel()`. In `update` mode the segment must be registered
	 * with `getByLabel`: the text is optional and the options follow JSON Merge Patch. In `replace` mode the arguments
	 * are those of `page.getByLabel()`, the text required.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's options (`exact`); in `update` mode a patch, where `null` deletes.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "label"; use replace("main.button@save").getByLabel(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.update().getByLabel({ exact: true });
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#getbylabel
	 */
	getByLabel(
		...args: ArgsFor<
			Mode,
			[text: Parameters<Page["getByLabel"]>[0], options?: Parameters<Page["getByLabel"]>[1]],
			UpdateArgsWithOptions<Parameters<Page["getByLabel"]>[0], Parameters<Page["getByLabel"]>[1]>
		>
	) {
		return this.commitWithOptions("label", args);
	}

	/**
	 * Changes the segment's locator to Playwright's `page.getByPlaceholder()`. In `update` mode the segment must be
	 * registered with `getByPlaceholder`: the text is optional and the options follow JSON Merge Patch. In `replace` mode
	 * the arguments are those of `page.getByPlaceholder()`, the text required.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's options (`exact`); in `update` mode a patch, where `null` deletes.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "placeholder"; use replace("main.button@save").getByPlaceholder(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.update().getByPlaceholder("Search orders");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#getbyplaceholder
	 */
	getByPlaceholder(
		...args: ArgsFor<
			Mode,
			[text: Parameters<Page["getByPlaceholder"]>[0], options?: Parameters<Page["getByPlaceholder"]>[1]],
			UpdateArgsWithOptions<Parameters<Page["getByPlaceholder"]>[0], Parameters<Page["getByPlaceholder"]>[1]>
		>
	) {
		return this.commitWithOptions("placeholder", args);
	}

	/**
	 * Changes the segment's locator to Playwright's `page.getByAltText()`. In `update` mode the segment must be
	 * registered with `getByAltText`: the text is optional and the options follow JSON Merge Patch. In `replace` mode the
	 * arguments are those of `page.getByAltText()`, the text required.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's options (`exact`); in `update` mode a patch, where `null` deletes.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "altText"; use replace("main.button@save").getByAltText(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.replace().getByAltText("Shop logo");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#getbyalttext
	 */
	getByAltText(
		...args: ArgsFor<
			Mode,
			[text: Parameters<Page["getByAltText"]>[0], options?: Parameters<Page["getByAltText"]>[1]],
			UpdateArgsWithOptions<Parameters<Page["getByAltText"]>[0], Parameters<Page["getByAltText"]>[1]>
		>
	) {
		return this.commitWithOptions("altText", args);
	}

	/**
	 * Changes the segment's locator to Playwright's `page.getByTitle()`. In `update` mode the segment must be registered
	 * with `getByTitle`: the text is optional and the options follow JSON Merge Patch. In `replace` mode the arguments
	 * are those of `page.getByTitle()`, the text required.
	 *
	 * @param text A string or a RegExp.
	 * @param options Playwright's options (`exact`); in `update` mode a patch, where `null` deletes.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "title"; use replace("main.button@save").getByTitle(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.update().getByTitle({ exact: true });
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#getbytitle
	 */
	getByTitle(
		...args: ArgsFor<
			Mode,
			[text: Parameters<Page["getByTitle"]>[0], options?: Parameters<Page["getByTitle"]>[1]],
			UpdateArgsWithOptions<Parameters<Page["getByTitle"]>[0], Parameters<Page["getByTitle"]>[1]>
		>
	) {
		return this.commitWithOptions("title", args);
	}

	/**
	 * Changes the segment's locator to Playwright's `page.locator()`. In `update` mode the segment must be registered
	 * with `locator`: the selector is optional and the options follow JSON Merge Patch. In `replace` mode the arguments
	 * are those of `page.locator()`, the selector required.
	 *
	 * @param selector A selector; an empty one is rejected in both modes.
	 * @param options Playwright's options, such as `hasText`; in `update` mode a patch, where `null` deletes.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "locator"; use replace("main.button@save").locator(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.replace().locator("ul > li", { hasText: /Order/ });
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#locator
	 */
	locator(
		...args: ArgsFor<
			Mode,
			[selector: Parameters<Page["locator"]>[0], options?: Parameters<Page["locator"]>[1]],
			UpdateArgsWithOptions<Parameters<Page["locator"]>[0], Parameters<Page["locator"]>[1]>
		>
	) {
		return this.commitWithOptions("locator", args);
	}

	/**
	 * Changes the segment's locator to a frame segment: with a selector, the `<iframe>` element whose descendants resolve
	 * inside the frame. In `update` mode an omitted selector keeps the registered one. In `replace` mode an omitted
	 * selector installs Playwright's any-frame `frameLocator()`, which must be the first segment of its chain and takes
	 * no steps; it cannot replace the query's own path.
	 *
	 * @param selector The `<iframe>` element's selector; an empty one is rejected in both modes.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "frameLocator"; use replace("main.button@save").frameLocator(…) instead.` In `replace`
	 * mode without a selector, on the query's own path or on a segment with steps in the query:
	 * `replace() cannot apply to "shell.frame": it has filter or nth steps, and frameLocator() without a selector takes
	 * none; call clearSteps("shell.frame") first.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.replace("shell.frame@payment").frameLocator("iframe#payment");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#framelocator
	 */
	frameLocator(...args: UpdateArgsWithoutOptions<Parameters<Page["locator"]>[0]>) {
		return this.commitPrimary("frameLocator", args[0]);
	}

	/**
	 * Changes the segment's locator to Playwright's `page.getByTestId()`. In `update` mode the segment must be registered
	 * with `getByTestId` and the test id is optional; in `replace` mode it is required. An empty string is a value
	 * Playwright matches and is kept.
	 *
	 * @param testId The test id: a string or a RegExp.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "testId"; use replace("main.button@save").getByTestId(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.replace().getByTestId("order-row");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#getbytestid
	 */
	getByTestId(
		...args: ArgsFor<
			Mode,
			[testId: Parameters<Page["getByTestId"]>[0]],
			UpdateArgsWithoutOptions<Parameters<Page["getByTestId"]>[0]>
		>
	) {
		return this.commitPrimary("testId", args[0]);
	}

	/**
	 * Changes the segment's locator to an `id` locator: a string matches the `id` attribute exactly, a RegExp is tested
	 * against each element's id with its flags. In `update` mode the segment must be registered with `getById` and the
	 * id is optional; in `replace` mode it is required. An empty string is rejected.
	 *
	 * @param id A string or a RegExp.
	 * @returns The query.
	 * @throws In `update` mode, for a segment registered with another strategy: `update("main.button@save") cannot change
	 * the strategy from "role" to "id"; use replace("main.button@save").getById(…) instead.`
	 * In either mode, on a builder taken before `skip()` of its segment: `update() cannot apply to "main.list": it is
	 * skipped in this query; call unskip("main.list") first.` (or `replace()`).
	 *
	 * @example
	 * ```ts
	 * query.replace().getById("order-1042");
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorupdatebuilder/#getbyid
	 */
	getById(...args: ArgsFor<Mode, [id: string | RegExp], UpdateArgsWithoutOptions<string | RegExp>>) {
		return this.commitPrimary("id", args[0]);
	}

	/** The strategies with options: the first argument is the primary unless it is an object or `null`. */
	private commitWithOptions(type: OptionsDefinition["type"], args: unknown[]) {
		const [primaryOrOptions, options] = args;
		const parsed = parseUpdateArguments<string | RegExp, OptionsPatch<object>>(
			primaryOrOptions as string | RegExp | OptionsPatch<object> | null | undefined,
			options as OptionsPatch<object> | null | undefined,
		);
		return this.commitPrimary(type, parsed.primary, parsed.hasOptions ? { options: parsed.options } : {});
	}

	/** Checks a provided primary, and in `replace` mode a missing one unless the strategy may omit it. */
	private commitPrimary(type: LocatorStrategyDefinition["type"], primary: unknown, rest: object = {}) {
		const spec = strategyOf(type);
		if (primary !== undefined || (this.mode === "replace" && !spec.optionalPrimary)) {
			assertStrategyPrimary(type, primary, { method: spec.method, path: this.subPath });
		}
		return this.commit({
			type,
			...(primary !== undefined ? { [spec.primary]: primary } : {}),
			...rest,
		} as LocatorUpdate);
	}

	private commit(definition: LocatorUpdate) {
		return this.apply(definition);
	}
}

export { buildReplacementDefinition, mergeLocatorDefinition };
