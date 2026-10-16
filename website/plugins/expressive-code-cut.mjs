// Expressive Code plugin: hides the compile-only prelude of a TypeScript block, everything up to and including a
// `// ---cut---` line, which scripts/check-doc-snippets.mjs compiles with the rest of the block.
export default function pluginCut() {
	return {
		name: "pomwright-cut",
		hooks: {
			preprocessCode({ codeBlock }) {
				if (codeBlock.language !== "ts" && codeBlock.language !== "typescript") return;
				const cut = codeBlock.getLines().findIndex((line) => line.text.trim() === "// ---cut---");
				if (cut >= 0) codeBlock.deleteLines([...Array(cut + 1).keys()]);
			},
		},
	};
}
