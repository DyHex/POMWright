---
"pomwright": patch
---

Options, filters and `update()` patches given as a class instance, or as an object with a prototype, keep the values
Playwright would read from them: a getter on the class, or a value the object inherits. Before, the copy POMWright
stores took only the object's own enumerable properties and dropped those values without an error, so the locator could match
more than Playwright's own call with the same object:

```ts
class SaveButton {
  get name() {
    return "Save";
  }
}

page.getByRole("button", new SaveButton());     // the Save button
add("save").getByRole("button", new SaveButton()); // was every button; now the Save button
```

The same holds for an own property that is not enumerable, as `Object.defineProperty` makes one: Playwright reads it,
and the copy keeps it.

A plain object behaves exactly as before. Methods on a prototype are not copied.
