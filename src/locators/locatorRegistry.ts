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
 * The type of the path parameter of `add` and the resolving methods: the path itself when it is well-formed,
 * otherwise the tuple of `LocatorSchemaPathFormat` naming the rule it breaks. A helper in a base class that is generic
 * in its paths takes its path parameter with it, so a misspelt path is a compile error where the helper is called.
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
export type LocatorSchemaPathArgument<Path extends string> =
	LocatorSchemaPathFormat<Path> extends Path ? Path : LocatorSchemaPathFormat<Path>;

type InvalidReusePath<Path extends string> = [
	`Invalid reuse path, reuse path cannot be the same as registration path: ${Path}`,
];

type ReusePathArgument<Paths extends string, Path extends Paths, ReusePath extends Paths> =
	Exclude<ReusePath, Path> extends never ? InvalidReusePath<Path> : LocatorSchemaPathArgument<ReusePath>;

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
	 * its `filter`, `nth` and `describe` return a new seed and leave it as it was. To share a locator between locator
	 * modules, reusing a registered path (`{ reuse: "common.button" }`) is usually simpler.
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
	private openRegistration: { end(): void } | undefined;

	/** Ends the open registration, so a registration kept in a variable can no longer change its path. */
	private endOpenRegistration(): void {
		this.openRegistration?.end();
		this.openRegistration = undefined;
	}

	constructor(
		private readonly page: Page,
		options?: LocatorRegistryOptions,
	) {
		this.createReusable = new ReusableLocatorFactory<LocatorSchemaPathType>();
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

	/**
	 * Registers a locator at a path. `add(path)` is followed by one of the ten locator methods, which take Playwright's
	 * arguments (`getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, `locator`,
	 * `frameLocator`, `getByTestId`, and `getById`, which Playwright lacks), and then any `filter`, `nth` and
	 * `describe` steps, applied in the order chained. The path is registered by the locator method; one path has one
	 * locator.
	 *
	 * With `{ reuse: "other.path" }` the path is registered at once as a copy of that registered path (its locator, its
	 * steps and an explicit description), and `filter`, `nth` and `describe` narrow the copy. With `{ reuse: seed }`, a
	 * seed from `createReusable` is registered at once; one call of the seed's own locator method may patch it first,
	 * as `update()` patches, then `filter`, `nth` and `describe`.
	 *
	 * The registration ends at the next call on the registry (`add`, `getLocator`, `getNestedLocator`,
	 * `getLocatorSchema`, `verify`, or resolving a query): a registration kept in a variable takes its steps before
	 * then, and a later call of it throws, so a registered locator never changes once anything else has happened.
	 *
	 * @param path The dot-delimited path: no empty segment and no whitespace, checked at compile time and at run time.
	 * @param options `{ reuse }`: a registered path (not this one) or a seed from `createReusable`.
	 * @returns The registration: the ten locator methods, or after a reuse `filter`, `nth` and `describe`.
	 * @throws At the locator method, when the path is registered already
	 * (`A locator schema with the path "main" already exists. …`), when its first argument is missing or an empty
	 * string where Playwright cannot use one (`locator requires a non-empty selector for "main.list".`), or when the
	 * path breaks the path rules (`LocatorSchemaPath string cannot contain consecutive dots: main..list`); at `add`, when
	 * a reused path is not registered (`No locator schema registered for path "common.button".`). A method of a registration
	 * that has ended throws: `nth() cannot apply to "main.list.item": its registration has ended; …`
	 *
	 * @example
	 * ```ts
	 * registry.add("main.list.item").getByRole("listitem").filter({ hasText: "Open" }).nth(0);
	 * registry.add("main.list.item@last", { reuse: "main.list.item" }).describe("Last open item");
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
		this.endOpenRegistration();
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
				path as RegistryPath<LocatorSchemaPathType>,
			);
			this.openRegistration = builder;
			return builder as never;
		}

		if (typeof reuse === "string") {
			const targetPath = path as RegistryPath<LocatorSchemaPathType>;
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
				locatorSchemaPath: path as RegistryPath<LocatorSchemaPathType>,
				definition: reuse.definition,
				steps: reuse.steps,
				description: reuse.description,
			},
			path as RegistryPath<LocatorSchemaPathType>,
		);

		const builder = this.seededBuilder(path as RegistryPath<LocatorSchemaPathType>, reusedRecord);
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
	 * Starts a query of a path: a private copy of its chain (every registered segment with its locator, steps and
	 * description) to change for one use with `filter`, `nth`, `clearSteps`, `describe`, `update`, `replace`, `skip`
	 * and `unskip`, then resolve with `getNestedLocator()` or `getLocator()`. The registry never changes, and every call
	 * starts a new copy.
	 *
	 * @param path A registered path.
	 * @returns The query, a `LocatorQueryBuilder`.
	 * @throws When the path is not registered: `No locator schema registered for path "main.list.item".`
	 *
	 * @example
	 * ```ts
	 * const lastOpenOrder = registry
	 *   .getLocatorSchema("main.list.item")
	 *   .filter({ hasText: "Open" })
	 *   .nth("last")
	 *   .getNestedLocator();
	 * ```
	 */
	getLocatorSchema<Path extends LocatorSchemaPathType>(
		path: LocatorSchemaPathArgument<Path>,
	): LocatorQueryBuilder<LocatorSchemaPathType, Extract<Path, RegistryPath<LocatorSchemaPathType>>> {
		this.endOpenRegistration();
		return new LocatorQueryBuilderInternal<LocatorSchemaPathType, Extract<Path, RegistryPath<LocatorSchemaPathType>>>(
			this,
			path as Extract<Path, RegistryPath<LocatorSchemaPathType>>,
		);
	}

	/**
	 * Checks every registered path once, without touching the page, and reports every failure in one error: a `has` or
	 * `hasNot` path that is not registered, a cycle of such references, an unsupported reference value, and a
	 * `frameLocator()` without a selector that is not the first segment of its chain. With `strictChains`, every
	 * ancestor of every path must be registered too. A page object calls it right after `defineLocators()`; a
	 * standalone registry calls it after registering its locators.
	 *
	 * @throws When a path fails, every failing path with its reason:
	 * `Locator registry verification failed for 1 of 2 paths:` followed by
	 * `"list.item": No locator schema registered for path "list.titel".`
	 *
	 * @example
	 * ```ts
	 * registry.add("list").locator("ul");
	 * registry.add("list.item").getByRole("listitem").filter({ has: "list.item.title" });
	 * registry.verify(); // "list.item": No locator schema registered for path "list.item.title".
	 * ```
	 */
	verify(): void {
		this.endOpenRegistration();
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
	 * Resolves the locator registered for a path alone: its locator and its own steps, without its ancestors, described
	 * by the path. For chains you build yourself, for filters (`filter({ has: registry.getLocator(path) })`) and for every
	 * match on the page at once; act on one element with `getNestedLocator`, whose chain keeps finding the right element
	 * when the page gains a similar one.
	 *
	 * @param path A registered path.
	 * @returns A Playwright `Locator`.
	 * @throws When the path is not registered: `No locator schema registered for path "main.list.item".`
	 *
	 * @example
	 * ```ts
	 * const item = registry.getLocator("main.list.item"); // locator('li') with its steps, no ancestors
	 * await expect(page.locator("section").filter({ has: item })).toHaveCount(1);
	 * ```
	 */
	getLocator<Path extends LocatorSchemaPathType>(path: LocatorSchemaPathArgument<Path>): Locator {
		this.endOpenRegistration();
		const target = path as RegistryPath<LocatorSchemaPathType>;
		validateLocatorSchemaPath(target);
		return this.resolveRecord(target, this.get(target));
	}

	/**
	 * Resolves a path to the chain of its registered segments, first to last, each with its steps, described by the
	 * path: the locator to act on and assert against. An unregistered segment is left out of the chain, and a
	 * `frameLocator(selector)` segment enters its frame for the segments after it.
	 *
	 * @param path A registered path.
	 * @returns A Playwright `Locator`.
	 * @throws When the path is not registered: `No locator schema registered for path "main.list.item".`
	 *
	 * @example
	 * ```ts
	 * await registry.getNestedLocator("main.form@login.button@login").click();
	 * // locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })
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
		// every resolution, a query's included, is a call on the registry
		this.endOpenRegistration();
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
export type AddAccessor<LocatorSchemaPathType extends string> = LocatorRegistryInternal<LocatorSchemaPathType>["add"];

/**
 * The registry's `getLocatorSchema` as a function of its own, as `createRegistryWithAccessors` returns it and a page
 * object has it: starts a query of a path.
 *
 * @see https://dyhex.github.io/POMWright/api/class-locatorregistry/#getlocatorschemaaccessor
 */
export type GetLocatorSchemaAccessor<LocatorSchemaPathType extends string> = <Path extends LocatorSchemaPathType>(
	path: LocatorSchemaPathArgument<Path>,
) => LocatorQueryBuilder<LocatorSchemaPathType, Extract<Path, RegistryPath<LocatorSchemaPathType>>>;

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
	"add" | "createReusable" | "getLocator" | "getLocatorSchema" | "getNestedLocator" | "verify"
>;

/**
 * Creates a locator registry on a page, without a page object, and returns it with its `add`, `getLocator`,
 * `getNestedLocator` and `getLocatorSchema` as functions of their own. Pass the path union as the type argument.
 * Call `registry.verify()` once the locators are registered; a page object does that itself.
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
export const createRegistryWithAccessors = <Paths extends string>(page: Page, options?: LocatorRegistryOptions) => {
	const registryInstance = new LocatorRegistryInternal<Paths>(page, options);
	const add: LocatorRegistryInternal<Paths>["add"] = registryInstance.add.bind(registryInstance);
	const getLocator: GetLocatorAccessor<Paths> = registryInstance.getLocator.bind(registryInstance);
	const getNestedLocator: GetNestedLocatorAccessor<Paths> = registryInstance.getNestedLocator.bind(registryInstance);
	const getLocatorSchema: GetLocatorSchemaAccessor<Paths> = registryInstance.getLocatorSchema.bind(registryInstance);
	const registry: LocatorRegistry<Paths> = registryInstance;
	return { registry, add, getLocator, getNestedLocator, getLocatorSchema } as const;
};
