import type { FrameLocator, Locator, Page } from "@playwright/test";

export type RoleDefinition = {
	type: "role";
	role: Parameters<Page["getByRole"]>[0];
	options?: Parameters<Page["getByRole"]>[1];
};

export type TextDefinition = {
	type: "text";
	text: Parameters<Page["getByText"]>[0];
	options?: Parameters<Page["getByText"]>[1];
};

export type LabelDefinition = {
	type: "label";
	text: Parameters<Page["getByLabel"]>[0];
	options?: Parameters<Page["getByLabel"]>[1];
};

export type PlaceholderDefinition = {
	type: "placeholder";
	text: Parameters<Page["getByPlaceholder"]>[0];
	options?: Parameters<Page["getByPlaceholder"]>[1];
};

export type AltTextDefinition = {
	type: "altText";
	text: Parameters<Page["getByAltText"]>[0];
	options?: Parameters<Page["getByAltText"]>[1];
};

export type TitleDefinition = {
	type: "title";
	text: Parameters<Page["getByTitle"]>[0];
	options?: Parameters<Page["getByTitle"]>[1];
};

export type LocatorDefinition = {
	type: "locator";
	selector: Parameters<Page["locator"]>[0];
	options?: Parameters<Page["locator"]>[1];
};

export type FrameLocatorDefinition = {
	type: "frameLocator";
	selector: Parameters<Page["frameLocator"]>[0];
};

export type TestIdDefinition = {
	type: "testId";
	testId: Parameters<Page["getByTestId"]>[0];
};

export type IdDefinition = {
	type: "id";
	id: string;
};

export type DataCyDefinition = {
	type: "dataCy";
	value: string;
};

export type LocatorStrategyDefinition =
	| RoleDefinition
	| TextDefinition
	| LabelDefinition
	| PlaceholderDefinition
	| AltTextDefinition
	| TitleDefinition
	| LocatorDefinition
	| FrameLocatorDefinition
	| TestIdDefinition
	| IdDefinition
	| DataCyDefinition;

export type PlaywrightFilterDefinition = NonNullable<Parameters<Locator["filter"]>[0]>;
export type ResolvedFilterDefinition = PlaywrightFilterDefinition;

export type FilterLocatorReference<LocatorSchemaPathType extends string> =
	| Locator
	| LocatorStrategyDefinition
	| { locator: LocatorStrategyDefinition }
	| { locatorPath: LocatorSchemaPathType }
	| LocatorSchemaPathType;

export type FilterDefinition<LocatorSchemaPathType extends string> =
	| PlaywrightFilterDefinition
	| (Omit<PlaywrightFilterDefinition, "has" | "hasNot"> & {
			has?: PlaywrightFilterDefinition["has"] | FilterLocatorReference<LocatorSchemaPathType>;
			hasNot?: PlaywrightFilterDefinition["hasNot"] | FilterLocatorReference<LocatorSchemaPathType>;
	  });

export type FilterPatch<LocatorSchemaPathType extends string> =
	| FilterDefinition<LocatorSchemaPathType>[]
	| {
			append?: FilterDefinition<LocatorSchemaPathType> | FilterDefinition<LocatorSchemaPathType>[];
			replace?: FilterDefinition<LocatorSchemaPathType> | FilterDefinition<LocatorSchemaPathType>[];
			clear?: boolean;
	  };

export type LocatorBuilderTarget = Page | Locator | FrameLocator;

export type LocatorSchemaRecord<LocatorSchemaPathType extends string = string> = {
	locatorSchemaPath: string;
	definition: LocatorStrategyDefinition;
	filters?: FilterDefinition<LocatorSchemaPathType>[];
	index?: IndexSelector | null;
};

export type LocatorUpdate = Partial<LocatorStrategyDefinition>;

export type IndexSelector = number | "first" | "last";

export type PathIndexMap = Partial<Record<string, IndexSelector | null | undefined>>;

export type LocatorRegistrationConfig<LocatorSchemaPathType extends string = string> = {
	filters?: FilterDefinition<LocatorSchemaPathType> | FilterDefinition<LocatorSchemaPathType>[];
	index?: IndexSelector | null;
};
