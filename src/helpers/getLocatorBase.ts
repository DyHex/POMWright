import { type Locator, test } from "@playwright/test";
import type { BasePage, BasePageOptions } from "../basePage";
import { GetBy } from "./getBy.locator";
import { GetByMethod, type LocatorSchema, getLocatorSchemaDummy } from "./locatorSchema.interface";
import type { PlaywrightReportLogger } from "./playwrightReportLogger";
export { GetByMethod };

/**
 * A FilterEntry describes filtering criteria passed to .filter() calls on Playwright locators.
 * has, hasNot: Locator | undefined - Used to filter elements that contain or exclude a certain element.
 * hasText, hasNotText: string | RegExp | undefined - Used to filter elements based on text content.
 */
type FilterEntry = {
	has?: Locator;
	hasNot?: Locator;
	hasNotText?: string | RegExp;
	hasText?: string | RegExp;
};

/**
 * ExtractSubPaths splits a path on '.' and returns a union of progressively longer sub-paths.
 * For example: ExtractSubPaths<"body.section@playground.button@reset"> produces:
 * "body" | "body.section@playground" | "body.section@playground.button@reset"
 */
type ExtractSubPaths<Path extends string> = Path extends `${infer Head}.${infer Tail}`
	? Head | `${Head}.${ExtractSubPaths<Tail>}`
	: Path;

/**
 * SubPaths computes valid sub-paths for a given chosen substring (LocatorSubstring).
 * If LocatorSubstring is a string:
 * We return only sub-paths that belong to the chosen substring. For example, if
 * LocatorSubstring = "body.section@playground.button@reset"
 * SubPaths returns only "body", "body.section@playground", and "body.section@playground.button@reset"
 * from the entire union of LocatorSchemaPathType, if they exist.
 */
type SubPaths<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends LocatorSchemaPathType | undefined,
> = LocatorSubstring extends string
	? Extract<LocatorSchemaPathType, LocatorSubstring | ExtractSubPaths<LocatorSubstring>>
	: never;

/**
 * UpdatableLocatorSchemaProperties represent the properties of LocatorSchema that can be changed by update/updates,
 * excluding the locatorSchemaPath itself, which remains immutable.
 */
export type UpdatableLocatorSchemaProperties = Omit<LocatorSchema, "locatorSchemaPath">;

/**
 * ModifiedLocatorSchema is a convenience type for properties that can form a new LocatorSchema without specifying the locatorSchemaPath.
 */
export interface ModifiedLocatorSchema extends UpdatableLocatorSchemaProperties {}

/** PathIndexPairs links each sub-part of a path to an optional index used in getNestedLocator calls. */
type PathIndexPairs = { path: string; index?: number }[];

const REQUIRED_PROPERTIES_FOR_LOCATOR_SCHEMA_WITH_METHODS = [
	"update",
	"updates",
	"addFilter",
	"getNestedLocator",
	"getLocator",
	"locatorSchemaPath",
	"locatorMethod",
	"schemasMap",
	"filterMap",
];

const safeStringifyOfNestedLocatorResults = (obj: unknown) => {
	const seen = new WeakSet();
	return JSON.stringify(
		obj,
		(key, value) => {
			// Convert Maps to arrays for logging
			if (value instanceof Map) {
				return Array.from(value.entries());
			}

			// Convert RegExp to a friendly object
			if (value instanceof RegExp) {
				return { type: "RegExp", source: value.source, flags: value.flags };
			}

			// Detect a Locator object by constructor name or known properties
			if (value && typeof value === "object" && value.constructor && value.constructor.name === "Locator") {
				return { type: "Locator", note: "Custom placeholder - Locators are complex." };
			}

			// Handle circular references
			if (typeof value === "object" && value !== null) {
				if (seen.has(value)) return "[Circular]";
				seen.add(value);
			}

			return value;
		},
		2,
	);
};

/**
 * LocatorSchemaWithMethods is the type returned by getLocatorSchema. It merges LocatorSchema with chainable methods:
 * - update: Modify certain properties of the resolved locator schema.
 * - updates: Modify multiple schemas along the chain simultaneously.
 * - addFilter: Add filtering criteria to refine a select locator in the chain further.
 * - getNestedLocator: Obtain a fully resolved nested locator.
 * - getLocator: Obtain a direct locator without nesting.
 *
 * schemasMap and filterMap store the deep-copied schemas and associated filters, ensuring immutability and isolation from originals.
 */
