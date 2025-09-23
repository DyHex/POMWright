# POMWright

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/DyHex/POMWright/main.yaml?label=CI%20on%20main)
[![NPM Version](https://img.shields.io/npm/v/pomwright)](https://www.npmjs.com/package/pomwright)
![NPM Downloads](https://img.shields.io/npm/dt/pomwright)
![GitHub License](https://img.shields.io/github/license/DyHex/POMWright)
[![NPM dev or peer Dependency Version](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)](https://www.npmjs.com/package/playwright)
[![Static Badge](https://img.shields.io/badge/created%40-ICE-ffcd00)](https://www.ice.no/)

POMWright is a lightweight TypeScript framework that layers the Page Object Model on top of Playwright.  It keeps locators, page objects, and fixtures organised so that UI tests stay readable and maintainable.

POMWright provides a way of abstracting the implementation details of a web page and encapsulating them into a reusable page object. This approach makes the tests easier to read, write, and maintain, and helps reduce duplicated code by breaking down the code into smaller, reusable components, making the code more maintainable and organized.

## Key capabilities

- Quickly build maintainable Page Object Classes.
- Define any Playwright Locator through type-safe LocatorSchemas.
- Automatic chaining of locators with dot-delimited paths that map directly to Playwright locator methods.
- Auto-completion of LocatorSchemaPaths and sub-paths.
- Adjust locators on the fly without mutating the original definitions.
- Attach structured logs directly to the Playwright HTML report.
- Manage `sessionStorage` for browser setup and state hand‑off.
- Multiple Domains/BaseURLs
- Validate elements position in DOM through chaining

## Why POMWright?

- **Stronger reliability** – centralised locator definitions reduce brittle inline selectors and make refactors visible at compile time.
- **Faster authoring** – strongly typed schema paths provide instant auto-complete, even for deeply nested segments and reusable fragments.
- **Easier maintenance** – shared helper patterns keep page objects, fixtures, and API clients aligned so teams can extend coverage without duplicating boilerplate.
- **Incremental adoption** – each helper sits on top of Playwright primitives, making it straightforward to migrate existing tests component by component.

## Installation

Install POMWright alongside Playwright:

```bash
pnpm add -D pomwright
# or
npm install --save-dev pomwright
```

## Documentation

Start with the introduction and continue through the topics:

1. [Intro to using POMWright](./docs/intro-to-using-pomwright.md)
2. [BasePage](./docs/BasePage-explanation.md)
3. [LocatorSchemaPath](./docs/LocatorSchemaPath-explanation.md)
4. [LocatorSchema](./docs/LocatorSchema-explanation.md)
5. [Locator schema helper methods](./docs/get-locator-methods-explanation.md)
6. [BaseApi](./docs/BaseApi-explanation.md)
7. [PlaywrightReportLogger](./docs/PlaywrightReportLogger-explanation.md)
8. [Session storage helpers](./docs/sessionStorage-methods-explanation.md)
9. [Tips for structuring locator files](./docs/tips-folder-structure.md)

## Troubleshooting and Support

If you encounter any issues or have questions, please check our [issues page](https://github.com/DyHex/POMWright/issues) or reach out to us directly.

## Contributing

Pull Requests are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

POMWright is open-source software licensed under the [Apache-2.0 license](https://github.com/DyHex/POMWright/blob/main/LICENSE).
