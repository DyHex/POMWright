import type { Locator } from "@playwright/test";
import type { LocatorSchema } from "../../src/helpers/locatorSchema.interface";
import { GetByMethod } from "../../src/helpers/locatorSchema.interface";
import type { LocatorRegistry, LocatorRegistryInternal } from "./locatorRegistry";
import type { RegistryPath } from "./types";
import { isLocatorInstance, validateLocatorSchemaPath } from "./utils";

type RegistryWithLookup<LocatorSchemaPathType extends string> = LocatorRegistryInternal<LocatorSchemaPathType> & {
	getIfExists?: (path: RegistryPath<LocatorSchemaPathType>) => unknown;
};

const getRegistryLookup = <LocatorSchemaPathType extends string>(
	registry: LocatorRegistry<LocatorSchemaPathType>,
): RegistryWithLookup<LocatorSchemaPathType> => registry as RegistryWithLookup<LocatorSchemaPathType>;

const logMissingDefinition = (path: string, field: string) => {
	console.warn(
		`[POMWright] Skipping v2 translation for "${path}" because "${field}" is missing. ` +
			"Rewrite this locator in defineLocators() using the v2 registry.",
	);
};

const logLocatorInstanceWarning = (path: string) => {
	console.warn(
		`[POMWright] Skipping v2 translation for "${path}" because v1 LocatorSchema.locator is a Locator instance. ` +
			"Rewrite this path in defineLocators() to avoid runtime gaps during migration.",
	);
};

export const addV1SchemaToV2Registry = <LocatorSchemaPathType extends string>(
	registry: LocatorRegistry<LocatorSchemaPathType>,
	locatorSchema: LocatorSchema,
) => {
	const path = locatorSchema.locatorSchemaPath;
	validateLocatorSchemaPath(path);

	const registryWithLookup = getRegistryLookup(registry);
	const existing = registryWithLookup.getIfExists?.(path as RegistryPath<LocatorSchemaPathType>);
	if (existing) {
		return;
	}

	console.info(
		`[POMWright] LocatorSchemaPath "${path}" is not registered in the v2 registry. ` +
			"Translating and adding v1 schema to v2 Locator Registry; update this path to use registry.add in defineLocators().",
	);

	const registration = registry.add(path as RegistryPath<LocatorSchemaPathType>);
	if (!registration) {
		return;
	}

	let postDefinition:
		| ReturnType<typeof registration.getByRole>
		| ReturnType<typeof registration.getByText>
		| ReturnType<typeof registration.getByLabel>
		| ReturnType<typeof registration.getByPlaceholder>
		| ReturnType<typeof registration.getByAltText>
		| ReturnType<typeof registration.getByTitle>
		| ReturnType<typeof registration.locator>
		| ReturnType<typeof registration.frameLocator>
		| ReturnType<typeof registration.getByTestId>
		| ReturnType<typeof registration.getById>
		| null = null;

	switch (locatorSchema.locatorMethod) {
		case GetByMethod.role: {
			if (!locatorSchema.role) {
				logMissingDefinition(path, "role");
				return;
			}
			postDefinition = registration.getByRole(locatorSchema.role, locatorSchema.roleOptions);
			break;
		}
		case GetByMethod.text: {
			if (!locatorSchema.text) {
				logMissingDefinition(path, "text");
				return;
			}
			postDefinition = registration.getByText(locatorSchema.text, locatorSchema.textOptions);
			break;
		}
		case GetByMethod.label: {
			if (!locatorSchema.label) {
				logMissingDefinition(path, "label");
				return;
			}
			postDefinition = registration.getByLabel(locatorSchema.label, locatorSchema.labelOptions);
			break;
		}
		case GetByMethod.placeholder: {
			if (!locatorSchema.placeholder) {
				logMissingDefinition(path, "placeholder");
				return;
			}
			postDefinition = registration.getByPlaceholder(locatorSchema.placeholder, locatorSchema.placeholderOptions);
			break;
		}
		case GetByMethod.altText: {
			if (!locatorSchema.altText) {
				logMissingDefinition(path, "altText");
				return;
			}
			postDefinition = registration.getByAltText(locatorSchema.altText, locatorSchema.altTextOptions);
			break;
		}
		case GetByMethod.title: {
			if (!locatorSchema.title) {
				logMissingDefinition(path, "title");
				return;
			}
			postDefinition = registration.getByTitle(locatorSchema.title, locatorSchema.titleOptions);
			break;
		}
		case GetByMethod.locator: {
			if (!locatorSchema.locator) {
				logMissingDefinition(path, "locator");
				return;
			}
			if (isLocatorInstance(locatorSchema.locator)) {
				logLocatorInstanceWarning(path);
				return;
			}
			postDefinition = registration.locator(locatorSchema.locator, locatorSchema.locatorOptions);
			break;
		}
		case GetByMethod.frameLocator: {
			if (!locatorSchema.frameLocator) {
				logMissingDefinition(path, "frameLocator");
				return;
			}
			postDefinition = registration.frameLocator(locatorSchema.frameLocator);
			break;
		}
		case GetByMethod.testId: {
			if (!locatorSchema.testId) {
				logMissingDefinition(path, "testId");
				return;
			}
			postDefinition = registration.getByTestId(locatorSchema.testId);
			break;
		}
		case GetByMethod.dataCy: {
			if (!locatorSchema.dataCy) {
				logMissingDefinition(path, "dataCy");
				return;
			}
			postDefinition = registration.locator(`[data-cy="${locatorSchema.dataCy}"]`);
			break;
		}
		case GetByMethod.id: {
			if (!locatorSchema.id) {
				logMissingDefinition(path, "id");
				return;
			}
			postDefinition = registration.getById(locatorSchema.id);
			break;
		}
		default: {
			const exhaustive: never = locatorSchema.locatorMethod;
			return exhaustive;
		}
	}

	if (!postDefinition) {
		return;
	}

	if (locatorSchema.filter && locatorSchema.locatorMethod !== GetByMethod.frameLocator) {
		const filter = locatorSchema.filter as {
			has?: Locator;
			hasNot?: Locator;
			hasText?: string | RegExp;
			hasNotText?: string | RegExp;
		};
		postDefinition.filter(filter);
	}
};