export type LocatorSchemaWithMethods<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends LocatorSchemaPathType | undefined,
> = LocatorSchema & {
	schemasMap: Map<string, LocatorSchema>;
	filterMap: Map<string, FilterEntry[]>;

	/**
	 * New update method:
	 * Allows updating any schema in the chain by specifying the subPath directly.
	 * Similar to addFilter, ensures compile-time suggestions for valid sub-paths.
	 *
	 * If you want to update multiple schemas, chain multiple .update() calls.
	 */
	update(
		subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>,
		updates: Partial<UpdatableLocatorSchemaProperties>,
	): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>;

	/**
	 * @deprecated This update method takes one argument and only updates the LocatorSchema which the full LocatorSchemaPath resolves to.
	 * Use the new `.update(subPath, updates)` method instead.
	 *
	 * update(updates: Partial< UpdatableLocatorSchemaProperties >)
	 * - Allows updating the properties of the LocatorSchema which the full LocatorSchemaPath resolves to.
	 * - This method is used for modifying the current schema without affecting the original schema.
	 * - Takes a "LocatorSchema" object which omits the locatorSchemaPath parameter as input, the parameters provided
	 * will overwrite the corresponding property in the current schema.
	 * - Returns the updated deep copy of the "LocatorSchema" with methods.
	 * - Can be chained with the update and updates methods, and the getLocator or getNestedLocator method.
	 */
	update(
		updates: Partial<UpdatableLocatorSchemaProperties>,
	): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>;

	/**
	 * @deprecated This updates method uses indices to identify which schema to update.
	 * Use the new `.update(subPath, updates)` method instead, chain the method for each update if multiple.
	 *
	 * updates(indexedUpdates: { [index: number]: Partial< UpdatableLocatorSchemaProperties > | null }):
	 * - Similar to update, but allows updating any locator in the nested chain (all sub-paths of the LocatorSchemaPath).
	 * - This method can modify the current deep copy of each LocatorSchema that each sub-path resolves to without
	 * affecting the original schemas
	 * - Takes an object where keys represent the index of the last "word" of a sub-path, where the value per key is a
	 * "LocatorSchema" object which omits the locatorSchemaPath parameter as input, the parameters provided will overwrite
	 * the corresponding property in the given schema.
	 * - Returns the updated deep copy of the LocatorSchema object with methods and its own updated deep copies for all
	 * LocatorSchema each sub-path resolved to.
	 * - Can be chained with the update and updates methods, and the getLocator or getNestedLocator method.
	 */
	updates(indexedUpdates: {
		[index: number]: Partial<UpdatableLocatorSchemaProperties> | null;
	}): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>;

	/**
	 * The equivalent of the Playwright locator.filter() method, the addFilter method is chainable on .getLocatorSchema.
	 * It will search for a particular string/RegExp/Locator somewhere inside the element, possibly in a descendant element,
	 * case-insensitively (string).
	 * - The filterData object can contain the following properties:
	 *   - has: Locator - Filters elements that contain a certain element.
	 *   - hasNot: Locator - Filters elements that do not contain a certain element.
	 *   - hasText: string | RegExp - Filters elements based on text content.
	 *   - hasNotText: string | RegExp - Filters elements that do not contain a certain text content.
	 * If you define multiple filterData properties in a single addFilter call instead of multiple addFilter calls, they
	 * will be chained after each other. If you want to add multiple filters of the same type, you must chain multiple addFilter calls.
	 */
	addFilter(
		subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>,
		filterData: FilterEntry,
	): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>;

	/**
	 * New getNestedLocator signature using subPath keys
	 * Maps each chosen subPath to an index for .nth() calls on that sub-locator.
	 */
	getNestedLocator(
		subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, LocatorSubstring>]?: number | null },
	): Promise<Locator>;

	/**
	 * @deprecated Use getNestedLocator({ LocatorSchemaPath: index }) instead of number-based indexing.
	 *
	 * getNestedLocator(indices?: { [key: number]: number | null } | null)
	 * - Asynchronously retrieves a nested locator based on the LocatorSchemaPath provided by getLocatorSchema("...")
	 * - Can be chained after the update and updates methods, getNestedLocator will end the chain.
	 * - The optional parameter of the method takes an object with 0-based indices "{0: 0, 3: 1}" for one or more locators
	 * to be nested given by sub-paths (indices correspond to last "word" of a sub-path).
	 * - Returns a promise that resolves to the nested locator.
	 */
	getNestedLocator(indices?: { [key: number]: number | null }): Promise<Locator>;

	/**
	 * getLocator()
	 * - Asynchronously retrieves a locator based on the current LocatorSchema. This method does not perform nesting,
	 * and will return the locator for which the full LocatorSchemaPath resolves to, provided by getLocatorSchema("...")
	 * - Can be chained after the update and updates methods, getLocator will end the chain.
	 * - Returns a promise that resolves to the locator.
	 */
	getLocator(): Promise<Locator>;
};

