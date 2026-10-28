// Checks that the API reference and the doc comments cover the public surface of the published declarations.
//
// - Every export has an API page or a section: a page whose `title:` is its name, or a `## Name` heading.
// - Every public or protected member of an exported class, interface or object type has a `### member` heading
//   (`### member` or `### member()`) in its own section: under the `## Name` heading of the export that declares it
//   (`ThisPageOptions` takes `timeout` from `NavigationOptions`), or, for the export a page is named after, under the
//   page's other `##` headings (Constructor, Methods, Properties, …).
// - Every export, every such member and every class constructor has a doc comment with a summary, and every
//   parameter of a function, method or constructor has a `@param` (a rest parameter needs at least one `@param`).
// - Every export, every method, every property of a class and every class constructor has a `@see` with its page on the
//   site; a field of an option or data type does not need one. The methods of what `add(path)` returns, which is not
//   exported, are held to the same rule.
// - Every @see is a https://dyhex.github.io/POMWright/ URL of its own entry: an export's page, or that page at its own
//   `## Name` heading; a member's or a constructor's own `###` heading in its own section (a heading repeated on a page
//   has its `-1` suffix, as the site makes it).
// - Every https://dyhex.github.io/POMWright/ URL in the declarations names a page of website/src/content/docs and, after
//   a `#`, one of its headings.
// - Every exported type is in the type table of docs/typescript.md (*The types*), linked to its API page or section.
//
//   node scripts/check-api-coverage.mjs [declarations]   # default: the installed package, .pack/pomwright/dist/index.d.ts
//
// `pnpm typecheck` and `pack-test.sh` run it after the package is extracted into .pack/pomwright, and CI's harness and
// site jobs after extracting the tarball they test, so it reads the declarations that would be published.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const declarations = path.resolve(root, process.argv[2] ?? ".pack/pomwright/dist/index.d.ts");
const apiDir = path.join(root, "website/src/content/docs/api");
const contentDir = path.join(root, "website/src/content/docs");
const siteUrl = "https://dyhex.github.io/POMWright/";

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

const hasSee = (symbol) => symbol.getJsDocTags(checker).some((tag) => tag.name === "see");
const isMethod = (symbol) =>
	(symbol.declarations ?? []).some(
		(declaration) => ts.isMethodDeclaration(declaration) || ts.isMethodSignature(declaration),
	);

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

/** Every @see to check: the entry it belongs to (`owner`, and `member` for a member or `new` for a constructor). */
const seeTags = [];
const collectSees = (owner, member, declarationsOfSymbol) => {
	for (const declaration of declarationsOfSymbol ?? []) {
		for (const tag of ts.getJSDocTags(declaration).filter((each) => each.tagName.text === "see")) {
			seeTags.push({ owner, member, text: tag.getText().replace(/\s*\*?\s*$/, "") });
		}
	}
};

const exportNames = new Set(checker.getExportsOfModule(moduleSymbol).map((exported) => exported.name));

/** The export whose declaration declares a member, when that is another export (a type it extends or intersects). */
function declaringExport(memberDeclaration, fallback) {
	for (let node = memberDeclaration?.parent; node; node = node.parent) {
		if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) {
			return node.name && exportNames.has(node.name.text) ? node.name.text : fallback;
		}
	}
	return fallback;
}

