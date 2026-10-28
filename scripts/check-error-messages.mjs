// Checks that the Error messages page (website/src/content/docs/api/errors.md) and the code agree, in both directions:
//
// - Every message the runtime throws (`new Error(…)`, `new TypeError(…)`, `new RangeError(…)` in src/, not in tests or
//   fakePage.ts) matches a line of the page's `text` blocks. A message is read with the TypeScript compiler API: its
//   literal text is kept, a `${…}` part is a wildcard, a ternary inside a message offers its branches as alternatives
//   (the page shows one), a ternary of whole messages is two messages, and a constant or a helper that returns the
//   message is followed to its text. A message of several lines is checked line by line. PARTS adds the helpers whose
//   message is reported inside another one.
// - Every compile-error message the types define (MESSAGE_TYPES) appears on the page.
// - Every line of the page's `text` blocks matches a thrown message or a compile-error message. A line may start with
//   more than its message (a page object's label, a path in verify()'s list); it must end as the message does. An
//   indented line continues the message above it (verify()'s paths, the never-applied seeds) and is not checked.
//
// Two lists name the thrown messages the page does not list: INTERNAL, errors no user can reach, each with its reason; and
// PASS_THROUGH, messages that pass another error's message on behind a prefix, which match any line. An entry the code
// no longer has fails the check, as does a message with too little fixed text to check that neither list names.
//
//   node scripts/check-error-messages.mjs

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(root, "src");
const errorsPage = path.join(root, "website/src/content/docs/api/errors.md");

/** Compile-error messages, by the type alias in src/ that holds them: every string literal type in it is one. */
const MESSAGE_TYPES = [
	"StepRequiresPromise",
	"NeedsPaths",
	"SchemaNeedsStorageType",
	"InvalidReusePath",
	"LocatorSchemaPathFormat",
	"BrokenRules",
];

/**
 * Errors no user can reach, because a check at the boundary rejects the same input first with a message the page
 * lists, or because they guard an invariant of the code. `message` is the message as this script renders it: `…` for
 * a varying part, `{a|b}` for alternatives.
 */
const INTERNAL = [
	{
		file: "src/helpers/sessionStorageSeed.ts",
		message: "neverAppliedError needs at least one pending seed",
		reason: "called only with the pending seeds of a closing page, which has at least one",
	},
	{
		file: "src/helpers/url.ts",
		message: "Cannot resolve … against baseUrl ….",
		reason: "goto() rethrows it with the page object's label; the constructor checks that urlPath resolves first",
	},
	{
		file: "src/locators/locatorRegistrationBuilder.ts",
		message: 'No locator schema definition provided for path "…".',
		reason: "a registration is stored only after its locator method or its reuse has set the definition",
	},
	{
		file: "src/locators/locatorUpdateBuilder.ts",
		message: 'Locator … for "…" requires a "type" property.',
		reason: "the update and replace builders always pass a definition with its strategy",
	},
	{
		file: "src/locators/locatorUpdateBuilder.ts",
		message: 'Locator replace for "…" of type "…" requires {an|a} "…" value.',
		reason: "the replace builder's method rejects a missing first argument first",
	},
	{
		file: "src/locators/utils.ts",
		message: 'Locator definition of type "frameLocator" has no selector; the any-frame form is resolved by the chain.',
		reason: "resolution handles the any-frame form before it creates a locator, and rejects it on its own",
	},
	{
		file: "src/locators/utils.ts",
		message: 'Locator definition of type "id" has no id value.',
		reason: "every builder, and reuse of a hand-made seed, rejects a missing id first",
	},
	{
		file: "src/locators/utils.ts",
		message: 'Unknown locator strategy "…".',
		reason: "a definition of another type is not a seed; reuse rejects it first",
	},
	{
		file: "src/locators/utils.ts",
		message: 'applyDefinitionPatch: a "…" seed cannot take a "…" patch.',
		reason: "the seeded registration rejects another strategy first",
	},
];

/** Helpers whose message is reported inside another one: verify() lists it for its path. */
const PARTS = [{ file: "src/locators/locatorRegistry.ts", name: "strictChainsMessage" }];

