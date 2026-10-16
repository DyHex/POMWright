import type { Locator, Page } from "@playwright/test";
import { type LocatorQueryBuilder, LocatorQueryBuilderInternal } from "./locatorQueryBuilder";
import {
	LocatorRegistrationBuilder,
	type LocatorRegistrationPostDefinitionBuilder,
	type LocatorRegistrationPreDefinitionBuilder,
	type LocatorRegistrationSeededBuilderForType,
} from "./locatorRegistrationBuilder";
import { ReusableLocatorFactory } from "./reusableLocatorBuilder";
import type {
	FilterDefinition,
	FilterLocatorReference,
	LocatorBuilderTarget,
	LocatorDescription,
	LocatorSchemaPathFormat,
	LocatorSchemaRecord,
	LocatorStep,
	LocatorStrategyDefinition,
	PlaywrightFilterDefinition,
	RegistryPath,
	ReusableLocator,
} from "./types";
import {
	anyFrameNoElementMessage,
	anyFrameNotFirstMessage,
	applyIndexSelector,
	cloneLocatorStrategyDefinition,
	createLocator,
	expandSchemaPath,
	isAnyFrameDefinition,
	isFrameLocatorDefinition,
	isLocatorInstance,
	isReusableLocator,
	normalizeSteps,
	stringifyForLog,
	validateLocatorSchemaPath,
} from "./utils";

/**
 * The type of every accessor's path parameter: the path itself when it is well-formed, otherwise the
 * tuple of `LocatorSchemaPathFormat` naming the rule it breaks. A helper that forwards a path from a
 * class generic in its path union declares its parameter with it.
 *
 * @example
 * ```ts
 * abstract class ShopApp<Paths extends string> extends PageObject<Paths> {
 *   async clickOn<Path extends Paths>(path: LocatorSchemaPathArgument<Path>) {
 *     await this.getNestedLocator(path).click();
 *   }
 * }
 * ```
 */
export type LocatorSchemaPathArgument<Path extends string> =
	LocatorSchemaPathFormat<Path> extends Path ? Path : LocatorSchemaPathFormat<Path>;

type InvalidReusePath<Path extends string> = [
	`Invalid reuse path, reuse path cannot be the same as registration path: ${Path}`,
];

type ReusePathArgument<Paths extends string, Path extends Paths, ReusePath extends Paths> =
	Exclude<ReusePath, Path> extends never ? InvalidReusePath<Path> : LocatorSchemaPathArgument<ReusePath>;

export class LocatorRegistryInternal<LocatorSchemaPathType extends string> {
	private readonly schemas = new Map<
		RegistryPath<LocatorSchemaPathType>,
		LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>
	>();

	/**
	 * Factory for reusable locator seeds that capture a locator strategy plus any chained
	 * `filter`/`nth` steps without registering them. A seed is a value, like a Playwright
	 * `Locator`: `filter`, `nth` and `describe` return a new seed. Pass a seed to
	 * {@link LocatorRegistryInternal.add} via `{ reuse }` to register a path that inherits the
	 * stored definition and steps; to share a locator between locator modules, reusing a
	 * registered path is usually simpler.
	 *
	 * @example
	 * ```ts
	 * const seed = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });
	 * registry.add("hero.title", { reuse: seed }).getByRole({ name: "Summary" });
	 * ```
	 */
	readonly createReusable: ReusableLocatorFactory<LocatorSchemaPathType>;

	constructor(private readonly page: Page) {
		this.createReusable = new ReusableLocatorFactory<LocatorSchemaPathType>();
	}

	private normalizeRecord(record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>) {
		return {
			locatorSchemaPath: record.locatorSchemaPath,
			// copies: the registry keeps nothing a caller still holds
			definition: cloneLocatorStrategyDefinition(record.definition),
			steps: normalizeSteps<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>(record.steps),
			...(record.description !== undefined ? { description: record.description } : {}),
		} satisfies LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;
	}

	private cloneRecordForReuse(
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
		path: RegistryPath<LocatorSchemaPathType>,
	) {
		return {
			locatorSchemaPath: path,
			definition: cloneLocatorStrategyDefinition(record.definition),
			steps: normalizeSteps<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>(record.steps),
			...(record.description !== undefined ? { description: record.description } : {}),
		} satisfies LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;
	}

