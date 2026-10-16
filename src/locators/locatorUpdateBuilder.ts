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
import { assembleDefinition, assertStrategyPrimary, definitionFields, methodForStrategy, strategyOf } from "./utils";

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

/**
 * JSON Merge Patch over a Playwright options object: an absent patch leaves the options alone,
 * `null` deletes them all, and inside a patch a `null` key is deleted, an `undefined` key is skipped
 * and any other value replaces. An empty result is no options at all.
 */
export const mergeOptions = <Options extends object>(
	current: Options | undefined,
	patch: OptionsPatch<Options> | null | undefined,
): Options | undefined => {
	if (patch === undefined) {
		return current;
	}
	if (patch === null) {
		return undefined;
	}
	const merged: Record<string, unknown> = { ...(current ?? {}) };
	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) {
			continue;
		}
		if (value === null) {
			delete merged[key];
		} else {
			merged[key] = value;
		}
	}
	return Object.keys(merged).length > 0 ? (merged as Options) : undefined;
};

type UpdateArgsWithOptions<Primary, Options> =
	| []
	| [Primary]
	| [OptionsPatch<Options> | null]
	| [Primary, OptionsPatch<Options> | null | undefined];

type UpdateArgsWithoutOptions<Primary> = [] | [Primary];

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
 * What `getLocatorSchema(path).update(subPath?)` (`Mode` `"update"`) and `replace(subPath?)` (`Mode`
 * `"replace"`) return: the ten strategy methods, each returning the query builder.
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
	 * Patches (`update`) or replaces (`replace`) a `getByRole` definition for the target sub-path. In
	 * `update` mode the registered strategy must be `role`, the role is optional and the options
	 * follow JSON Merge Patch: `{ name: null }` deletes one option, a `null` options argument deletes
	 * them all, and `undefined` leaves them alone. In `replace` mode the arguments are those of
	 * `page.getByRole`: the role is required and the options are Playwright's own, without `null`.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("form.button").update().getByRole({ name: "Save" }).getNestedLocator();
	 * getLocatorSchema("form.button").update().getByRole("button", null).getNestedLocator();
	 * ```
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
	 * Patches or replaces a `getByText` definition. In `update` mode the text is optional and the
	 * options follow JSON Merge Patch; in `replace` mode the text is required.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("banner.message").replace().getByText(/Updated/, { exact: false }).getNestedLocator();
	 * ```
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
	 * Patches or replaces a `getByLabel` definition. In `update` mode the text is optional and the
	 * options follow JSON Merge Patch; in `replace` mode the text is required.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("form.email").update().getByLabel({ exact: true }).getNestedLocator();
	 * ```
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
	 * Patches or replaces a `getByPlaceholder` definition. In `update` mode the text is optional and
	 * the options follow JSON Merge Patch; in `replace` mode the text is required.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("form.search").update().getByPlaceholder({ exact: true }).getNestedLocator();
	 * ```
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
	 * Patches or replaces a `getByAltText` definition. In `update` mode the text is optional and the
	 * options follow JSON Merge Patch; in `replace` mode the text is required.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("image.logo").replace().getByAltText("Logo").getNestedLocator();
	 * ```
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
	 * Patches or replaces a `getByTitle` definition. In `update` mode the text is optional and the
	 * options follow JSON Merge Patch; in `replace` mode the text is required.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("icon.info").update().getByTitle({ exact: true }).getNestedLocator();
	 * ```
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
	 * Patches or replaces a `locator` definition. In `update` mode the selector is optional and the
	 * options follow JSON Merge Patch; in `replace` mode the selector is required. An empty selector
	 * is rejected in both modes.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("list.items").replace().locator("ul > li", { hasText: /Row/ }).getNestedLocator();
	 * ```
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
	 * Patches or replaces a `frameLocator` definition. In `update` mode an omitted selector keeps the
	 * registered one; in `replace` mode an omitted selector installs Playwright's any-frame
	 * `page.frameLocator()`, which must be the first segment of its chain. An empty selector is
	 * rejected in both modes.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("frame.login").replace().frameLocator("iframe.auth").getNestedLocator();
	 * ```
	 */
	frameLocator(...args: UpdateArgsWithoutOptions<Parameters<Page["locator"]>[0]>) {
		return this.commitPrimary("frameLocator", args[0]);
	}

	/**
	 * Patches or replaces a `getByTestId` definition. In `update` mode the id is optional; in
	 * `replace` mode it is required. An empty string is a value Playwright matches and is kept.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("card.title").update().getByTestId().getNestedLocator();
	 * ```
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
	 * Patches or replaces an `id` definition. The value is stored verbatim: strings match the `id`
	 * attribute exactly, RegExps are evaluated as patterns with their flags. An empty string throws.
	 * In `update` mode the id is optional; in `replace` mode it is required.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("modal.close").update().getById().getNestedLocator();
	 * ```
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
