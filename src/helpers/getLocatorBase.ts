import { type Locator, test } from "@playwright/test";
import { BasePage } from "../basePage";
import { GetBy } from "./getBy.locator";
import { GetByMethod, type LocatorSchema, getLocatorSchemaDummy } from "./locatorSchema.interface";
import { PlaywrightReportLogger } from "./playwrightReportLogger";
export { GetByMethod };

// Type representing properties of a LocatorSchema that can be updated, excluding the locatorSchemaPath.
export type UpdatableLocatorSchemaProperties = Omit<LocatorSchema, "locatorSchemaPath">;

// Interface defining a method to update parts of a locator schema.
interface WithUpdateMethod {
	update(updates: Partial<UpdatableLocatorSchemaProperties>): LocatorSchemaWithMethods;
}

// Interface defining a method to apply multiple updates to a locator schema based on index.
interface WithUpdatesMethod {
	updates(indexedUpdates: {
		[index: number]: Partial<UpdatableLocatorSchemaProperties> | null;
	}): LocatorSchemaWithMethods;
}

// Interface defining a method to get a nested locator based on provided indices.
interface WithGetNestedLocatorMethod {
	getNestedLocator(indices?: { [key: number]: number | null } | null): Promise<Locator>;
}

// Interface defining a method to get a locator from a schema.
interface WithGetLocatorMethod {
	getLocator(): Promise<Locator>;
}

// Type extending LocatorSchema with additional methods and a map of related schemas.
export type LocatorSchemaWithMethods = LocatorSchema &
	WithUpdateMethod &
	WithUpdatesMethod &
	WithGetNestedLocatorMethod &
	WithGetLocatorMethod & {
		schemasMap: Map<string, LocatorSchema>;
	};

// Interface representing a modified locator schema, excluding the locatorSchemaPath.
export interface ModifiedLocatorSchema extends UpdatableLocatorSchemaProperties {}

// Type for representing pairs of path and index used in constructing nested locators.
type PathIndexPairs = { path: string; index?: number }[];

/**
 * Provides core functionality for dynamically generating nested locators.
 * Nested locators help pinpoint elements with higher precision in Playwright tests.
 * The class includes methods for adding, updating, and retrieving locator schemas,
 * and for building nested locators based on these schemas.
 */
export class GetLocatorBase<LocatorSchemaPathType extends string> {
	private getBy: GetBy;

	private locatorSchemas: Map<LocatorSchemaPathType, () => LocatorSchema>;
	/**
	 * Initializes the GetLocatorBase class with a page object class and a logger.
	 */
	constructor(
		protected pageObjectClass: BasePage<LocatorSchemaPathType>,
		protected log: PlaywrightReportLogger,
	) {
		this.locatorSchemas = new Map<LocatorSchemaPathType, () => LocatorSchema>();
		this.getBy = new GetBy(this.pageObjectClass.page, this.log.getNewChildLogger("GetBy"));
	}

