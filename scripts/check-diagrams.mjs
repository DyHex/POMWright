// Renders every Mermaid diagram of the built documentation site in Chromium, in the light and the dark scheme, and fails
// when one did not render: no SVG, Mermaid's error diagram, or an error the page logged. The build cannot catch this,
// since diagrams render in the browser; how a diagram looks stays a matter of eye. The pages are found in the built HTML,
// served by this script under the site's base path. Run after the site is built: pnpm docs:diagrams, and the site job of
// .github/workflows/checks.yaml. Chromium comes from the root's @playwright/test.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "website/dist");
const base = "/POMWright/";
const { chromium } = createRequire(path.join(root, "package.json"))("@playwright/test");

const walk = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});

const pages = walk(dist)
	.filter((file) => file.endsWith(".html") && readFileSync(file, "utf8").includes('<pre class="mermaid"'))
	.map((file) =>
		path
			.relative(dist, file)
			.replace(/index\.html$/, "")
			.split(path.sep)
			.join("/"),
	)
	.sort();
if (pages.length === 0) {
	console.error(
		"diagrams: no page with a Mermaid diagram in website/dist; was the site built, or did the markup change?",
	);
	process.exit(1);
}

const types = {
	".html": "text/html",
	".js": "text/javascript",
	".css": "text/css",
	".svg": "image/svg+xml",
	".json": "application/json",
	".xml": "application/xml",
	".png": "image/png",
	".woff2": "font/woff2",
};
const server = createServer((request, response) => {
	const { pathname } = new URL(request.url ?? "/", "http://localhost");
	// only the site's own files, under its base path
	let file = path.join(dist, decodeURIComponent(pathname.slice(base.length)));
	if (statSync(file, { throwIfNoEntry: false })?.isDirectory()) {
		file = path.join(file, "index.html");
	}
	const inSite = pathname.startsWith(base) && file.startsWith(dist);
	if (!inSite || !statSync(file, { throwIfNoEntry: false })?.isFile()) {
		response.writeHead(404).end();
		return;
	}
	response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
	response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const problems = [];
let diagrams = 0;
for (const colorScheme of ["light", "dark"]) {
	const context = await browser.newContext({ colorScheme });
	const page = await context.newPage();
	let logged = [];
	page.on("console", (message) => message.type() === "error" && logged.push(message.text()));
	page.on("pageerror", (error) => logged.push(String(error)));
	for (const pagePath of pages) {
		logged = [];
		await page.goto(`${origin}${base}${pagePath}`);
		const rendered = await page
			.waitForFunction(
				() =>
					[...document.querySelectorAll("pre.mermaid")].every(
						(block) => block.querySelector("svg") !== null || /Syntax error|Parse error/.test(block.textContent ?? ""),
					),
				undefined,
				{ timeout: 15_000 },
			)
			.then(
				() => true,
				() => false,
			);
		const blocks = await page.locator("pre.mermaid").evaluateAll((elements) =>
			elements.map((block) => ({
				svg: block.querySelector("svg") !== null,
				error:
					block.querySelector('[aria-roledescription="error"]') !== null ||
					/Syntax error|Parse error/.test(block.textContent ?? ""),
			})),
		);
		const failed = blocks.flatMap((block, index) =>
			!block.svg || block.error ? [`diagram ${index + 1} ${block.error ? "shows Mermaid's error" : "has no SVG"}`] : [],
		);
		if (!rendered) failed.push("not every diagram rendered within 15 s");
		failed.push(...logged.map((text) => `the page logged: ${text}`));
		diagrams += colorScheme === "light" ? blocks.length : 0;
		console.log(
			`${colorScheme} ${pagePath}: ${blocks.length} diagram(s)${failed.length ? `: ${failed.join("; ")}` : ", rendered"}`,
		);
		problems.push(...failed.map((text) => `${colorScheme} ${pagePath}: ${text}`));
	}
	await context.close();
}
await browser.close();
server.close();

console.log(`diagrams: ${diagrams} on ${pages.length} pages, light and dark, ${problems.length} problems`);
process.exit(problems.length > 0 ? 1 : 0);
