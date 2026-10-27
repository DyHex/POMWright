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
// A TypeScript example the check could not compile fails it, with the fix: one in a ~~~ fence, one labelled tsx, mts
// or cts, and nocheck on any other page. Blocks in other languages (js, sh, text, …) are not checked.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const contentDir = path.join(root, "website/src/content/docs");
const outDir = path.join(root, "test/.doc-snippets");
const sharedDir = path.join(root, "website/snippets");
const shared = fs.existsSync(sharedDir) ? fs.readdirSync(sharedDir).filter((name) => name.endsWith(".ts")) : [];
const readme = path.join(root, "README.md");
const fence = /^(\s*)(`{3,}|~{3,})(\w*)(.*)$/;
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
		const [, indent, ticks, lang, meta] = open;
		const body = [];
		let j = i + 1;
		while (j < lines.length && !(lines[j].startsWith(indent + ticks) && lines[j].trim() === ticks)) {
			body.push(lines[j].startsWith(indent) ? lines[j].slice(indent.length) : lines[j]);
			j++;
		}
		if (["ts", "typescript", "tsx", "mts", "cts"].includes(lang)) {
			found.push({ line: i + 2, lang, tilde: ticks.startsWith("~"), meta, body: body.join("\n") });
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
		if (block.lang !== "ts" && block.lang !== "typescript") {
			rejected.push(`${where}: a block labelled ${block.lang} is not compiled; write the example as a \`\`\`ts block`);
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

let typeErrors = "";
try {
	execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", path.relative(root, outDir), "--pretty", "false"], {
		cwd: root,
		stdio: "pipe",
		encoding: "utf8",
	});
} catch (error) {
	typeErrors = String(error.stdout).replace(
		/^(test\/\.doc-snippets\/[^(]+)\((\d+),(\d+)\)/gm,
		(all, file, line, col) => {
			const from = origin.get(file);
			return from ? `${from.page}:${from.line + Number(line) - 1}:${col} (${file})` : all;
		},
	);
}
if (typeErrors) {
	console.error(typeErrors);
	console.error(
		`doc snippets: type errors in ${checked} checked blocks (tsc reports only syntax errors while any block does not parse)`,
	);
}
if (rejected.length > 0) {
	console.error(
		`doc snippets: ${rejected.length} TypeScript blocks the check cannot compile:\n  ${rejected.join("\n  ")}`,
	);
}
if (typeErrors || rejected.length > 0) {
	process.exit(1);
}
console.log(
	`doc snippets: ${checked} checked, ${skipped.length} skipped (nocheck), example app: ${shared.length} files`,
);
for (const where of skipped) console.log(`  nocheck: ${where}`);