	/**
	 * Retrieves a locator schema with additional methods for manipulation and retrieval of locators.
	 */
	public getLocatorSchema(locatorSchemaPath: LocatorSchemaPathType): LocatorSchemaWithMethods {
		const pathIndexPairs = this.extractPathsFromSchema(locatorSchemaPath);
		const schemasMap = this.collectDeepCopies(locatorSchemaPath, pathIndexPairs);
		const locatorSchemaCopy = schemasMap.get(locatorSchemaPath) as LocatorSchemaWithMethods;
		locatorSchemaCopy.schemasMap = schemasMap;

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this; // the update and updates functions need locatorSchemaCopy 'this' context

		/**
		 * update(updates: Partial< UpdatableLocatorSchemaProperties >)
		 * - Allows updating the properties of the LocatorSchema which the full LocatorSchemaPath resolves to.
		 * - This method is used for modifying the current schema without affecting the original schema.
		 * - Takes a "LocatorSchema" object which omits the locatorSchemaPath parameter as input, the parameters provided
		 * will overwrite the corresponding property in the current schema.
		 * - Returns the updated deep copy of the "LocatorSchema" with methods.
		 * - Can be chained with the update and updates methods, and the getLocator or getNestedLocator method.
		 */
		locatorSchemaCopy.update = function (
			this: LocatorSchemaWithMethods,
			updates: Partial<UpdatableLocatorSchemaProperties>,
		) {
			self.applyUpdate(schemasMap, locatorSchemaPath, updates);
			return this;
		};

		/**
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
		locatorSchemaCopy.updates = function (
			this: LocatorSchemaWithMethods,
			indexedUpdates: {
				[index: number]: Partial<UpdatableLocatorSchemaProperties>;
			},
		) {
			self.applyUpdates(schemasMap, pathIndexPairs, indexedUpdates);
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
		locatorSchemaCopy.getNestedLocator = async (indices?: Record<number, number>) => {
			return await this.buildNestedLocator(locatorSchemaPath, schemasMap, indices);
		};

		/**
		 * getLocator()
		 * - Asynchronously retrieves a locator based on the current LocatorSchema. This method does not perform nesting,
		 * and will return the locator for which the full LocatorSchemaPath resolves to, provided by getLocatorSchema("...")
		 * - Can be chained after the update and updates methods, getLocator will end the chain.
		 * - Returns a promise that resolves to the locator.
		 */
		locatorSchemaCopy.getLocator = async () => {
			return this.getBy.getLocator(locatorSchemaCopy);
		};

		return locatorSchemaCopy;
	}

	/**
	 * Collects deep copies of locator schemas based on a given locator schema path and path-index pairs.
	 * It ensures that each locator schema and its sub-schemas are properly cloned and stored.
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

	/**
	 * Applies an update to a specific locator schema within the provided map of schemas.
	 * This method ensures that the specified updates are merged into the targeted locator schema.
	 */
	private applyUpdate(
		schemasMap: Map<string, LocatorSchema>,
		locatorSchemaPath: LocatorSchemaPathType,
		updateData: Partial<LocatorSchema>,
	): void {
		const schema = schemasMap.get(locatorSchemaPath);
		if (schema) {
			const updatedSchema = this.deepMerge(schema, updateData);

			if (
				"update" &&
				"updates" &&
				"getNestedLocator" &&
				"getLocator" &&
				"locatorSchemaPath" &&
				"locatorMethod" &&
				"schemasMap" in schema
			) {
				Object.assign(schema, updatedSchema);
			} else {
				throw new Error("Invalid LocatorSchema object provided for update method.");
			}
		}
	}

	/**
	 * Applies multiple updates to locator schemas based on provided path-index pairs and update data.
	 * This method facilitates batch updating of nested schemas within a complex locator structure.
	 */
	private applyUpdates(
		schemasMap: Map<string, LocatorSchema>,
		pathIndexPairs: PathIndexPairs,
		updatesData: { [index: number]: Partial<LocatorSchema> },
	): void {
		for (const [index, updateAtIndex] of Object.entries(updatesData)) {
			const path = pathIndexPairs[parseInt(index)]?.path;
			if (path && updateAtIndex) {
				const schema = schemasMap.get(path);
				if (schema) {
					const updatedSchema = this.deepMerge(schema, updateAtIndex);

					// Check if the schema being updated is a LocatorSchemaWithMethods
					if (
						"update" &&
						"updates" &&
						"getNestedLocator" &&
						"getLocator" &&
						"locatorSchemaPath" &&
						"locatorMethod" &&
						"schemasMap" in schema
					) {
						// Apply updates directly to maintain circular reference
						Object.assign(schema, updatedSchema);
					} else {
						// For partial LocatorSchema, just replace it in the map
						schemasMap.set(path, updatedSchema);
					}
				}
			}
		}
	}

	/**
	 * Creates a new locator schema based on provided schema details and a schema path.
	 * This method structures a new locator schema ready for inclusion in the locator management system.
	 */
	private createLocatorSchema(schemaDetails: ModifiedLocatorSchema, locatorSchemaPath: LocatorSchemaPathType) {
		const schema: LocatorSchema = { ...schemaDetails, locatorSchemaPath };
		return schema;
	}