const surface = new Map(); // export -> members, each with the export whose section documents it
const exportedTypes = [];
for (const exported of checker.getExportsOfModule(moduleSymbol)) {
	const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
	const declaration = symbol.declarations?.[0];
	collectSees(exported.name, undefined, symbol.declarations);
	if (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
		exportedTypes.push(exported.name);
	}
	if (!summaryOf(symbol)) problems.add(`no summary: ${exported.name}`);
	if (!hasSee(symbol)) problems.add(`no @see: ${exported.name}`);
	if (symbol.flags & ts.SymbolFlags.Function) checkParameters(exported.name, symbol.declarations ?? []);

	const members = [];
	if (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
		const type = checker.getDeclaredTypeOfSymbol(symbol);
		if (symbol.flags & ts.SymbolFlags.Class) {
			const constructors = symbol.members?.get(ts.InternalSymbolName.Constructor)?.declarations ?? [];
			collectSees(exported.name, "new", constructors);
			for (const signature of constructors) {
				if (!ts.getJSDocCommentsAndTags(signature).length) problems.add(`no summary: new ${exported.name}()`);
				if (!ts.getJSDocTags(signature).some((tag) => tag.tagName.text === "see")) {
					problems.add(`no @see: new ${exported.name}()`);
				}
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
				const documentedIn = declaringExport(memberDeclaration, exported.name);
				members.push({ name: property.name, documentedIn });
				collectSees(documentedIn, property.name, property.declarations);
				const where = `${exported.name}.${property.name}`;
				if (!summaryOf(property)) problems.add(`no summary: ${where}`);
				// a method or a property of a class links its heading; a field of an option or data type need not
				if ((symbol.flags & ts.SymbolFlags.Class || isMethod(property)) && !hasSee(property)) {
					problems.add(`no @see: ${where}`);
				}
				const methods = (property.declarations ?? []).filter(
					(member) => ts.isMethodDeclaration(member) || ts.isMethodSignature(member),
				);
				checkParameters(where, methods);
			}
		}
	}
	surface.set(exported.name, members);
}

// what `add(path)` returns is not exported, but it is what a consumer hovers most; its page is titled Registration
const BUILDERS_PAGE = "Registration";
const sourceFile = program.getSourceFile(declarations);
for (const name of ["LocatorRegistrationPreDefinitionBuilder", "LocatorRegistrationPostDefinitionBuilder"]) {
	const statement = sourceFile.statements.find((node) => node.name?.text === name);
	if (!statement) {
		problems.add(`not in the declarations: ${name}`);
		continue;
	}
	const type = checker.getDeclaredTypeOfSymbol(checker.getSymbolAtLocation(statement.name));
	for (const property of checker.getPropertiesOfType(type)) {
		const memberDeclaration = property.valueDeclaration ?? property.declarations?.[0];
		if (memberDeclaration && ts.getCombinedModifierFlags(memberDeclaration) & ts.ModifierFlags.Private) continue;
		if (!hasSee(property)) problems.add(`no @see: ${name}.${property.name}`);
		collectSees(BUILDERS_PAGE, property.name, property.declarations);
	}
}

/** A heading's anchor, as the site makes it (github-slugger: lower case, punctuation removed). */
const slugOf = (text) =>
	text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.trim()
		.replace(/\s/g, "-");