	/**
	 * Registers a locator schema at the provided dot-delimited path.
	 * Accepts exactly one locator strategy (`getByRole`, `locator`, etc.) and any number of
	 * `filter`/`nth` steps chained in call order; calling a second strategy throws.
	 *
	 * With `{ reuse: "other.path" }` the path is registered at once as a copy of that registered
	 * path (its strategy, its steps and an explicit description), and `filter`, `nth` and
	 * `describe` narrow the copy after the copied steps; there is no strategy override, the source
	 * never changes, and a copy of an any-frame `frameLocator()` takes no steps.
	 *
	 * With `{ reuse: seed }` (from `createReusable`) the seed is registered at once, and one
	 * override of the seed's strategy may come first as a PATCH, as `update()` patches, followed
	 * by `filter`, `nth` and `describe`. Any other reuse value throws.
	 *
	 * @example
	 * ```ts
	 * registry
	 *   .add("list.item")
	 *   .getByRole("listitem", { name: /Row/ })
	 *   .filter({ hasText: "Row" })
	 *   .nth("last");
	 * registry.add("list.lastItem", { reuse: "list.item" }).describe("Last row");
	 * ```
	 */
	add<
		Path extends LocatorSchemaPathType,
		Reuse extends LocatorSchemaPathType | ReusableLocator<LocatorSchemaPathType> | undefined = undefined,
	>(
		path: LocatorSchemaPathArgument<Path>,
		...args: Reuse extends undefined
			? []
			: [
					options: {
						reuse: Reuse extends LocatorSchemaPathType
							? ReusePathArgument<LocatorSchemaPathType, Path, Reuse>
							: Extract<Reuse, ReusableLocator<LocatorSchemaPathType>>;
					},
				]
	): Reuse extends undefined
		? LocatorRegistrationPreDefinitionBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>
		: Reuse extends LocatorSchemaPathType
			? LocatorRegistrationPostDefinitionBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>
			: LocatorRegistrationSeededBuilderForType<
					LocatorSchemaPathType,
					RegistryPath<LocatorSchemaPathType>,
					Extract<Reuse, ReusableLocator<LocatorSchemaPathType>>["type"]
				> {
		const options = args[0] as
			| {
					reuse?:
						| ReusableLocator<LocatorSchemaPathType>
						| LocatorSchemaPathType
						| InvalidReusePath<RegistryPath<LocatorSchemaPathType>>;
			  }
			| undefined;
		const reuse = options?.reuse;

		if (reuse === undefined) {
			return new LocatorRegistrationBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, false>(
				this,
				path as RegistryPath<LocatorSchemaPathType>,
			) as never;
		}

		if (typeof reuse === "string") {
			const targetPath = path as RegistryPath<LocatorSchemaPathType>;
			if (reuse === targetPath) {
				throw new Error(`Locator reuse path cannot be the same as registration path: "${targetPath}".`);
			}
			const sourceRecord = this.get(reuse as RegistryPath<LocatorSchemaPathType>);
			// a registered record is a seed: its strategy, steps and description, then filter, nth and describe
			return this.seededBuilder(
				targetPath,
				this.cloneRecordForReuse(sourceRecord, targetPath),
			).viewAfterReuse() as never;
		}

		if (Array.isArray(reuse)) {
			const [reason] = reuse;
			throw new Error(`Invalid reuse path configuration for "${path}": ${reason}`);
		}

		if (!isReusableLocator(reuse)) {
			throw new Error(`reuse requires a registered path or a seed from createReusable for "${path}".`);
		}

		const reusedRecord: LocatorSchemaRecord<
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		> = this.cloneRecordForReuse(
			{
				locatorSchemaPath: path as RegistryPath<LocatorSchemaPathType>,
				definition: reuse.definition,
				steps: reuse.steps,
				description: reuse.description,
			},
			path as RegistryPath<LocatorSchemaPathType>,
		);

		return this.seededBuilder(path as RegistryPath<LocatorSchemaPathType>, reusedRecord) as never;
	}

	private seededBuilder(
		path: RegistryPath<LocatorSchemaPathType>,
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
	) {
		return new LocatorRegistrationBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, true>(
			this,
			path,
			{
				initialDefinition: record.definition,
				initialSteps: record.steps,
				reuseType: record.definition.type,
				initialDescription: record.description,
			},
		).persistSeededDefinition();
	}

	register(
		path: RegistryPath<LocatorSchemaPathType>,
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
	) {
		validateLocatorSchemaPath(path);
		const existing = this.schemas.get(path);
		if (existing) {
			const errorDetails = stringifyForLog({ existing, attempted: record });
			throw new Error(`A locator schema with the path "${path}" already exists.\nExisting Schema: ${errorDetails}`);
		}
		this.schemas.set(path, this.normalizeRecord(record));
	}