/**
 * GetLocatorBase:
 * The foundational class for managing and constructing nested locators based on LocatorSchemas.
 *
 * Key points:
 * - Generics: <LocatorSchemaPathType, LocatorSubstring>
 *   LocatorSchemaPathType is a union of all possible locator paths.
 *   LocatorSubstring is either undefined or narrowed to a chosen path.
 *
 * - getLocatorSchema(path):
 *   Returns a deep-copied schema and a chainable object (LocatorSchemaWithMethods) that
 *   allows calling update, updates, addFilter, and finally getNestedLocator or getLocator.
 *
 * - By using WithMethodsClass, we lock LocatorSubstring = P, the chosen path,
 *   ensuring addFilter suggests only valid sub-paths of P.
 *
 * - applyUpdate / applyUpdates and deepMerge:
 *   Handle schema modifications without affecting the original definitions.
 *
 * - buildNestedLocator:
 *   Assembles nested Playwright locators step-by-step according to the path.
 */
export class GetLocatorBase<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends LocatorSchemaPathType | undefined = undefined,
> {
	public getBy: GetBy;
	private locatorSchemas: Map<LocatorSchemaPathType, () => LocatorSchema>;

	constructor(
		protected pageObjectClass: BasePage<LocatorSchemaPathType, BasePageOptions, LocatorSubstring>,
		protected log: PlaywrightReportLogger,
		protected locatorSubstring?: LocatorSubstring,
	) {
		this.locatorSchemas = new Map<LocatorSchemaPathType, () => LocatorSchema>();
		this.getBy = new GetBy(this.pageObjectClass.page, this.log.getNewChildLogger("GetBy"));
	}

	/**
	 * getLocatorSchema:
	 * Given a path P, we:
	 * 1. Collect deep copies of the schemas involved.
	 * 2. Create a WithMethodsClass instance with LocatorSubstring = P.
	 * 3. Return a locator schema copy enriched with chainable methods.
	 */
	public getLocatorSchema<P extends LocatorSchemaPathType>(
		locatorSchemaPath: P,
	): LocatorSchemaWithMethods<LocatorSchemaPathType, P> {
		// Collect copies:
		const pathIndexPairs = this.extractPathsFromSchema(locatorSchemaPath);
		const schemasMap = this.collectDeepCopies(locatorSchemaPath, pathIndexPairs);

		const locatorSchemaCopy = schemasMap.get(locatorSchemaPath) as LocatorSchemaWithMethods<LocatorSchemaPathType, P>;
		locatorSchemaCopy.schemasMap = schemasMap;
		locatorSchemaCopy.filterMap = new Map<string, FilterEntry[]>();

		// Instantiate WithMethodsClass with P as LocatorSubstring
		const wrapper = new WithMethodsClass<LocatorSchemaPathType, P>(
			this.pageObjectClass as unknown as BasePage<LocatorSchemaPathType, BasePageOptions, P>,
			this.log,
			locatorSchemaPath,
			schemasMap,
		);
		return wrapper.init(locatorSchemaPath, locatorSchemaCopy);
	}

	/**
	 * collectDeepCopies:
	 * Clones and stores all schemas related to the chosen path and its sub-paths.
	 * Ensures updates and filters don't affect original schema definitions.
	 */
	private collectDeepCopies(
		locatorSchemaPath: LocatorSchemaPathType,
		pathIndexPairs: PathIndexPairs,
	): Map<string, LocatorSchema> {
		const schemasMap = new Map<string, LocatorSchema>();

		// Check if the locatorSchemaPath exists
		const fullSchemaFunc = this.safeGetLocatorSchema(locatorSchemaPath);
		if (!fullSchemaFunc) {
			const errorMessage = `LocatorSchema not found for path: '${locatorSchemaPath}'`;
			this.log.error(errorMessage);
			throw new Error(`[${this.pageObjectClass.pocName}] ${errorMessage}`);
		}

		// Add the full locatorSchemaPath to the schemasMap
		schemasMap.set(locatorSchemaPath, structuredClone(fullSchemaFunc()));

		// Iterate over sub-paths and add those that exist to the schemasMap
		for (const { path } of pathIndexPairs) {
			if (path !== locatorSchemaPath) {
				const schemaFunc = this.safeGetLocatorSchema(path);
				if (schemaFunc) {
					schemasMap.set(path, structuredClone(schemaFunc()));
				}
			}
		}

		return schemasMap;
	}

	private isLocatorSchemaWithMethods(schema: LocatorSchema): boolean {
		return REQUIRED_PROPERTIES_FOR_LOCATOR_SCHEMA_WITH_METHODS.every((p) => p in schema);
	}

	/**
	 * applyUpdateToSubPath:
	 * Applies updates to a specific sub-path schema within schemasMap.
	 * Similar to applyUpdate, but we locate the sub-path schema directly by its path.
	 */
	public applyUpdateToSubPath(
		schemasMap: Map<string, LocatorSchema>,
		subPath: LocatorSchemaPathType,
		updates: Partial<UpdatableLocatorSchemaProperties>,
	) {
		const schema = schemasMap.get(subPath);
		if (!schema) {
			throw new Error(`No schema found for sub-path: '${subPath}'`);
		}

		const updatedSchema = this.deepMerge(schema, updates);
		if (this.isLocatorSchemaWithMethods(schema)) {
			Object.assign(schema, updatedSchema);
		} else {
			// For partial LocatorSchema, just replace it in the map
			schemasMap.set(subPath, updatedSchema);
		}
	}

	/**
	 * applyUpdate:
	 * Applies updates to a single schema within the schemasMap.
	 */
	public applyUpdate(
		schemasMap: Map<string, LocatorSchema>,
		locatorSchemaPath: LocatorSchemaPathType,
		updateData: Partial<LocatorSchema>,
	): void {
		const schema = schemasMap.get(locatorSchemaPath);
		if (schema) {
			const updatedSchema = this.deepMerge(schema, updateData);

			if (this.isLocatorSchemaWithMethods(schema)) {
				Object.assign(schema, updatedSchema);
			} else {
				throw new Error("Invalid LocatorSchema object provided for update method.");
			}
		}
	}

	/**
	 * applyUpdates:
	 * Applies multiple updates to multiple schemas in the chain, identified by their path indexes.
	 */
	public applyUpdates(
		schemasMap: Map<string, LocatorSchema>,
		pathIndexPairs: PathIndexPairs,
		updatesData: { [index: number]: Partial<LocatorSchema> },
	): void {
		for (const [index, updateAtIndex] of Object.entries(updatesData)) {
			const path = pathIndexPairs[Number.parseInt(index)]?.path;
			if (path && updateAtIndex) {
				const schema = schemasMap.get(path);
				if (schema) {
					const updatedSchema = this.deepMerge(schema, updateAtIndex);

					if (this.isLocatorSchemaWithMethods(schema)) {
						Object.assign(schema, updatedSchema);
					} else {
						schemasMap.set(path, updatedSchema);
					}
				}
			}
		}
	}

	/**
	 * createLocatorSchema:
	 * Creates a fresh LocatorSchema object by merging provided schemaDetails with a required locatorSchemaPath.
	 */
	private createLocatorSchema(schemaDetails: ModifiedLocatorSchema, locatorSchemaPath: LocatorSchemaPathType) {
		const schema: LocatorSchema = { ...schemaDetails, locatorSchemaPath };
		return schema;
	}

	/**
	 * addSchema:
	 * Registers a new LocatorSchema under the given locatorSchemaPath.
	 * Throws an error if a schema already exists at that path.
	 */
	public addSchema(locatorSchemaPath: LocatorSchemaPathType, schemaDetails: ModifiedLocatorSchema): void {
		// Create the new schema
		const newLocatorSchema = this.createLocatorSchema(schemaDetails, locatorSchemaPath);

		// Check if the locatorSchemaPath already exists in the map, it should not
		const existingSchemaFunc = this.safeGetLocatorSchema(locatorSchemaPath);
		if (existingSchemaFunc) {
			// Throw an error with details of both schemas if the locatorSchemaPath already exists
			const existingLocatorSchema = existingSchemaFunc();
			throw new Error(
				`[${this.pageObjectClass.pocName}] A LocatorSchema with the path '${locatorSchemaPath}' already exists. \n` +
					`Existing Schema: ${JSON.stringify(existingLocatorSchema, null, 2)} \n` +
					`Attempted to Add Schema: ${JSON.stringify(newLocatorSchema, null, 2)}`,
			);
		}

		this.locatorSchemas.set(locatorSchemaPath, () => newLocatorSchema);
	}

	/**
	 * safeGetLocatorSchema:
	 * Safely retrieves a schema function if available for the given path.
	 */
	private safeGetLocatorSchema(path: string): (() => LocatorSchema) | undefined {
		return this.locatorSchemas.get(path as LocatorSchemaPathType);
	}

	/**
	 * extractPathsFromSchema:
	 * Splits a path into incremental sub-paths and associates them with optional indices.
	 * Used by updates and getNestedLocator methods.
	 */
	public extractPathsFromSchema = (paths: string, indices: Record<number, number> = {}): PathIndexPairs => {
		const schemaParts = paths.split(".");
		let cumulativePath = "";

		return schemaParts.map((part, index) => {
			cumulativePath = cumulativePath ? `${cumulativePath}.${part}` : part;
			return {
				path: cumulativePath,
				index: indices[index] ?? undefined,
			};
		});
	};

	/**
	 * logError:
	 * Logs detailed error information and re-throws the error to ensure tests fail as expected.
	 */
	private logError = (
		error: Error,
		locatorSchemaPath: string,
		currentLocator: Locator | null,
		currentPath: string,
		pathIndexPairs: PathIndexPairs,
		nestedLocatorResults?: {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			LocatorSchema: any;
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			NestingSteps: any[];
		},
	) => {
		const errorDetails = {
			error: error.message,
			locatorSchemaPath,
			currentPath,
			pathIndexPairs: JSON.stringify(pathIndexPairs, null, 2),
			currentLocatorDetails: currentLocator
				? {
						locatorString: currentLocator,
						isNotNull: true,
					}
				: { isNotNull: false },
			nestedLocatorResults: safeStringifyOfNestedLocatorResults(nestedLocatorResults),
		};

		this.log.error(
			"An error occurred during nested locator construction.\n",
			"Error details:\n",
			JSON.stringify(errorDetails, null, 2),
		);

		throw error; // Re-throw the caught error to ensure the test fails.
	};

	/**
	 * deepMerge:
	 * Recursively merges source properties into target, validating them against LocatorSchema to ensure no invalid keys.
	 * Ensures immutability by creating a new object rather than modifying in place.
	 */
	private deepMerge<TargetType extends object, SourceType extends Partial<TargetType>>(
		target: TargetType,
		source: SourceType,
		schema: Partial<LocatorSchema> = getLocatorSchemaDummy(), // Use the schema for deep validation
	): TargetType {
		// Create a new merged object to ensure immutability
		const merged: TargetType = { ...target };

		for (const key of Object.keys(source)) {
			if (key === "locatorSchemaPath") {
				throw new Error(
					`[${
						this.pageObjectClass.pocName
					}] Invalid property: 'locatorSchemaPath' cannot be updated. Attempted to update LocatorSchemaPath from '${
						(target as Record<string, unknown>)[key]
					}' to '${(source as Record<string, unknown>)[key]}'.`,
				);
			}

			if (!(key in schema)) {
				throw new Error(`Invalid property: '${key}' is not a valid property of LocatorSchema`);
			}

			const sourceValue = source[key as keyof typeof source];
			const targetValue = target[key as keyof typeof target];

			// Check if the schema allows for further nesting
			if (
				typeof sourceValue === "object" &&
				sourceValue !== null &&
				schema[key as keyof LocatorSchema] &&
				typeof schema[key as keyof LocatorSchema] === "object"
			) {
				if (targetValue && typeof targetValue === "object" && !Array.isArray(targetValue)) {
					// Recursively merge objects
					merged[key as keyof typeof merged] = this.deepMerge(
						targetValue as Record<string, unknown>, // Updated type here
						sourceValue as Partial<TargetType[keyof TargetType]>,
						schema[key as keyof LocatorSchema] as Partial<LocatorSchema>,
					) as TargetType[keyof TargetType]; // Typecast merged object to the correct type
				} else {
					// Initialize the target value if it doesn't exist or isn't an object
					merged[key as keyof typeof merged] = this.deepMerge(
						{} as Record<string, unknown>,
						sourceValue as Partial<TargetType[keyof TargetType]>,
						schema[key as keyof LocatorSchema] as Partial<LocatorSchema>,
					) as TargetType[keyof TargetType]; // Typecast merged object to the correct type
				}
			} else {
				// Handle non-object types: primitives, arrays, or RegExps
				if (Array.isArray(sourceValue)) {
					(merged as Record<string, unknown>)[key] = Array.isArray(targetValue)
						? targetValue.concat(sourceValue)
						: [...sourceValue];
				} else if (
					typeof sourceValue === "object" &&
					sourceValue !== null &&
					Object.prototype.toString.call(sourceValue) === "[object RegExp]"
				) {
					(merged as Record<string, unknown>)[key] = new RegExp(
						(sourceValue as unknown as RegExp).source,
						(sourceValue as unknown as RegExp).flags,
					);
				} else {
					(merged as Record<string, unknown>)[key] = sourceValue;
				}
			}
		}

		return merged;
	}

	/**
	 * buildNestedLocator:
	 * Constructs a nested locator by iterating through each sub-path of locatorSchemaPath and chaining locators.
	 * Applies filters, indexing (nth), and logs details for debugging during test retries.
	 */
	public buildNestedLocator = async (
		locatorSchemaPath: LocatorSchemaPathType,
		schemasMap: Map<string, LocatorSchema>,
		filterMap: Map<string, FilterEntry[]>,
		indices: Record<number, number> = {},
	): Promise<Locator> => {
		return (await test.step(`${this.pageObjectClass.pocName}: Build Nested Locator`, async () => {
			const pathIndexPairs = this.extractPathsFromSchema(locatorSchemaPath, indices);
			let currentLocator: Locator | undefined | null = null;
			let currentIFrame: string | undefined | null = null;
			const nestedLocatorResults: {
				LocatorSchema: LocatorSchema | null;
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				NestingSteps: any[];
			} = {
				LocatorSchema: null,
				NestingSteps: [],
			};

			for (const { path, index } of pathIndexPairs) {
				const currentSchema = schemasMap.get(path);
				if (!currentSchema) continue;

				try {
					const nextLocator = this.getBy.getLocator(currentSchema);
					currentLocator = currentLocator ? currentLocator.locator(nextLocator) : nextLocator;

					// Apply schema-level filter if present
					if (currentSchema.locatorMethod !== GetByMethod.frameLocator && currentSchema.filter) {
						currentLocator = currentLocator.filter({
							has: currentSchema.filter.has,
							hasNot: currentSchema.filter.hasNot,
							hasNotText: currentSchema.filter.hasNotText,
							hasText: currentSchema.filter.hasText,
						});
					}

					// Apply additional filters from filterMap if present
					const filterEntries = filterMap.get(path);
					if (filterEntries) {
						for (const filterData of filterEntries) {
							currentLocator = currentLocator.filter({
								has: filterData.has,
								hasNot: filterData.hasNot,
								hasNotText: filterData.hasNotText,
								hasText: filterData.hasText,
							});
						}
					}

					// Apply indexing if requested
					if (index != null) {
						currentLocator = currentLocator.nth(index);
					}

					// Logging and debugging details, POMWright will set the log level to debug during retries of tests
					if (this.log.isLogLevelEnabled("debug")) {
						if (!nestedLocatorResults.LocatorSchema) {
							const schemaFromMap = schemasMap.get(locatorSchemaPath);
							if (schemaFromMap) {
								nestedLocatorResults.LocatorSchema = schemaFromMap;
							}
						}

						if (currentSchema.locatorMethod === GetByMethod.frameLocator) {
							if (!currentIFrame) {
								currentIFrame = currentSchema.frameLocator;
							}
							if (currentIFrame && currentSchema.frameLocator && currentIFrame.endsWith(currentSchema.frameLocator)) {
								currentIFrame += ` -> ${currentSchema.frameLocator}`;
							}
						}

						if (currentIFrame !== undefined) {
							await this.evaluateCurrentLocator(currentLocator, nestedLocatorResults.NestingSteps, currentIFrame);
						} else {
							await this.evaluateCurrentLocator(currentLocator, nestedLocatorResults.NestingSteps, null);
						}
					}
				} catch (error) {
					this.logError(error as Error, locatorSchemaPath, currentLocator, path, pathIndexPairs, nestedLocatorResults);
					break;
				}
			}

			if (!currentLocator) {
				this.logError(
					new Error(`Failed to build nested locator for path: ${locatorSchemaPath}`),
					locatorSchemaPath,
					currentLocator,
					locatorSchemaPath,
					pathIndexPairs,
				);
			}

			if (this.log.isLogLevelEnabled("debug")) {
				this.log.debug("Nested locator evaluation results:", safeStringifyOfNestedLocatorResults(nestedLocatorResults));
			}

			if (currentLocator != null) {
				return currentLocator;
			}
		})) as Locator;
	};

	/**
	 * evaluateCurrentLocator:
	 * Gathers debug information about the current locator's resolved elements.
	 * Helps with logging and debugging complex locator chains.
	 */
	private evaluateCurrentLocator = async (
		currentLocator: Locator,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		resultsArray: any[],
		currentIFrame: string | null,
	): Promise<void> => {
		if (currentIFrame) {
			resultsArray.push({
				currentLocatorString: currentLocator,
				currentIFrame: currentIFrame,
				Note: "iFrame locators evaluation not implemented",
			});
		} else {
			const elementsData = await this.evaluateAndGetAttributes(currentLocator);

			resultsArray.push({
				currentLocatorString: `${currentLocator}`,
				resolved: elementsData.length > 0,
				elementCount: elementsData.length,
				elementsResolvedTo: elementsData,
			});
		}
	};

	/**
	 * evaluateAndGetAttributes:
	 * Extracts tagName and attributes from all elements matched by the locator for debugging purposes.
	 */
	private evaluateAndGetAttributes = async (
		pwLocator: Locator,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	): Promise<any[]> => {
		return await pwLocator.evaluateAll((objects) =>
			objects.map((el) => {
				const elementAttributes = el.hasAttributes()
					? Object.fromEntries(Array.from(el.attributes).map(({ name, value }) => [name, value]))
					: {};
				return { tagName: el.tagName, attributes: elementAttributes };
			}),
		);
	};
}

