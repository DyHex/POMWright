import { type Locator, test } from "@playwright/test";
import { BasePage } from "../basePage";
import { GetBy } from "./getBy.locator";
import {
  GetByMethod,
  type LocatorSchema,
  getLocatorSchemaDummy,
} from "./locatorSchema.interface";
import { PlaywrightReportLogger } from "./playwrightReportLogger";
export { GetByMethod };

// Defines properties that can be updated in a LocatorSchema
export type UpdatableLocatorSchemaProperties = Omit<
  LocatorSchema,
  "locatorSchemaPath"
>;

// Interface for additional methods provided to LocatorSchema
interface WithUpdateMethod {
  update(
    updates: Partial<UpdatableLocatorSchemaProperties>,
  ): LocatorSchemaWithMethods;
}

interface WithUpdatesMethod {
  updates(indexedUpdates: {
    [index: number]: Partial<UpdatableLocatorSchemaProperties> | null;
  }): LocatorSchemaWithMethods;
}

interface WithGetNestedLocatorMethod {
  getNestedLocator(
    indices?: { [key: number]: number | null } | null,
  ): Promise<Locator>;
}

interface WithGetLocatorMethod {
  getLocator(): Promise<Locator>;
}

// Extends LocatorSchema with additional methods and properties
export type LocatorSchemaWithMethods = LocatorSchema &
  WithUpdateMethod &
  WithUpdatesMethod &
  WithGetNestedLocatorMethod &
  WithGetLocatorMethod & {
    schemasMap: Map<string, LocatorSchema>;
  };

// ModifiedLocatorSchema omits the locatorSchemaPath from LocatorSchema
export interface ModifiedLocatorSchema
  extends UpdatableLocatorSchemaProperties {}

type PathIndexPairs = { path: string; index?: number }[];

/**
 * GetLocatorBase
 *
 * The GetLocatorBase class is designed to provide the core functionality for dynamically generating
 * nested locators based on a defined structure. By nesting locators we narrow what we can resolve
 * to, providing a higher degree of certainty that the element(s) resolved to are correct and in
 * the expected location. These nested locators are used in Playwright tests to interact with elements
 * in a more contextual manner.
 *
 * @class
 * @public
 *
 */
export class GetLocatorBase<LocatorSchemaPathType extends string> {
  private getBy: GetBy;

  private locatorSchemas: Map<LocatorSchemaPathType, () => LocatorSchema>;
  /**
   * Constructor for the GetLocatorBaseClass.
   *
   * @param {BasePage} pageObjectClass - The page object class to which the locator pertains.
   * @param {PlaywrightReportLogger} log - The PlaywrightReportLogger child of the page object class.
   */
  constructor(
    protected pageObjectClass: BasePage<LocatorSchemaPathType>,
    protected log: PlaywrightReportLogger,
  ) {
    this.locatorSchemas = new Map<LocatorSchemaPathType, () => LocatorSchema>();
    this.getBy = new GetBy(
      this.pageObjectClass.page,
      this.log.getNewChildLogger("GetBy"),
    );
  }

  /**
   * test
   * @param locatorSchemaPath
   * @returns
   */
  public getLocatorSchema(
    locatorSchemaPath: LocatorSchemaPathType,
  ): LocatorSchemaWithMethods {
    const pathIndexPairs = this.extractPathsFromSchema(locatorSchemaPath);
    const schemasMap = this.collectDeepCopies(
      locatorSchemaPath,
      pathIndexPairs,
    );
    const locatorSchemaCopy = schemasMap.get(
      locatorSchemaPath,
    ) as LocatorSchemaWithMethods;
    locatorSchemaCopy.schemasMap = schemasMap;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this; // the update and updates functions need locatorSchemaCopy 'this' context

    locatorSchemaCopy.update = function (
      this: LocatorSchemaWithMethods,
      updates: Partial<UpdatableLocatorSchemaProperties>,
    ) {
      self.applyUpdate(schemasMap, locatorSchemaPath, updates);
      return this;
    };

    locatorSchemaCopy.updates = function (
      this: LocatorSchemaWithMethods,
      indexedUpdates: {
        [index: number]: Partial<UpdatableLocatorSchemaProperties>;
      },
    ) {
      self.applyUpdates(schemasMap, pathIndexPairs, indexedUpdates);
      return this;
    };

    locatorSchemaCopy.getNestedLocator = async (
      indices?: Record<number, number>,
    ) => {
      return await this.buildNestedLocator(
        locatorSchemaPath,
        schemasMap,
        indices,
      );
    };

    locatorSchemaCopy.getLocator = async () => {
      return this.getBy.getLocator(locatorSchemaCopy);
    };

    return locatorSchemaCopy;
  }

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

