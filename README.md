# POMWright

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/DyHex/POMWright/main.yaml?label=CI%20on%20main)
[![NPM Version](https://img.shields.io/npm/v/pomwright)](https://www.npmjs.com/package/pomwright)
![NPM Downloads](https://img.shields.io/npm/dt/pomwright)
![GitHub License](https://img.shields.io/github/license/DyHex/POMWright)
[![NPM dev or peer Dependency Version](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)](https://www.npmjs.com/package/playwright)
[![Static Badge](https://img.shields.io/badge/created%40-ICE-ffcd00)](https://www.ice.no/)

POMWright is a TypeScript companion framework for Playwright focused on Page Object Model workflows.

It provides automatic locator chaining via a LocatorRegistry, a Session Storage API, a log fixture for report attachments, and a test.step decorator — all of which can be used independently either through a functional approachs or as part of your custom POMs or quickly create new standardized POMS by extending a class with the provided the abstract PageObject class. PageObject also adds navigation helpers and URL typing which supports multiple base URLs and dynamic RegExp paths.

---

## Version status: v2 runtime only

POMWright now ships a **v2-only runtime API** centered on `PageObject`, `LocatorRegistry`, and standalone helpers.

Legacy v1 and migration documentation is retained under:

- `docs/v1`
- `docs/v1-to-v2-migration`

---

## Why use POMWright instead of vanilla Playwright POM?

Playwright’s official best practices emphasize locator chaining for clarity and resilience. In practice, manually writing and maintaining those chains becomes tedious and fragile as pages grow. POMWright’s solution is the LocatorRegistry, which automatically builds locator chains from single locator definitions tied to unique paths. You register one locator per path (with Playwright‑like syntax), and POMWright composes the full chain for you.

This gives you the same Playwright primitives you already use — but with dramatically simpler maintenance, better structure, and safer refactors across small and large projects.

### Chain everything

POMWright’s default behavior is to resolve locators by chaining all segments in a path. That brings two major benefits:

- **Robustness through scope‑aware uniqueness:** Chaining narrows selectors through the intended DOM structure, producing more robust locators that are less brittle to UI changes and therefore less prone to flake. A “Change” button tied to a password field under a “Credentials” region resolves differently than a “Change” button tied to an email field under a “Contact info” region. If an identical button is added elsewhere, existing tests keep working because their paths remain scoped. If the button is mistakenly added under the wrong section, tests will fail and reveal the mistake.

- **Implicit DOM structure validation:** Because chains traverse the DOM hierarchy, locator resolution validates that the UI is still arranged as expected — as strictly or loosely as you choose. You don’t need to map the entire DOM; just chain the “structural anchors” that matter. Often, user‑visible elements are good enough.

### Highlights

- **Centralized locator definitions with automatic chaining** — one path defines an entire selector chain across the app, across all Playwright locator types.
- **Safer refactors** — update a locator once and all usages update automatically (including full chains).
- **Typed paths and sub‑paths** with contextual autocomplete and compile‑time validation, making structural updates as simple as find‑and‑replace.
- **Explicit control of chain depth** — choose terminal resolution (getLocator) or full chained resolution (`getNestedLocator`) at the call site.
- **Non‑mutating query overrides** — handle edge cases, variations, and iteration without changing base definitions (`getLocatorSchema(...).update/replace/remove/filter/nth/describe`).
- **Reusable locator seeds + typed path reuse** — share locator patterns or clone existing definitions across contexts without duplication.
- **Optional helpers** — locator registry, session storage, logging, and step decorator can be adopted independently.
- **Minimal base class** — `PageObject` provides URL + navigation + registry + session storage, leaving everything else to your own composition.

---

## Example: vanilla Playwright POM vs POMWright `PageObject`

### Vanilla Playwright POM (typical)

```ts
import { test, type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly main: Locator;
  readonly loginForm: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.locator("main");
    this.loginForm = this.main.getByRole("form", { name: "Login" });
    this.usernameInput = this.loginForm.getByLabel("Username");
    this.passwordInput = this.loginForm.getByLabel("Password");
    this.submitButton = this.main.getByRole("button", { name: "Login" });
  }

  async goto() {
    await test.step("LoginPage.goto", async () => {
      await this.page.goto("/login");
    });
  }

  async login(username: string, password: string) {
    await test.step("LoginPage.login", async () => {
      await this.usernameInput.fill(username);
      await this.passwordInput.fill(password);
      await this.submitButton.click();      
    });
  }
}
```

### Vanilla Playwright fixture

```ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./login.page";

type Fixtures = { loginPage: LoginPage };

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

### Vanilla Playwright Test

```ts
import { test } from "./fixtures";

test("login flow", async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login("alice", "secret");
});
```

### POMWright `PageObject` (v2)

```ts
import { type Page } from "@playwright/test";
import { PageObject, step } from "pomwright";

type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password"
  | "main.button@login";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.form@login").getByRole("form", { name: "Login" });
    this.add("main.form@login.input@username").getByLabel("Username");
    this.add("main.form@login.input@password").getByLabel("Password");
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }

  protected pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await this.getNestedLocator("main.form@login").waitFor({ state: "visible" });
      },
    ];
  }

  @step()
  async login(username: string, password: string) {
    await this.getNestedLocator("main.form@login.input@username").fill(username);
    await this.getNestedLocator("main.form@login.input@password").fill(password);
    await this.getNestedLocator("main.button@login").click();
  }
}
```

**Tip:** If a Page Object grows large with many Paths and this.add(...) calls, move the locator definitions into a companion file (e.g., login.page.ts + login.locators.ts) to keep the class focused on behavior while keeping the registry definitions centralized and reusable. Simmilarily you can move all Paths and add calls for locator definitions common to all POMs for a given domain into a common.locators.ts file to share across your POMs.

```ts
// login.locators.ts
import type { LocatorRegistry } from "pomwright";
import { Paths as Common, defineLocators as addCommon } from "../common.locators"; // errors, dialogs, navbar, main, etc.

export type Paths =
  | Common
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password"
  | "main.button@login";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  addCommon(registry);
  registry.add("main.form@login").getByRole("form", { name: "Login" });
  registry.add("main.form@login.input@username").getByLabel("Username");
  registry.add("main.form@login.input@password").getByLabel("Password");
  registry.add("main.button@login").getByRole("button", { name: "Login" });
}
```

```ts
// login.page.ts
import { type Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import { type Paths, defineLocators } from "./login.locators.ts";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  protected pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await this.getNestedLocator("common.nav.logo").waitFor({ state: "visible" });
        await this.getNestedLocator("main.form@login").waitFor({ state: "visible" });
      },
    ];
  }

  @step()
  async login(username: string, password: string) {
    await this.getNestedLocator("main.form@login.input@username").fill(username);
    await this.getNestedLocator("main.form@login.input@password").fill(password);
    await this.getNestedLocator("main.button@login").click();
  }
}
```

### POMWright fixtures

```ts
import { test as base } from "@playwright/test";
import { PlaywrightReportLogger, type LogEntry, type LogLevel } from "pomwright";
import { LoginPage } from "./login.page";

