# v1 ↔ v2 Drift Tracker

Use this file to keep an up-to-date picture of how v1 (src/intTest) and v2 (srcV2/intTestV2) differ. Update sections immediately when new differences are introduced or resolved.

## Known breaking changes (with migration ideas)

- Locator definitions moved from v1 object schemas (e.g., `addSchema` with `LocatorSchemaWithoutPath`) to the v2 fluent registry DSL (`locators.add(path).getByRole(...)`, `getByText(...)`, etc.).
  - **Possible solutions:** Maintain a small translation helper that converts v1 schema objects into v2 builder calls, or author new locators directly in the registry DSL for clearer intent.
- Update/filter chaining changed: v1 uses `update`/`addFilter` on schema objects, whereas v2 expects ordered override steps and per-segment overrides when calling `getNestedLocator`/`getLocator`.
  - **Possible solutions:** Wrap common v1 update patterns in helper functions that emit v2 override step arrays; keep overrides co-located with the call sites for readability.
- Registration behavior is stricter in v2: duplicate `add(path)` registrations throw instead of overwriting the prior schema.
  - **Possible solutions:** Prefer `replace(path, ...)` for deliberate updates or guard registration with `getIfExists` checks before calling `add`.
- Frame handling is explicit in v2: `frameLocator` steps switch the target for subsequent steps, and a terminal `frameLocator` returns its owner locator rather than the frame itself.
  - **Possible solutions:** Extend chains with an element inside the frame to keep the final locator scoped correctly, or add a helper that returns the frame locator when the frame is terminal.

## Missing features/validation relative to v1

- Session storage helpers (`SessionStorage` in v1) have not been ported to v2 helpers.
- Custom selector engine utilities from `src/utils` (e.g., `selectorEngines`) are not present in v2.
- v1 exposes a `GetBy` helper for schema construction; v2 expects direct registry builder usage without a dedicated helper wrapper.
- LocatorRegistry logger (`playwrightReportLogger` in v1) and fixture (`log` in v1) not implemented in v2, currently using the v1 implementation.
- No equivalent feature to v1 `LocatorSchemaWithoutPath` in v2.

## Potential migration issues

- Teams with large v1 schema maps must translate both definitions and chained update/filter calls to the v2 override step model, which may affect shared locator utilities.
- Tests that assume permissive re-registration of locator paths will fail under v2’s duplicate-path errors; ensure registration order is deterministic.
- Frame-only paths may resolve differently because v2 returns the owner locator when the frame is terminal, which can break assertions expecting a frame locator.

## Known or suspected v2 bugs

- Requesting a locator path that ends on a `frameLocator` yields the owner locator rather than the frame locator, which may block consumers that need the frame handle directly.
- Override validation demands every override key correspond to a registered path; consumers passing optional overrides without guarding may hit runtime errors when a definition is missing.
