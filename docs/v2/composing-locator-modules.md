# Composing locator modules

When you split locator registration across `*.locators.ts` files, type child modules with
an inline generic so they accept parent registries with supersets of paths while keeping full fluent
type precision:

```ts
// alert.locator.ts
import type { LocatorRegistry } from "pomwright";

type Paths = "common.alert" | "common.alert.message";

export function defineLocators<Extra extends string = never>(registry: LocatorRegistry<Paths | Extra>) {
  registry.add("common.alert").locator(".alert-container");
  registry.add("common.alert.message").locator(".alert-message");
}
```

```ts
// nav.locator.ts
```

```ts
// footer.locator.ts
```

Intermediary parent modules can then pass their full registry directly without casts:

```ts
// common.locators.ts
import type { LocatorRegistry } from "pomwright";
import { type Paths as Alert, defineLocators as addAlert } from "./alert.locators";
import { type Paths as Nav, defineLocators as addNav } from "./nav.locators";
import { type Paths as Footer, defineLocators as addFooter } from "./footer.locators";

type Paths = Alert | Nav | Footer | "main";

export function defineLocators<Extra extends string = never>(registry: LocatorRegistry<Paths | Extra>) {
  addAlert(registry);
  addNav(registry);
  addFooter(registry);
  registry.add("main").locator("main");
}
```

Parent modules can then pass their full registry directly without casts:

```ts
// login.locators.ts
import type { LocatorRegistry } from "pomwright";
import { type Paths as Common, defineLocators as addCommon } from "../common.locators";

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
import { type Page, expect } from "@playwright/test";
import { PageObject } from "pomwright";
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
}
```
