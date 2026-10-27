---
title: API reference
description: "Every export of pomwright, grouped, with a line on what each is and a link to its page."
---

Everything POMWright exports, imported from the package root: `import { PageObject } from "pomwright"`. Types are
imported with `import type`. Each page documents its members in Playwright's form: usage, arguments, return value and
the errors thrown, with the real messages. The same text is in the doc comments, so an editor's hover shows it.

## Page objects

| export | what it is |
| --- | --- |
| [`PageObject`](/POMWright/api/class-pageobject/) | the base class of a page object: a registry, a navigation helper and a session storage helper for a page |
| [`PageObjectOptions`](/POMWright/api/types/#pageobjectoptions) | the constructor's options: `label`, `navOptions`, `sessionStorage`, `locators` |
| [`PageObjectTypeOptions`](/POMWright/api/types/#pageobjecttypeoptions) | the second type argument: the URL types and the session storage schema |
| [`BaseUrlTypeFromOptions`](/POMWright/api/types/#baseurltypefromoptions), [`UrlPathTypeFromOptions`](/POMWright/api/types/#urlpathtypefromoptions), [`FullUrlTypeFromOptions`](/POMWright/api/types/#fullurltypefromoptions), [`StorageTypeFromOptions`](/POMWright/api/types/#storagetypefromoptions) | the types `PageObjectTypeOptions` produces |

## Locators

| export | what it is |
| --- | --- |
| [`LocatorRegistry`](/POMWright/api/class-locatorregistry/) | a registry: `add`, `getNestedLocator`, `getLocator`, `getLocatorSchema`, `verify`, `createReusable` |
| [`createRegistryWithAccessors`](/POMWright/api/class-locatorregistry/#createregistrywithaccessors) | creates a registry without a page object |
| [`LocatorRegistryOptions`](/POMWright/api/class-locatorregistry/#locatorregistryoptions) | the registry's options: `strictChains` |
| [`AddAccessor`](/POMWright/api/class-locatorregistry/#addaccessor), [`GetLocatorAccessor`](/POMWright/api/class-locatorregistry/#getlocatoraccessor), [`GetNestedLocatorAccessor`](/POMWright/api/class-locatorregistry/#getnestedlocatoraccessor), [`GetLocatorSchemaAccessor`](/POMWright/api/class-locatorregistry/#getlocatorschemaaccessor) | the registry's methods as functions of their own |
| [Registration](/POMWright/api/class-registrationbuilder/) | what `add(path)` returns: the ten locator methods, then `filter`, `nth`, `describe` (not exported) |
| [`LocatorQueryBuilder`](/POMWright/api/class-locatorquerybuilder/) | a query, what `getLocatorSchema(path)` returns |
| [`LocatorUpdateBuilder`](/POMWright/api/class-locatorupdatebuilder/) | what a query's `update()` and `replace()` return |
| [`ReusableLocator`](/POMWright/api/class-reusablelocator/) | a seed from `createReusable` |
| [`ReusableLocatorFactory`](/POMWright/api/class-reusablelocator/#reusablelocatorfactory) | the type of `createReusable`, which makes seeds |
| [`FilterDefinition`](/POMWright/api/types/#filterdefinition) | the argument of `filter` |
| [`IndexSelector`](/POMWright/api/types/#indexselector) | the argument of `nth` |
| [`LocatorSchemaPathFormat`](/POMWright/api/types/#locatorschemapathformat) | the path rules as a type |
| [`LocatorSchemaPathArgument`](/POMWright/api/types/#locatorschemapathargument) | the type of a path parameter, for helpers that forward paths |

## Navigation

| export | what it is |
| --- | --- |
| [`NavigationFor`](/POMWright/api/class-navigation/) | a page object's `navigation`: `goto`, `expectThisPage`, `expectAnotherPage` |
| [`NavigationOptions`](/POMWright/api/class-navigation/#navigationoptions) | `waitUntil` and `timeout` |
| [`ThisPageOptions`](/POMWright/api/class-navigation/#thispageoptions) | the options of `goto()` and `expectThisPage()`, with `runPostNavigationActions` |
| [`UrlMatcher`](/POMWright/api/class-navigation/#urlmatcher) | the `fullUrl` of a page whose URL varies |

## Session storage

| export | what it is |
| --- | --- |
| [`SessionStorage`](/POMWright/api/class-sessionstorage/) | Playwright's `page.sessionStorage` with batches, report steps, an origin check, codecs and `seed` |
| [`json`](/POMWright/api/class-sessionstorage/#json) | the JSON codec |
| [`Codec`](/POMWright/api/class-sessionstorage/#codec) | how a key's value is stored and read back |
| [`SessionStorageSchema`](/POMWright/api/class-sessionstorage/#sessionstorageschema) | codecs by key |
| [`SessionStorageOptions`](/POMWright/api/class-sessionstorage/#sessionstorageoptions) | the options of `new SessionStorage()` |
| [`SeedOptions`](/POMWright/api/class-sessionstorage/#seedoptions) | the options of `seed` |
| [`Decoded`](/POMWright/api/class-sessionstorage/#decoded) | the type of a key's value under a schema |
| [`AllEntries`](/POMWright/api/class-sessionstorage/#allentries) | what `get()` returns |

## Reports

| export | what it is |
| --- | --- |
| [`test`](/POMWright/api/fixtures/) | Playwright's `test` with the `log` fixture |
| [`PlaywrightReportLogger`](/POMWright/api/class-playwrightreportlogger/) | a logger whose entries are attached to the report |
| [`LogEntry`](/POMWright/api/class-playwrightreportlogger/#logentry), [`LogLevel`](/POMWright/api/class-playwrightreportlogger/#loglevel) | one entry; the levels |
| [`step`](/POMWright/api/step/) | the `@step` decorator |
| [`StepDecorator`](/POMWright/api/step/#stepdecorator) | the type of the decorator `step()` returns |

## Errors

[Error messages](/POMWright/api/errors/) lists every message, by the call that throws it.
