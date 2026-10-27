import type { Locator, Page } from "@playwright/test";
import { type LocatorQueryBuilder, LocatorQueryBuilderInternal } from "./locatorQueryBuilder";
import {
	LocatorRegistrationBuilder,
	type LocatorRegistrationPostDefinitionBuilder,
	type LocatorRegistrationPreDefinitionBuilder,
	type LocatorRegistrationSeededBuilderForType,
	type RegistrationEnd,
} from "./locatorRegistrationBuilder";
import { type ReusableLocatorFactory, ReusableLocatorFactoryInternal } from "./reusableLocatorBuilder";
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
	assertStrategyPrimary,
	cloneLocatorStrategyDefinition,
	createLocator,
	expandSchemaPath,
	isAnyFrameDefinition,
	isFrameLocatorDefinition,
	isLocatorInstance,
	isReusableLocator,
	normalizeSteps,
	strategyOf,
	stringifyForLog,
	validateLocatorSchemaPath,
} from "./utils";

/**
 * The default of `createRegistryWithAccessors`' type parameter: a registry created without its paths takes no path, and
 * the compile error at its first path says what is missing. `<string>` keeps paths unchecked at compile time.
 */
type NeedsPaths =
	"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)";

/**
 * The type of the path parameter of `add` and the resolving methods: the path itself when it is well-formed,
 * otherwise the tuple of `LocatorSchemaPathFormat` naming the rule it breaks. A helper in a base class that is generic
 * in its paths takes its path parameter with it, so a misspelt path is a compile error where the helper is called. On a
 * registry created without its paths, every path is a compile error saying so.
 *
 * @example
 * ```ts
 * abstract class ShopApp<Paths extends string> extends PageObject<Paths> {
 *   async clickOn<Path extends Paths>(path: LocatorSchemaPathArgument<Path>) {
 *     await this.getNestedLocator(path).click();
 *   }
 * }
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/types/#locatorschemapathargument
 */
export type LocatorSchemaPathArgument<Path extends string> = [Path] extends [NeedsPaths]
	? NeedsPaths
	: LocatorSchemaPathFormat<Path> extends Path
		? Path
		: LocatorSchemaPathFormat<Path>;

/**
 * Checks a path at the call, since the types may not have (a wide string, JavaScript), and narrows it to a registry
 * path, so the check and the type cannot be separated by a later change.
 */
function assertRegistryPath<Paths extends string, P extends string = Paths>(
	path: unknown,
): asserts path is P & RegistryPath<Paths> {
	validateLocatorSchemaPath(path);
}

type InvalidReusePath<Path extends string> = [
	`Invalid reuse path, reuse path cannot be the same as registration path: ${Path}`,
];

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** A single string literal: not `string`, not a pattern such as `` `list.item@${string}` ``, not a union. */
type IsSingleLiteral<T extends string> = string extends T
	? false
	: // biome-ignore lint/complexity/noBannedTypes: {} fits Record<T, unknown> only when T is a pattern, not a literal
		{} extends Record<T, unknown>
		? false
		: [T] extends [UnionToIntersection<T>]
			? true
			: false;

/**
 * A reuse path that is the registration path is a compile error only when both are one and the same literal; a union,
 * `string` or a pattern may hold other values, so the runtime checks it.
 */
type ReusePathArgument<Paths extends string, Path extends Paths, ReusePath extends Paths> =
	IsSingleLiteral<Path> extends true
		? Exclude<ReusePath, Path> extends never
			? InvalidReusePath<Path>
			: LocatorSchemaPathArgument<ReusePath>
		: LocatorSchemaPathArgument<ReusePath>;

/**
 * The options of a registry: the second argument of `createRegistryWithAccessors`, and the `locators` option of a
 * `PageObject`.
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#locatorregistryoptions
 */
export type LocatorRegistryOptions = {
	/**
	 * `true` makes `verify()` require every ancestor of every registered path to be registered too, naming each one
	 * that is not. Defaults to `false`: an unregistered segment is a name that groups paths and is left out of the
	 * chain.
	 */
	strictChains?: boolean;
};

