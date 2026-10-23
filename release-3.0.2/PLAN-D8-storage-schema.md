# PLAN-D8 — a declared storage type without its schema (opus-D1)

## The problem

A page object writes its session storage schema in two places: the type, in its type options, and the value, in the
constructor's options. Nothing checks that both are there.

```ts
const accountStorage = { user: json<{ name: string }>(), token: json<string>() };

// As the docs show it: the type and the value
export class AccountPage extends PageObject<Paths, { storage: typeof accountStorage }> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account", { sessionStorage: { schema: accountStorage } });
  }
}

// The mistake: the type without the value. It compiles today.
export class AccountPage extends PageObject<Paths, { storage: typeof accountStorage }> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account");
  }
}
```

With the mistake, the helper has no codecs ([../src/pageObject.ts#L100](../src/pageObject.ts#L100): the option and
the schema are optional; the helper gets `{}`). Probe, 2026-10-22, chromium, the packed build:

```ts
await accountPage.sessionStorage.set("token", "abc");    // stores abc, not "abc" (silent)
const user = await accountPage.sessionStorage.get("user"); // typed { name: string } | null, is the string '{"name":"Ada"}' (silent)
await accountPage.sessionStorage.set("user", { name: "Ada" });
// throws: … value for "user" is not a string and no codec is declared for it (loud)
```

So writing an object fails loudly, and the silent cases are a string-valued codec (`json<string>()`) and every read.

## Option A: the schema becomes required when `storage` is declared

The constructor's options argument becomes required, with `sessionStorage.schema`, when the type options declare a
`storage` with at least one key. Without `storage`, nothing changes.

```ts
class Plain extends PageObject<Paths> {
  constructor(page: Page) { super(page, base, "/p"); }                                     // compiles, as today
}
class Forgot extends PageObject<Paths, { storage: typeof accountStorage }> {
  constructor(page: Page) { super(page, base, "/p"); }                                     // compile error
}
class Right extends PageObject<Paths, { storage: typeof accountStorage }> {
  constructor(page: Page) { super(page, base, "/p", { sessionStorage: { schema: accountStorage } }); } // compiles
}
```

Your reading is right for these three cases. `Forgot` never worked as declared, so making it a compile error is a
patch by our rules. (It is a compile error only: types do not exist at runtime, so JavaScript behaves as today.)

**What makes A breaking is the second base class on *Organising a project*.** It forwards the options of any subclass
through a generic `Options`:

```ts
export abstract class ShopPage<Paths extends string, Options extends PageObjectTypeOptions = { urlPathType: string }>
  extends PageObject<Paths, ShopOptions<Options>> {
  protected constructor(page: Page, urlPath: …, options?: PageObjectOptions<ShopOptions<Options>>) {
    super(page, "https://shop.example", urlPath, options); // error under A
  }
}
```

Inside the base class, `Options` is not known, so TypeScript cannot decide whether the options are required, and it
rejects passing a possibly missing `options`. Probe, 2026-10-22, `tsc` 6.0.3, a model of the constructor with the
conditional parameter: `Plain`, `Forgot` (error, as wanted), `Right` and the first, non-generic base class compile; the
generic base class fails with
`TS2345: Argument of type '[Opts<ShopOptions<O>> | undefined]' is not assignable to parameter of type 'Rest<ShopOptions<O>>'`.
The error is in the base class itself, so every project that copied that pattern stops compiling, whether or not any
of its pages uses storage. That is code written as the docs show it: a major.

## Option A-lite: required inside the options, the options still optional

`PageObjectOptions` requires `sessionStorage.schema` when `storage` is declared, but the constructor's options stay
optional. Probe, 2026-10-22: both documented base classes compile. It catches less:

```ts
class LabelOnly extends PageObject<Paths, { storage: typeof accountStorage }> {
  constructor(page: Page) { super(page, base, "/p", { label: "Account" }); } // compile error: caught
}
class NoOptions extends PageObject<Paths, { storage: typeof accountStorage }> {
  constructor(page: Page) { super(page, base, "/p"); }                     // compiles: NOT caught (opus's case)
}
```

It also turns `PageObjectOptions` into a conditional type, so a consumer's own generic code that builds a
`PageObjectOptions<O>` for an unknown `O` may stop compiling, a break outside the documented patterns.

## Option B: docs and a better runtime message

A `:::note` on *Session storage* and on *Types*: the type and the value both, or neither. The one loud case gets a
hint: `… no codec is declared for it; declare it in the schema (a page object's sessionStorage.schema)`. No type
change, no risk.

## Option C: one place to write it (the long-term fix, a major)

The real cause is that the schema is written twice. The fix is to write it once, as a value, and let the type follow
from it. TypeScript never infers a base class's type arguments from the `super(…)` call: the `extends` clause is fixed
first. So the value has to move to where inference happens. One shape, probed as a model on 2026-10-22 (`tsc` 6.0.3,
the storage type inferred from the value, an unknown key rejected):

```ts
// 4.x sketch, not a design: the schema is a value, written once; the types come from it.
const AccountBase = PageObject.withSessionStorage({ user: json<{ name: string }>() });

export class AccountPage extends AccountBase<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account");
  }
}

const user = await accountPage.sessionStorage.get("user"); // { name: string } | null, from the value
```

There is no `storage` type option and no `sessionStorage.schema` option to forget. It removes both, so it is a major
and needs its own plan: base classes, forwarding, the docs, and the migration.

## Recommendation

**Decided: B for 3.0.2** (2026-10-22). **C becomes a GitHub issue** for the next major ([ISSUES.md](ISSUES.md)), not an
`AGENTS.md` entry. A breaks the documented generic base class. A-lite misses the case that was found and makes a public
type conditional, for a small gain.

## Tests (B)

Unit: the new hint in the message (`src/helpers/sessionStorage.test.ts`).

## Docs (B)

`docs/session-storage.md` (through a page object), `api/types.md` (`PageObjectTypeOptions.storage`,
`PageObjectOptions`), the message on `api/errors.md` and `api/class-sessionstorage.md`.

## Changeset (B)

`patch`: "Writing a value that is not a string to a key without a codec now says where codecs are declared."

## Decisions

- [x] B now (2026-10-22); C as a GitHub issue for the next major (see [ISSUES.md](ISSUES.md))
