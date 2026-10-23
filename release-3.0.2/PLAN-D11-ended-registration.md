# PLAN-D11 — a registry call inside an `add` chain (opus-D7)

## Intended contract

A registration ends at the next call on its registry (`AGENTS.md` section 5, decided): nothing can observe a
half-built registration, and a registration kept in a variable cannot change once anything else has happened.

## Verified current behaviour

JavaScript evaluates a call's arguments before the call. Here, `getLocator("badge")` runs before `filter`:

```ts
add("list.item").locator("li").filter({ has: getLocator("badge") });
//                                            ^ a registry call: it ends the open registration of "list.item"
//                             ^ then filter() runs on an ended registration and throws
```

Probe, 2026-10-22, chromium, the packed build:

```text
filter() cannot apply to "list.item": its registration has ended; give a registration all its steps in its add(…) chain, or query the path for one use.
```

The line is one `add(…)` chain, so the hint tells the user to do what they did. `list.item` stays registered without
the filter. In a page object the message arrives as `<label>: defineLocators() failed: …`.

## Decided: keep the rule, fix the message (2026-10-22)

The three ways to filter by another registered locator, and when each fits:

```ts
// 1. A path: resolved when the locator is resolved, to that path's own locator (terminal only).
//    The shortest; forward references work; verify() checks the path exists and has no cycle.
add("list.item").locator("li").filter({ has: "badge" });

// 2. A Locator resolved before add(…): any locator, fixed when this line runs.
const badge = getLocator("badge");
add("list.item").locator("li").filter({ has: badge });

// 3. A chain resolved before add(…): when the filter needs ancestors, which a path reference leaves out.
const badgeInCard = getNestedLocator("card.badge");
add("list.item").locator("li").filter({ has: badgeInCard });
```

A `Locator` passed this way is kept as it is (`AGENTS.md` section 5), so `verify()` cannot check it, and the path must
be registered before the line that resolves it.

### The message

The registry remembers the call that ended an open registration, and the ended builder's error names it and gives both
fixes. Draft (the exact text comes from a probe at execution):

```text
filter() cannot apply to "list.item": its registration was ended by getLocator("badge"), a registry call made before this step was added. Filter by path, filter({ has: "badge" }), or resolve the locator before add(…).
```

When the ending call was something else (`add`, `verify`, a resolution of an unrelated path), the message names it
the same way.

## Tests

Unit (`src/locators/locatorRegistrationBuilder.test.ts`): the message after `getLocator`, `getNestedLocator`,
`getLocatorSchema`, `add` and `verify` end a registration. Harness: the three working forms above against a fixture
page, with DOM assertions.

## Docs

- `docs/registering-locators.md`, "A registration ends at the next call": the example of a registry call inside a
  filter argument, and the three forms above.
- `docs/filters-and-indices.md`: when to pass a path, a `Locator` or a chain to `has`.
- `api/errors.md`, `api/class-registrationbuilder.md`: the new message. Grep `website/` for the old text.

## Changeset

`patch`: "When a registration has ended because the registry was called before its chain was complete, for example by
`getLocator` inside a `filter` argument, the error names that call and shows the two ways to write the filter."

## Decisions

- [x] Keep the rule; name the ending call and both fixes in the message; document the three forms (2026-10-22)
