# From a snapshot to paths

How to read the aria snapshot `scripts/map.mjs snapshot` prints (Playwright's `page.ariaSnapshot({ mode: "ai" })`),
and turn it into the paths and registrations of a locator module. The rules for locators and names are the `pomwright`
skill's `guides/choosing-locators-and-paths.md`; this file is about getting there from a snapshot.

## Contents

- [Reading the snapshot](#reading-the-snapshot)
- [Containers become segments](#containers-become-segments)
- [Elements become paths](#elements-become-paths)
- [The suggested locators](#the-suggested-locators)
- [Frames](#frames)
- [What to leave out](#what-to-leave-out)

## Reading the snapshot

Each line is an element: its role, its accessible name in quotes, its state in brackets, and its ref. Indentation is
containment. A line is quoted when the name holds a colon. An `iframe` line holds the frame's own elements, with refs
like `f1e3`. Excerpts from two pages, joined here to show each kind of line:

```text
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Primary Colors Section" [level=2] [ref=e3]
    - button "Red" [ref=e4]
    - button "Reset Color" [ref=e7]
  - region "Accessible Section" [ref=e14]:
    - heading "Primary Colors Test" [level=2] [ref=e15]
    - button "Red" [ref=e16]
  - iframe [ref=e5]:
    - generic [ref=f1e1]:
      - 'button "Toggle A: Off" [ref=f1e3]'
```

`generic` is an element without a role: a `div` or a `span`. Its children are what matter.

## Containers become segments

A container a user sees as one thing becomes a segment, registered by its role and name: `main`, `navigation`,
`banner`, `contentinfo`, a named `region`, a `form`, a `dialog`, a `table`, a `list`. In the snapshot above,
`region "Accessible Section"` becomes `region@accessible` with `getByRole("region", { name: "Accessible Section" })`.

A `generic` container that groups what a test acts on (a section of buttons, a card) has no role to find it by:

- when it has a test id, `getByTestId`;
- otherwise, when the suggested locator names it by an id that is part of the page's design (`#section1` above),
  register it with `getById("section1")`;
- otherwise leave it out and let the next segment carry the context, or, when the elements repeat, register the
  repeated elements as a plural path and pick one with a query;
- and report it: a heading inside a `<section>` with `aria-labelledby` would make it a named region, findable by role.

Only as many segments as make each chain unique: a `generic` that only wraps another container is not a segment.

## Elements become paths

Each element a test acts on or checks becomes a path under its container: the role is the kind, the name in camelCase
the which (`button "Reset Color"` as `button@resetColor`). Headings that identify a container become its `heading`;
text a test checks becomes `text@<what>`. Elements that repeat with the same role under one container (rows, cards,
list items) become one plural path.

A name that carries state (`"Toggle A: Off"`, `"Orders (3)"`) is registered by its stable part, as a RegExp
(`{ name: /^Toggle A/ }`), or by the test id the suggestion found.

## The suggested locators

`map.mjs` prints, for each mapped ref, what Playwright's `locator.normalize()` suggests: a locator unique on the whole
page, the way codegen writes one. Use it as evidence, not as the registration:

- It is a whole chain (an id or a role for the container, then the element); a path splits it into segments, each with
  its own registration.
- It puts a test id first: for the button above it suggests the test id `toggle-a`, though the button has a role and a
  name. Register the role and the name when the name is stable; keep the test id when the name changes or is missing.
- It falls back to an id or CSS where nothing user-facing identifies an element: that is the element's honest locator,
  and worth reporting as missing accessibility.

## Frames

An `iframe` line becomes a `frameLocator(selector)` segment, with the selector the suggestion uses for it
(`iframe[title="iframeA"]` above), registered under the container that tells the frames apart; the frame's elements
become paths below it. A frame inside a frame is a second `frameLocator` segment below the first.

## What to leave out

`generic` wrappers, decorative images, text no test checks, and every element of a repeated structure but its plural
path. A page object is the tests' vocabulary for the page, not a copy of it: map what the tests the user wants will
use, and add paths when tests need them.