const strictChainsMessage = (missing: readonly string[]) => {
	const names = missing.map((part) => `"${part}"`);
	const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
	return `strictChains requires every ancestor to be registered; ${list} ${names.length === 1 ? "is" : "are"} not.`;
};

export class LocatorRegistryInternal<LocatorSchemaPathType extends string> {
	private readonly schemas = new Map<
		RegistryPath<LocatorSchemaPathType>,
		LocatorSchemaRecord<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>>
	>();

	/**
	 * Makes seeds: a locator strategy with its arguments, then `filter`, `nth` and `describe` steps, registered under
	 * no path. `add(path, { reuse: seed })` registers a seed at a path. A seed is a value, as a Playwright `Locator` is:
	 * its `filter`, `nth` and `describe` return a new seed and leave it as it was.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#createreusable
	 *
	 * @example
	 * ```ts
	 * const heading = registry.createReusable.getByRole("heading", { level: 2 });
	 * registry.add("main.heading@orders", { reuse: heading.filter({ hasText: "Orders" }) });
	 * ```
	 */
	readonly createReusable: ReusableLocatorFactory<LocatorSchemaPathType>;

	private readonly strictChains: boolean;

	/** The registration the latest `add(path)` started; the next call on the registry ends it. */
	private openRegistration: { end(by: RegistrationEnd): void } | undefined;

	/**
	 * Ends the open registration, so a registration kept in a variable can no longer change its path. The call that ends
	 * it, `method` with `path`, is described for the ended registration's error only when one is open: every registry
	 * call comes here, and most find nothing open. `resolves` marks a `getLocator` or `getNestedLocator`.
	 */
	private endOpenRegistration(method: string, path?: string, resolves = false): void {
		if (this.openRegistration === undefined) {
			return;
		}
		const by: RegistrationEnd =
			method === "resolution"
				? { call: `a query's resolution of "${path}"`, query: true }
				: {
						call: path === undefined ? `${method}()` : `${method}("${path}")`,
						resolvedPath: resolves ? path : undefined,
						...(method === "getLocatorSchema" ? { query: true as const } : {}),
					};
		this.openRegistration.end(by);
		this.openRegistration = undefined;
	}