/** Messages that pass another error's message on behind a prefix; that message is checked where it is thrown. */
const PASS_THROUGH = [
	{
		file: "src/pageObject.ts",
		message: "…: …",
		reason: "a registry error from verify() behind the page object's label; the registry's message is listed",
	},
	{
		file: "src/helpers/sessionStorage.ts",
		message: "…: …",
		reason: "any other error from Playwright behind the helper's title, which the page describes in prose",
	},
	{
		file: "src/helpers/sessionStorageSeed.ts",
		message: "…: …",
		reason: "an error from Playwright while seed() registers, behind the helper's title",
	},
];

/** A message with fewer fixed characters than this (spaces aside) matches too much to be checked. */
const MIN_FIXED = 5;

const problems = [];
const relative = (file) => path.relative(root, file);

// --- the messages in the code ---

const files = fs
	.readdirSync(srcDir, { recursive: true })
	.map((name) => path.join(srcDir, name))
	.filter((file) => file.endsWith(".ts") && !/\.test(-d)?\.ts$/.test(file) && !file.endsWith("fakePage.ts"));
const program = ts.createProgram(files, {
	noEmit: true,
	skipLibCheck: true,
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.ESNext,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();

const WILD = { wild: true };

/** The declaration a name refers to, through an import. */
function declarationOf(node) {
	let symbol = checker.getSymbolAtLocation(node);
	if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
	const declaration = symbol?.declarations?.[0];
	return declaration && files.includes(declaration.getSourceFile().fileName) ? declaration : undefined;
}

/** The initializer of a `const` that holds a value, not a function. */
function constantOf(node) {
	const declaration = declarationOf(node);
	if (!declaration || !ts.isVariableDeclaration(declaration) || !declaration.initializer) return undefined;
	const isConst = ts.getCombinedNodeFlags(declaration) & ts.NodeFlags.Const;
	return isConst && !ts.isFunctionLike(declaration.initializer) ? declaration.initializer : undefined;
}

/** The expressions a function of src/ returns, for a call of it. */
function returnsOf(call) {
	let fn = declarationOf(call.expression);
	if (fn && ts.isVariableDeclaration(fn)) fn = fn.initializer;
	if (!fn || !ts.isFunctionLike(fn) || !fn.body) return undefined;
	if (!ts.isBlock(fn.body)) return [fn.body];
	const found = [];
	const visit = (node) => {
		if (ts.isReturnStatement(node) && node.expression) found.push(node.expression);
		else if (!ts.isFunctionLike(node)) ts.forEachChild(node, visit);
	};
	ts.forEachChild(fn.body, visit);
	return found;
}

const unwrap = (node) =>
	ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)
		? unwrap(node.expression)
		: node;

/**
 * The messages an expression can be: a ternary of whole messages is two messages, and a constant or a call of a helper
 * of src/ is followed to the message it holds or returns.
 */
function messagesOf(expression, depth = 0) {
	const node = unwrap(expression);
	if (depth < 6 && ts.isConditionalExpression(node)) {
		return [...messagesOf(node.whenTrue, depth + 1), ...messagesOf(node.whenFalse, depth + 1)];
	}
	if (depth < 6 && ts.isIdentifier(node)) {
		const value = constantOf(node);
		if (value) return messagesOf(value, depth + 1);
	}
	if (depth < 6 && ts.isCallExpression(node)) {
		const returned = returnsOf(node);
		if (returned) return returned.flatMap((expression) => messagesOf(expression, depth + 1));
	}
	return [partsOf(node)];
}

/**
 * The parts of one message: a string, WILD for a varying part, or `{ alt }` for a ternary inside the message, whose
 * branches (a singular and a plural, a part present or not) are alternatives: the page shows one of them.
 */
function partsOf(expression, depth = 0) {
	const node = unwrap(expression);
	if (depth > 6) return [WILD];
	if (ts.isStringLiteralLike(node)) return [node.text];
	if (ts.isTemplateExpression(node)) {
		const parts = [node.head.text];
		for (const span of node.templateSpans) parts.push(...partsOf(span.expression, depth + 1), span.literal.text);
		return parts;
	}
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		return [...partsOf(node.left, depth + 1), ...partsOf(node.right, depth + 1)];
	}
	if (ts.isConditionalExpression(node)) {
		return [{ alt: [partsOf(node.whenTrue, depth + 1), partsOf(node.whenFalse, depth + 1)] }];
	}
	if (ts.isIdentifier(node)) {
		const value = constantOf(node);
		if (value) return partsOf(value, depth + 1);
	}
	return [WILD];
}

