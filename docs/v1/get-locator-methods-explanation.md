# Working with Locator Schemas

`BasePage` exposes two layers of helpers for working with locator schemas:

1. **Wrapper shortcuts** – `getLocator()` and `getNestedLocator()` resolve locators in a single call. They are great when you just need a locator and do not have to tweak the schema.
2. **`getLocatorSchema()` chains** – return a deep copy of the schemas that make up the requested path so you can update selectors, add filters, or reuse the chain with different parameters.

The sections below show how both approaches fit together.

## Example set-up

The snippets that follow use the simple page object and fixture below.

### Create a Page Object Class

```ts
import { Page, TestInfo } from "@playwright/test";
import { BasePage, GetByMethod, PlaywrightReportLogger } from "pomwright";

type LocatorSchemaPath =
  | "content"
  | "content.heading"
  | "content.region.details"
  | "content.region.details.button.edit";

export default class Profile extends BasePage<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://someDomain.com", "/profile", Profile.name, pwrl);
  }

  protected initLocatorSchemas() {
    this.locators.addSchema("content", {
      locator: ".main-content",
      locatorMethod: GetByMethod.locator
    });

    this.locators.addSchema("content.heading", {
      role: "heading",
      roleOptions: {
        name: "Your Profile"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("content.region.details", {
      role: "region",
      roleOptions: {
        name: "Profile Details"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("content.region.details.button.edit", {
      role: "button",
      roleOptions: {
        name: "Edit"
      },
      locatorMethod: GetByMethod.role
    });
  }
}
```

### Provide the page object through a fixture

```ts
import { test as base } from "pomwright";
import Profile from "./profile";

type Fixtures = {
  profile: Profile;
};

export const test = base.extend<Fixtures>({
  profile: async ({ page, log }, use, testInfo) => {
    const profile = new Profile(page, testInfo, log);
    await use(profile);
  }
});
```

### Use the fixture in a test

```ts
import { test } from "./fixtures";

test("load profile", async ({ profile }) => {
  await profile.page.goto(profile.fullUrl);
});
```

## BasePage wrapper shortcuts

The wrapper methods call `getLocatorSchema(path)` internally and immediately resolve the locator. Use them when the stored schema already matches the element you need.

### `getLocator(path)`

Returns the locator for the final schema in the chain. This is equivalent to `getLocatorSchema(path).getLocator()`.

```ts
test("click edit button with a single locator", async ({ profile }) => {
  await profile.page.waitForURL(profile.fullUrl);

  const editButton = await profile.getLocator("content.region.details.button.edit");
  await editButton.click();
});
```

### `getNestedLocator(path, indices?)`

Builds a nested locator by chaining every schema that makes up the path. Optional indices let you pick a specific occurrence of any segment.

```ts
test("click edit button with a nested locator", async ({ profile }) => {
  await profile.page.waitForURL(profile.fullUrl);

  const editButton = await profile.getNestedLocator("content.region.details.button.edit");
  await editButton.click();
});
```

When a path represents repeating elements, provide sub-path keys to select the right instance:

```ts
test("specify index for nested locators", async ({ profile }) => {
  await profile.page.waitForURL(profile.fullUrl);

  const editButton = await profile.getNestedLocator(
    "content.region.details.button.edit",
    {
      "content.region.details": 0,
      "content.region.details.button.edit": 1
    }
  );

  await editButton.click();
});
```

## Building chains with `getLocatorSchema()`

`getLocatorSchema(path)` returns a deep copy of every schema that makes up the `path` plus chainable helpers for refining the locator. All manipulations happen on the copy, so the original definitions inside the page object stay immutable.

```ts
const chain = profile.getLocatorSchema("content.region.details.button.edit");
```

### `update(subPath, partial)`

Override one or more properties of any schema in the chain. Calls can be chained and are applied in order. This is how you adapt selectors to dynamic states without mutating the stored definitions.

```ts
const editButton = await profile
  .getLocatorSchema("content.region.details.button.edit")
  .update("content.region.details.button.edit", {
    roleOptions: { name: "Edit details" }
  })
  .getNestedLocator();
```

You can also update intermediate segments without touching the rest of the path:

```ts
await profile
  .getLocatorSchema("content.region.details.button.edit")
  .update("content.region.details", {
    locator: ".profile-details",
    locatorMethod: GetByMethod.locator
  })
  .getNestedLocator();
```

Chain multiple `update` calls when you need to adjust different LocatorSchema in the chain:

```ts
test("make multiple versions of a locator", async ({ profile }) => {
  await profile.page.waitForURL(profile.fullUrl);

  const edgeCaseNestedLocator = profile
    .getLocatorSchema("content.region.details.button.edit")
    .update("content.region.details", {
      roleOptions: { name: "Payment Info" }
    })
    .update("content.region.details.button.edit", {
      roleOptions: { name: "Update" }
    })
    .getNestedLocator();

  await edgeCaseNestedLocator.click();
});
```

### `addFilter(subPath, filterOptions)`

Adds filters in the same way as Playwright's [`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter). Multiple filters are merged in the order you call them.

```ts
const resetButton = await profile
  .getLocatorSchema("content.region.details.button.edit")
  .addFilter("content.region.details", { hasText: /Profile Details/i })
  // .addFilter(...)
  .getNestedLocator();
```

### `getNestedLocator(indices?)`

Resolves the full chain to a Playwright locator. Provide optional indices if you need to target a specific occurrence. This method is the same one the wrapper shortcut delegates to, but it keeps any updates or filters you applied earlier in the chain.

```ts
const nestedLocator = await profile
  .getLocatorSchema("content.region.details.button.edit")
  //.update(...)
  //.addFilter(...)
  .getNestedLocator({ "content.region": 1 }); // equivalent to .nth(1) (second occurance)
```

### `getLocator()`

Resolves only the final schema in the chain, i.e. the LocatorSchema which the full LocatorSchemaPath points to. The resulting locator is identical to calling `getNestedLocator()` on a chain that contains a single schema, but it is often more expressive when you only care about the last segment or need to manually chain given some edge case. Same as getNestedLocator, it keeps any updates or filters you applied earlier in the chain.

```ts
const badge = await profile
  .getLocatorSchema("content.region.details.button.edit")
  //.update(...)
  //.addFilter(...)
  .getLocator();
```

### Reusing a chain

Because each call to `getLocatorSchema()` returns a deep copy, you can derive multiple locators without affecting the original definitions.

```ts
const editButtonSchema = profile.getLocatorSchema("content.region.details.button.edit");

const editButton = await editButtonSchema.getLocator();
await editButton.click();

editButtonSchema.update("content.region.details.button.edit", {
  roleOptions: { name: "Edit details" }
});

const editButtonUpdated = await editButtonSchema.getNestedLocator();
await editButtonUpdated.click();

// Calling profile.getLocatorSchema("content.region.details.button.edit") again
// returns a fresh deep copy of the original schema chain.
```

Switching to sub-path keys makes updates easier when `LocatorSchemaPath` strings change, and TypeScript will warn you if you mistype a path. While improving readability.