/**
 * WithMethodsClass:
 * A specialized class that extends GetLocatorBase with a fixed LocatorSubstring.
 * By setting LocatorSubstring = P at runtime (the chosen path), we ensure that addFilter autocompletion
 * only suggests sub-paths derived from the chosen locatorSchemaPath.
 *
 * This class is instantiated inside getLocatorSchema and returns a LocatorSchemaWithMethods instance
 * with all chainable methods bound and typed.
 */
class WithMethodsClass<
	LocatorSchemaPathType extends string,
	LocatorSubstring extends LocatorSchemaPathType | undefined,
> extends GetLocatorBase<LocatorSchemaPathType, LocatorSubstring> {
	constructor(
		protected pageObjectClass: BasePage<LocatorSchemaPathType, BasePageOptions, LocatorSubstring>,
		protected log: PlaywrightReportLogger,
		locatorSubstring: LocatorSubstring,
		private schemasMap: Map<string, LocatorSchema>,
	) {
		super(pageObjectClass, log, locatorSubstring);
	}

	private locatorSchemaPath!: LocatorSubstring extends string ? LocatorSubstring : never;

	/**
	 * init:
	 * Assigns the locatorSchemaPath and binds methods (update, updates, addFilter, getNestedLocator, getLocator)
	 * directly on the locatorSchemaCopy. Returns the modified copy, now fully chainable and type-safe.
	 */
	public init(
		locatorSchemaPath: LocatorSubstring,
		locatorSchemaCopy: LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>,
	): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring> {
		this.locatorSchemaPath = locatorSchemaPath as LocatorSubstring extends string ? LocatorSubstring : never;
		// locatorSchemaCopy already has schemasMap & filterMap initialized before calling init

		const self = this; // the update and updates functions need locatorSchemaCopy 'this' context

		locatorSchemaCopy.update = function (
			this: LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>,
			a: SubPaths<LocatorSchemaPathType, LocatorSubstring> | Partial<UpdatableLocatorSchemaProperties>,
			b?: Partial<UpdatableLocatorSchemaProperties>,
		) {
			const fullPath = this.locatorSchemaPath as string;
			if (b === undefined) {
				// Called as update(updates)
				const updates = a as Partial<UpdatableLocatorSchemaProperties>;
				// Old behavior or default to applying updates to full locatorSchemaPath
				self.applyUpdate(self.schemasMap, self.locatorSchemaPath as LocatorSchemaPathType, updates);
			} else {
				// Called as update(subPath, updates)
				const subPath = a as SubPaths<LocatorSchemaPathType, LocatorSubstring>;
				const updates = b as Partial<UpdatableLocatorSchemaProperties>;

				if (!(subPath === fullPath || fullPath.startsWith(`${subPath}.`))) {
					throw new Error(`Invalid sub-path: '${subPath}' is not a valid sub-path of '${fullPath}'.`);
				}

				self.applyUpdateToSubPath(self.schemasMap, subPath as LocatorSchemaPathType, updates);
			}

			return this;
		} as LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>["update"];

		locatorSchemaCopy.updates = function (indexedUpdates: {
			[index: number]: Partial<UpdatableLocatorSchemaProperties>;
		}) {
			const pathIndexPairs = self.extractPathsFromSchema(self.locatorSchemaPath as string);
			self.applyUpdates(self.schemasMap, pathIndexPairs, indexedUpdates);
			return this;
		};

		locatorSchemaCopy.addFilter = function (
			subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>,
			filterData: FilterEntry,
		) {
			const fullPath = this.locatorSchemaPath as string;

			// Check if subPath is exactly fullPath or if fullPath starts with "subPath."
			if (!(subPath === fullPath || fullPath.startsWith(`${subPath}.`))) {
				throw new Error(`Invalid sub-path: '${subPath}' is not a valid sub-path of '${fullPath}'.`);
			}

			if (!this.filterMap) {
				this.filterMap = new Map<string, FilterEntry[]>();
			}

			const existingFilters = this.filterMap.get(subPath) || [];
			existingFilters.push(filterData);
			this.filterMap.set(subPath, existingFilters);
			return this;
		};

		/**
		 * getNestedLocator(indices?: { [key: number]: number | null } | null)
		 * - Asynchronously retrieves a nested locator based on the LocatorSchemaPath provided by getLocatorSchema("...")
		 * - Can be chained after the update and updates methods, getNestedLocator will end the chain.
		 * - The optional parameter of the method takes an object with 0-based indices "{0: 0, 3: 1}" for one or more locators
		 * to be nested given by sub-paths (indices correspond to last "word" of a sub-path).
		 * - Returns a promise that resolves to the nested locator.
		 */
		locatorSchemaCopy.getNestedLocator = async function (
			this: LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>,
			arg?: Record<string | number, number | null>,
		) {
			// If no arg provided or empty object, no indexing required
			if (!arg || Object.keys(arg).length === 0) {
				return await self.buildNestedLocator(
					self.locatorSchemaPath as LocatorSchemaPathType,
					self.schemasMap,
					this.filterMap,
					{}, // no indices
				);
			}

			// Determine if we are using old number-based indexing or new subPath-based indexing
			const keys = Object.keys(arg);
			const isNumberKey = keys.every((k) => /^\d+$/.test(k)); // all keys are numeric
			if (isNumberKey) {
				// Deprecated old usage
				const numericIndices = arg as Record<number, number>;
				return await self.buildNestedLocator(
					self.locatorSchemaPath as LocatorSchemaPathType,
					self.schemasMap,
					this.filterMap,
					numericIndices,
				);
			}
			// New usage: keys are subPaths
			const subPathIndices = arg as { [subPath: string]: number | null };

			// Validate and convert subPathIndices to numeric indices
			const pathIndexPairs = self.extractPathsFromSchema(self.locatorSchemaPath as string);

			// Build a map from path string to its index in the chain
			const pathToIndexMap: Record<string, number> = {};
			pathIndexPairs.forEach((pair, i) => {
				pathToIndexMap[pair.path] = i;
			});

			const numericIndices: Record<number, number> = {};

			for (const [subPath, index] of Object.entries(subPathIndices)) {
				// subPath must be a prefix or equal to fullPath
				const fullPath = this.locatorSchemaPath as string;
				if (!(subPath === fullPath || fullPath.startsWith(`${subPath}.`))) {
					throw new Error(`Invalid sub-path: '${subPath}' is not a valid sub-path of '${fullPath}'.`);
				}

				const numericIndex = pathToIndexMap[subPath];
				if (numericIndex === undefined) {
					throw new Error(`Sub-path '${subPath}' not found in the locator chain for '${fullPath}'.`);
				}

				if (index !== null) {
					numericIndices[numericIndex] = index;
				}
			}

			return await self.buildNestedLocator(
				self.locatorSchemaPath as LocatorSchemaPathType,
				self.schemasMap,
				this.filterMap,
				numericIndices,
			);
		};

		/**
		 * getLocator()
		 * - Asynchronously retrieves a locator based on the current LocatorSchema. This method does not perform nesting,
		 * and will return the locator for which the full LocatorSchemaPath resolves to, provided by getLocatorSchema("...")
		 * - Can be chained after the update and updates methods, getLocator will end the chain.
		 * - Returns a promise that resolves to the locator.
		 */
		locatorSchemaCopy.getLocator = async () => {
			return self.getBy.getLocator(locatorSchemaCopy);
		};

		return locatorSchemaCopy;
	}
}