	replace(
		path: RegistryPath<LocatorSchemaPathType>,
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
	) {
		validateLocatorSchemaPath(path);
		if (!this.schemas.has(path)) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
		this.schemas.set(path, this.normalizeRecord(record));
	}

	get(
		path: RegistryPath<LocatorSchemaPathType>,
	): LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>> {
		const record = this.getIfExists(path);
		if (!record) {
			throw new Error(`No locator schema registered for path "${path}".`);
		}
		return record;
	}

	getIfExists(
		path: RegistryPath<LocatorSchemaPathType>,
	): LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>> | undefined {
		const record = this.schemas.get(path);
		if (!record) {
			return undefined;
		}

		return {
			locatorSchemaPath: record.locatorSchemaPath,
			definition: cloneLocatorStrategyDefinition(record.definition),
			steps: normalizeSteps(record.steps),
			...(record.description !== undefined ? { description: record.description } : {}),
		} satisfies LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>;
	}

	private resolveFilterLocator(
		locatorReference: FilterLocatorReference<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
		context: {
			rootPath: RegistryPath<LocatorSchemaPathType>;
			resolvingPaths: Set<string>;
		},
	) {
		if (isLocatorInstance(locatorReference)) {
			return locatorReference;
		}

		if (typeof locatorReference === "string") {
			return this.getLocatorWithContext(locatorReference as RegistryPath<LocatorSchemaPathType>, context);
		}

		throw new Error(
			`Unsupported filter reference while resolving "${context.rootPath}". ` +
				"Filter has/hasNot supports Playwright Locator instances or registry path strings.",
		);
	}

	private createResolutionContext(rootPath: RegistryPath<LocatorSchemaPathType>) {
		return {
			rootPath,
			resolvingPaths: new Set<string>(),
		};
	}

	private getLocatorWithContext(
		path: RegistryPath<LocatorSchemaPathType>,
		context: {
			rootPath: RegistryPath<LocatorSchemaPathType>;
			resolvingPaths: Set<string>;
		},
	) {
		if (context.resolvingPaths.has(path)) {
			throw new Error(`Detected cyclic filter reference while resolving "${context.rootPath}": "${path}".`);
		}

		context.resolvingPaths.add(path);
		try {
			return this.resolveRecord(path, this.get(path), context);
		} finally {
			context.resolvingPaths.delete(path);
		}
	}

	private resolveFilter(
		filter: FilterDefinition<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>,
		context: {
			rootPath: RegistryPath<LocatorSchemaPathType>;
			resolvingPaths: Set<string>;
		},
	): PlaywrightFilterDefinition {
		if (typeof filter !== "object" || filter === null || !("has" in filter || "hasNot" in filter)) {
			return filter as PlaywrightFilterDefinition;
		}
		const { has, hasNot, ...rest } = filter;
		const resolved: PlaywrightFilterDefinition = { ...rest };
		if (has !== undefined) {
			resolved.has = this.resolveFilterLocator(has, context);
		}
		if (hasNot !== undefined) {
			resolved.hasNot = this.resolveFilterLocator(hasNot, context);
		}
		return resolved;
	}

	/** The terminal-only resolution of a record: its definition and its own steps, no ancestors. */
	private resolveRecord(
		path: RegistryPath<LocatorSchemaPathType>,
		record: LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>,
		context?: {
			rootPath: RegistryPath<LocatorSchemaPathType>;
			resolvingPaths: Set<string>;
		},
	): Locator {
		return this.buildLocatorChain(
			path,
			record.definition,
			new Map(),
			new Map([[path, record.steps ?? []]]),
			undefined,
			record.description,
			context,
		);
	}

	/**
	 * Returns a mutable query builder clone for the provided path. Use the builder to add or clear
	 * `filter`/`nth` steps, or to `update`/`replace` locator definitions before resolving locators.
	 * Changes affect only the builder clone; the registry’s stored schema remains untouched.
	 *
	 * @example
	 * ```ts
	 * const builder = registry
	 *   .getLocatorSchema("section.button")
	 *   .filter("section.button", { hasText: /Save/ })
	 *   .nth("section", 0);
	 * const locator = builder.getNestedLocator();
	 * ```
	 */
	getLocatorSchema<Path extends LocatorSchemaPathType>(
		path: LocatorSchemaPathArgument<Path>,
	): LocatorQueryBuilder<LocatorSchemaPathType, Extract<Path, RegistryPath<LocatorSchemaPathType>>> {
		return new LocatorQueryBuilderInternal<LocatorSchemaPathType, Extract<Path, RegistryPath<LocatorSchemaPathType>>>(
			this,
			path as Extract<Path, RegistryPath<LocatorSchemaPathType>>,
		);
	}

