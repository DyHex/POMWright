import type { Locator } from "@playwright/test";
import type { LocatorRegistryInternal } from "./locatorRegistry";
import {
	buildReplacementDefinition,
	type LocatorUpdateBuilder,
	LocatorUpdateBuilderInternal,
	mergeLocatorDefinition,
} from "./locatorUpdateBuilder";
import type {
	FilterDefinition,
	IndexSelector,
	LocatorChainPaths,
	LocatorDescription,
	LocatorStep,
	LocatorStrategyDefinition,
	LocatorUpdate,
	RegistryPath,
} from "./types";
import {
	anyFrameNoElementMessage,
	assertDescription,
	cloneLocatorStrategyDefinition,
	copyFilter,
	expandSchemaPath,
	isAnyFrameDefinition,
} from "./utils";

/**
 * What `getLocatorSchema(path)` returns, and every step of its chain: a clone of the path's chain whose
 * `filter`, `nth`, `clearSteps`, `skip`, `unskip`, `describe`, `update` and `replace` calls change only the clone.
 *
 * @example
 * ```ts
 * export const lastRow = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.item"> =>
 *   registry.getLocatorSchema("list.item").nth("last");
 * ```
 */
export type LocatorQueryBuilder<
	LocatorSchemaPathType extends string,
	Path extends RegistryPath<LocatorSchemaPathType>,
> = LocatorQueryBuilderInternal<LocatorSchemaPathType, Path>;

