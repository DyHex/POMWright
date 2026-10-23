**Title:** Write a page object's session storage schema once (breaking)

**Labels:** backlog, breaking

---

A page object writes its session storage schema twice: the type in its type options (`{ storage: typeof schema }`) and the value in the constructor's options (`sessionStorage: { schema }`). Nothing checks that both are there. With the type and without the value, the declared keys are stored and read without their codecs:

```ts
const accountStorage = { user: json<{ name: string }>(), token: json<string>() };

export class AccountPage extends PageObject<Paths, { storage: typeof accountStorage }> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account"); // no sessionStorage option: compiles
  }
}

await accountPage.sessionStorage.set("token", "abc");    // stores abc, not "abc"
const user = await accountPage.sessionStorage.get("user"); // typed { name: string } | null, returns a string
```

3.0.2 documents that both are needed and adds a hint to the runtime error for a non-string value without a codec.

Making the value required when the type is declared breaks the documented generic base class (*Organising a project*): inside a base class with a generic `Options`, TypeScript cannot resolve a conditional constructor parameter, so forwarding `options` stops compiling.

The fix is to write the schema once, as a value, and infer the type from it. TypeScript never infers a base class's type arguments from the `super(…)` call, so the value has to move to where inference happens. One shape, checked as a model with TypeScript 6.0.3:

```ts
const AccountBase = PageObject.withSessionStorage({ user: json<{ name: string }>() });

export class AccountPage extends AccountBase<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account");
  }
}

const user = await accountPage.sessionStorage.get("user"); // { name: string } | null, from the value
```

It removes the `storage` type option and the `sessionStorage.schema` option, so it belongs to the next major and needs a design: base classes, forwarding, the docs and the migration.
