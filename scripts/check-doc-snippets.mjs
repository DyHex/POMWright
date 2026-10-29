// Type-checks every TypeScript code block of the documentation and the README against the packed package, as a
// consumer compiles it: the harness's compiler options (strict, noUncheckedIndexedAccess, verbatimModuleSyntax) plus
// declaration: true.
//
//   node scripts/check-doc-snippets.mjs            # after `pnpm harness:install`
//
// Each page, and the README, is one small project: a block with title="name.ts" is that file and can be imported by the
// page's other blocks ("./name"); an untitled block is a module of its own. Lines up to and including `// ---cut---`
// are compiled but not shown on the site. A block whose meta says `nocheck` is skipped and listed; only the 2.x code of
// docs/upgrading-from-2x.md may say it. Errors are reported at the page line they come from. The files of
// website/snippets/ (the docs' example app: page objects and fixtures) are part of every page's project unless the page
// has a block with the same title, so an example can import "./fixtures"; they are also compiled on their own, so the
// check has inputs before any page exists.
//
// A block's language is the fence's first word, after any spaces, as CommonMark and the site read it. A TypeScript
// example the check could not compile fails it, with the fix: one in a ~~~ fence, one labeled tsx, mts or cts, one whose
// label is ts or typescript written otherwise (``` ts, ```TS), and nocheck on any other page. Blocks in other
// languages (js, sh, text, …) are not checked. A tsc that fails without reporting a type error (a crash, a missing
// install) fails the check with what it printed.
//
// The doc comments' examples are compiled too, in test/.doc-examples/, a project of their own: every ```ts block after an
// @example in src/ and index.ts. They are fragments of a consumer's file, so each gets an import of the POMWright exports
// and Playwright types it names, and context.d.ts declares the instances they assume (page, registry, log, storage, a
// login page object of the examples' app, …) and the paths they pass. Errors are reported at the source line; ```ts
// nocheck skips an example that cannot stand alone and lists it.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const contentDir = path.join(root, "website/src/content/docs");
const outDir = path.join(root, "test/.doc-snippets");
const sharedDir = path.join(root, "website/snippets");
const shared = fs.existsSync(sharedDir) ? fs.readdirSync(sharedDir).filter((name) => name.endsWith(".ts")) : [];
const readme = path.join(root, "README.md");
const fence = /^(\s*)(`{3,}|~{3,})(\s*)([^\s`]*)(.*)$/;
const NOCHECK_PAGE = "docs/upgrading-from-2x";

function pages(dir) {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return pages(full);
		return /\.mdx?$/.test(entry.name) ? [full] : [];
	});
}

function blocks(file) {
	const lines = fs.readFileSync(file, "utf8").split("\n");
	const found = [];
	for (let i = 0; i < lines.length; i++) {
		const open = fence.exec(lines[i]);
		if (!open) continue;
		const [, indent, ticks, space, lang, meta] = open;
		const body = [];
		let j = i + 1;
		while (j < lines.length && !(lines[j].startsWith(indent + ticks) && lines[j].trim() === ticks)) {
			body.push(lines[j].startsWith(indent) ? lines[j].slice(indent.length) : lines[j]);
			j++;
		}
		const label = lang.toLowerCase();
		if (["ts", "typescript", "tsx", "mts", "cts"].includes(label)) {
			// written exactly when nothing stands between the fence and a lower-case label
			const exact = space === "" && lang === label;
			found.push({ line: i + 2, lang: label, exact, tilde: ticks.startsWith("~"), meta, body: body.join("\n") });
		}
		i = j;
	}
	return found;
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "_app"), { recursive: true });
for (const name of shared) fs.copyFileSync(path.join(sharedDir, name), path.join(outDir, "_app", name));
const origin = new Map(); // snippet file -> { page, line }
let checked = 0;
const skipped = [];
const rejected = [];