const hasNewline = (part) =>
	typeof part === "string"
		? part.includes("\n")
		: part.alt
			? part.alt.some((branch) => branch.some(hasNewline))
			: false;

/** Merges neighboring strings and wildcards, and splits the message into its lines. */
function linesOf(parts) {
	const lines = [[]];
	for (const part of parts) {
		const line = lines.at(-1);
		if (part === WILD || part.alt?.some((branch) => branch.some(hasNewline))) {
			if (line.at(-1) !== WILD) line.push(WILD);
		} else if (part.alt) {
			const branches = part.alt.map((branch) => linesOf(branch)[0]);
			// a choice between two varying parts varies
			if (branches.every((branch) => branch.length === 1 && branch[0] === WILD)) {
				if (line.at(-1) !== WILD) line.push(WILD);
			} else line.push({ alt: branches });
		} else {
			part.split("\n").forEach((text, index) => {
				if (index > 0) lines.push([]);
				const current = lines.at(-1);
				if (text === "") return;
				if (typeof current.at(-1) === "string") current[current.length - 1] += text;
				else current.push(text);
			});
		}
	}
	return lines;
}

const render = (line) =>
	line.map((part) => (part === WILD ? "…" : part.alt ? `{${part.alt.map(render).join("|")}}` : part)).join("");
const fixed = (line) =>
	line
		.filter((part) => typeof part === "string")
		.join("")
		.replace(/\s/g, "").length;
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const source = (line) =>
	line
		.map((part) => (part === WILD ? ".*" : part.alt ? `(?:${part.alt.map(source).join("|")})` : escapeRegExp(part)))
		.join("");