/** The headings of a page, outside code blocks, each with its level and its anchor (a repeated one gets `-1`, …). */
function headingsOf(file) {
	const headings = [];
	const counts = new Map();
	let fenced = false;
	for (const line of fs.readFileSync(file, "utf8").split("\n")) {
		if (/^\s*```/.test(line)) fenced = !fenced;
		const heading = !fenced && /^(#{1,6}) (.+)$/.exec(line);
		if (!heading) continue;
		const base = slugOf(heading[2]);
		const seen = counts.get(base) ?? 0;
		counts.set(base, seen + 1);
		headings.push({ level: heading[1].length, text: heading[2].trim(), anchor: seen === 0 ? base : `${base}-${seen}` });
	}
	return headings;
}
const anchorsOf = (file) => new Set(headingsOf(file).map((heading) => heading.anchor));

// every link to the site in the declarations names a page and, after a `#`, one of its headings
const siteUrls = new Set(
	(fs.readFileSync(declarations, "utf8").match(/https:\/\/dyhex\.github\.io\/POMWright\/[^\s)`"'<>]*/g) ?? []).map(
		(url) => url.replace(/[.,;:]+$/, ""),
	),
);
for (const url of siteUrls) {
	const [pagePath, anchor] = url.slice(siteUrl.length).split("#");
	const slug = pagePath.replace(/\/$/, "");
	const page = [`${slug}.md`, `${slug}.mdx`, `${slug}/index.md`, `${slug}/index.mdx`]
		.map((candidate) => path.join(contentDir, candidate))
		.find((file) => fs.existsSync(file));
	if (!page) problems.add(`no page for ${url}`);
	else if (anchor && !anchorsOf(page).has(anchor)) problems.add(`no heading for ${url}`);
}

// each API page's sections: a `## Name` of an export (or of the builders' page) owns the `###` headings after it; the
// page's own title owns those before it and under its other `##` headings
const owner = new Map(); // name -> { page, url, anchor (of its `## Name`, or none for the page), headings: member -> anchor }
const pages = fs.existsSync(apiDir)
	? fs.readdirSync(apiDir, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
	: [];
for (const entry of pages) {
	const file = path.join(apiDir, entry.name);
	const title = /^title: "?([^"\n]+)"?$/m.exec(fs.readFileSync(file, "utf8"))?.[1];
	if (!title) continue;
	const url = `${siteUrl}api/${entry.name.replace(/\.mdx?$/, "")}/`;
	owner.set(title, { page: entry.name, url, anchor: undefined, headings: new Map() });
	let current = title;
	for (const heading of headingsOf(file)) {
		const text = heading.text.replace(/`/g, "");
		if (heading.level === 2) {
			current = surface.has(text) ? text : title;
			if (current === text) owner.set(text, { page: entry.name, url, anchor: heading.anchor, headings: new Map() });
		} else if (heading.level === 3) {
			const member = /^new [\w$]+\(\)$/.test(text) ? "new" : /^([\w.#$]+)(?:\(\))?$/.exec(text)?.[1];
			if (member) owner.get(current)?.headings.set(member, heading.anchor);
		}
	}
}

for (const [name, members] of [...surface].sort(([a], [b]) => a.localeCompare(b))) {
	const found = owner.get(name);
	if (!found) {
		problems.add(`no API page or section: ${name}`);
		continue;
	}
	for (const { name: member, documentedIn } of members) {
		const section = owner.get(documentedIn);
		if (!section?.headings.has(member)) {
			problems.add(`no heading: ${name}.${member} in the section of ${documentedIn} (${section?.page ?? "no page"})`);
		}
	}
}

// every @see links its own entry
for (const { owner: name, member, text } of seeTags) {
	const where = member === undefined ? name : member === "new" ? `new ${name}()` : `${name}.${member}`;
	const url = /https:\/\/dyhex\.github\.io\/POMWright\/[^\s)`"'<>]*/.exec(text)?.[0]?.replace(/[.,;:]+$/, "");
	const found = owner.get(name);
	if (!url) {
		problems.add(`@see without a link to the site: ${where} (${text})`);
		continue;
	}
	if (!found) continue; // reported above as an export without a page
	const own =
		member === undefined
			? [found.url, ...(found.anchor ? [`${found.url}#${found.anchor}`] : [])]
			: found.headings.has(member)
				? [`${found.url}#${found.headings.get(member)}`]
				: [];
	if (own.length > 0 && !own.includes(url))
		problems.add(`@see not at its own heading: ${where} links ${url}, not ${own.join(" or ")}`);
}

// the TypeScript page's table names every exported type, linked to its API page or section
const typescriptPage = path.join(contentDir, "docs/typescript.md");
const typesSection = /^## The types\n([\s\S]*?)(?=^## )/m.exec(fs.readFileSync(typescriptPage, "utf8"))?.[1] ?? "";
const tableLinks = new Map(
	[...typesSection.matchAll(/\[`([\w$]+)[^`]*`\]\(([^)\s]+)\)/g)].map((match) => [match[1], match[2]]),
);
for (const name of exportedTypes.sort()) {
	const found = owner.get(name);
	const href = tableLinks.get(name);
	if (!href) {
		problems.add(`not in the TypeScript page's type table, linked: ${name}`);
		continue;
	}
	if (!found) continue;
	const section = `${found.url}${found.anchor ? `#${found.anchor}` : ""}`.replace(siteUrl, "/POMWright/");
	if (href !== section) problems.add(`the TypeScript page's type table links ${name} to ${href}, not ${section}`);
}

for (const problem of problems) console.log(`  ${problem}`);
const memberCount = [...surface.values()].reduce((sum, members) => sum + members.length, 0);
console.log(
	`api coverage: ${surface.size} exports, ${memberCount} members, ${siteUrls.size} site links, ${problems.size} problems`,
);
process.exit(problems.size ? 1 : 0);
