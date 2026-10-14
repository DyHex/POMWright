// Writes the package's ESM entry after `tsup --format cjs --dts`. There is one implementation, the CommonJS build
// dist/index.js; dist/index.mjs re-exports it by name and dist/index.d.mts re-exports its declarations, the layout
// @playwright/test uses. A process that reaches pomwright through both `import` and `require` therefore holds one
// copy of every class and every module-level state. The names come from the built module itself, so the entry cannot
// drift from index.ts; test/tests/packaging/esmEntry.spec.mts checks the parity on the packed package.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const names = Object.keys(createRequire(import.meta.url)(`${dist}index.js`)).sort();

if (names.length === 0) {
	throw new Error("write-esm-entry: dist/index.js exports nothing; run tsup first");
}

writeFileSync(
	`${dist}index.mjs`,
	`import pomwright from "./index.js";\n\nexport const { ${names.join(", ")} } = pomwright;\n`,
);
writeFileSync(`${dist}index.d.mts`, `export * from "./index.js";\n`);
console.log(`write-esm-entry: dist/index.mjs and dist/index.d.mts re-export ${names.length} names`);
