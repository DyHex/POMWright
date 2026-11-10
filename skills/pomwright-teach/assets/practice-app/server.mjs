// The practice app of the pomwright-teach skill: a small shop, served from pages/ with Node alone.
//
//   node server.mjs [--port 4173]
//
// Pages: / (newsletter form), /products (cards), /cart (a table from session storage), /payment (an iframe of
// /payment/card),
// /login (a form that goes to /account/42), /account/<id>. Every page has a header, a cookie dialog on the first visit
// of a tab, and the cart in session storage under "cart" ({"items":[{"name","quantity"}]}).

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const pages = fileURLToPath(new URL("./pages/", import.meta.url));
const at = process.argv.indexOf("--port");
const port = Number(at === -1 ? 4173 : process.argv[at + 1]);
const routes = {
	"/": "home.html",
	"/products": "products.html",
	"/cart": "cart.html",
	"/payment": "payment.html",
	"/payment/card": "card.html",
	"/login": "login.html",
	"/app.css": "app.css",
	"/app.js": "app.js",
};
const types = { html: "text/html; charset=utf-8", css: "text/css", js: "text/javascript" };

createServer(async (request, response) => {
	const { pathname } = new URL(request.url ?? "/", "http://localhost");
	const file = routes[pathname] ?? (/^\/account\/\d+$/.test(pathname) ? "account.html" : undefined);
	if (file === undefined) {
		response.writeHead(404, { "content-type": types.html });
		response.end("<!doctype html><title>Not found</title><h1>Not found</h1>");
		return;
	}
	response.writeHead(200, { "content-type": types[file.split(".").pop()] });
	response.end(await readFile(`${pages}${file}`));
}).listen(port, () => console.log(`practice shop on http://localhost:${port}`));
