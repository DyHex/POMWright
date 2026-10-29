# 2E-3: `ClassName` in a step's title is the class of the object the method is called on, which no page says; a `super` call shows two steps with one title

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 105 in [DECISIONS.md](../DECISIONS.md); planned in the steps and logging plan (docs)
- **Area**: E15 `@step` title; E23 forms (inventory-blind.md); `api/step.md`, `docs/test-steps.md`, the `step` doc comment
- **Severity**: Low (a contract that is ambiguous on a common pattern, base classes shared by page objects; the report
  is not wrong, but an override that calls `super` shows two identical titles)
- **Semver of the fix**: none (docs only); titling by the declaring class instead would be a behavior change (see *Fix
  plan*)
- **Pass**: 1
- **First review**: missed by the first review (it probed the titles of instance, static and detached calls, not
  inherited or `super` calls); the title rule predates `v3.0.1` (`titleFor`, `src/helpers/stepDecorator.ts:101-115`)
- **Reviewed**: `d850405`, 2026-10-28T16:54:56+01:00, Opus 5.5, second review, segment 2E

## Contract

- `src/helpers/stepDecorator.ts:163-164` (doc comment of `step`): "runs a method as Playwright's `test.step`, titled
  `ClassName.methodName` (for a static method too, by its class) unless given a title".
- `website/src/content/docs/api/step.md:6-7`: "titled `ClassName.methodName` unless given a title"; *Arguments*,
  `title`: "Defaults to `ClassName.methodName`."
- `website/src/content/docs/docs/test-steps.md:9-10`: "`@step` does it with a decorator, and titles the step after the
  class and the method"; line 37-38: static methods "are titled by their class (`AccountPage.create`)".
- `website/src/content/docs/docs/organizing-a-project.md:115-145` shows the pattern where this matters: `LoginPage
  extends ShopPage<Paths>`, a base class every page object shares, with `@step()` methods.

None says which class: the one that declares the method or the one of the object it runs on.

## Reproduction

The same probe and command as 2E-2 (`E/locations/zz-probe-E-loc.spec.ts`, `E/locations/printReporter.ts`, output
`E/locations/run2.txt`, exit 0). The classes:

```ts
class Base {
  @step() async overridden() {}
  @step() async inherited() {}
  @step({ box: true }) async boxedOverridden() {}
}

class Widget extends Base {
  @step() override async overridden() { await super.overridden(); }               // line 73
  @step({ box: true }) override async boxedOverridden() { await super.boxedOverridden(); } // line 78
  // …
}

const widget = new Widget();
await widget.inherited();       // line 158
await widget.overridden();      // line 159
await widget.boxedOverridden(); // line 160
```

## Observed / expected

```text
test.step "Widget.inherited" @ zz-probe-E-loc.spec.ts:158
  test.step "Widget.overridden" @ zz-probe-E-loc.spec.ts:73
test.step "Widget.overridden" @ zz-probe-E-loc.spec.ts:159
  test.step "Widget.boxedOverridden" @ zz-probe-E-loc.spec.ts:78
test.step "Widget.boxedOverridden" @ zz-probe-E-loc.spec.ts:160
```

A method declared in `Base` is titled `Widget.inherited`, and the `Base` step a `super` call opens is titled like the
override that contains it (`Widget.overridden` inside `Widget.overridden`). (An inherited static method was not probed;
by the code it is titled by the class the call names, `this`.) Expected: the pages say which class names the step, so a reader of a report with a
shared base class knows what `LoginPage.acceptCookies` means, and why two nested steps can share a title.

## Cause

`titleFor` (`src/helpers/stepDecorator.ts:101-115`) reads the class at call time from `this` (`this.constructor` for an
instance method, `this` for a static one). With standard decorators the declaring class is not known to a method
decorator, so the runtime class is the only one both decorator modes can give alike.

## Fix plan

- **Intended contract**: the title names the class of the object the method is called on (the class itself for a
  static method), so a method a base class declares is titled by each subclass that calls it.
- **Options**:
  1. *(recommended)* Docs only: say so in the `step` doc comment, `api/step.md` (`title` argument), and
     `docs/test-steps.md` after "titles the step after the class and the method", with the consequence for `super`:
     "an override that calls `super` opens two steps with the same title; give one a title of its own to tell them
     apart". Cost: three sentences.
  2. Title by the declaring class. Not available to a standard method decorator without a class decorator or a
     per-class registry; it would change every inherited step's title in existing reports (a behavior change users
     may match on in reporters). A design question; not recommended.
- **Implementation**: none for option 1.
- **Tests**: a unit test in `src/helpers/stepDecorator.test.ts` that a method wrapped once and called on a subclass
  instance is titled by the subclass, so the documented rule is pinned.
- **Docs**: the `step` doc comment (`src/helpers/stepDecorator.ts:163`), `api/step.md` (intro and `title`),
  `docs/test-steps.md` (*Introduction*); `api/step.md` and the doc comment must keep agreeing (the API coverage check).
- **Changeset**: none.
- **Decisions to tick**: that the receiver's class is the rule.
- **Relation**: none.