	/**
	 * Checks every registered path once and reports every failure together. A path with a selector is
	 * resolved terminal-only, as `getLocator` does, which evaluates its `has`/`hasNot` path references
	 * through the normal resolution (unregistered targets, cycles, unsupported reference values); an
	 * any-frame path is checked against its first-segment rule instead, since it has no terminal form.
	 * Nothing touches the DOM. `PageObject` calls this right after `defineLocators()`; a standalone
	 * registry calls it after registration.
	 *
	 * @example
	 * ```ts
	 * registry.add("list.item").getByRole("listitem").filter({ has: "list.titel" });
	 * registry.verify();
	 * // Locator registry verification failed for 1 of 1 paths:
	 * //   "list.item": No locator schema registered for path "list.titel".
	 * ```
	 */
	verify(): void {
		const failures: string[] = [];
		for (const [path, record] of this.schemas) {
			try {
				if (isAnyFrameDefinition(record.definition)) {
					const ancestor = expandSchemaPath(path)
						.slice(0, -1)
						.find((part) => this.schemas.has(part as RegistryPath<LocatorSchemaPathType>));
					if (ancestor !== undefined) {
						throw new Error(anyFrameNotFirstMessage(path, ancestor));
					}
				} else {
					// the terminal-only build of getLocator, so a cycle is reported as getLocator would report it
					this.resolveRecord(path, this.get(path));
				}
			} catch (error) {
				failures.push(`"${path}": ${error instanceof Error ? error.message : String(error)}`);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`Locator registry verification failed for ${failures.length} of ${this.schemas.size} paths:\n  ${failures.join("\n  ")}`,
			);
		}
	}

	/**
	 * Resolves the Playwright {@link Locator} for the provided path, applying only the terminal
	 * definition and its recorded steps (no ancestor chaining). Throws if the path is not registered.
	 *
	 * @example
	 * ```ts
	 * const button = registry.getLocator("form.submit");
	 * await button.click();
	 * ```
	 */
	getLocator<Path extends LocatorSchemaPathType>(path: LocatorSchemaPathArgument<Path>): Locator {
		const target = path as RegistryPath<LocatorSchemaPathType>;
		validateLocatorSchemaPath(target);
		return this.resolveRecord(target, this.get(target));
	}

	/**
	 * Resolves a chained Playwright {@link Locator} for a nested path, traversing each registered
	 * segment and applying their steps in order. Throws if any segment in the chain is missing.
	 *
	 * @example
	 * ```ts
	 * const nested = registry.getNestedLocator("list.item");
	 * await expect(nested).toBeVisible();
	 * ```
	 */
	getNestedLocator<Path extends LocatorSchemaPathType>(path: LocatorSchemaPathArgument<Path>): Locator {
		return this.getLocatorSchema(path).getNestedLocator();
	}