  private applyUpdate(
    schemasMap: Map<string, LocatorSchema>,
    locatorSchemaPath: LocatorSchemaPathType,
    updateData: Partial<LocatorSchema>,
  ): void {
    const schema = schemasMap.get(locatorSchemaPath);
    if (schema) {
      schemasMap.set(locatorSchemaPath, this.deepMerge(schema, updateData));
    }
  }

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
          schemasMap.set(path, this.deepMerge(schema, updateAtIndex));
        }
      }
    }
  }

  private createLocatorSchema(
    schemaDetails: ModifiedLocatorSchema,
    locatorSchemaPath: LocatorSchemaPathType,
  ) {
    const schema: LocatorSchema = { ...schemaDetails, locatorSchemaPath };
    return schema;
  }

  public addSchema(
    locatorSchemaPath: LocatorSchemaPathType,
    schemaDetails: ModifiedLocatorSchema,
  ): void {
    // Create the new schema
    const newLocatorSchema = this.createLocatorSchema(
      schemaDetails,
      locatorSchemaPath,
    );

    // Check if the locatorSchemaPath already exists in the map, it should not
    const existingSchemaFunc = this.safeGetLocatorSchema(locatorSchemaPath);
    if (existingSchemaFunc) {
      // Throw an error with details of both schemas if the locatorSchemaPath already exists
      const existingLocatorSchema = existingSchemaFunc();
      throw new Error(
        `[${this.pageObjectClass.pocName}] A LocatorSchema with the path '${locatorSchemaPath}' already exists. \n` +
          `Existing Schema: ${JSON.stringify(
            existingLocatorSchema,
            null,
            2,
          )} \n` +
          `Attempted to Add Schema: ${JSON.stringify(
            newLocatorSchema,
            null,
            2,
          )}`,
      );
    }

    // Add the new schema to the map
    this.locatorSchemas.set(locatorSchemaPath, () => newLocatorSchema);
  }

  private safeGetLocatorSchema(
    path: string,
  ): (() => LocatorSchema) | undefined {
    return this.locatorSchemas.get(path as LocatorSchemaPathType);
  }

  private extractPathsFromSchema = (
    paths: string,
    indices: Record<number, number> = {},
  ): PathIndexPairs => {
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

  // Merges 'source' into 'target', combining their properties into a new isolated object.
  private deepMerge<TargetType, SourceType>(
    target: TargetType,
    source: SourceType,
  ): TargetType {
    // Create a new merged object to ensure immutability
    const merged = { ...target };
    const dummySchema = getLocatorSchemaDummy();

    if (typeof source === "object" && source !== null) {
      const filteredKeys = Object.keys(source).filter(
        (key) => key !== "locatorSchemaPath",
      );

      for (const key of filteredKeys) {
        const targetKey = key as keyof TargetType;
        const sourceKey = key as keyof SourceType;

        // Check if the key exists in the dummy schema for validation
        if (!(key in dummySchema)) {
          throw new Error(
            `Invalid property: '${key}' is not a valid property of LocatorSchema`,
          );
        }

        const targetValue = merged[targetKey];
        const sourceValue = source[sourceKey];

        // Merge logic based on the type of the source value
        if (sourceValue !== undefined) {
          if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
            // Concatenate arrays
            merged[targetKey] = [
              ...targetValue,
              ...sourceValue,
            ] as TargetType[keyof TargetType];
          } else if (sourceValue instanceof RegExp) {
            // Clone RegExp
            merged[targetKey] = new RegExp(
              sourceValue.source,
              sourceValue.flags,
            ) as TargetType[keyof TargetType];
          } else if (typeof sourceValue === "object" && sourceValue !== null) {
            // Recursive merge for nested objects
            merged[targetKey] = targetValue
              ? this.deepMerge(targetValue, sourceValue)
              : (structuredClone(sourceValue) as TargetType[keyof TargetType]);
          } else {
            // Direct assignment for non-object values or nulls
            merged[targetKey] =
              sourceValue as unknown as TargetType[keyof TargetType];
          }
        }
      }
    }

    return merged;
  }

  protected buildNestedLocator = async (
    locatorSchemaPath: LocatorSchemaPathType,
    schemasMap: Map<string, LocatorSchema>,
    indices: Record<number, number> = {},
  ): Promise<Locator> => {
    return (await test.step(`${this.pageObjectClass.pocName}: Build Nested Locator`, async () => {
      const pathIndexPairs = this.extractPathsFromSchema(
        locatorSchemaPath,
        indices,
      );
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
              const safeGetLocatorSchema =
                this.safeGetLocatorSchema(locatorSchemaPath);
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
              await this.evaluateCurrentLocator(
                currentLocator,
                nestedLocatorResults.NestingSteps,
                currentIFrame,
              );
            } else {
              await this.evaluateCurrentLocator(
                currentLocator,
                nestedLocatorResults.NestingSteps,
                null,
              );
            }
          }
        } catch (error) {
          this.logError(
            error as Error,
            locatorSchemaPath,
            currentLocator,
            path,
            pathIndexPairs,
            nestedLocatorResults,
          );
          break;
        }
      }

      if (!currentLocator) {
        this.logError(
          new Error(
            `Failed to build nested locator for path: ${locatorSchemaPath}`,
          ),
          locatorSchemaPath,
          currentLocator,
          locatorSchemaPath,
          pathIndexPairs,
        );
      }

      if (this.log.isLogLevelEnabled("debug")) {
        this.log.debug(
          "Nested locator evaluation results:",
          JSON.stringify(nestedLocatorResults, null, 2),
        );
      }

      if (currentLocator != null) {
        currentLocator.scrollIntoViewIfNeeded().catch(() => {});
        return currentLocator;
      }
    })) as Locator;
  };

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
   * Evaluates the Playwright locator, checking if it resolves to any elements, and retrieves element attributes.
   *
   * @param pwLocator - The Playwright locator to evaluate.
   * @returns - A promise that resolves to an object containing the Playwright locator and an array of element attributes for each element located, or null if no elements are found.
   */
  private evaluateAndGetAttributes = async (
    pwLocator: Locator,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ): Promise<any[]> => {
    return await pwLocator.evaluateAll((objects) =>
      objects.map((el) => {
        const elementAttributes = el.hasAttributes()
          ? Object.fromEntries(
              Array.from(el.attributes).map(({ name, value }) => [name, value]),
            )
          : {};
        return { tagName: el.tagName, attributes: elementAttributes };
      }),
    );
  };
}
