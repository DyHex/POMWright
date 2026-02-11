# POMWright Migration Skills

AI assistant skills for migrating POMWright page objects between versions.

## Available Skills

### pomwright-v1-5-bridge-migration
Migrate v1 `BasePage` page objects to the v1.5 bridge (`BasePageV1toV2`) as an intermediate step toward v2.

**Covers:**
- Changing class inheritance
- Translating `addSchema`/`initLocatorSchemas` to `defineLocators` with v2 DSL
- Updating call-site syntax (`getLocator`, `getNestedLocator`, `getLocatorSchema`)
- Updating filter/index/update/mutation patterns

### pomwright-v2-migration
Migrate page objects to v2 `PageObject` from either v1 `BasePage` or the v1.5 bridge.

**Covers:**
- Class inheritance and constructor signature changes
- Locator registration with v2 DSL
- Adding `pageActionsToPerformAfterNavigation`
- Call-site syntax updates
- Migrating fixtures, navigation, sessionStorage, and logging
- Adopting the `@step` decorator

## Installation

### For Claude Code

Copy the skill directories to your local Claude Code skills folder:

```bash
cp -r skills/pomwright-v1-5-bridge-migration ~/.claude/skills/
cp -r skills/pomwright-v2-migration ~/.claude/skills/
```

### For Other AI Assistants

These skills are structured as markdown-based instructions with reference documentation. Adapt the content from each `SKILL.md` file according to your AI assistant's skill/prompt format.

## Structure

Each skill includes:
- `SKILL.md` - Main skill instructions
- `references/` - Supporting documentation and examples
