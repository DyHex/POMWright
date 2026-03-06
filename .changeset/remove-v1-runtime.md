---
"pomwright": major
---

Remove the v1 runtime implementation and test/tooling from the package.

### Breaking changes

- Removed v1 exports from `pomwright` entrypoint:
  - `GetByMethod`, `LocatorSchema`, `AriaRoleType`
  - `BaseApi`
  - `BasePage`, `BasePageOptions`, `ExtractBaseUrlType`, `ExtractFullUrlType`, `ExtractUrlPathType`
  - `GetLocatorBase`, `LocatorSchemaWithoutPath`
  - `BasePageV1toV2`
- Removed v1 source and test paths (`src`, `intTest`, `test`) and v1 scripts/tooling (`pack-test.sh`, `vitest`).
- Removed v1 bridge translation helper from v2 runtime.

### Notes

- v2 public API remains unchanged.
- Legacy v1 and migration documentation is retained in `docs/v1` and `docs/v1-to-v2-migration`.
