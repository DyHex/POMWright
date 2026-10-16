---
title: Installation
description: "Install POMWright beside Playwright Test: the versions it needs, how to import it, and the TypeScript settings that matter."
---

## Introduction

POMWright is a library for [Playwright Test](https://playwright.dev/docs/intro). It adds what Playwright leaves to you
when a suite grows: page objects whose locators are registered once per path and chained for you, a session storage
helper, a logger that attaches to the report, and a decorator for test steps. It has no runner, no assertions and no
browser handling of its own; your tests stay Playwright tests.

**You will learn**

- What POMWright needs
- How to install and import it
- Which TypeScript settings matter

## Requirements

- **Node.js 20** or later, the version Playwright itself needs.
- **`@playwright/test` 1.64** or later, below 2.0. POMWright declares it as a peer dependency: your project installs
  Playwright, and POMWright uses that copy.
- **TypeScript** is what these docs use. POMWright also works from JavaScript; every rule its types state is also
  checked at runtime.

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

Playwright compiles your TypeScript itself ([TypeScript](https://playwright.dev/docs/test-typescript)), and POMWright
needs no setting of its own. A few settings meet POMWright's code:

- **Decorators.** [`@step`](/POMWright/docs/test-steps/) works with TypeScript's standard decorators, the default, and
  with `experimentalDecorators: true`, in your editor and in Playwright's runner.
- **`noImplicitOverride`.** With it, a page object's `pageActionsToPerformAfterNavigation()` needs the `override`
  keyword, as any overridden method does.
- **`declaration: true`.** A project that publishes its page objects as a package can name every type POMWright hands
  out; see [TypeScript](/POMWright/docs/typescript/).

The examples in these docs are compiled with `strict` and `noUncheckedIndexedAccess`.

## What's next

- [Your first page object](/POMWright/docs/first-page-object/)
