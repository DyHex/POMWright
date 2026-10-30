// Writes the module the declaration-emit check compiles (test/tsconfig.declarations.json, declaration: true): every
// public member of every seed in test/tests/packaging/emitSeeds.ts returned on its own, without annotations, and the
// protected members of the page objects declared there, through a subclass, so a member whose type a consumer cannot
// name fails the emit (TS4023, TS4094, TS2883). Only members declared in pomwright's own declarations are walked, so
// Playwright's (the test object's) are not. It reads the installed package, the one test/ resolves, and fails when an
// export of pomwright is neither seeded (a key named after it, or after it and a dot) nor listed as memberless, so a new
// export is never passed over: give it a seed, or list it with the reason the list gives.
//
//   node scripts/generate-emit-members.mjs   # part of pnpm typecheck, before the emit compile

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const seedsFile = path.join(root, "test", "tests", "packaging", "emitSeeds.ts");
const outDir = path.join(root, "test", ".emit-members");
const outFile = path.join(outDir, "members.ts");

const config = ts.readConfigFile(path.join(root, "test", "tsconfig.json"), ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, path.join(root, "test"));
const program = ts.createProgram([seedsFile], { ...options, noEmit: true });
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length > 0) {
	const host = { getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => "\n" };
	console.error(ts.formatDiagnostics(diagnostics, host));
	process.exit(1);
}
const checker = program.getTypeChecker();
const source = program.getSourceFile(seedsFile);

/** The declarations of a statement exported under `name` in the seeds file. */
const exported = (name) => {
	let found;
	ts.forEachChild(source, (node) => {
		if (ts.isVariableStatement(node)) {
			for (const declaration of node.declarationList.declarations) {
				if (declaration.name.getText() === name) found = declaration;
			}
		}
		if (ts.isClassDeclaration(node) && node.name?.text === name) found = node;
	});
	return found;
};

// every export of pomwright, read from the import of the seeds file
let pomwright;
ts.forEachChild(source, (node) => {
	if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === "pomwright") {
		pomwright = checker.getSymbolAtLocation(node.moduleSpecifier);
	}
});
const exportNames = checker.getExportsOfModule(pomwright).map((symbol) => symbol.getName());

const seedsDeclaration = exported("seeds");
const seedsType = checker.getTypeAtLocation(seedsDeclaration);
const seedKeys = checker.getPropertiesOfType(seedsType).map((property) => property.getName());
// the array literal of `memberless`, read as written (an `as const` tuple)
const memberlessList = exported("memberless").initializer;
const memberless = (ts.isAsExpression(memberlessList) ? memberlessList.expression : memberlessList).elements.map(
	(element) => element.text,
);

const uncovered = exportNames.filter(
	(name) => !memberless.includes(name) && !seedKeys.some((key) => key === name || key.startsWith(`${name}.`)),
);
const unknown = [...memberless, ...seedKeys.map((key) => key.split(".")[0])].filter(
	(name) => !exportNames.includes(name),
);
if (uncovered.length > 0 || unknown.length > 0) {
	if (uncovered.length > 0) {
		console.error(
			`emit members: no seed for ${uncovered.join(", ")}; add one to emitSeeds.ts, or list it as memberless`,
		);
	}
	if (unknown.length > 0)
		console.error(`emit members: emitSeeds.ts names what pomwright does not export: ${unknown.join(", ")}`);
	process.exit(1);
}

const fromPomwright = (symbol) =>
	(symbol.declarations ?? []).some((declaration) =>
		/[\\/]pomwright[\\/]dist[\\/]/.test(declaration.getSourceFile().fileName),
	);
const modifiers = (symbol) => {
	const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
	return declaration ? ts.getCombinedModifierFlags(declaration) : 0;
};
const access = (name) => (/^[A-Za-z_$][\w$]*$/.test(name) ? `.${name}` : `[${JSON.stringify(name)}]`);

const lines = [];
const subclasses = [];
for (const key of seedKeys) {
	const seed = `seeds[${JSON.stringify(key)}]`;
	lines.push(`\t${JSON.stringify(key)}: () => ${seed},`);
	const type = checker.getTypeOfSymbolAtLocation(checker.getPropertyOfType(seedsType, key), seedsDeclaration);
	const walked = checker
		.getPropertiesOfType(type)
		.filter(
			(property) =>
				fromPomwright(property) && property.getName() !== "prototype" && !property.getName().startsWith("#"),
		);
	for (const property of walked) {
		if (modifiers(property) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
		lines.push(`\t${JSON.stringify(`${key}.${property.getName()}`)}: () => ${seed}${access(property.getName())},`);
	}
	// a page object declared in the seeds file: its protected members, read by a subclass
	const className = type.getSymbol()?.getName();
	if (className !== undefined && exported(className) !== undefined && ts.isClassDeclaration(exported(className))) {
		const protectedMembers = walked.filter((property) => modifiers(property) & ts.ModifierFlags.Protected);
		if (protectedMembers.length > 0) {
			const body = protectedMembers.map(
				(property) => `\t\t\t${property.getName()}: this${access(property.getName())},`,
			);
			subclasses.push(
				`export class ${className}Protected extends ${className} {\n\tprotectedMembers() {\n\t\treturn {\n${body.join("\n")}\n\t\t};\n\t}\n}`,
			);
			lines.push(
				...protectedMembers.map((property) => `\t// ${key}.${property.getName()}: protected, in ${className}Protected`),
			);
		}
	}
}

const classes = subclasses.map((text) => /^export class \w+Protected extends (\w+)/.exec(text)[1]);
const imports = ["seeds", ...new Set(classes)].sort().join(", ");
const module = `// Generated by scripts/generate-emit-members.mjs from emitSeeds.ts and the published declarations; do not edit.
import { ${imports} } from "../tests/packaging/emitSeeds";

export const members = {
${lines.join("\n")}
};
${subclasses.length > 0 ? `\n${subclasses.join("\n\n")}\n` : ""}`;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, module);
const count = lines.filter((line) => !line.trimStart().startsWith("//")).length + subclasses.length;
console.log(
	`emit members: ${exportNames.length} exports (${seedKeys.length} seeds, ${memberless.length} memberless), ${count} entries in ${path.relative(root, outFile)}`,
);