for (const page of [...pages(contentDir), readme]) {
	const rel = page === readme ? "README" : path.relative(contentDir, page).replace(/\.mdx?$/, "");
	const titles = new Set();
	for (const block of blocks(page)) {
		const where = `${path.relative(root, page)}:${block.line - 1}`;
		if (block.tilde) {
			rejected.push(`${where}: a TypeScript block in a ~~~ fence is not compiled; write it as a \`\`\`ts block`);
			continue;
		}
		if (!block.exact && (block.lang === "ts" || block.lang === "typescript")) {
			rejected.push(`${where}: a TypeScript block's label is written otherwise than ts; write it as a \`\`\`ts block`);
			continue;
		}
		if (block.lang !== "ts" && block.lang !== "typescript") {
			rejected.push(`${where}: a block labeled ${block.lang} is not compiled; write the example as a \`\`\`ts block`);
			continue;
		}
		if (/\bnocheck\b/.test(block.meta)) {
			if (rel !== NOCHECK_PAGE) {
				rejected.push(
					`${where}: nocheck is only for the 2.x code of Upgrading from 2.x; make the example compile: // ---cut--- hides the setup lines it needs, and // @ts-expect-error marks a deliberate compile error`,
				);
			} else {
				skipped.push(where);
			}
			continue;
		}
		const title = /title="([^"]+\.ts)"/.exec(block.meta)?.[1];
		if (title && titles.has(title)) throw new Error(`${where}: a second block titled ${title} on one page`);
		if (title) titles.add(title);
		const name = title ?? `snippet-${block.line}.ts`;
		const target = path.join(outDir, rel, name);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, `${block.body}\n`);
		origin.set(path.relative(root, target), { page: path.relative(root, page), line: block.line });
		checked++;
	}
	for (const name of shared) {
		if (titles.has(name)) continue;
		const target = path.join(outDir, rel, name);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.copyFileSync(path.join(sharedDir, name), target);
	}
}

fs.writeFileSync(
	path.join(outDir, "tsconfig.json"),
	JSON.stringify(
		{ extends: "../tsconfig.json", compilerOptions: { declaration: true, noEmit: true }, include: ["**/*.ts"] },
		null,
		"\t",
	),
);

/** Runs tsc over one project; its type errors, each placed at the line of the page or source file it comes from. */
function compile(dir, origins) {
	try {
		execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", path.relative(root, dir), "--pretty", "false"], {
			cwd: root,
			stdio: "pipe",
			encoding: "utf8",
		});
		return "";
	} catch (error) {
		// tsc exits non-zero with its type errors on stdout; without any, it failed in another way, which fails the check too
		const reported = typeof error.stdout === "string" ? error.stdout : "";
		if (!/error TS\d+/.test(reported)) {
			const said = [reported, typeof error.stderr === "string" ? error.stderr : ""].join("\n").trim();
			const how = error.status != null ? `exit code ${error.status}` : (error.signal ?? "no exit code");
			console.error(`doc snippets: tsc failed without a type error (${how}):\n${said || error.message}`);
			process.exit(1);
		}
		const prefix = path.relative(root, dir).replaceAll(".", "\\.");
		return reported.replace(new RegExp(`^(${prefix}/[^(]+)\\((\\d+),(\\d+)\\)`, "gm"), (all, file, line, col) => {
			const from = origins.get(file);
			return from ? `${from.page}:${from.line + Number(line) - 1}:${col} (${file})` : all;
		});
	}
}

const typeErrors = compile(outDir, origin);

// The doc comments' examples, the API reference in the editor: every ```ts block after an @example in src/ and index.ts,
// each a module of its own in test/.doc-examples/, compiled in a project of its own with the context the examples
// assume declared once (a page, a registry over the paths they use, a logger, a session storage helper, Playwright's
// test and expect), so a page's example cannot lean on it. A fragment of a class (`protected …`, or using `this`) is
// compiled inside one, statements inside an async function. `nocheck` after the fence skips an example that cannot
// stand alone and lists it.
const examplesDir = path.join(root, "test/.doc-examples");
const sourceFiles = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(full);
		return /\.ts$/.test(entry.name) && !/\.test(-d)?\.ts$/.test(entry.name) ? [full] : [];
	});
