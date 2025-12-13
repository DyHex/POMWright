# v1 ↔ v2 Drift Tracker

Use this file to keep an up-to-date picture of how v1 (src/intTest) and v2 (srcV2/intTestV2) differ. Update sections immediately when new differences are introduced or resolved.

## Known breaking changes (with migration ideas)

- Locator definitions moved from v1 object schemas (e.g., `addSchema` with `LocatorSchemaWithoutPath`) to the v2 fluent registry DSL (`locators.add(path).getByRole(...)`, `getByText(...)`, etc.).
  - **Possible solutions:** Maintain a small translation helper that converts v1 schema objects into v2 builder calls, or author new locators directly in the registry DSL for clearer intent.
- Update/filter chaining changed: v1 uses `update`/`addFilter` on schema objects, whereas v2 expects ordered override steps and per-segment overrides when calling `getNestedLocator`/`getLocator`.
  - **Possible solutions:** Wrap common v1 update patterns in helper functions that emit v2 override step arrays; keep overrides co-located with the call sites for readability.
- Registration behavior is stricter in v2: duplicate `add(path)` registrations throw instead of overwriting the prior schema. (might be the v1 behavior actually)
  - **Possible solutions:** Prefer `replace(path, ...)` for deliberate updates or guard registration with `getIfExists` checks before calling `add`.
- Frame handling is explicit in v2: `frameLocator` steps switch the target for subsequent steps, and a terminal `frameLocator` returns its owner locator rather than the frame itself.
  - **Possible solutions:** Extend chains with an element inside the frame to keep the final locator scoped correctly, or add a helper that returns the frame locator when the frame is terminal.
  - `getById` in v2 normalizes leading `#`/`id=` prefixes and accepts `RegExp` or string values; string IDs are exact, while regex IDs match by pattern.
- Locator schema validation is stricter in v2: runtime checks now mirror compile-time rules by rejecting whitespace.
  - **Possible solutions:** Normalize user-provided path strings (trim and replace whitespace) before registering.
- Requesting a locator path that ends on a `frameLocator` yields the owner locator pointing at the actual iframe (validate its presence) rather than the frame locator which you'd use to resolve/validate elements inside the iframe.
  - **Solution:** Invoke .contentFrame() on the returned locator in the test/step/method to reverse operation and you can use it to target elements inside the iframe again.
- Locator registration and updates no longer accept `{ filters, index }` config objects on locator methods. Chain `.filter()`/`.nth()` to record ordered steps instead. A v1 compatibility shim will be used for legacy schemas rather than mixing the behaviors inside v2.
- Locator registration now enforces a single locator-type call per `add` chain (with a single matching override allowed when reusing); attempts to chain another locator method throw instead of silently overwriting, and the fluent surface narrows to `filter`/`nth` after a locator is set.
- `{ reuse }` overrides are PATCH-style in v2: missing selector/text/role values inherit from the reused locator, and provided options merge with existing ones instead of replacing the definition wholesale. This applies to every locator method (e.g., `locator`, `getByRole`, `getByText`, `getById`), so a reuse override can supply only the fields it wants to change while keeping the seeded discriminant/selector intact.
- Shorthand `getLocator(path)` / `getNestedLocator(path)` now return Playwright `Locator` instances synchronously and no longer accept override arguments or fluent mutations; use `getLocatorSchema(path)` for filters/indices/updates. v1 supported optional override objects (e.g., index maps) and required `await` on the shorthand helpers.

## Missing features/validation relative to v1

- TODO Session storage helpers (`SessionStorage` in v1) have not been ported to v2 helpers.
- DROPPED Custom selector engine utilities from `src/utils` (e.g., `selectorEngines`) are not present in v2.
- DROPPED v1 exposes a `GetBy` helper for schema construction; v2 expects direct registry builder usage without a dedicated helper wrapper.
- LocatorRegistry no longer emits `PlaywrightReportLogger` output in v2, and `createRegistryWithAccessors` no longer accepts a logger parameter. v1-style registry logging would need to be layered via a compatibility shim if required.
- Added support for reusable locator definitions (`registry.createReusable`) and reusing registered paths via `add(path, { reuse })`, covering v1 `LocatorSchemaWithoutPath` use cases.

## Potential migration issues

- Teams with large v1 schema maps must translate both definitions and chained update/filter calls to the v2 override step model, which may affect shared locator utilities.
- Tests that assume permissive re-registration of locator paths will fail under v2’s duplicate-path errors; ensure registration order is deterministic.
- Frame-only paths may resolve differently because v2 returns the owner locator when the frame is terminal, which can break assertions expecting a frame locator.
- v2 treats `.` as the only special character in locator paths; paths containing `#`, `@`, or other symbols are valid segments but cannot contain consecutive dots or start/end with a dot or be an empty string. This should be the same behavior as in v1. But v2 is stricter as it also does not allow any whitespace characters in a path.

## Known or suspected v2 bugs

- Override validation demands every override key correspond to a registered path; consumers passing optional overrides without guarding may hit runtime errors when a definition is missing.
