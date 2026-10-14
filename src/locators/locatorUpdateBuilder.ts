import type { Page } from "@playwright/test";
import type { LocatorQueryBuilder } from "./locatorQueryBuilder";
import type {
	FrameLocatorDefinition,
	IdDefinition,
	LocatorChainPaths,
	LocatorDefinition,
	LocatorStrategyDefinition,
	LocatorUpdate,
	OptionsPatch,
	RegistryPath,
	RoleDefinition,
	TestIdDefinition,
} from "./types";
import { assertIdValue, assertPrimaryValue, methodForStrategy } from "./utils";

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

type TextLikeDefinition = Extract<LocatorStrategyDefinition, { text: string | RegExp }>;
type TextLikeUpdate = Extract<LocatorUpdate, { type: TextLikeDefinition["type"] }>;

const mergeTextLike = (current: TextLikeDefinition, updates: TextLikeUpdate): LocatorStrategyDefinition => {
	const text = updates.text ?? current.text;
	const options = mergeOptions(current.options, updates.options);
	return (
		options !== undefined ? { type: current.type, text, options } : { type: current.type, text }
	) as LocatorStrategyDefinition;
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
	if (!updates || typeof updates !== "object" || !("type" in updates)) {
		throw new Error(`Locator update for "${path}" requires a "type" property.`);
	}
	if (updates.type !== current.type) {
		throw new Error(
			`update("${path}") cannot change the strategy from "${current.type}" to "${updates.type}"; use replace("${path}").${methodForStrategy[updates.type]}(…) instead.`,
		);
	}

	switch (updates.type) {
		case "role": {
			const base = current as RoleDefinition;
			const role = updates.role ?? base.role;
			const options = mergeOptions(base.options, updates.options);
			return options !== undefined ? { type: "role", role, options } : { type: "role", role };
		}
		case "text":
		case "label":
		case "placeholder":
		case "altText":
		case "title":
			return mergeTextLike(current as TextLikeDefinition, updates);
		case "locator": {
			const base = current as LocatorDefinition;
			const selector = updates.selector ?? base.selector;
			const options = mergeOptions(base.options, updates.options);
			return options !== undefined ? { type: "locator", selector, options } : { type: "locator", selector };
		}
		case "frameLocator": {
			const base = current as FrameLocatorDefinition;
			const selector = updates.selector ?? base.selector;
			return selector !== undefined ? { type: "frameLocator", selector } : { type: "frameLocator" };
		}
		case "testId": {
			const base = current as TestIdDefinition;
			return { type: "testId", testId: updates.testId ?? base.testId };
		}
		case "id": {
			const base = current as IdDefinition;
			return { type: "id", id: updates.id ?? base.id };
		}
		default: {
			const exhaustive: never = updates;
			return exhaustive;
		}
	}
};

/**
 * PUT semantics for `replace`: a complete definition of any strategy. The primary is required
 * except for `frameLocator`, where its absence is the any-frame form; the options are taken as
 * given, so a `null` has no delete meaning here and equals omission.
 */
