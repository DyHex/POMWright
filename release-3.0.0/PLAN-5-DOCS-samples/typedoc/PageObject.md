---
editUrl: false
next: false
prev: false
title: "PageObject"
---

Defined in: pageObject.ts:75

Base class for page objects. `defineLocators()` does not run inside this constructor, where the
subclass has not stored anything yet: it runs, followed by `verify()`, right after the code that
called `new` has finished (a check scheduled as the constructor's last statement), or at the first
locator call if that comes earlier, once per instance. A registry mistake is reported with the
page object's label and the original error as `cause`; reported by the scheduled check, its stack
points at the construction site.

## Type Parameters

### LocatorSchemaPathType

`LocatorSchemaPathType` *extends* `string`

### Options

`Options` *extends* [`PageObjectTypeOptions`](/POMWright/api/generated/type-aliases/pageobjecttypeoptions/) = \{ `baseUrlType`: `string`; `urlPathType`: `string`; \}

## Properties

### add

> `readonly` **add**: [`AddAccessor`](/POMWright/api/generated/type-aliases/addaccessor/)\<`LocatorSchemaPathType`\>

Defined in: pageObject.ts:87

***

### baseUrl

> `readonly` **baseUrl**: [`BaseUrlTypeFromOptions`](/POMWright/api/generated/type-aliases/baseurltypefromoptions/)\<`Options`\>

Defined in: pageObject.ts:80

***

### fullUrl

> `readonly` **fullUrl**: [`FullUrlTypeFromOptions`](/POMWright/api/generated/type-aliases/fullurltypefromoptions/)\<`Options`\>

Defined in: pageObject.ts:82

***

### getLocator

> `readonly` **getLocator**: [`GetLocatorAccessor`](/POMWright/api/generated/type-aliases/getlocatoraccessor/)\<`LocatorSchemaPathType`\>

Defined in: pageObject.ts:88

***

### getLocatorSchema

> `readonly` **getLocatorSchema**: [`GetLocatorSchemaAccessor`](/POMWright/api/generated/type-aliases/getlocatorschemaaccessor/)\<`LocatorSchemaPathType`\>

Defined in: pageObject.ts:89

***

### getNestedLocator

> `readonly` **getNestedLocator**: [`GetNestedLocatorAccessor`](/POMWright/api/generated/type-aliases/getnestedlocatoraccessor/)\<`LocatorSchemaPathType`\>

Defined in: pageObject.ts:90

***

### label

> `readonly` **label**: `string`

Defined in: pageObject.ts:83

***

### navigation

> `readonly` **navigation**: [`NavigationFor`](/POMWright/api/generated/type-aliases/navigationfor/)\<[`BaseUrlTypeFromOptions`](/POMWright/api/generated/type-aliases/baseurltypefromoptions/)\<`Options`\>, [`FullUrlTypeFromOptions`](/POMWright/api/generated/type-aliases/fullurltypefromoptions/)\<`Options`\>\>

Defined in: pageObject.ts:85

***

### page

> `readonly` **page**: `Page`

Defined in: pageObject.ts:79

***

### sessionStorage

> `readonly` **sessionStorage**: [`SessionStorage`](/POMWright/api/generated/classes/sessionstorage/)\<[`StorageTypeFromOptions`](/POMWright/api/generated/type-aliases/storagetypefromoptions/)\<`Options`\>\>

Defined in: pageObject.ts:84

***

### urlPath

> `readonly` **urlPath**: [`UrlPathTypeFromOptions`](/POMWright/api/generated/type-aliases/urlpathtypefromoptions/)\<`Options`\>

Defined in: pageObject.ts:81
