# Schema Translation: v1 addSchema -> v2 add() DSL

## GetByMethod mapping

| v1 `locatorMethod` | v1 schema field | v1 options field | v2 method | v2 arguments |
|---|---|---|---|---|
| `GetByMethod.role` | `role` | `roleOptions` | `getByRole(role, options?)` | role value, roleOptions as second arg |
| `GetByMethod.text` | `text` | `textOptions` | `getByText(text, options?)` | text value, textOptions as second arg |
| `GetByMethod.label` | `label` | `labelOptions` | `getByLabel(text, options?)` | label value, labelOptions as second arg |
| `GetByMethod.placeholder` | `placeholder` | `placeholderOptions` | `getByPlaceholder(text, options?)` | placeholder value, placeholderOptions |
| `GetByMethod.altText` | `altText` | `altTextOptions` | `getByAltText(text, options?)` | altText value, altTextOptions |
| `GetByMethod.title` | `title` | `titleOptions` | `getByTitle(text, options?)` | title value, titleOptions |
| `GetByMethod.locator` | `locator` (string) | `locatorOptions` | `locator(selector, options?)` | locator string, locatorOptions |
| `GetByMethod.frameLocator` | `frameLocator` | - | `frameLocator(selector)` | frameLocator string |
| `GetByMethod.testId` | `testId` | - | `getByTestId(testId)` | testId value |
| `GetByMethod.id` | `id` | - | `getById(id)` | id string or RegExp |
| `GetByMethod.dataCy` | `dataCy` | - | `locator('[data-cy="value"]')` | CSS attribute selector string |

## Translation examples

### Role

```ts
// v1
this.locators.addSchema("main.button@login", {
  role: "button",
  roleOptions: { name: "Login" },
  locatorMethod: GetByMethod.role,
});

// v2
this.add("main.button@login").getByRole("button", { name: "Login" });
```

### Locator (CSS/XPath)

```ts
// v1
this.locators.addSchema("main", {
  locator: "main",
  locatorMethod: GetByMethod.locator,
});

// v2
this.add("main").locator("main");
```

### Locator with options

```ts
// v1
this.locators.addSchema("body.section@playground", {
  locator: "section",
  locatorOptions: { hasText: /Playground/i },
  locatorMethod: GetByMethod.locator,
});

// v2
this.add("body.section@playground").locator("section", { hasText: /Playground/i });
```

### Label

```ts
// v1
this.locators.addSchema("main.form.input@username", {
  label: "Username",
  locatorMethod: GetByMethod.label,
});

// v2
this.add("main.form.input@username").getByLabel("Username");
```

### FrameLocator

```ts
// v1
this.locators.addSchema("main.frame@login", {
  frameLocator: "#auth",
  locatorMethod: GetByMethod.frameLocator,
});

// v2
this.add("main.frame@login").frameLocator("#auth");
```

Note: terminal frameLocator paths in v2 resolve to `frameLocator.owner()` (the iframe element), not the frame itself. Non-terminal frames scope into the frame for subsequent segments.

### dataCy (removed in v2)

```ts
// v1
this.locators.addSchema("main.widget", {
  dataCy: "my-widget",
  locatorMethod: GetByMethod.dataCy,
});

// v2 (translate to CSS attribute selector)
this.add("main.widget").locator('[data-cy="my-widget"]');
```

### getById

```ts
// v1
this.locators.addSchema("main.modal@close", {
  id: "close-modal",
  locatorMethod: GetByMethod.id,
});

// v2
this.add("main.modal@close").getById("close-modal");
```

Note: v1 regex IDs use prefix match `*[id^="pattern"]`; v2 regex IDs use substring match `[id*="pattern"]` with CSS escaping. Results may differ for edge cases.

## Filter translation

v1 `filter` property on schema -> v2 chained `.filter()` call:

```ts
// v1
this.locators.addSchema("body.section@playground", {
  locator: "section",
  locatorMethod: GetByMethod.locator,
  filter: { hasText: /Playground/i },
});

// v2
this.add("body.section@playground").locator("section").filter({ hasText: /Playground/i });

// OR, if the filter only has hasText/hasNotText, use locator options instead:
this.add("body.section@playground").locator("section", { hasText: /Playground/i });
```

v2 `filter` also accepts `has`/`hasNot` as **registry path strings** (not Locator instances as in v1):

```ts
// v2 filter with has/hasNot as path references
this.add("main.card").locator(".card").filter({
  has: "main.card.badge",      // path string, not Locator
  hasText: "Active",
});
```

## Reusable locator patterns

### v1: LocatorSchemaWithoutPath + spread

```ts
const buttonSchema: LocatorSchemaWithoutPath = {
  role: "button",
  locatorMethod: GetByMethod.role,
};

this.locators.addSchema("main.button@submit", { ...buttonSchema, roleOptions: { name: "Submit" } });
this.locators.addSchema("main.button@cancel", { ...buttonSchema, roleOptions: { name: "Cancel" } });
```

### v2: createReusable or path reuse

```ts
// Option A: createReusable
const button = this.createReusable.getByRole("button");
this.add("main.button@submit", { reuse: button }).getByRole({ name: "Submit" });
this.add("main.button@cancel", { reuse: button }).getByRole({ name: "Cancel" });

// Option B: reuse by path (exact clone, no override chaining)
this.add("main.button@submit").getByRole("button", { name: "Submit" });
this.add("main.button@cancel", { reuse: "main.button@submit" });
```

## Registration with filter + nth at definition time

```ts
// v2 supports chaining filter and nth on add():
this.add("one.two").locator("div.two").filter({ hasText: "two" }).nth(0);
```

This registers the locator with a filter step and an nth step baked in.