type Fixtures = { 
  loginPage: LoginPage,
  log: PlaywrightReportLogger
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  log: async ({}, use, testInfo) => { // or just import { test as base } from "pomwright";
    const sharedLogEntry: LogEntry[] = [];
    const sharedLogLevel: { current: LogLevel; initial: LogLevel } =
      testInfo.retry === 0
        ? { current: "warn", initial: "warn" }
        : { current: "debug", initial: "debug" };

    const log = new PlaywrightReportLogger(sharedLogLevel, sharedLogEntry, "TestCase");
    await use(log);
    log.attachLogsToTest(testInfo);
  },
});
```

### POMWright test

```ts
import { test } from "./fixtures";

test("login flow", async ({ loginPage, log }) => {
  await loginPage.navigation.gotoThisPage();
  await loginPage.login("alice", "secret");
  log.info("Hellow World!");
});

```

### What improves in the POMWright version?

- **No manual chain construction in class properties**:
The vanilla POM has to build and store each chain manually (main → form → input). In POMWright, you register each locator once and chaining is automatic, so you avoid duplicated chain logic and drift.
- **Single source of truth for structure**:
The DOM structure is encoded in the registry paths, not scattered across class fields. This makes the page structure explicit and easier to reason about.
- **Refactors touch fewer places**:
In vanilla POM, changing a DOM structure often means editing multiple chained fields. In POMWright, you update the registry definitions once and all chains update together.
- **Less coupling between fields**:
The vanilla POM creates dependencies between stored locators (loginForm must exist before usernameInput). POMWright doesn’t rely on field chains — each locator is defined independently and assembled by the registry.
- **Clearer intent at call sites lowers cognitive load when scanning code**:
In POMWright, call sites read like semantic paths (`"main.form@login.input@username"`), which makes intent clearer than referencing nested locator properties. Semantic paths make it obvious what a locator represents, while the registry tells you how it’s built.
- **Explicit terminal vs chained resolution**:
You can choose terminal‑only (getLocator) or fully chained (getNestedLocator) resolution per call without creating extra fields for each variation.
- **Chaining consistency by default**:
Every getNestedLocator(...) resolves the same full chain, so you can’t accidentally skip a parent locator when implementing or refactoring methods.
- **Easier to introduce variations**:
In vanilla POM, you often need extra fields or conditional logic for small variations. POMWright’s getLocatorSchema lets you tweak chains or filters for edge cases without changing the base definitions.
- **Consistent fixture usage**:
The POMWright fixture exposes a uniform API (navigation, registry, session storage), whereas the vanilla fixture just provides a class instance with custom fields. This reduces ad‑hoc helpers over time.
- **Built‑in navigation flow**:
The POMWright version can express “loaded state” directly as post‑navigation actions. The vanilla version requires separate helper methods or repeated waits in tests.
- **Step and logging instrumentation are standardized**:
@step() and optional logging make action tracing consistent across pages instead of ad‑hoc test.step wrappers in individual methods.
- **Registry definitions are shareable across POCs**:
If multiple POMs share UI sections, the same locator paths can be reused directly rather than copied.
- **Better guardrails for large teams**:
Typed paths and consistent chaining help prevent “near‑miss” locators that work in one file but differ subtly elsewhere.
- **More predictable long‑term maintenance**:
Registry‑driven chains reduce the risk of subtle inconsistencies between methods or tests as the suite grows.
- **Easier onboarding for new contributors**:
Paths reveal structure and intent immediately, so newcomers don’t need to trace nested Locator fields to understand what’s happening.

---

## Installation

```bash
pnpm add -D pomwright
# or
npm install --save-dev pomwright
```

---

## Documentation index

### v2 documentation (recommended)

- [v2 Overview](./docs/v2/overview.md)
- [v2 PageObject](./docs/v2/PageObject.md)
- [v2 Locator Registry](./docs/v2/locator-registry.md)
- [v2 Composing Locator Modules](./docs/v2/composing-locator-modules.md)
- [v2 Session Storage](./docs/v2/session-storage.md)
- [v2 Logging](./docs/v2/logging.md)

### v1 -> v2 migration guides

- [v1 to v2 Comparison](./docs/v1-to-v2-migration/v1-to-v2-comparison.md)
- [Direct Migration Guide](./docs/v1-to-v2-migration/direct-migration-guide.md)
- [Bridge Migration Guide](./docs/v1-to-v2-migration/bridge-migration-guide.md)

### v1 documentation (legacy/deprecated)

- [Intro to using POMWright (v1)](./docs/v1/intro-to-using-pomwright.md)
- [BasePage](./docs/v1/BasePage-explanation.md)
- [LocatorSchemaPath](./docs/v1/LocatorSchemaPath-explanation.md)
- [LocatorSchema](./docs/v1/LocatorSchema-explanation.md)
- [Locator helper methods](./docs/v1/get-locator-methods-explanation.md)
- [BaseApi](./docs/v1/BaseApi-explanation.md)
- [PlaywrightReportLogger](./docs/v1/PlaywrightReportLogger-explanation.md)
- [Session storage helpers](./docs/v1/sessionStorage-methods-explanation.md)
- [Tips for folder structure](./docs/v1/tips-folder-structure.md)

---

## Support

If you run into issues or have questions, please use the
[GitHub issues page](https://github.com/DyHex/POMWright/issues).

## Contributing

Pull requests are welcome!

## License

POMWright is open-source software licensed under [Apache-2.0](./LICENSE).
