// Checks that the API reference and the doc comments cover the public surface of the published declarations.
//
// - Every export has an API page or a section: a page whose `title:` is its name, or a `## Name` heading.
// - Every public or protected member of an exported class, interface or object type has a `### member` heading on
//   that page (`### member` or `### member()`).
// - Every export, every such member and every class constructor has a doc comment with a summary, and every
//   parameter of a function, method or constructor has a `@param` (a rest parameter needs at least one `@param`).
//
//   node scripts/check-api-coverage.mjs [declarations]   # default: the installed package, .pack/pomwright/dist/index.d.ts
//
// `pnpm typecheck` runs it after `pnpm harness:install` has extracted the package; CI passes the tarball's declarations.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const declarations = path.resolve(root, process.argv[2] ?? ".pack/pomwright/dist/index.d.ts");
const apiDir = path.join(root, "website/src/content/docs/api");

if (!fs.existsSync(declarations)) {
	console.error(`api coverage: ${path.relative(root, declarations)} not found; run pnpm harness:install first`);
	process.exit(1);
}

const program = ts.createProgram([declarations], { strict: true, skipLibCheck: true, noEmit: true });
const checker = program.getTypeChecker();
const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(declarations));

const summaryOf = (symbol) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
const paramTags = (declaration) =>
	ts
		.getJSDocTags(declaration)
		.filter(ts.isJSDocParameterTag)
		.map((tag) => tag.name.getText());

const problems = new Set(); // overloads would repeat a problem

/** Every declaration of a function-like symbol: each overload needs its own @param or inherits the first one's. */
function checkParameters(where, declarationsOfSymbol) {
	const signatures = declarationsOfSymbol.filter((declaration) => ts.isFunctionLike(declaration));
	if (signatures.length === 0) return;
	const documented = new Set(signatures.flatMap(paramTags));
	for (const signature of signatures) {
		for (const parameter of signature.parameters) {
			const name = parameter.name.getText();
			if (parameter.dotDotDotToken) {
				if (documented.size === 0 && !documented.has(name)) problems.add(`no @param: ${where} (...${name})`);
				continue;
			}
			if (!documented.has(name)) problems.add(`no @param: ${where} (${name})`);
		}
	}
}

const surface = new Map(); // export -> members
for (const exported of checker.getExportsOfModule(moduleSymbol)) {
	const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
	const declaration = symbol.declarations?.[0];
	if (!summaryOf(symbol)) problems.add(`no summary: ${exported.name}`);
	if (symbol.flags & ts.SymbolFlags.Function) checkParameters(exported.name, symbol.declarations ?? []);

	const members = [];
	if (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
		const type = checker.getDeclaredTypeOfSymbol(symbol);
		if (symbol.flags & ts.SymbolFlags.Class) {
			const constructors = symbol.members?.get(ts.InternalSymbolName.Constructor)?.declarations ?? [];
			for (const signature of constructors) {
				if (!ts.getJSDocCommentsAndTags(signature).length) problems.add(`no summary: new ${exported.name}()`);
			}
			checkParameters(`new ${exported.name}()`, constructors);
		}
		// a union, a conditional type (the path rules) or a tuple has no members to document
		const opaque =
			type.flags & (ts.TypeFlags.Union | ts.TypeFlags.Conditional) ||
			checker.isTupleType(type) ||
			checker.isArrayType(type);
		if (!opaque) {
			for (const property of checker.getPropertiesOfType(type)) {
				const memberDeclaration = property.valueDeclaration ?? property.declarations?.[0] ?? declaration;
				const modifiers = ts.getCombinedModifierFlags(memberDeclaration);
				if (modifiers & ts.ModifierFlags.Private || property.name.startsWith("#") || property.name.startsWith("__")) {
					continue;
				}
				members.push(property.name);
				const where = `${exported.name}.${property.name}`;
				if (!summaryOf(property)) problems.add(`no summary: ${where}`);
				const methods = (property.declarations ?? []).filter(
					(member) => ts.isMethodDeclaration(member) || ts.isMethodSignature(member),
				);
				checkParameters(where, methods);
			}
		}
	}
	surface.set(exported.name, members);
}

const owner = new Map(); // export -> { page, headings }
const pages = fs.existsSync(apiDir)
	? fs.readdirSync(apiDir, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
	: [];
for (const entry of pages) {
	const text = fs.readFileSync(path.join(apiDir, entry.name), "utf8");
	const title = /^title: "?([^"\n]+)"?$/m.exec(text)?.[1];
	const headings = new Set([...text.matchAll(/^### `?([\w.#$]+)(?:\(\))?`?\s*$/gm)].map((match) => match[1]));
	const names = [title, ...[...text.matchAll(/^## `?([\w$]+)`?\s*$/gm)].map((match) => match[1])];
	for (const name of names) if (name) owner.set(name, { page: entry.name, headings });
}

for (const [name, members] of [...surface].sort(([a], [b]) => a.localeCompare(b))) {
	const found = owner.get(name);
	if (!found) {
		problems.add(`no API page or section: ${name}`);
		continue;
	}
	for (const member of members) {
		if (!found.headings.has(member)) problems.add(`no heading: ${name}.${member} (${found.page})`);
	}
}

for (const problem of problems) console.log(`  ${problem}`);
const memberCount = [...surface.values()].reduce((sum, members) => sum + members.length, 0);
console.log(`api coverage: ${surface.size} exports, ${memberCount} members, ${problems.size} problems`);
process.exit(problems.size ? 1 : 0);