	/**
	 * Adds a new locator schema to the internal map of locator schemas.
	 * This method ensures that the new schema is properly registered and can be referenced and used in locator generation.
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

		// Add the new schema to the map
		this.locatorSchemas.set(locatorSchemaPath, () => newLocatorSchema);
	}

	/**
	 * Safely retrieves a locator schema function based on a given path.
	 * This method provides a secure way to access locator schemas, ensuring that only valid paths are used.
	 */
	private safeGetLocatorSchema(path: string): (() => LocatorSchema) | undefined {
		return this.locatorSchemas.get(path as LocatorSchemaPathType);
	}

	/**
	 * Extracts path-index pairs from a given schema path.
	 * This utility function breaks down a complex path into manageable parts,
	 * associating each part with its corresponding index when necessary.
	 */
	private extractPathsFromSchema = (paths: string, indices: Record<number, number> = {}): PathIndexPairs => {
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
	 * logError is a utility function for logging errors with detailed debug information
	 * It re-throws the error after logging to ensure the test will fail.
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
			nestedLocatorResults: nestedLocatorResults,
		};

		this.log.error(
			"An error occurred during nested locator construction.\n",
			"Error details:\n",
			JSON.stringify(errorDetails, null, 2),
		);

		throw error; // Re-throw the caught error to ensure the test fails.
	};

	/** Merges 'source' into 'target', combining their properties into a new isolated object. */
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
						{} as Record<string, unknown>, // Updated type here
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
					// Direct assignment for primitives and nulls
					(merged as Record<string, unknown>)[key] = sourceValue;
				}
			}
		}

		return merged;
	}

	/**
	 * Assembles nested locators based on a locator schema path and optional indices for locating specific elements.
	 * This method orchestrates the process of building a locator that can resolve to a specific element or set of
	 * elements in the DOM.
	 */
	protected buildNestedLocator = async (
		locatorSchemaPath: LocatorSchemaPathType,
		schemasMap: Map<string, LocatorSchema>,
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
				LocatorSchema: null, // Initialize as an empty object
				NestingSteps: [],
			};

			for (const { path, index } of pathIndexPairs) {
				const currentSchema = schemasMap.get(path);
				if (!currentSchema) continue;

				try {
					const nextLocator = this.getBy.getLocator(currentSchema);

					if (currentLocator) {
						currentLocator = currentLocator.locator(nextLocator);
						if (index != null) {
							currentLocator = currentLocator.nth(index);
						}
					} else {
						currentLocator = nextLocator;
						if (index != null) {
							currentLocator = currentLocator.nth(index);
						}
					}

					if (this.log.isLogLevelEnabled("debug")) {
						if (!nestedLocatorResults.LocatorSchema) {
							const safeGetLocatorSchema = this.safeGetLocatorSchema(locatorSchemaPath);
							if (safeGetLocatorSchema !== undefined) {
								nestedLocatorResults.LocatorSchema = safeGetLocatorSchema();
							}
						}

						if (currentSchema.locatorMethod === GetByMethod.frameLocator) {
							if (!currentIFrame) {
								currentIFrame = currentSchema.frameLocator;
							}

							if (currentIFrame != null && currentSchema.frameLocator != null) {
								if (currentIFrame.endsWith(currentSchema.frameLocator)) {
									currentIFrame += ` -> ${currentSchema.frameLocator}`;
								}
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
				this.log.debug("Nested locator evaluation results:", JSON.stringify(nestedLocatorResults, null, 2));
			}

			if (currentLocator != null) {
				currentLocator.scrollIntoViewIfNeeded().catch(() => {});
				return currentLocator;
			}
		})) as Locator;
	};

	/**
	 * Evaluates the current locator, capturing details about its resolution status and the elements it resolves to.
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
				currentLocatorString: currentLocator,
				resolved: elementsData.length > 0,
				elementCount: elementsData.length,
				elementsResolvedTo: elementsData,
			});
		}
	};

	/**
	 * Retrieves and compiles attributes of elements resolved by a Playwright locator per nesting step.
	 * This method provides insights into the elements targeted by the locator, aiding in debugging and verification.
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
