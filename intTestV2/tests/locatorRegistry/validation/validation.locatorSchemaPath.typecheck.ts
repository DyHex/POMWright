import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

declare const page: Page;

type ValidPaths = "valid" | "valid.path";

createRegistryWithAccessors<ValidPaths>(page);

type InvalidPaths = "valid" | "validReuse" | "" | ".leading" | "trailing." | "double..dot" | "contains whitespace";

const invalidRegistryFactoryResult = createRegistryWithAccessors<InvalidPaths>(page);

invalidRegistryFactoryResult.add("valid").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add(".leading").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("trailing.").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("double..dot").locator("body");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("contains whitespace").locator("body");

invalidRegistryFactoryResult.add("validReuse", { reuse: "valid" });
invalidRegistryFactoryResult.add("validReuse", { reuse: "validReuse" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: "" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: ".leading" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: "trailing." });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: "double..dot" });
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.add("validReuse", { reuse: "contains whitespace" });

invalidRegistryFactoryResult.getLocator("valid");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator("");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator(".leading");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator("trailing.");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator("double..dot");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocator("contains whitespace");

invalidRegistryFactoryResult.getLocatorSchema("valid");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema("");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema(".leading");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema("trailing.");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema("double..dot");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getLocatorSchema("contains whitespace");

invalidRegistryFactoryResult.getNestedLocator("valid");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator("");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator(".leading");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator("trailing.");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator("double..dot");
// @ts-expect-error invalid path literal should fail at the accessor argument with path-format details
invalidRegistryFactoryResult.getNestedLocator("contains whitespace");