const buildReplacementDefinition = (updates: LocatorUpdate, path: string): LocatorStrategyDefinition => {
	if (!updates || typeof updates !== "object" || !("type" in updates)) {
		throw new Error(`Locator replace for "${path}" requires a "type" property.`);
	}

	switch (updates.type) {
		case "role": {
			const { role } = updates;
			if (role === undefined) {
				throw new Error(`Locator replace for "${path}" of type "role" requires a "role" value.`);
			}
			const options = mergeOptions(undefined, updates.options);
			return options !== undefined ? { type: "role", role, options } : { type: "role", role };
		}
		case "text":
		case "label":
		case "placeholder":
		case "altText":
		case "title": {
			const { text, type } = updates;
			if (text === undefined) {
				throw new Error(`Locator replace for "${path}" of type "${type}" requires a "text" value.`);
			}
			const options = mergeOptions(undefined, updates.options);
			return (options !== undefined ? { type, text, options } : { type, text }) as LocatorStrategyDefinition;
		}
		case "locator": {
			const { selector } = updates;
			if (selector === undefined) {
				throw new Error(`Locator replace for "${path}" of type "locator" requires a "selector" value.`);
			}
			const options = mergeOptions(undefined, updates.options);
			return options !== undefined ? { type: "locator", selector, options } : { type: "locator", selector };
		}
		case "frameLocator": {
			const { selector } = updates;
			return selector !== undefined ? { type: "frameLocator", selector } : { type: "frameLocator" };
		}
		case "testId": {
			const { testId } = updates;
			if (testId === undefined) {
				throw new Error(`Locator replace for "${path}" of type "testId" requires a "testId" value.`);
			}
			return { type: "testId", testId };
		}
		case "id": {
			const { id } = updates;
			if (id === undefined) {
				throw new Error(`Locator replace for "${path}" of type "id" requires an "id" value.`);
			}
			return { type: "id", id };
		}
		default: {
			const exhaustive: never = updates;
			return exhaustive;
		}
	}
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
		const [roleOrOptions, options] = args;
		const parsed = parseUpdateArguments<RoleDefinition["role"], OptionsPatch<RoleDefinition["options"]>>(
			roleOrOptions,
			options,
		);
		if (parsed.primary !== undefined || this.mode === "replace") {
			assertPrimaryValue(parsed.primary, { method: "getByRole", field: "role", path: this.subPath, allowEmpty: false });
		}
		return this.commit({
			type: "role",
			...(parsed.primary !== undefined ? { role: parsed.primary } : {}),
			...(parsed.hasOptions ? { options: parsed.options } : {}),
		});
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
		return this.commitTextLike("text", "getByText", args);
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
		return this.commitTextLike("label", "getByLabel", args);
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
		return this.commitTextLike("placeholder", "getByPlaceholder", args);
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
		return this.commitTextLike("altText", "getByAltText", args);
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
		return this.commitTextLike("title", "getByTitle", args);
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
		const [selectorOrOptions, options] = args;
		const parsed = parseUpdateArguments<Parameters<Page["locator"]>[0], OptionsPatch<Parameters<Page["locator"]>[1]>>(
			selectorOrOptions,
			options,
		);
		if (parsed.primary !== undefined || this.mode === "replace") {
			assertPrimaryValue(parsed.primary, {
				method: "locator",
				field: "selector",
				path: this.subPath,
				allowEmpty: false,
			});
		}
		return this.commit({
			type: "locator",
			...(parsed.primary !== undefined ? { selector: parsed.primary } : {}),
			...(parsed.hasOptions ? { options: parsed.options } : {}),
		});
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
		const [selector] = args;
		if (selector !== undefined) {
			assertPrimaryValue(selector, {
				method: "frameLocator",
				field: "selector",
				path: this.subPath,
				allowEmpty: false,
			});
		}
		return this.commit({
			type: "frameLocator",
			...(selector !== undefined ? { selector } : {}),
		});
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
		const [testId] = args;
		if (testId !== undefined || this.mode === "replace") {
			assertPrimaryValue(testId, { method: "getByTestId", field: "testId", path: this.subPath, allowEmpty: true });
		}
		return this.commit({
			type: "testId",
			...(testId !== undefined ? { testId } : {}),
		});
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
		const [id] = args;
		if (id !== undefined || this.mode === "replace") {
			assertIdValue(id, { method: "getById", path: this.subPath });
		}
		return this.commit({
			type: "id",
			...(id !== undefined ? { id } : {}),
		});
	}

	private commitTextLike(
		type: TextLikeDefinition["type"],
		method: string,
		args:
			| UpdateArgsWithOptions<string | RegExp, TextLikeDefinition["options"]>
			| [text: string | RegExp, options?: TextLikeDefinition["options"]],
	) {
		const [textOrOptions, options] = args;
		const parsed = parseUpdateArguments<string | RegExp, OptionsPatch<TextLikeDefinition["options"]>>(
			textOrOptions,
			options,
		);
		if (parsed.primary !== undefined || this.mode === "replace") {
			assertPrimaryValue(parsed.primary, { method, field: "text", path: this.subPath, allowEmpty: true });
		}
		return this.commit({
			type,
			...(parsed.primary !== undefined ? { text: parsed.primary } : {}),
			...(parsed.hasOptions ? { options: parsed.options } : {}),
		} as LocatorUpdate);
	}

	private commit(definition: LocatorUpdate) {
		return this.apply(definition);
	}
}

export { buildReplacementDefinition, mergeLocatorDefinition };