export class LocatorQueryBuilderInternal<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends RegistryPath<LocatorSchemaPathType>,
> {
	private readonly definitions = new Map<string, LocatorStrategyDefinition>();
	private readonly steps = new Map<
		string,
		LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]
	>();
	private readonly descriptions = new Map<string, LocatorDescription>();
	/** Ancestors left out of the chain by `skip`; their definition, steps and description stay as they are. */
	private readonly skipped = new Set<string>();
	private readonly chain: ReadonlySet<string>;

	constructor(
		private readonly registry: LocatorRegistryInternal<LocatorSchemaPathType>,
		private readonly path: LocatorSubstring,
	) {
		const chain = expandSchemaPath(path);
		this.chain = new Set(chain);
		let hasTerminal = false;
		for (const part of chain) {
			// getIfExists returns a clone, which this query owns from here on
			const record = this.registry.getIfExists(part as RegistryPath<LocatorSchemaPathType>);
			if (!record) {
				continue;
			}
			this.definitions.set(part, record.definition);
			this.steps.set(part, record.steps ?? []);
			if (record.description !== undefined) {
				this.descriptions.set(part, record.description);
			}
			if (part === path) {
				hasTerminal = true;
			}
		}
		if (!hasTerminal) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
	}

	/**
	 * Starts a PATCH-style update for the locator definition at the given `subPath` within this
	 * builder. Returns a builder exposing the same locator-type methods as `registry.add`, with all
	 * arguments optional to merge with the existing definition. The registry remains unchanged until
	 * you resolve with `getLocator`/`getNestedLocator`.
	 *
	 * If `subPath` is omitted, the terminal path for this builder (`path` passed to
	 * `getLocatorSchema`) is used. The steps and the description are left as they are, and a segment
	 * left out with `skip` must be brought back with `unskip` first.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("form.button")
	 *   .update("form.button")
	 *   .getByRole({ name: "Submit" })
	 *   .getNestedLocator();
	 * ```
	 */
	update(): LocatorUpdateBuilder<
		LocatorSchemaPathType,
		LocatorSubstring,
		LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>
	>;
	update<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
	): LocatorUpdateBuilder<LocatorSchemaPathType, LocatorSubstring, SubPath>;
	update<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(subPath?: SubPath) {
		const resolvedSubPath = (subPath ?? this.path) as LocatorChainPaths<
			RegistryPath<LocatorSchemaPathType>,
			LocatorSubstring
		>;
		this.ensureSubPath(resolvedSubPath);
		this.ensureNotSkipped("update", resolvedSubPath);
		return new LocatorUpdateBuilderInternal<LocatorSchemaPathType, LocatorSubstring, typeof resolvedSubPath, "update">(
			resolvedSubPath,
			"update",
			(definition) => this.applyUpdate(resolvedSubPath, definition),
		);
	}

	/**
	 * Records a Playwright-style filter for the specified `subPath` within this builder. Unlike
	 * `registry.add`, `subPath` is optional here: when omitted, the terminal path for this builder is
	 * used. Provide an explicit `subPath` when targeting an ancestor segment.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("list.item")
	 *   .filter("list", { hasText: "List" })
	 *   .filter("list.item", { hasText: "Row" });
	 * ```
	 */
	filter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	filter<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	filter<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		...args:
			| [FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>]
			| [SubPath, FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>]
	) {
		const hasExplicitSubPath = args.length === 2;
		const [subPathOrFilter, maybeFilter] = args;
		const resolvedSubPath = (hasExplicitSubPath ? subPathOrFilter : this.path) as LocatorChainPaths<
			RegistryPath<LocatorSchemaPathType>,
			LocatorSubstring
		>;
		const filter = (hasExplicitSubPath ? maybeFilter : subPathOrFilter) as FilterDefinition<
			RegistryPath<LocatorSchemaPathType>,
			RegistryPath<LocatorSchemaPathType>
		>;

		this.ensureSubPath(resolvedSubPath);
		this.ensureNotSkipped("filter", resolvedSubPath);
		this.ensureStepTarget(resolvedSubPath);
		const existing = this.steps.get(resolvedSubPath) ?? [];
		existing.push({ kind: "filter", filter: copyFilter(filter) });
		this.steps.set(resolvedSubPath, existing);
		return this;
	}

	/**
	 * Clears all recorded `filter`/`nth` steps for the specified `subPath` in this builder, leaving
	 * the locator definition intact. If `subPath` is omitted, the terminal path for this builder is
	 * used; provide an explicit `subPath` to clear ancestor steps.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("list.item").clearSteps("list.item").getNestedLocator();
	 * ```
	 */
	clearSteps(): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	clearSteps<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	clearSteps<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath?: SubPath,
	) {
		const resolvedSubPath = (subPath ?? this.path) as LocatorChainPaths<
			RegistryPath<LocatorSchemaPathType>,
			LocatorSubstring
		>;
		this.ensureSubPath(resolvedSubPath);
		this.ensureNotSkipped("clearSteps", resolvedSubPath);
		this.steps.set(resolvedSubPath, []);
		return this;
	}

	/**
	 * Records an index selector for the specified `subPath` in this builder. Indices are applied in
	 * the order they are chained and require that the subPath already exists on the builder. If
	 * `subPath` is omitted, the terminal path for this builder is used; provide an explicit `subPath`
	 * to target ancestor segments.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("list.item").nth("list.item", 2).getNestedLocator();
	 * ```
	 */
	nth(index: IndexSelector): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	nth<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		index: IndexSelector,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring>;
	nth<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		...args: [IndexSelector] | [SubPath, IndexSelector]
	) {
		const hasExplicitSubPath = args.length === 2;
		const [subPathOrIndex, maybeIndex] = args;
		const resolvedSubPath = (hasExplicitSubPath ? subPathOrIndex : this.path) as LocatorChainPaths<
			RegistryPath<LocatorSchemaPathType>,
			LocatorSubstring
		>;
		const index = (hasExplicitSubPath ? maybeIndex : subPathOrIndex) as IndexSelector;

		this.ensureSubPath(resolvedSubPath);
		this.ensureNotSkipped("nth", resolvedSubPath);
		this.ensureStepTarget(resolvedSubPath);
		const existing = this.steps.get(resolvedSubPath) ?? [];
		existing.push({ kind: "index", index });
		this.steps.set(resolvedSubPath, existing);
		return this;
	}

	/**
	 * Adds or overrides the description for the terminal path of this builder. The description is
	 * applied only to the resolved terminal locator and does not mutate registry state.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("section.button")
	 *   .describe("Save button")
	 *   .getNestedLocator();
	 * ```
	 */
	describe(description: LocatorDescription): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring> {
		assertDescription(description, { method: "describe", path: this.path });
		this.descriptions.set(this.path, description);
		return this;
	}

	private applyUpdate<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		updates: LocatorUpdate,
	) {
		const merged = mergeLocatorDefinition(this.ensureSubPath(subPath), updates, subPath);
		this.definitions.set(subPath, cloneLocatorStrategyDefinition(merged));
		return this;
	}

	/**
	 * Starts a POST-style replacement for the locator definition at the given `subPath` within this
	 * builder. Returns a builder exposing the same locator-type methods as `registry.add`, requiring
	 * primary arguments where Playwright does. Registry state is unchanged; the replacement applies
	 * to the builder clone when resolved. If `subPath` is omitted, the terminal path for this
	 * builder is used. The steps and the description are left as they are, and a segment left out
	 * with `skip` must be brought back with `unskip` first.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("section.button")
	 *   .replace("section.button")
	 *   .getByRole("button", { name: "Save" })
	 *   .getNestedLocator();
	 * ```
	 */
	replace(): LocatorUpdateBuilder<
		LocatorSchemaPathType,
		LocatorSubstring,
		LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>,
		"replace"
	>;
	replace<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
	): LocatorUpdateBuilder<LocatorSchemaPathType, LocatorSubstring, SubPath, "replace">;
	replace<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(subPath?: SubPath) {
		const resolvedSubPath = (subPath ?? this.path) as LocatorChainPaths<
			RegistryPath<LocatorSchemaPathType>,
			LocatorSubstring
		>;
		this.ensureSubPath(resolvedSubPath);
		this.ensureNotSkipped("replace", resolvedSubPath);
		return new LocatorUpdateBuilderInternal<LocatorSchemaPathType, LocatorSubstring, typeof resolvedSubPath, "replace">(
			resolvedSubPath,
			"replace",
			(definition) => this.applyReplacement(resolvedSubPath, definition),
		);
	}

	private applyReplacement<SubPath extends LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, LocatorSubstring>>(
		subPath: SubPath,
		updates: LocatorUpdate,
	) {
		const nextDefinition = buildReplacementDefinition(updates, subPath);
		this.definitions.set(subPath, cloneLocatorStrategyDefinition(nextDefinition));
		return this;
	}

	/**
	 * Leaves an ancestor out of the chain when this query resolves, as if it were not registered. Nothing
	 * is deleted: `unskip` brings it back exactly as it was. The terminal path cannot be skipped, and a
	 * skipped segment rejects `update`, `replace`, `filter`, `nth` and `clearSteps` until `unskip`.
	 *
	 * @example
	 * ```ts
	 * getLocatorSchema("main.list.item").skip("main.list").getNestedLocator(); // locator('main').locator('li')
	 * ```
	 */
	skip<SubPath extends SkippablePaths<LocatorSchemaPathType, LocatorSubstring>>(
		subPath: SubPath,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring> {
		this.ensureSubPath(subPath);
		// the type excludes the terminal; JavaScript callers can still pass it
		if ((subPath as string) === this.path) {
			throw new Error(
				`skip() cannot skip "${subPath}": it is the path this query resolves; skip one of its ancestors.`,
			);
		}
		if (this.skipped.has(subPath)) {
			throw new Error(`skip() cannot skip "${subPath}": it is already skipped in this query.`);
		}
		this.skipped.add(subPath);
		return this;
	}

	/** Puts a segment left out with `skip` back into the chain, exactly as it was. */
	unskip<SubPath extends SkippablePaths<LocatorSchemaPathType, LocatorSubstring>>(
		subPath: SubPath,
	): LocatorQueryBuilder<LocatorSchemaPathType, LocatorSubstring> {
		this.ensureSubPath(subPath);
		if (!this.skipped.has(subPath)) {
			throw new Error(`unskip() cannot unskip "${subPath}": it is not skipped in this query.`);
		}
		this.skipped.delete(subPath);
		return this;
	}

	/**
	 * Resolves and returns the Playwright {@link Locator} for the terminal path of this builder,
	 * applying only the terminal definition and its steps; skipped ancestors make no difference.
	 *
	 * @example
	 * ```ts
	 * const locator = getLocatorSchema("form.submit").getLocator();
	 * ```
	 */
	getLocator(): Locator {
		return this.registry.buildLocatorChain(
			this.path,
			this.ensureSubPath(this.path),
			new Map(),
			this.steps,
			undefined,
			this.descriptions.get(this.path),
		);
	}

	/**
	 * Resolves the chained Playwright {@link Locator} for this builder’s root path, traversing each
	 * registered segment that is not skipped and applying recorded steps.
	 *
	 * @example
	 * ```ts
	 * const nested = getLocatorSchema("list.item")
	 *   .filter("list", { hasText: "List" })
	 *   .getNestedLocator();
	 * ```
	 */
	getNestedLocator(): Locator {
		return this.registry.buildLocatorChain(
			this.path,
			this.ensureSubPath(this.path),
			this.definitions,
			this.steps,
			this.skipped,
			this.descriptions.get(this.path),
		);
	}

	/** A sub-path is a registered segment of this query's chain; returns its definition in this query. */
	private ensureSubPath(subPath: string): LocatorStrategyDefinition {
		const definition = this.definitions.get(subPath);
		if (definition !== undefined) {
			return definition;
		}
		const reason = this.chain.has(subPath)
			? " It is a segment of that path, but no locator schema is registered for it."
			: "";
		throw new Error(`"${subPath}" is not a valid sub-path of "${this.path}".${reason}`);
	}

	private ensureNotSkipped(method: "update" | "replace" | "filter" | "nth" | "clearSteps", subPath: string) {
		if (this.skipped.has(subPath)) {
			throw new Error(
				`${method}() cannot apply to "${subPath}": it is skipped in this query; call unskip("${subPath}") first.`,
			);
		}
	}

	/** An any-frame segment has no element, so a filter or index step on it is rejected at the call. */
	private ensureStepTarget(subPath: string) {
		if (isAnyFrameDefinition(this.ensureSubPath(subPath))) {
			throw new Error(anyFrameNoElementMessage(subPath));
		}
	}
}

/** The sub-paths `skip` and `unskip` accept: the query's registered-path ancestors, never the path itself. */
type SkippablePaths<LocatorSchemaPathType extends string, Path extends RegistryPath<LocatorSchemaPathType>> = Exclude<
	LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>,
	Path
>;