const messages = []; // { where, lines: [line], regexes: [RegExp] }
const listed = new Set();
for (const file of files) {
	const sourceFile = program.getSourceFile(file);
	const visit = (node) => {
		if (
			ts.isNewExpression(node) &&
			ts.isIdentifier(node.expression) &&
			/^(Type|Range)?Error$/.test(node.expression.text) &&
			node.arguments?.[0]
		) {
			const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
			const where = `${relative(file)}:${line + 1}`;
			for (const parts of messagesOf(node.arguments[0])) {
				const lines = linesOf(parts);
				const shown = lines.map(render).join("\\n");
				const entry = [...INTERNAL, ...PASS_THROUGH].find(
					(item) => item.file === relative(file) && item.message === shown,
				);
				if (entry) {
					listed.add(entry);
					continue;
				}
				const checked = lines.filter((text) => fixed(text) >= MIN_FIXED);
				if (checked.length === 0) {
					problems.push(`${where}: "${shown}" has too little fixed text to check; name it in INTERNAL or PASS_THROUGH`);
					continue;
				}
				messages.push({ where, shown, regexes: checked.map((text) => new RegExp(`${source(text)}$`)) });
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
}
for (const part of PARTS) {
	const sourceFile = program.getSourceFile(path.join(root, part.file));
	let found;
	const visit = (node) => {
		if (found) return;
		if (
			(ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) &&
			node.name &&
			ts.isIdentifier(node.name) &&
			node.name.text === part.name
		) {
			found = node;
		} else ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	const fn = found && ts.isVariableDeclaration(found) ? found.initializer : found;
	if (!fn || !ts.isFunctionLike(fn) || !fn.body) {
		problems.push(`PARTS: no function ${part.name} in ${part.file}`);
		continue;
	}
	const returned = ts.isBlock(fn.body) ? [] : [fn.body];
	const visitReturns = (node) => {
		if (ts.isReturnStatement(node) && node.expression) returned.push(node.expression);
		else if (!ts.isFunctionLike(node)) ts.forEachChild(node, visitReturns);
	};
	if (ts.isBlock(fn.body)) ts.forEachChild(fn.body, visitReturns);
	const { line } = sourceFile.getLineAndCharacterOfPosition(fn.getStart());
	for (const expression of returned) {
		for (const parts of messagesOf(expression)) {
			const lines = linesOf(parts);
			messages.push({
				where: `${part.file}:${line + 1}`,
				shown: lines.map(render).join("\\n"),
				regexes: lines.filter((text) => fixed(text) >= MIN_FIXED).map((text) => new RegExp(`${source(text)}$`)),
			});
		}
	}
}
for (const entry of [...INTERNAL, ...PASS_THROUGH]) {
	if (!listed.has(entry)) problems.push(`${entry.file}: no message "${entry.message}" any more; remove its entry`);
}

// --- the compile-error messages ---

const messageTypes = [];
for (const name of MESSAGE_TYPES) {
	let alias;
	for (const file of files) {
		const visit = (node) => {
			if (ts.isTypeAliasDeclaration(node) && node.name.text === name) alias = node;
			else ts.forEachChild(node, visit);
		};
		visit(program.getSourceFile(file));
	}
	if (!alias) {
		problems.push(`MESSAGE_TYPES: no type alias ${name} in src/`);
		continue;
	}
	const literals = [];
	const visit = (node) => {
		if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
			if (node.literal.text !== "") literals.push([node.literal.text]);
		} else if (ts.isTemplateLiteralTypeNode(node)) {
			const parts = [node.head.text];
			for (const span of node.templateSpans) parts.push(WILD, span.literal.text);
			literals.push(parts);
		} else if (ts.isConditionalTypeNode(node)) {
			// what a conditional tests against is a pattern, not a message
			visit(node.trueType);
			visit(node.falseType);
		} else ts.forEachChild(node, visit);
	};
	visit(alias.type);
	if (literals.length === 0 && ts.isTypeQueryNode(alias.type)) {
		const value = constantOf(alias.type.exprName);
		if (value && ts.isStringLiteralLike(value)) literals.push([value.text]);
	}
	if (literals.length === 0) {
		problems.push(`MESSAGE_TYPES: ${name} holds no string literal`);
		continue;
	}
	for (const literal of literals) {
		const [line] = linesOf(literal);
		messageTypes.push({ name, shown: render(line), regex: new RegExp(source(line)) });
	}
}

// --- the page ---

const pageLines = [];
{
	const lines = fs.readFileSync(errorsPage, "utf8").split("\n");
	let inText = false;
	lines.forEach((text, index) => {
		if (/^```/.test(text)) {
			inText = !inText && text.trim() === "```text";
			return;
		}
		if (inText && text.trim() !== "" && !/^\s/.test(text)) pageLines.push({ line: index + 1, text: text.trimEnd() });
	});
}
const pageName = relative(errorsPage);

for (const message of messages) {
	message.regexes.forEach((regex, index) => {
		if (!pageLines.some(({ text }) => regex.test(text))) {
			const shown = message.shown.split("\\n");
			problems.push(`${message.where}: "${shown.length > 1 ? shown[index] : message.shown}" is not on ${pageName}`);
		}
	});
}
for (const type of messageTypes) {
	if (!pageLines.some(({ text }) => type.regex.test(text))) {
		problems.push(`${type.name}: the compile error "${type.shown}" is not on ${pageName}`);
	}
}
for (const { line, text } of pageLines) {
	const matched =
		messages.some((message) => message.regexes.some((regex) => regex.test(text))) ||
		messageTypes.some((type) => type.regex.test(text));
	if (!matched) problems.push(`${pageName}:${line}: no message in the code ends as this line does: ${text}`);
}

if (problems.length > 0) {
	console.error(`error messages: ${problems.length} problems\n  ${problems.join("\n  ")}`);
	process.exit(1);
}
console.log(
	`error messages: ${messages.length} thrown and ${messageTypes.length} compile-error messages, ${pageLines.length} lines on the page, ${INTERNAL.length} internal, ${PASS_THROUGH.length} passed through`,
);
