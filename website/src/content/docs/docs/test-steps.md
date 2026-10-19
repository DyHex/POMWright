---
title: "Test steps: @step"
description: "The @step decorator wraps a method in Playwright's test.step, titled ClassName.methodName, for methods that return a Promise."
---

## Introduction

Playwright groups actions in the report with [`test.step()`](https://playwright.dev/docs/api/class-test#test-step).
Wrapping every page-object method in it by hand is repetitive; `@step` does it with a decorator, and titles the step
after the class and the method:

```ts
import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";

type Paths = "main" | "main.form@login" | "main.form@login.button@login";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.form@login").getByRole("form", { name: "Log in" });
    this.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
  }

  @step()
  async submit() {
    await this.getNestedLocator("main.form@login.button@login").click();
  }
}
```

The report shows `LoginPage.submit` as a step, with the click inside it, at the line that called `submit()`. `@step`
works on any class, page object or not, and on static methods, which are titled by their class (`AccountPage.create`).

## Title and options

`@step` takes what `test.step` takes after its body, a title and the step's options:

```ts
import { step } from "pomwright";

export class Checkout {
  @step()
  async open() {} // "Checkout.open"

  @step("Pay with the test card")
  async pay() {}

  @step({ box: true })
  async confirm() {} // an error inside points at the line that called confirm()

  @step("Wait for the receipt", { timeout: 10_000 })
  async receipt() {}
}
```

## Only methods that return a Promise

`test.step` always returns a Promise and runs its body later, so a method that returned a plain value would hand its
caller a Promise, and its errors would escape the caller's `try`. TypeScript therefore rejects `@step` on such a
method, and the error names the fix:

```ts
import { step } from "pomwright";

export class Cart {
  // @ts-expect-error @step decorates methods that return a Promise: make the method async
  @step()
  total(): number {
    return 42;
  }
}
```

## Decorator settings

`@step` works with TypeScript's standard decorators, the default, and with `experimentalDecorators: true`, in the
editor and in Playwright's runner.

## Reference

- [`step`](/POMWright/api/step/)
- Playwright: [`test.step()`](https://playwright.dev/docs/api/class-test#test-step)
