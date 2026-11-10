# Session storage

`SessionStorage` is Playwright's `page.sessionStorage` with batches, a report step per call, origin checks, per-key
codecs, and `seed`, which stores entries before an app's first script. Full rules:
[Session storage](https://dyhex.github.io/POMWright/docs/session-storage/) and
[Seeding session storage](https://dyhex.github.io/POMWright/docs/seeding-session-storage/).

## Contents

- [Values and codecs](#values-and-codecs)
- [The methods](#the-methods)
- [Through a page object](#through-a-page-object)
- [Another origin, or as a fixture](#another-origin-or-as-a-fixture)
- [seed: before the app starts](#seed-before-the-app-starts)
- [When the app navigates by itself](#when-the-app-navigates-by-itself)

## Values and codecs

Session storage holds strings, stored and read back as given. A key that holds structured data is declared once with a
codec, and `set`, `get` and `seed` then take and return the decoded value, typed by key. `json<T>()` is the codec
POMWright ships; a key without one must be a string. A storage layer that JSON-encodes every value, strings included,
gets `json<string>()` for its string keys. Any other encoding is a `Codec<T>`, `{ parse, stringify }`.

## The methods

Each takes one key or several: `set(key, value)` and `set({ … })`; `get()` (every entry), `get(key)` (the value or
`null`) and `get([keys])`; `clear(key)`, `clear([keys])` and `clear()`; `seed(entries)` (below). Calls for one origin
act in the order they were made, also when they overlap. A call fails, naming where the page went, when the page
navigates during it.

## Through a page object

A page object's helper, `sessionStorage`, belongs to the origin of its string `baseUrl` and refuses another. Write the
schema once as a value, take its type from it, and pass the value:

```ts
import type { Page } from "@playwright/test";
import { json, PageObject } from "pomwright";

type Cart = { items: string[] };
const cartStorage = { cart: json<Cart>() };

export class CartPage extends PageObject<"main", { storage: typeof cartStorage }> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/cart", { sessionStorage: { schema: cartStorage } });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }
}

declare const cartPage: CartPage;

await cartPage.sessionStorage.seed({ cart: { items: ["lamp"] }, token: "abc" });
await cartPage.navigation.goto();
const cart = await cartPage.sessionStorage.get("cart"); // Cart | null
```

An app's whole schema can live with its base class, typed from the app's own state models where the test project can
import them; a base class that lets its subclasses declare a schema takes the options type as a type parameter (see
[Organizing a project](https://dyhex.github.io/POMWright/docs/organizing-a-project/#a-base-class-for-your-site)).

## Another origin, or as a fixture

`new SessionStorage(page, { label, origin, schema })` works without a page object: for an origin the test passes
through (an identity provider, a payment page), or as a fixture of its own. Without `origin`, a helper works on
whatever origin the page is on, and fails before the page's first navigation.

```ts
import { type Codec, json, SessionStorage, test as base } from "pomwright";

type User = { name: string };

export const test = base.extend<{ shopStorage: SessionStorage<{ user: Codec<User> }> }>({
  shopStorage: async ({ page }, use) => {
    await use(new SessionStorage(page, { label: "Shop", origin: "https://shop.example", schema: { user: json<User>() } }));
  },
});
```

## seed: before the app starts

`seed` stores entries for an origin before the app's next load there, so the app's first script already sees them:
an init script that writes on the first arrival only, whatever navigation takes the page there, then is removed. On
the origin already, it writes at once.

- **Await `seed` before the action that starts the navigation.** Not awaited, it races the navigation;
  typescript-eslint's `no-floating-promises` rule finds a missing `await`.
- Seed every origin first when the values are known up front; seed the next origin before the hop when a value is
  learned on the way. Calls for one origin merge, later values winning per key.
- A seed still waiting when the test ends fails the test: seed where the test navigates there, never in a fixture
  that some tests do not use.
- A new tab has its own storage and does not receive the page's seed.
- A page object with a RegExp `baseUrl` has no origin: its `seed` takes `{ origin }`.

## When the app navigates by itself

An app may reload or redirect as it loads. A storage call made while that is under way fails, and a retry does not
help, since the app may have started without the values. Wait for where the app ends up, with
`navigation.expectThisPage()` or an element it shows once settled, then call; or `seed` before the navigation. A wait
that every test of a page needs belongs in the page object's actions after navigation.
