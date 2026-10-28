# 2F-4: `schema-type-and-value`'s migration, and the compile error it brings, do not cover a page object whose base class forwards `PageObjectOptions`, the base class *Organizing a project* shows first

- **Kind**: documentation
- **Area**: Changesets: `.changeset/schema-type-and-value.md`; the compile-error message of `PageObjectOptions`'s
  `sessionStorage.schema` (`src/pageObject.ts:81-82`)
- **Severity**: Low (an upgrade meets a compile error whose advice cannot be followed where it is reported; the way out
  is documented on *Organizing a project*, but neither the changeset nor the message leads there)
- **Semver of the fix**: none (changeset text and a compile-error message: a type-level string, no accepted input
  changes)
- **Pass**: 1
- **First review**: new since 54cdada (e05b84d, 2026-10-27, "fix: a storage schema's type and value must agree")
- **Reviewed**: `d850405`, 2026-10-28T17:29:25+01:00, Opus 5.5, second review, segment 2F

## Contract

- `docs/versioning.md` *Changesets*: "Call out consumer-facing API or behavior changes in the changeset body, with a
  migration hint whenever something … wrote stops working"; *Bumps*: a type corrected to what the docs promise is a
  patch "even when code that relied on the wrong type stops compiling (its changeset gives the migration)".
- `.changeset/schema-type-and-value.md`: "Take the type from the value, and pass that value:
  `PageObject<Paths, { storage: typeof schema }>` with `{ sessionStorage: { schema } }`, or
  `new SessionStorage(page, { schema })`, whose type comes from the value."
- `website/src/content/docs/docs/organizing-a-project.md` *A base class for your site* (the same text at v3.0.1, then
  `organising-a-project.md`): the first base class, `ShopPage<Paths extends string> extends PageObject<Paths>`, forwards
  `options?: PageObjectOptions`; the second, generic in its options, is the one whose subclass "that declares `storage`
  gets a typed session storage helper".

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-second-review-probes/F/breaks/forwarding.ts`: the first base class of
*Organizing a project*, verbatim but for the environment variable, and a subclass that passes a schema through it:

```ts
export abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
	protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
		super(page, "https://shop.example", urlPath, { navOptions: { waitUntil: "domcontentloaded" }, ...options });
	}
}
const cartSchema = { cart: json<{ items: number }>() };
export class CartPage extends ShopPage<"main"> {
	constructor(page: Page) {
		super(page, "/cart", { sessionStorage: { schema: cartSchema } });
	}
	protected defineLocators(): void {
		this.add("main").locator("main");
	}
}
```

```bash
cd /home/magdys/workspace/dyhex/POMWright-second-review-probes/F
for proj in npm301 npmproj; do cp breaks/forwarding.ts $proj/forwarding.ts; (cd $proj && node node_modules/typescript/bin/tsc \
  --noEmit --strict --target es2022 --types node --module esnext --moduleResolution bundler forwarding.ts; echo "$proj exit $?"); done
```

`npm301` is `pomwright@3.0.1` from npm, `npmproj` the baseline tarball, both with TypeScript 6.0.3.

## Observed / expected

```text
npm301 exit 0
forwarding.ts(15,44): error TS2322: Type '{ cart: Codec<{ items: number; }>; }' is not assignable to type 'Record<string, "declare the schema's type in the page object's type options: PageObject<Paths, { storage: typeof schema }>">'.
  Property 'cart' is incompatible with index signature.
    Type 'Codec<{ items: number; }>' is not assignable to type '"declare the schema's type in the page object's type options: PageObject<Paths, { storage: typeof schema }>"'.
npmproj exit 2
```

The break itself is the intended one (in 3.0.1 `CartPage.sessionStorage.get("cart")` was typed `string | null` and
returned the decoded object), and a patch by `docs/versioning.md`. What is missing is the way out for this shape of
code: `CartPage` extends `ShopPage<"main">`, which has no type parameter for the options, so neither the message's
advice (`PageObject<Paths, { storage: typeof schema }>`) nor the changeset's can be written where the error is
reported. The fix is in the base class: make it generic in its options, as the second base class of *Organizing a
project* is, and declare `{ storage: typeof cartSchema }` in the subclass. The harness knows this case
(`test/tests/packaging/publicTypes.typecheck.ts:578-584`, "a value the base class cannot type: use the generic base
class below"); the release notes do not.

Expected: the changeset names this case and its fix, for example "A page object whose base class forwards
`PageObjectOptions` declares its storage through a base class generic in its options, as *Organizing a project*
shows", and the message names it too, for example "… type options: PageObject<Paths, { storage: typeof schema }>, or
a base class's options type parameter".

## Cause

`.changeset/schema-type-and-value.md` and `SchemaNeedsStorageType` (`src/pageObject.ts:81-82`) were written for a page
object that extends `PageObject` directly and for `new SessionStorage()`.

## Fix plan

- Intended contract: every code shape the change stops compiling has its migration in the changeset, and the compile
  error points at a change that can be made.
- Options: (a, recommended) add the base-class sentence to the changeset and, on *Organizing a project* after the
  generic base class, one line on a subclass that passes a schema; (b) also extend `SchemaNeedsStorageType`'s text; a
  compile-error message the docs quote changes with it (*Types* → `PageObjectOptions` → `sessionStorage`,
  *Error messages*, `scripts/check-error-messages.mjs` compares them), so (b) is larger and stays a patch.
- Tests: none new; the harness's case exists. If the message changes, the pages that quote it change with it.
- Changeset: the edit to `.changeset/schema-type-and-value.md` itself (its bump stays patch).
