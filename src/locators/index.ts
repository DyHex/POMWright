export { type LocatorQueryBuilder, LocatorQueryBuilderInternal } from "./locatorQueryBuilder";
export { LocatorRegistrationBuilder } from "./locatorRegistrationBuilder";
export type {
	AddAccessor,
	GetLocatorAccessor,
	GetLocatorSchemaAccessor,
	GetNestedLocatorAccessor,
	LocatorRegistry,
	LocatorRegistryOptions,
	LocatorSchemaPathArgument,
} from "./locatorRegistry";
export { createRegistryWithAccessors, LocatorRegistryInternal } from "./locatorRegistry";
export {
	type LocatorUpdateBuilder,
	LocatorUpdateBuilderInternal,
	type LocatorUpdateMode,
} from "./locatorUpdateBuilder";
export {
	ReusableLocatorBuilder,
	type ReusableLocatorFactory,
	ReusableLocatorFactoryInternal,
} from "./reusableLocatorBuilder";
export * from "./types";
export * from "./utils";
