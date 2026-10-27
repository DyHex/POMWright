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
	anyFrameReplaceStepsMessage,
	anyFrameReplaceTerminalMessage,
	anyFrameStepsMessage,
	assertDescription,
	cloneLocatorStrategyDefinition,
	copyFilter,
	expandSchemaPath,
	isAnyFrameDefinition,
} from "./utils";

/**
 * A query, what `getLocatorSchema(path)` returns: a private copy of the path's chain to change for one use and then
 * resolve. Its methods change this query and return it; the registry never changes. A method that takes a `subPath`
 * works on that segment of the chain, the path itself or a registered ancestor; without one, on the path itself. The
 * `subPath` is typed per member of the path union: a literal member when it is a segment of the chain, a template member
 * for each segment it matches, and a `string` member as any string, which the runtime checks.
 *
 * @example
 * ```ts
 * export const lastRow = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.items"> =>
 *   registry.getLocatorSchema("list.items").nth("last");
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/
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
	 * Patches a segment's locator for this query and keeps its strategy, in JSON Merge Patch form; its steps and
	 * description stay.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#update
	 *
	 * @param subPath The segment: the query's path or one of its registered ancestors. Defaults to the query's path.
	 * @returns An update builder whose methods return this query.
	 * @throws When `subPath` is not a registered segment of the chain (`"main.button@save" is not a valid sub-path of
	 * "main.list.item".`), or when it is skipped in this query (`update() cannot apply to "main.list": it is skipped in
	 * this query; call unskip("main.list") first.`), at this call or, for a builder kept while the segment was skipped,
	 * when the builder's method applies the change.
	 *
	 * @example
	 * ```ts
	 * registry.getLocatorSchema("main.button@save").update().getByRole({ name: "Cancel" }).getNestedLocator();
	 * registry.getLocatorSchema("main.button@save").update().getByRole("button", null).getNestedLocator();
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
	 * Adds a `locator.filter()` step to a segment, after its registered steps: Playwright's filter options, where `has`
	 * and `hasNot` also take a registered path, resolved to that path's own locator.
	 *
	 * @param subPath The segment: the query's path or one of its registered ancestors. Defaults to the query's path.
	 * @param filter `hasText`, `hasNotText`, `has`, `hasNot` and `visible`, as Playwright's `locator.filter()` takes
	 * them.
	 * @returns This query.
	 * @throws When `subPath` is not a registered segment of the chain (`"main.button@save" is not a valid sub-path of
	 * "main.list.item".`), when it is skipped in this query (`filter() cannot apply to "main.list": it is skipped in this
	 * query; call unskip("main.list") first.`), or when it is a `frameLocator()` without a selector, which has no element
	 * (`filter() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or
	 * describe; …`).
	 *
	 * @example
	 * ```ts
	 * registry.getLocatorSchema("main.list.item").filter({ hasText: "#1042" }).getNestedLocator();
	 * registry.getLocatorSchema("main.list.item").filter("main.list", { hasText: "Open" }).getNestedLocator();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#filter
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
		this.ensureStepTarget("filter", resolvedSubPath);
		const existing = this.steps.get(resolvedSubPath) ?? [];
		existing.push({ kind: "filter", filter: copyFilter(filter) });
		this.steps.set(resolvedSubPath, existing);
		return this;
	}

	/**
	 * Removes the `filter` and `nth` steps of a segment in this query, registered and added; its locator and description
	 * stay.
	 *
	 * @param subPath The segment: the query's path or one of its registered ancestors. Defaults to the query's path.
	 * @returns This query.
	 * @throws When `subPath` is not a registered segment of the chain (`"main.button@save" is not a valid sub-path of
	 * "main.list.item".`), or when it is skipped in this query (`clearSteps() cannot apply to "main.list": it is skipped
	 * in this query; call unskip("main.list") first.`).
	 *
	 * @example
	 * ```ts
	 * registry.getLocatorSchema("main.list.item").clearSteps().nth("last").getNestedLocator();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#clearsteps
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
	 * Adds an index step to a segment, after its registered steps: `"first"` and `"last"` become Playwright's `first()`
	 * and `last()`, a number goes to `nth()` as given (`-1` is the last element).
	 *
	 * @param subPath The segment: the query's path or one of its registered ancestors. Defaults to the query's path.
	 * @param index A number, `"first"` or `"last"`.
	 * @returns This query.
	 * @throws When `subPath` is not a registered segment of the chain (`"main.button@save" is not a valid sub-path of
	 * "main.list.item".`), when it is skipped in this query (`nth() cannot apply to "main.list": it is skipped in this
	 * query; call unskip("main.list") first.`), or when it is a `frameLocator()` without a selector, which has no element
	 * (`nth() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe;
	 * …`).
	 *
	 * @example
	 * ```ts
	 * registry.getLocatorSchema("main.list.item").nth(2).getNestedLocator();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#nth
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
		this.ensureStepTarget("nth", resolvedSubPath);
		const existing = this.steps.get(resolvedSubPath) ?? [];
		existing.push({ kind: "index", index });
		this.steps.set(resolvedSubPath, existing);
		return this;
	}

	/**
	 * Sets the description of the locator this query resolves; `""` removes it.
	 *
	 * @param description A string; `""` removes the description.
	 * @returns This query.
	 * @throws When the description is not a string (from JavaScript):
	 * `describe requires a string for "main.list.item"; pass "" to remove the description.`
	 *
	 * @example
	 * ```ts
	 * registry.getLocatorSchema("main.list.item").describe("First order").getNestedLocator();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#describe
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
		// checked again here: a builder kept from before a skip() must not change the skipped segment
		this.ensureNotSkipped("update", subPath);
		const merged = mergeLocatorDefinition(this.ensureSubPath(subPath), updates, subPath);
		this.definitions.set(subPath, cloneLocatorStrategyDefinition(merged));
		return this;
	}

	/**
	 * Replaces a segment's locator for this query with one of any strategy, with Playwright's arguments; its steps and
	 * description stay.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#replace
	 *
	 * @param subPath The segment: the query's path or one of its registered ancestors. Defaults to the query's path.
	 * @returns An update builder whose methods return this query.
	 * @throws When `subPath` is not a registered segment of the chain (`"main.button@save" is not a valid sub-path of
	 * "main.list.item".`), or when it is skipped in this query (`replace() cannot apply to "main.list": it is skipped in
	 * this query; call unskip("main.list") first.`), at this call or, for a builder kept while the segment was skipped,
	 * when the builder's method applies the change.
	 *
	 * @example
	 * ```ts
	 * registry.getLocatorSchema("main.list.item").replace("main.list").getByRole("list", { name: "Orders" }).getNestedLocator();
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
		this.ensureNotSkipped("replace", subPath);
		const nextDefinition = buildReplacementDefinition(updates, subPath);
		// the any-frame form has no element: it cannot be what this query resolves, nor carry steps
		if (isAnyFrameDefinition(nextDefinition)) {
			if ((subPath as string) === this.path) {
				throw new Error(anyFrameReplaceTerminalMessage(subPath));
			}
			if ((this.steps.get(subPath) ?? []).length > 0) {
				throw new Error(anyFrameReplaceStepsMessage(subPath));
			}
		}
		this.definitions.set(subPath, cloneLocatorStrategyDefinition(nextDefinition));
		return this;
	}

	/**
	 * Leaves an ancestor out of the chain when this query resolves; `unskip` brings it back as it was. Until then,
	 * `update`, `replace`, `filter`, `nth` and `clearSteps` on it throw.
	 *
	 * @param subPath A registered ancestor of the query's path; the path itself cannot be skipped.
	 * @returns This query.
	 * @throws When the segment is skipped already
	 * (`skip() cannot skip "main.list": it is already skipped in this query.`), or when it is the query's path (from
	 * JavaScript).
	 *
	 * @example
	 * ```ts
	 * registry.getLocatorSchema("main.list.item").skip("main.list").getNestedLocator();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#skip
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

	/**
	 * Puts a segment left out with `skip` back into the chain, with everything it had.
	 *
	 * @param subPath A segment skipped in this query.
	 * @returns This query.
	 * @throws When the segment is not skipped: `unskip() cannot unskip "main.list": it is not skipped in this query.`
	 *
	 * @example
	 * ```ts
	 * query.unskip("main.list").getNestedLocator();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#unskip
	 */
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
	 * Resolves the query's path alone, with its steps and description, as `getLocator(path)` on the registry does;
	 * changes to its ancestors make no difference to it.
	 *
	 * @returns A Playwright `Locator`.
	 *
	 * @example
	 * ```ts
	 * const item = registry.getLocatorSchema("main.list.item").nth("last").getLocator();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#getlocator
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
	 * Resolves the query's chain: every registered segment that is not skipped, first to last, each with its steps, as
	 * `getNestedLocator(path)` on the registry does.
	 *
	 * @returns A Playwright `Locator`.
	 * @throws When a segment cannot be resolved, as `getNestedLocator(path)` throws.
	 *
	 * @example
	 * ```ts
	 * await registry.getLocatorSchema("main.list.item").filter({ hasText: "Open" }).getNestedLocator().click();
	 * ```
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorquerybuilder/#getnestedlocator
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
	private ensureStepTarget(method: "filter" | "nth", subPath: string) {
		if (isAnyFrameDefinition(this.ensureSubPath(subPath))) {
			throw new Error(anyFrameStepsMessage(`${method}()`, subPath));
		}
	}
}

/** The sub-paths `skip` and `unskip` accept: the query's registered-path ancestors, never the path itself. */
type SkippablePaths<LocatorSchemaPathType extends string, Path extends RegistryPath<LocatorSchemaPathType>> = Exclude<
	LocatorChainPaths<RegistryPath<LocatorSchemaPathType>, Path>,
	Path
>;
