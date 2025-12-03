import type { FrameLocator, Locator, Page } from "@playwright/test";
import type { LocatorSchemaPathValid } from "./utils";

export type LocatorSchemaPathAlias<LocatorSchemaPathType extends string> = LocatorSchemaPathType &
	LocatorSchemaPathValid<LocatorSchemaPathType>;

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

export type LocatorStep<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> =
	| { kind: "filter"; filter: FilterDefinition<LocatorSchemaPathType, AllowedPaths> }
	| { kind: "index"; index: IndexSelector | null };

export type LocatorStepOverride<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> =
	| { nth: IndexSelector | null }
	| { filter: FilterDefinition<LocatorSchemaPathType, AllowedPaths> }
	| FilterDefinition<LocatorSchemaPathType, AllowedPaths>;

export type FilterLocatorReference<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> =
	| Locator
	| LocatorStrategyDefinition
	| { locator: LocatorStrategyDefinition }
	| { locatorPath: AllowedPaths }
	| AllowedPaths;

export type FilterDefinition<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> =
	| PlaywrightFilterDefinition
	| (Omit<PlaywrightFilterDefinition, "has" | "hasNot"> & {
			has?: PlaywrightFilterDefinition["has"] | FilterLocatorReference<LocatorSchemaPathType, AllowedPaths>;
			hasNot?: PlaywrightFilterDefinition["hasNot"] | FilterLocatorReference<LocatorSchemaPathType, AllowedPaths>;
	  });

export type FilterPatch<
	LocatorSchemaPathType extends string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> =
	| FilterDefinition<LocatorSchemaPathType, AllowedPaths>[]
	| {
			append?:
				| FilterDefinition<LocatorSchemaPathType, AllowedPaths>
				| FilterDefinition<LocatorSchemaPathType, AllowedPaths>[];
			replace?:
				| FilterDefinition<LocatorSchemaPathType, AllowedPaths>
				| FilterDefinition<LocatorSchemaPathType, AllowedPaths>[];
			clear?: boolean;
	  };

export type LocatorBuilderTarget = Page | Locator | FrameLocator;

export type LocatorSchemaRecord<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> = {
	locatorSchemaPath: LocatorSchemaPathAlias<LocatorSchemaPathType>;
	definition: LocatorStrategyDefinition;
	steps?: LocatorStep<LocatorSchemaPathType, AllowedPaths>[];
	filters?: FilterDefinition<LocatorSchemaPathType, AllowedPaths>[];
	index?: IndexSelector | null;
};

type LocatorUpdateFor<Definition extends LocatorStrategyDefinition> = { type: Definition["type"] } & Partial<
	Omit<Definition, "type">
>;

export type LocatorUpdate =
	| LocatorUpdateFor<RoleDefinition>
	| LocatorUpdateFor<TextDefinition>
	| LocatorUpdateFor<LabelDefinition>
	| LocatorUpdateFor<PlaceholderDefinition>
	| LocatorUpdateFor<AltTextDefinition>
	| LocatorUpdateFor<TitleDefinition>
	| LocatorUpdateFor<LocatorDefinition>
	| LocatorUpdateFor<FrameLocatorDefinition>
	| LocatorUpdateFor<TestIdDefinition>
	| LocatorUpdateFor<IdDefinition>
	| LocatorUpdateFor<DataCyDefinition>;

export type IndexSelector = number | "first" | "last";

export type PathIndexMap = Partial<Record<string, IndexSelector | null | undefined>>;

export type LocatorOverrides<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> = Partial<
	Record<
		AllowedPaths,
		| IndexSelector
		| null
		| LocatorStepOverride<LocatorSchemaPathType, AllowedPaths>
		| LocatorStepOverride<LocatorSchemaPathType, AllowedPaths>[]
	>
>;

export type LocatorRegistrationConfig<
	LocatorSchemaPathType extends string = string,
	AllowedPaths extends string = LocatorSchemaPathAlias<LocatorSchemaPathType>,
> = {
	filters?:
		| FilterDefinition<LocatorSchemaPathType, AllowedPaths>
		| FilterDefinition<LocatorSchemaPathType, AllowedPaths>[];
	index?: IndexSelector | null;
};