const examples = [];
for (const file of [path.join(root, "index.ts"), ...sourceFiles(path.join(root, "src"))]) {
	const lines = fs.readFileSync(file, "utf8").split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (!/^\s*\*\s*@example\b/.test(lines[i])) continue;
		let j = i + 1;
		while (j < lines.length && !/^\s*\*\s*(```|~~~)/.test(lines[j]) && !/\*\//.test(lines[j])) j++;
		const open = /^\s*\*\s*(```|~~~)\s*([^\s`]*)(.*)$/.exec(lines[j] ?? "");
		if (!open) continue;
		const body = [];
		const first = j + 2;
		for (j++; j < lines.length && !/^\s*\*\s*(```|~~~)\s*$/.test(lines[j]); j++)
			body.push(lines[j].replace(/^\s*\* ?/, ""));
		examples.push({
			file: path.relative(root, file),
			line: first,
			label: open[2],
			meta: open[3],
			body: body.join("\n"),
		});
		i = j;
	}
}
// An example uses POMWright's exports and Playwright's types without importing them, as a fragment of a file that does:
// each gets an import of the ones it names and neither imports nor declares, values and types apart.
const exported = { values: new Set(), types: new Set() };
for (const [, list] of fs.readFileSync(path.join(root, "index.ts"), "utf8").matchAll(/export (?:type )?\{([^}]*)\}/g)) {
	for (const item of list
		.split(",")
		.map((name) => name.trim())
		.filter(Boolean)) {
		const name = item
			.replace(/^type /, "")
			.split(" as ")
			.at(-1)
			.trim();
		(item.startsWith("type ") ? exported.types : exported.values).add(name);
	}
}
for (const [statement] of fs.readFileSync(path.join(root, "index.ts"), "utf8").matchAll(/export type \{[^}]*\}/g)) {
	for (const name of statement
		.slice(statement.indexOf("{") + 1, -1)
		.split(",")
		.map((n) => n.trim())
		.filter(Boolean)) {
		exported.values.delete(name);
		exported.types.add(name);
	}
}
const PLAYWRIGHT = {
	values: ["expect"],
	types: ["Page", "Locator", "FrameLocator", "Frame", "TestInfo", "BrowserContext"],
};
const importsFor = (body) => {
	const declared = new Set(
		[
			...body.matchAll(/\b(?:import\s+(?:type\s+)?\{([^}]*)\}|(?:const|let|class|function|type|interface)\s+(\w+))/g),
		].flatMap(([, names, single]) =>
			single
				? [single]
				: names.split(",").map((n) =>
						n
							.replace(/^\s*type\s+/, "")
							.split(" as ")
							.at(-1)
							.trim(),
					),
		),
	);
	const used = (name) => !declared.has(name) && new RegExp(`(?<![.\\w])${name}\\b`).test(body);
	const lines = [];
	const pick = (values, types, from) => {
		const names = [...[...values].filter(used), ...[...types].filter(used).map((name) => `type ${name}`)];
		if (names.length > 0) lines.push(`import { ${names.join(", ")} } from "${from}";`);
	};
	pick(exported.values, exported.types, "pomwright");
	pick(PLAYWRIGHT.values, PLAYWRIGHT.types, "@playwright/test");
	return lines;
};

// the paths the examples pass, and each one's ancestors, are the registry's
const examplePaths = new Set();
const pathArgument =
	/(?:\badd|getLocator|getNestedLocator|getLocatorSchema|\.update|\.replace|\.filter|\.skip|\.unskip|\.clearSteps|clickOn|createReusable)\(\s*"([^"]+)"|\bnth\(\s*"([^"]+)"\s*,|\b(?:reuse|has|hasNot):\s*"([^"]+)"/g;
