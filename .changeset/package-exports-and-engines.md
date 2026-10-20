---
"pomwright": major
---

### Breaking changes

The package now declares its entry points and its Node floor, mirroring how `@playwright/test` is packaged.

- The package has an `exports` map: import from `"pomwright"` only. Deep imports such as `pomwright/dist/index.js`
  fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`; `pomwright/package.json` stays available. CommonJS projects (Playwright's
  default) load the same file as before. ESM projects (`"type": "module"`) now load an ESM entry that re-exports that
  CommonJS build by name, so a process that reaches pomwright through both `import` and `require` holds one copy of
  every class; TypeScript reads ESM declarations for `import` and CommonJS declarations for `require`, under every
  `moduleResolution`. The `module` field and the separate ESM build are gone. Migration: replace deep imports with
  imports from `"pomwright"`.
- `engines.node` is `>=20`, Playwright 1.64's own requirement. npm warns when installing on older Node, where
  Playwright already refuses to start.

### Fixes

- The `license` field is the SPDX id `Apache-2.0` instead of `Apache 2.0`, and `repository.url` is in the form npm
  expects, so npm no longer rewrites it on publish.

### Publishing

- Releases are published with npm provenance: npm shows, for each published version, the GitHub Actions run and the
  commit that built it, and `npm audit signatures` verifies it.