	/**
	 * Resolves `path`: its registered ancestors in `definitions`, minus the `skipped` ones, in chain order,
	 * then `terminal`. An empty `definitions` map is the terminal-only resolution of `getLocator`.
	 */
	buildLocatorChain(
		path: RegistryPath<LocatorSchemaPathType>,
		terminal: LocatorStrategyDefinition,
		definitions: ReadonlyMap<string, LocatorStrategyDefinition>,
		steps: ReadonlyMap<string, LocatorStep<RegistryPath<LocatorSchemaPathType>, RegistryPath<LocatorSchemaPathType>>[]>,
		skipped?: ReadonlySet<string>,
		terminalDescription?: LocatorDescription,
		context?: {
			rootPath: RegistryPath<LocatorSchemaPathType>;
			resolvingPaths: Set<string>;
		},
	): Locator {
		const resolutionContext = context ?? this.createResolutionContext(path);
		// the registered ancestors in chain order; an unregistered or skipped one is left out
		const ancestors = expandSchemaPath(path)
			.slice(0, -1)
			.flatMap((part) => {
				const definition = definitions.get(part);
				return definition === undefined || skipped?.has(part) ? [] : [{ part, definition }];
			});

		let currentTarget: LocatorBuilderTarget = this.page;
		let previousPart: string | undefined;

		// Every strategy, frames included, is an element locator followed by its steps in chain order.
		const resolveSegment = (part: string, definition: LocatorStrategyDefinition): Locator => {
			let resolvedLocator = createLocator(currentTarget, definition);
			for (const step of steps.get(part) ?? []) {
				resolvedLocator =
					step.kind === "filter"
						? resolvedLocator.filter(this.resolveFilter(step.filter, resolutionContext))
						: applyIndexSelector(resolvedLocator, step.index);
			}
			previousPart = part;
			return resolvedLocator;
		};

		for (const { part, definition } of ancestors) {
			// The any-frame segment is Playwright's page.frameLocator(): it exists only at the start of a
			// selector, has no element to step on or to return, and enters whichever single frame matches.
			if (isAnyFrameDefinition(definition)) {
				if (currentTarget !== this.page) {
					throw new Error(anyFrameNotFirstMessage(part, previousPart ?? path));
				}
				if ((steps.get(part) ?? []).length > 0) {
					throw new Error(anyFrameNoElementMessage(part));
				}
				currentTarget = this.page.frameLocator();
				previousPart = part;
				continue;
			}
			const locator = resolveSegment(part, definition);
			// a frame segment enters the frame for its descendants; as the terminal it is the <iframe> element
			currentTarget = isFrameLocatorDefinition(definition) ? locator.contentFrame() : locator;
		}

		if (isAnyFrameDefinition(terminal)) {
			if (currentTarget !== this.page) {
				throw new Error(anyFrameNotFirstMessage(path, previousPart ?? path));
			}
			throw new Error(anyFrameNoElementMessage(path));
		}
		return resolveSegment(path, terminal).describe(terminalDescription ?? path);
	}
}

export type GetLocatorAccessor<LocatorSchemaPathType extends string> = <Path extends LocatorSchemaPathType>(
	path: LocatorSchemaPathArgument<Path>,
) => Locator;

export type AddAccessor<LocatorSchemaPathType extends string> = LocatorRegistryInternal<LocatorSchemaPathType>["add"];

export type GetLocatorSchemaAccessor<LocatorSchemaPathType extends string> = <Path extends LocatorSchemaPathType>(
	path: LocatorSchemaPathArgument<Path>,
) => LocatorQueryBuilder<LocatorSchemaPathType, Extract<Path, RegistryPath<LocatorSchemaPathType>>>;

export type GetNestedLocatorAccessor<LocatorSchemaPathType extends string> = <Path extends LocatorSchemaPathType>(
	path: LocatorSchemaPathArgument<Path>,
) => Locator;

export type LocatorRegistry<LocatorSchemaPathType extends string> = Pick<
	LocatorRegistryInternal<LocatorSchemaPathType>,
	"add" | "createReusable" | "getLocator" | "getLocatorSchema" | "getNestedLocator" | "verify"
>;

/**
 * Creates a v2 locator registry bound to a Playwright {@link Page} and returns the registry plus
 * pre-bound helpers for ergonomic use in page objects and tests. Path unions are validated at
 * compile time and runtime. The returned `add`/`getLocator`/`getNestedLocator`/`getLocatorSchema`
 * accessors are pre-bound to the registry instance for dependency injection.
 *
 * @example
 * ```ts
 * const { registry, add, getNestedLocator, getLocatorSchema } =
 *   createRegistryWithAccessors<"root" | "root.child">(page);
 *
 * registry.add("root").locator("section");
 * registry.add("root.child").getByRole("heading", { level: 2 });
 *
 * const nested = getNestedLocator("root.child");
 * const patched = getLocatorSchema("root.child").filter("root.child", { hasText: /Docs/ }).getNestedLocator();
 * ```
 */
export const createRegistryWithAccessors = <Paths extends string>(page: Page) => {
	const registryInstance = new LocatorRegistryInternal<Paths>(page);
	const add: LocatorRegistryInternal<Paths>["add"] = registryInstance.add.bind(registryInstance);
	const getLocator: GetLocatorAccessor<Paths> = registryInstance.getLocator.bind(registryInstance);
	const getNestedLocator: GetNestedLocatorAccessor<Paths> = registryInstance.getNestedLocator.bind(registryInstance);
	const getLocatorSchema: GetLocatorSchemaAccessor<Paths> = registryInstance.getLocatorSchema.bind(registryInstance);
	const registry: LocatorRegistry<Paths> = registryInstance;
	return { registry, add, getLocator, getNestedLocator, getLocatorSchema } as const;
};
