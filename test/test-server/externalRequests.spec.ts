import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import app from "../server";

// No page of the test server loads anything from another host: a slow host once stalled a page's load event past the
// navigation timeout and made the harness flaky, and a page that needs the internet tests the network, not POMWright.
// One test per page: every GET route of server.js, read from Express's router when the tests are collected, and the
// static page at "/". Each page opens in a browser context of its own, and every request that context reports is
// checked. The browser's own background traffic is not reported to a context (and Playwright starts Chromium with it
// switched off). A scan of the server's source and its test data covers what opening the pages cannot reach: the POST
// routes, and anything a page would load only on a click or a timer.

const TEST_SERVER = "http://localhost:9000";
const OWN_ORIGINS = new Set([TEST_SERVER, "http://127.0.0.1:9000"]);
const OWN_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_SCHEMES = new Set(["data:", "about:", "blob:"]);
// XML namespaces are names, not requests: an SVG file declares its namespace with one.
const NAMESPACES = new Set([
	"http://www.w3.org/2000/svg",
	"http://www.w3.org/1999/xlink",
	"http://www.w3.org/1999/xhtml",
]);
// A route with a parameter is opened with a sample; one without a sample fails its test until it gets one here.
const SAMPLES: Record<string, string> = {
	"/testpath/:color": "/testpath/red",
	"/testnav/item/:id": "/testnav/item/42",
};

// Express 5 keeps its routes in app.router.stack, each with the methods it answers, which Express's types leave out.
type Layer = { route?: { path: string; methods: Record<string, boolean> } };
const layers = (app as unknown as { router: { stack: Layer[] } }).router.stack;
const pagePaths = ["/", ...layers.flatMap((layer) => (layer.route?.methods.get ? [layer.route.path] : []))];

function isOwn(url: string): boolean {
	const { protocol, origin } = new URL(url);
	return LOCAL_SCHEMES.has(protocol) || OWN_ORIGINS.has(origin);
}

function filesUnder(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? filesUnder(full) : [full];
	});
}

test.describe.configure({ mode: "parallel" });

for (const routePath of pagePaths) {
	test(`${routePath} loads only from the test server`, async ({ context, page }) => {
		const target = routePath.includes(":") ? SAMPLES[routePath] : routePath;
		expect(target, `a sample for ${routePath} in SAMPLES`).toBeDefined();
		const urls: string[] = [];
		context.on("request", (request) => urls.push(request.url()));
		// a download, a 204, or a document that leaves at once can end the navigation without a page to load; the
		// requests made until then are what is checked
		await page.goto(`${TEST_SERVER}${target}`).catch(() => undefined);
		await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
		expect.soft(urls, `${target} was requested`).toContain(`${TEST_SERVER}${target}`);
		expect(urls.filter((url) => !isOwn(url))).toEqual([]);
	});
}

test("the server's source and test data name no other host", () => {
	const root = path.join(__dirname, "..");
	const files = [path.join(root, "server.js"), ...filesUnder(path.join(root, "test-data"))];
	const found: string[] = [];
	for (const file of files) {
		for (const [url] of readFileSync(file, "utf8").matchAll(/https?:\/\/[^\s"'`<>),\\]+/g)) {
			const host = /^https?:\/\/([^/:?#]+)/.exec(url)?.[1] ?? "";
			if (NAMESPACES.has(url) || OWN_HOSTS.has(host)) continue;
			found.push(`${path.relative(root, file)}: ${url}`);
		}
	}
	expect(found).toEqual([]);
});
