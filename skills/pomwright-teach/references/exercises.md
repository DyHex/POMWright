# Exercises

An exercise is the feedback loop of a lesson: a task in the workspace whose spec fails until the learner has done it,
and passes, against the running practice shop, once they have.

## Contents

- [The shape of an exercise](#the-shape-of-an-exercise)
- [Writing one](#writing-one)
- [Checking the learner's work](#checking-the-learners-work)

## The shape of an exercise

`exercises/NNNN-slug/`, with:

- `TASK.md`: what to do, in two to five sentences, and the command that checks it;
- the starter files: a page object or a locator module with `// TODO` where the learner writes, and whatever the task
  builds on, finished;
- `NNNN-slug.spec.ts`: the check, which uses the learner's page object as a test would.

The check is a spec the learner could have written: it navigates, acts and asserts through the page object. For a task
about locators, it asserts every path matches the element it should (one for a singular path, at least one for a
plural one), so a locator that finds too much fails as surely as one that finds nothing.

```ts title="newsletter.page.ts"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export type Paths =
  | "main"
  | "main.form@newsletter"
  | "main.form@newsletter.input@email"
  | "main.form@newsletter.button@subscribe";

export class HomePage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "http://localhost:4173", "");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    // TODO: register the newsletter form, its email field and its subscribe button
  }
}
```

```ts title="0001-newsletter.spec.ts"
import { expect, test } from "@playwright/test";
import { HomePage, type Paths } from "./newsletter.page";

const singular: Paths[] = [
  "main",
  "main.form@newsletter",
  "main.form@newsletter.input@email",
  "main.form@newsletter.button@subscribe",
];

test("every path of the home page finds its one element", async ({ page }) => {
  const home = new HomePage(page);
  await home.navigation.goto();
  for (const path of singular) {
    await expect(home.getNestedLocator(path), path).toHaveCount(1);
  }
});
```

Until the TODO is done, the test fails at the first path without a locator,
`No locator schema registered for path "main.form@newsletter".`; once it is, each path must find its one element. The
learner runs `npx playwright test exercises/0001-newsletter`.

## Writing one

1. Write the solution in the exercise folder, as the `pomwright` skill would.
2. Run the spec: it must pass against the practice shop.
3. Replace the part the learner writes with `// TODO` and a one-line hint, and run the spec again: it must fail, and
   its message must point at what is missing.
4. Write `TASK.md`. Keep the solution out of the workspace.

Pick tasks that build the unit's skill and nothing else: registering a form's elements, choosing between two locators,
writing a query that finds one card, turning a test into page-object steps, seeding the cart.

## Checking the learner's work

Run the spec, then read the code. A pass written to the rules (Playwright's order of preference, `kind@which` names,
the chain as short as unique, `@step` methods, data from the fixture) is the win to record. A pass that breaks a rule
gets one improvement, the most important, shown in the right form, and a rerun. A failure gets a hint that points at
the place, not the answer, then a bigger one if needed.