	constructor(
		private readonly page: Page,
		options?: LocatorRegistryOptions,
	) {
		this.createReusable = new ReusableLocatorFactoryInternal<LocatorSchemaPathType>();
		this.strictChains = options?.strictChains === true;
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

	/** Registers a locator at a path. Consumers see `LocatorRegistry`'s `add`, which carries the doc comment. */
	add<
		Path extends LocatorSchemaPathType,
		Reuse extends LocatorSchemaPathType | ReusableLocator<LocatorSchemaPathType> | undefined = undefined,
	>(
		path: LocatorSchemaPathArgument<Path>,
		// not distributive: a union-typed reuse is checked as one argument
		...args: [Reuse] extends [undefined]
			? []
			: [
					options: {
						reuse: [Reuse] extends [LocatorSchemaPathType]
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
		this.endOpenRegistration("add", String(path));
		assertRegistryPath<LocatorSchemaPathType>(path);
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
			const builder = new LocatorRegistrationBuilder<LocatorSchemaPathType, RegistryPath<LocatorSchemaPathType>, false>(
				this,
				path,
			);
			this.openRegistration = builder;
			return builder as never;
		}

		if (typeof reuse === "string") {
			const targetPath = path;
			if (reuse === targetPath) {
				throw new Error(`Locator reuse path cannot be the same as registration path: "${targetPath}".`);
			}
			const sourceRecord = this.get(reuse as RegistryPath<LocatorSchemaPathType>);
			// a registered record is a seed: its strategy, steps and description, then filter, nth and describe
			const builder = this.seededBuilder(targetPath, this.cloneRecordForReuse(sourceRecord, targetPath));
			this.openRegistration = builder;
			return builder.viewAfterReuse() as never;
		}

		if (Array.isArray(reuse)) {
			const [reason] = reuse;
			throw new Error(`Invalid reuse path configuration for "${path}": ${reason}`);
		}

		if (!isReusableLocator(reuse)) {
			throw new Error(`reuse requires a registered path or a seed from createReusable for "${path}".`);
		}
		// a seed from createReusable passed this check when it was made; a hand-made one gets it here
		const seedDefinition = reuse.definition;
		if (!isAnyFrameDefinition(seedDefinition)) {
			const primary = (seedDefinition as unknown as Record<string, unknown>)[strategyOf(seedDefinition.type).primary];
			assertStrategyPrimary(seedDefinition.type, primary, { method: "reuse", path: path as string });
		}

		const reusedRecord: LocatorSchemaRecord<
			LocatorSchemaPathType,
			RegistryPath<LocatorSchemaPathType>
		> = this.cloneRecordForReuse(
			{
				locatorSchemaPath: path,
				definition: reuse.definition,
				steps: reuse.steps,
				description: reuse.description,
			},
			path,
		);

		const builder = this.seededBuilder(path, reusedRecord);
		this.openRegistration = builder;
		return builder as never;
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
			throw new Error(
				`A locator schema with the path "${path}" already exists.\nExisting and attempted schemas: ${errorDetails}`,
			);
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

	/** Whether a path has a record now, without copying it: a kept query's error asks, since its own copy is older. */
	has(path: string): boolean {
		return this.schemas.has(path as RegistryPath<LocatorSchemaPathType>);
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
	 * Starts a query of a path: a private copy of its chain to change for one use and then resolve. The registry never
	 * changes.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#getlocatorschema
	 *
	 * @param path A registered path.
	 * @returns The query, a `LocatorQueryBuilder`.
	 * @throws When the path is not registered: `No locator schema registered for path "main.list.items".`
	 *
	 * @example
	 * ```ts
	 * const lastOpenOrder = registry
	 *   .getLocatorSchema("main.list.items")
	 *   .filter({ hasText: "Open" })
	 *   .nth("last")
	 *   .getNestedLocator();
	 * ```
	 */
	getLocatorSchema<Path extends LocatorSchemaPathType>(
		path: LocatorSchemaPathArgument<Path>,
	): LocatorQueryBuilder<LocatorSchemaPathType, Path & RegistryPath<LocatorSchemaPathType>> {
		this.endOpenRegistration("getLocatorSchema", String(path));
		assertRegistryPath<LocatorSchemaPathType, Path>(path);
		return new LocatorQueryBuilderInternal<LocatorSchemaPathType, Path & RegistryPath<LocatorSchemaPathType>>(
			this,
			path,
		);
	}

	/**
	 * Checks every registered path once, without touching the page, and reports every failure in one error. A page object
	 * calls it after `defineLocators()`; a standalone registry calls it after registering its locators.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#verify
	 *
	 * @throws When a path fails, every failing path with its reason:
	 * `Locator registry verification failed for 1 of 2 paths:` followed by
	 * `"list.items": No locator schema registered for path "list.items.title".`
	 *
	 * @example
	 * ```ts
	 * registry.add("list").locator("ul");
	 * registry.add("list.items").getByRole("listitem").filter({ has: "list.items.title" });
	 * registry.verify(); // "list.items": No locator schema registered for path "list.items.title".
	 * ```
	 */
	verify(): void {
		this.endOpenRegistration("verify");
		const failures: string[] = [];
		for (const [path, record] of this.schemas) {
			const problems: string[] = [];
			if (this.strictChains) {
				const missing = expandSchemaPath(path)
					.slice(0, -1)
					.filter((part) => !this.schemas.has(part as RegistryPath<LocatorSchemaPathType>));
				if (missing.length > 0) {
					problems.push(strictChainsMessage(missing));
				}
			}
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
				problems.push(error instanceof Error ? error.message : String(error));
			}
			if (problems.length > 0) {
				failures.push(`"${path}": ${problems.join(" ")}`);
			}
		}
		if (failures.length > 0) {
			throw new Error(
				`Locator registry verification failed for ${failures.length} of ${this.schemas.size} paths:\n  ${failures.join("\n  ")}`,
			);
		}
	}

	/**
	 * Resolves the locator registered for a path alone, with its own steps and without its ancestors, described by the
	 * path: for chains you build yourself, filters and every match on the page at once.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#getlocator
	 *
	 * @param path A registered path.
	 * @returns A Playwright `Locator`.
	 * @throws When the path is not registered: `No locator schema registered for path "main.list.items".`
	 *
	 * @example
	 * ```ts
	 * const items = registry.getLocator("main.list.items"); // locator('li') with its steps, no ancestors
	 * await expect(page.locator("section").filter({ has: items })).toHaveCount(1);
	 * ```
	 */
	getLocator<Path extends LocatorSchemaPathType>(path: LocatorSchemaPathArgument<Path>): Locator {
		this.endOpenRegistration("getLocator", String(path), true);
		assertRegistryPath<LocatorSchemaPathType>(path);
		return this.resolveRecord(path, this.get(path));
	}

	/**
	 * Resolves a path to the chain of its registered segments, each with its steps, described by the path: the locator to
	 * act on and assert against.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#getnestedlocator
	 *
	 * @param path A registered path.
	 * @returns A Playwright `Locator`.
	 * @throws When the path is not registered: `No locator schema registered for path "main.list.items".`
	 *
	 * @example
	 * ```ts
	 * await registry.getNestedLocator("main.form@login.button@login").click();
	 * // locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })
	 * ```
	 */
	getNestedLocator<Path extends LocatorSchemaPathType>(path: LocatorSchemaPathArgument<Path>): Locator {
		this.endOpenRegistration("getNestedLocator", String(path), true);
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
		// every resolution, a query's included, is a call on the registry
		this.endOpenRegistration("resolution", path);
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

/**
 * The registry's `getLocator` as a function of its own, as `createRegistryWithAccessors` returns it and a page object
 * has it: the locator registered for a path alone.
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#getlocatoraccessor
 */
export type GetLocatorAccessor<LocatorSchemaPathType extends string> = <Path extends LocatorSchemaPathType>(
	path: LocatorSchemaPathArgument<Path>,
) => Locator;

/**
 * The registry's `add` as a function of its own, as `createRegistryWithAccessors` returns it and a page object has it.
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#addaccessor
 */
export interface AddAccessor<LocatorSchemaPathType extends string> {
	// add's signature, repeated: an indexed access type of the method would resolve to its anonymous type in a consumer's
	// declarations and spell out the unexported registration builders
	// biome-ignore lint/style/useShorthandFunctionType: an interface is always named in declarations, never inlined
	<
		Path extends LocatorSchemaPathType,
		Reuse extends LocatorSchemaPathType | ReusableLocator<LocatorSchemaPathType> | undefined = undefined,
	>(
		path: LocatorSchemaPathArgument<Path>,
		...args: [Reuse] extends [undefined]
			? []
			: [
					options: {
						reuse: [Reuse] extends [LocatorSchemaPathType]
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
				>;
}

/**
 * The registry's `getLocatorSchema` as a function of its own, as `createRegistryWithAccessors` returns it and a page
 * object has it: starts a query of a path.
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#getlocatorschemaaccessor
 */
export type GetLocatorSchemaAccessor<LocatorSchemaPathType extends string> = <Path extends LocatorSchemaPathType>(
	path: LocatorSchemaPathArgument<Path>,
) => LocatorQueryBuilder<LocatorSchemaPathType, Path & RegistryPath<LocatorSchemaPathType>>;

/**
 * The registry's `getNestedLocator` as a function of its own, as `createRegistryWithAccessors` returns it and a page
 * object has it: the chain of a path's registered segments.
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#getnestedlocatoraccessor
 */
export type GetNestedLocatorAccessor<LocatorSchemaPathType extends string> = <Path extends LocatorSchemaPathType>(
	path: LocatorSchemaPathArgument<Path>,
) => Locator;

/**
 * A locator registry: one locator per dot-delimited path, and the chain of a path's registered segments built from
 * them. `add` registers, `getNestedLocator` and `getLocator` resolve, `getLocatorSchema` starts a query, `verify`
 * checks every path, and `createReusable` makes seeds. Every page object has one; `createRegistryWithAccessors` makes
 * one on its own.
 *
 * @example
 * ```ts
 * export function defineLocators(registry: LocatorRegistry<"main" | "main.button@save">) {
 *   registry.add("main").locator("main");
 *   registry.add("main.button@save").getByRole("button", { name: "Save" });
 * }
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/
 */
export type LocatorRegistry<LocatorSchemaPathType extends string> = Pick<
	LocatorRegistryInternal<LocatorSchemaPathType>,
	"createReusable" | "getLocator" | "getLocatorSchema" | "getNestedLocator" | "verify"
> & {
	/**
	 * Registers a locator at a path: `add(path)`, one of the ten locator methods with Playwright's arguments, then any
	 * `filter`, `nth` and `describe` steps. With `{ reuse }`, a copy of a registered path or a seed from `createReusable`
	 * is registered at once. The registration ends at the next call on the registry; a later call of it throws.
	 *
	 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#add
	 *
	 * @param path The dot-delimited path: no empty segment and no whitespace, checked at compile time and at run time.
	 * @param options `{ reuse }`: a registered path (not this one) or a seed from `createReusable`.
	 * @returns The registration: the ten locator methods, or after a reuse `filter`, `nth` and `describe`.
	 * @throws At `add`, when the path breaks the path rules, a literal being a compile error already
	 * (`LocatorSchemaPath string cannot contain consecutive dots: main..list`, every broken rule named). At the locator
	 * method, when the path is registered already
	 * (`A locator schema with the path "main" already exists. …`; with `{ reuse }`, at `add`, which registers at once), or
	 * when its first argument is missing or an empty string where Playwright cannot use one
	 * (`locator requires a non-empty selector for "main.list".`). At `add`, when
	 * a reused path is not registered (`No locator schema registered for path "common.button".`), or is the registration
	 * path itself (`Locator reuse path cannot be the same as registration path: "main.list".`; a single literal reusing
	 * itself is a compile error already, a variable is checked here). A method of a registration
	 * that has ended throws: `nth() cannot apply to "main.list.items": its registration was ended by add("…"); …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list.items@open").getByRole("listitem").filter({ hasText: "Open" });
	 * registry.add("main.list.item@lastOpen", { reuse: "main.list.items@open" }).nth("last").describe("Last open item");
	 * ```
	 */
	// typed by the interface, not picked from the class: a picked method's type is anonymous in a consumer's
	// declarations and spells out the unexported registration builders
	add: AddAccessor<LocatorSchemaPathType>;
};

/**
 * Creates a locator registry on a page, without a page object, and returns it with its `add`, `getLocator`,
 * `getNestedLocator` and `getLocatorSchema` as functions of their own. The path union is a required type argument:
 * without it, the first path is a compile error (`createRegistryWithAccessors needs its paths as a type argument`).
 * `<string>` is accepted for paths known only at run time, or while migrating untyped code: it gives up every compile
 * time check of the paths (suggestions, the format, undeclared paths, sub-paths), which the runtime still makes. Call
 * `registry.verify()` once the locators are registered; a page object does that itself.
 *
 * @param page The Playwright page the locators resolve on.
 * @param options `{ strictChains }`: `true` makes `verify()` require every ancestor of every path to be registered.
 * @returns `{ registry, add, getLocator, getNestedLocator, getLocatorSchema }`.
 *
 * @example
 * ```ts
 * const { registry, getNestedLocator } = createRegistryWithAccessors<"main" | "main.button@save">(page);
 * registry.add("main").locator("main");
 * registry.add("main.button@save").getByRole("button", { name: "Save" });
 * registry.verify();
 * await getNestedLocator("main.button@save").click();
 * ```
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#createregistrywithaccessors
 */
export const createRegistryWithAccessors = <Paths extends string = NeedsPaths>(
	page: Page,
	options?: LocatorRegistryOptions,
) => {
	const registryInstance = new LocatorRegistryInternal<Paths>(page, options);
	const add: AddAccessor<Paths> = registryInstance.add.bind(registryInstance);
	const getLocator: GetLocatorAccessor<Paths> = registryInstance.getLocator.bind(registryInstance);
	const getNestedLocator: GetNestedLocatorAccessor<Paths> = registryInstance.getNestedLocator.bind(registryInstance);
	const getLocatorSchema: GetLocatorSchemaAccessor<Paths> = registryInstance.getLocatorSchema.bind(registryInstance);
	const registry: LocatorRegistry<Paths> = registryInstance;
	return { registry, add, getLocator, getNestedLocator, getLocatorSchema } as const;
};