for (const { body } of examples) {
	for (const match of body.matchAll(pathArgument)) {
		const segments = (match[1] ?? match[2] ?? match[3]).split(".");
		for (let n = 1; n <= segments.length; n++) examplePaths.add(segments.slice(0, n).join("."));
	}
}
fs.rmSync(examplesDir, { recursive: true, force: true });
fs.mkdirSync(examplesDir, { recursive: true });
fs.writeFileSync(
	path.join(examplesDir, "context.d.ts"),
	[
		"// What the doc comments' examples assume, declared once (scripts/check-doc-snippets.mjs writes this file).",
		`type Paths = ${[...examplePaths].map((p) => JSON.stringify(p)).join(" | ") || "string"};`,
		'declare const page: import("@playwright/test").Page;',
		'declare const testInfo: import("@playwright/test").TestInfo;',
		'declare const registry: import("pomwright").LocatorRegistry<Paths>;',
		'declare const log: import("pomwright").PlaywrightReportLogger;',
		'declare const storage: import("pomwright").SessionStorage;',
		'declare const row: import("pomwright").ReusableLocator<Paths>;',
		// a page object of the examples' app, as the docs' login.page.ts writes it
		'declare const ExamplesPageObject: typeof import("pomwright").PageObject;',
		"declare class LoginPage extends ExamplesPageObject<Paths> {",
		'\tconstructor(page: import("@playwright/test").Page);',
		"\tprotected defineLocators(): void;",
		"\tlogIn(email: string, password: string): Promise<void>;",
		"}",
		"declare const loginPage: LoginPage;",
		"declare const ordersPage: LoginPage;",
		'declare const accountPage: import("pomwright").PageObject<Paths, { urlPathType: RegExp }>;',
		'declare const cart: import("@playwright/test").Locator;',
		"declare const locale: string | undefined;",
		"declare const timezoneId: string | undefined;",
		"",
	].join("\n"),
);
fs.writeFileSync(
	path.join(examplesDir, "tsconfig.json"),
	JSON.stringify(
		{ extends: "../tsconfig.json", compilerOptions: { declaration: true, noEmit: true }, include: ["**/*.ts"] },
		null,
		"\t",
	),
);
const exampleOrigin = new Map();
const examplesSkipped = [];
let examplesChecked = 0;
for (const example of examples) {
	const where = `${example.file}:${example.line - 1}`;
	if (example.label !== "ts") {
		rejected.push(
			`${where}: an @example block labeled ${example.label || "nothing"} is not compiled; write it as \`\`\`ts`,
		);
		continue;
	}
	if (/\bnocheck\b/.test(example.meta)) {
		examplesSkipped.push(where);
		continue;
	}
	const { body } = example;
	const head = importsFor(body);
	// a query's path: one below the deepest sub-path the example passes it, or a path with ancestors
	if (/\bquery\b/.test(body) && !/\b(?:const|let)\s+query\b/.test(body)) {
		const subPaths = [...body.matchAll(/\bquery\s*\.\s*\w+\(\s*"([^"]+)"/g)].map((match) => match[1]);
		const deepest = subPaths.sort((a, b) => b.split(".").length - a.split(".").length)[0];
		const terminal =
			[...examplePaths].find((p) => deepest !== undefined && p.startsWith(`${deepest}.`)) ??
			deepest ??
			[...examplePaths].find((p) => p.split(".").length > 2) ??
			"main";
		head.push(`declare const query: import("pomwright").LocatorQueryBuilder<Paths, ${JSON.stringify(terminal)}>;`);
	}
	let code;
	if (/^(export |import |type |interface |abstract class |class |function |declare )/m.test(body)) {
		code = body;
	} else if (/^\s*(protected|public|private) /.test(body)) {
		head.push('import { PageObject as ExamplePageObject } from "pomwright";');
		code = `export abstract class Example extends ExamplePageObject<Paths> {\n${body}\n}`;
	} else if (/\bthis\./.test(body)) {
		head.push('import { PageObject as ExamplePageObject } from "pomwright";');
		// a page object of the examples keeps its logger in a field of its own
		code = `export abstract class Example extends ExamplePageObject<Paths> {\n\tdeclare log: import("pomwright").PlaywrightReportLogger;\n\tasync example() {\n${body}\n\t}\n}`;
	} else {
		code = `export async function example() {\n${body}\n}`;
	}
	// the wrapper's own lines before the example's first one
	const before =
		head.length +
		(code === body ? 0 : code.indexOf(body) === -1 ? 0 : code.slice(0, code.indexOf(body)).split("\n").length - 1);
	const target = path.join(examplesDir, `${example.file.replaceAll("/", "_").replace(/\.ts$/, "")}-${example.line}.ts`);
	fs.writeFileSync(target, `${[...head, code].join("\n")}\nexport {};\n`);
	exampleOrigin.set(path.relative(root, target), { page: example.file, line: example.line - before });
	examplesChecked++;
}
const exampleErrors = compile(examplesDir, exampleOrigin);

if (typeErrors) {
	console.error(typeErrors);
	console.error(
		`doc snippets: type errors in ${checked} checked blocks (tsc reports only syntax errors while any block does not parse)`,
	);
}
if (exampleErrors) {
	console.error(exampleErrors);
	console.error(`doc snippets: type errors in the doc comments' examples (${examplesChecked} checked)`);
}
if (rejected.length > 0) {
	console.error(
		`doc snippets: ${rejected.length} TypeScript blocks the check cannot compile:\n  ${rejected.join("\n  ")}`,
	);
}
if (typeErrors || exampleErrors || rejected.length > 0) {
	process.exit(1);
}
console.log(
	`doc snippets: ${checked} checked, ${skipped.length} skipped (nocheck), example app: ${shared.length} files; doc comments' examples: ${examplesChecked} checked, ${examplesSkipped.length} skipped (nocheck)`,
);
for (const where of [...skipped, ...examplesSkipped]) console.log(`  nocheck: ${where}`);
