# PLAN-D14 — options read through a prototype (codex-D6)

## Background: why POMWright copies options

A registered locator must not change when the caller later changes the object it passed (`AGENTS.md` section 5). So
`add(…)` stores a copy of the options. The copy is made by `copyFields`
([../src/locators/utils.ts#L191-L192](../src/locators/utils.ts#L191-L192)), which takes the object's own enumerable
properties (`Object.entries`).

Playwright does not copy: `page.getByRole("button", options)` reads `options.name`, `options.exact` and so on by
property access, which also finds a property on the object's prototype.

## Where the two differ

```ts
// 1. A plain object: own properties. Same in both.
add("save").getByRole("button", { name: "Save" });

// 2. A class with a field: the field is an own property. Same in both.
class SaveOptions { name = "Save"; }
add("save").getByRole("button", new SaveOptions());

// 3. A class with a getter: the getter lives on SaveButton.prototype, not on the object.
class SaveButton { get name() { return "Save"; } }
page.getByRole("button", new SaveButton());     // Playwright: the Save button only
add("save").getByRole("button", new SaveButton()); // POMWright today: every button (name was dropped)

// 4. An inherited property: `exact` lives on the prototype.
const defaults = { exact: true };
const options = Object.create(defaults);
options.name = "Save";
page.getByRole("button", options);              // Playwright: exact match
add("save").getByRole("button", options);       // POMWright today: substring match (exact was dropped)
```

TypeScript accepts all four: the types are structural, and a getter `name` satisfies `{ name?: string }`. Probe,
2026-10-22, chromium, the packed build, case 3 with `<button>Save</button><button>Cancel</button>`: Playwright matches
1, POMWright 2. No warning. Case 4 follows from the same code (`Object.entries` returns own properties only) and is
probed at execution.

Where this can come from: a helper class for labels (`get name() { return t("save"); }`), objects from a library that
uses getters, or `Object.create` for shared defaults. All are uncommon in locator options.

## Option A: copy what Playwright would read

`copyFields` collects the property names of the object and of each prototype up to `Object.prototype` (excluded),
reads each one by normal property access, skips functions (methods), and copies the values as today. Cases 3 and 4 then
behave as in Playwright; cases 1 and 2 are unchanged.

- A getter is read once, when the locator is registered, as Playwright reads it once when `getByRole` is called.
- Unrelated readable properties of the object come along into the stored options. Playwright ignores keys it does not
  know, so the locator is the same; the stored record shows them.

## Option C: document it

The docs say options are read as plain data, the object's own properties, and that a class instance with getters or a
prototype is spread into a plain object first (`{ name: saveButton.name }`). The difference from Playwright stays,
silent in code.

## Cost

`copyFields` runs once per options or filter object, when a locator is registered or a query is changed, never per
resolution. For a plain object, A adds one `Object.getPrototypeOf` (which returns `Object.prototype`, where the walk
stops) and reads names with `Object.getOwnPropertyNames` instead of `Object.entries`. Registration takes 1 to 2.5 µs
per path today, of which this copy is a part. A should stay inside that, and the benchmark rerun after all code plans
(see [PLANS.md](PLANS.md), *Execution order*) measures it.

## Recommendation

**A, weakly.** It removes a silent difference from Playwright at the one place options are copied. **C** is a
reasonable choice for an input this rare.

## Tests (A)

Unit (`src/locators/utils.test.ts`): cases 1–4, a method on the prototype (skipped), a null-prototype object. Harness:
case 3 and case 4 against a fixture page, Playwright and POMWright side by side.

## Changeset (A)

`patch`: "Options passed as a class instance or an object with a prototype keep the values Playwright would read, such
as getters and inherited properties. Before, they were dropped when the options were copied."

## Execution note (2026-10-22)

`mergeOptions` reads an `update()` patch and a seeded override's options with `Object.entries` as well, so a patch
given as a class instance lost its getters the same way. Both now read through one helper, `readFields` in
`src/locators/utils.ts`; a unit test and the harness spec cover a patch.

## Decisions

- [x] A (2026-10-22)
