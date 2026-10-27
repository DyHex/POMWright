---
title: step
description: "The @step decorator: a method that returns a Promise runs as Playwright's test.step, titled ClassName.methodName unless given a title."
---

`@step` runs a method as Playwright's [`test.step()`](https://playwright.dev/docs/api/class-test#test-step), titled
`ClassName.methodName` unless given a title, so the report shows the method as a step, with what it did inside it. It
works with TypeScript's standard decorators, the default, and with `experimentalDecorators: true`, on any class, on
generic methods and on static methods, which are titled by their class (`AccountPage.create`).

```ts
import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";

export class LoginPage extends PageObject<"main" | "main.button@submit"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.button@submit").getByRole("button", { name: "Log in" });
  }

  @step()
  async submit() {
    await this.getNestedLocator("main.button@submit").click(); // a step titled LoginPage.submit
  }
}
```

Guide: [test steps](/POMWright/docs/test-steps/).

---

## Usage

```ts
import { step } from "pomwright";

export class Checkout {
  @step()
  async open() {} // "Checkout.open"

  @step("Pay with the test card")
  async pay() {}

  @step({ box: true })
  async confirm() {}

  @step("Wait for the receipt", { timeout: 10_000 })
  async receipt() {}
}
```

## Arguments

- `title` string *(optional)*

  The step's title. Defaults to `ClassName.methodName`.

- `options` Object *(optional)*

  `test.step()`'s options, such as `box` (report the step at the line that called the method) and `timeout`.

`@step` also works without parentheses, and then takes neither.

## Returns

- A [StepDecorator](#stepdecorator), for a method that returns a Promise, as an `async` method does. TypeScript rejects
  any other (see [only methods that return a Promise](/POMWright/docs/test-steps/#only-methods-that-return-a-promise)):

```text
@step decorates methods that return a Promise: make the method async
```

## Throws

From JavaScript, on something that is not a method:

```text
@step decorator can only be applied to methods.
```

---

## StepDecorator

Added in: v3.0.2

`StepDecorator`: the type of the decorator `step()` returns, with or without a title and options. Store one in a module
to share a configuration across classes; the module still builds with `declaration: true`. See
[sharing a decorator](/POMWright/docs/test-steps/#sharing-a-decorator).

```ts
import { type StepDecorator, step } from "pomwright";

export const boxedStep: StepDecorator = step({ box: true });

export class Checkout {
  @boxedStep
  async confirm() {}
}
```
