---
title: Installation
description: "Install POMWright beside Playwright Test: the versions it needs, how to import it, and the TypeScript settings that matter."
---

## Introduction

POMWright is a library for [Playwright Test](https://playwright.dev/docs/intro). It adds what Playwright leaves to you
when a suite grows: page objects whose locators are registered once per path and chained for you, with a base URL
and a navigation helper of their own or from a base class, so one Playwright project can test several origins; a session
storage helper; a logger that attaches to the report; and a decorator for test steps. It has no runner, no assertions
and no browser handling of its own; your tests stay Playwright tests.

**You will learn**

- What POMWright needs
- How to install and import it
- Which TypeScript settings matter

## Requirements

- **Node.js 20** or later, the version Playwright itself needs.
- **`"@playwright/test": ">=1.64.0 <2.0.0"`**. POMWright declares it as a peer dependency: your project installs
  Playwright, and POMWright uses that copy.
- **TypeScript** is what these docs use. POMWright also works from JavaScript: paths, the first argument of every
  locator method, URLs and session storage values are checked at runtime as the types check them. An index is not:
  `nth` hands it to Playwright as given, as Playwright's `locator.nth` takes it (see
  [indices](/POMWright/docs/filters-and-indices/#indices-nth)).

## Install

Start from a Playwright project; if you do not have one yet, follow
[Installing Playwright](https://playwright.dev/docs/intro#installing-playwright). Then add POMWright:

```bash
npm install --save-dev pomwright
```

With pnpm, `pnpm add --save-dev pomwright`; with Yarn, `yarn add --dev pomwright`.

## Import from the package root

Everything is imported from `pomwright`:

```ts
import { PageObject, SessionStorage, step, test } from "pomwright";
```

Deep imports such as `pomwright/dist/index.js` are not part of the API and fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
CommonJS projects (Playwright's default) and ESM projects (`"type": "module"`) load the same build, so a test run never
holds two copies of POMWright, even when some files `import` it and others `require` it.

## TypeScript settings

POMWright needs no `tsconfig.json` setting of its own. Playwright compiles your TypeScript itself and does not check
its types ([TypeScript](https://playwright.dev/docs/test-typescript)). To check them with `tsc`, note that TypeScript 6
includes only the `@types` packages a tsconfig lists, and Playwright's own declarations need Node's, so a Playwright
project lists `"types": ["node"]`, with or without POMWright. With that, everything in these docs compiles. Three
settings change how code that uses POMWright is checked. None is required, and each only matters when you turn it on:

- **Decorators.** Nothing to enable. [`@step`](/POMWright/docs/test-steps/) works with TypeScript's standard
  decorators, the default, and with `experimentalDecorators: true`, in your editor and in Playwright's runner. Use
  whichever your project already does.
- **`noImplicitOverride`.** Off by default. When it is on, TypeScript requires the `override` keyword on a page object's
  `pageActionsToPerformAfterNavigation()`, as on any method that replaces one from a base class, and reports TS4114
  without it. With the setting off, the keyword is allowed but not needed. `defineLocators()` never needs it.
- **`declaration: true`.** Off by default, and only needed by a project that publishes its page objects as a package.
  When it is on, every exported value's type must be nameable. POMWright's types are, except in one pattern; see
  [Locator modules](/POMWright/docs/locator-modules/#what-a-module-may-return).

The examples in these docs are compiled with `strict` and `noUncheckedIndexedAccess`.

## What's next

- [Your first page object](/POMWright/docs/first-page-object/)
