const express = require("express");
const path = require("node:path");

const app = express();
const port = 9000;

// Serve static files from the "test-data/staticPage" directory
app.use(express.static(path.join(__dirname, "test-data/staticPage")));

// Route to handle "/testpath/:color"
app.get("/testpath/:color", (req, res) => {
	const color = req.params.color;

	// Ensure the color is a valid 3 or 6-character hex code
	if (!/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)) {
		res.status(400).send("Invalid color code.");
		return;
	}

	// Return a simple HTML page with the background set to the color
	res.send(`
    <html>
      <body style="background-color: #${color}; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; flex-direction: column;">
        <h1 style="border: 3px solid black; padding: 10px; background-color: #E0E0E0; color: black;">Your Random Color is:</h1>
        <table role="table" aria-label="Hex Code Information" style="text-align: center; font-size: 24px; background-color: #E0E0E0; color: black; border-collapse: collapse;">
          <tr role="row">
            <td role="rowheader" aria-label="Hex Code Header" style="border: 3px solid black; padding: 10px; background-color: silver;">Hex Code:</td>
          </tr>
          <tr role="row">
            <td role="cell" aria-label="color code" style="border: 3px solid black; padding: 10px;">#${color}</td>
          </tr>
        </table>
      </body>
    </html>
  `);
});

// Route to handle "/testpath" with a link that generates a new random color on click
app.get("/testpath", (req, res) => {
	res.send(`
    <html>
      <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
        <a id="randomColorLink" href="#" style="font-size: 24px;" aria-label="Random Color Link">Go to Random Color Page</a>

        <script>
          // Function to generate a random hex color of either 3 or 6 digits
          function generateRandomColor() {
            // Randomly choose between generating a 3-character or 6-character hex color
            const isShort = Math.random() < 0.5;
            let randomColor = Math.floor(Math.random() * (isShort ? 4095 : 16777215)).toString(16);
            // Pad the color if necessary to make it 3 or 6 characters long
            return isShort ? randomColor.padStart(3, '0') : randomColor.padStart(6, '0');
          }

          // Add a click event listener to the link
          document.getElementById('randomColorLink').addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default action of the link
            const randomColor = generateRandomColor(); // Generate a new random color
            window.location.href = '/testpath/' + randomColor; // Navigate to the random color URL
          });
        </script>
      </body>
    </html>
  `);
});

// Route to handle "/testfilters"
app.get("/testfilters", (req, res) => {
	res.send(`
    <html>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <section id="section1" style="margin-bottom: 20px; border: 1px solid black; padding: 10px;">
          <h2 style="color: silver; text-shadow: 1px 1px 1px black;">Primary Colors Section</h2>
          <button style="background-color: red; color: white; padding: 10px;" onclick="changeColor('section1', 'red')">Red</button>
          <button style="background-color: blue; color: white; padding: 10px;" onclick="changeColor('section1', 'blue')">Blue</button>
          <button style="background-color: green; color: white; padding: 10px;" onclick="changeColor('section1', 'green')">Green</button>
          <button style="background-color: lightgray; color: black; padding: 10px;" onclick="resetColor('section1')">Reset Color</button>
        </section>

        <section id="section2" style="margin-bottom: 20px; border: 1px solid black; padding: 10px;">
          <h2 style="color: silver; text-shadow: 1px 1px 1px black;">Primary Colors Explorer</h2>
          <button style="background-color: red; color: white; padding: 10px;" onclick="changeColor('section2', 'red')">Red</button>
          <button style="background-color: blue; color: white; padding: 10px;" onclick="changeColor('section2', 'blue')">Blue</button>
          <button style="background-color: green; color: white; padding: 10px;" onclick="changeColor('section2', 'green')">Green</button>
          <button style="background-color: lightgray; color: black; padding: 10px;" onclick="resetColor('section2')">Reset Color</button>
        </section>

        <section id="section3" aria-label="Accessible Section" style="margin-bottom: 20px; border: 1px solid black; padding: 10px;">
          <h2 style="color: silver; text-shadow: 1px 1px 1px black;">Primary Colors Test</h2>
          <button style="background-color: red; color: white; padding: 10px;" onclick="changeColor('section3', 'red')">Red</button>
          <button style="background-color: blue; color: white; padding: 10px;" onclick="changeColor('section3', 'blue')">Blue</button>
          <button style="background-color: green; color: white; padding: 10px;" onclick="changeColor('section3', 'green')">Green</button>
          <button style="background-color: lightgray; color: black; padding: 10px;" onclick="resetColor('section3')">Reset Color</button>
        </section>

        <section id="section4" style="margin-bottom: 20px; border: 1px solid black; padding: 10px;">
          <h2 style="color: silver; text-shadow: 1px 1px 1px black;">Primary Colors Playground</h2>
          <button style="background-color: red; color: white; padding: 10px;" onclick="changeColor('section4', 'red')">Red</button>
          <button style="background-color: blue; color: white; padding: 10px;" onclick="changeColor('section4', 'blue')">Blue</button>
          <button style="background-color: green; color: white; padding: 10px;" onclick="changeColor('section4', 'green')">Green</button>
          <button style="background-color: lightgray; color: black; padding: 10px;" onclick="resetColor('section4')">Reset Color</button>
        </section>

        <script>
          function changeColor(sectionId, color) {
            document.getElementById(sectionId).style.backgroundColor = color;
          }

          function resetColor(sectionId) {
            document.getElementById(sectionId).style.backgroundColor = "";
          }
        </script>
      </body>
    </html>
  `);
});

app.get("/iframe", (_req, res) => {
	res.send(`
    <html>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <h1>Iframe playground</h1>

        <section id="sectionA" style="margin-bottom: 20px; border: 2px solid #333; padding: 10px;">
          <h2>Section A</h2>
          <iframe
            id="iframeA"
            title="iframeA"
            src="/iframe/a"
            style="width: 400px; height: 200px; border: 3px solid #0066cc;"
          ></iframe>
        </section>

        <section id="sectionB" style="margin-bottom: 20px; border: 2px solid #333; padding: 10px;">
          <h2>Section B</h2>
          <iframe
            id="iframeB"
            title="iframeB"
            src="/iframe/b"
            style="width: 400px; height: 240px; border: 3px solid #cc6600;"
          ></iframe>
        </section>
      </body>
    </html>
  `);
});

app.get("/iframe/a", (_req, res) => {
	res.send(`
    <html>
      <body style="margin: 0; padding: 10px; font-family: Arial, sans-serif;">
        <h3>Frame A</h3>
        <button id="toggleA" data-testid="toggle-a" aria-pressed="false">Toggle A: Off</button>
        <script>
          const buttonA = document.getElementById('toggleA');
          buttonA.addEventListener('click', () => {
            const pressed = buttonA.getAttribute('aria-pressed') === 'true';
            buttonA.setAttribute('aria-pressed', (!pressed).toString());
            buttonA.textContent = pressed ? 'Toggle A: Off' : 'Toggle A: On';
          });
        </script>
      </body>
    </html>
  `);
});

app.get("/iframe/b", (_req, res) => {
	res.send(`
    <html>
      <body style="margin: 0; padding: 10px; font-family: Arial, sans-serif;">
        <h3>Frame B</h3>
        <button id="toggleB" data-testid="toggle-b" aria-pressed="false">Toggle B: Off</button>

        <iframe
          id="iframeC"
          title="iframeC"
          src="/iframe/c"
          style="display: block; margin-top: 12px; width: 320px; height: 160px; border: 3px solid #009933;"
        ></iframe>

        <script>
          const buttonB = document.getElementById('toggleB');
          buttonB.addEventListener('click', () => {
            const pressed = buttonB.getAttribute('aria-pressed') === 'true';
            buttonB.setAttribute('aria-pressed', (!pressed).toString());
            buttonB.textContent = pressed ? 'Toggle B: Off' : 'Toggle B: On';
          });
        </script>
      </body>
    </html>
  `);
});

app.get("/iframe/c", (_req, res) => {
	res.send(`
    <html>
      <body style="margin: 0; padding: 10px; font-family: Arial, sans-serif;">
        <h3>Frame C</h3>
        <button id="toggleC" data-testid="toggle-c" aria-pressed="false">Toggle C: Off</button>
        <script>
          const buttonC = document.getElementById('toggleC');
          buttonC.addEventListener('click', () => {
            const pressed = buttonC.getAttribute('aria-pressed') === 'true';
            buttonC.setAttribute('aria-pressed', (!pressed).toString());
            buttonC.textContent = pressed ? 'Toggle C: Off' : 'Toggle C: On';
          });
        </script>
      </body>
    </html>
  `);
});

// Route to handle "/testids": ids that are valid HTML but awkward as CSS selectors
app.get("/testids", (_req, res) => {
	res.send(`<!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Test ids</title></head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <h1>Test ids</h1>
        <section id="settings.panel">settings panel</section>
        <div id="settings" class="panel">decoy</div>
        <div id="Settings.Panel">case decoy</div>
        <input id="form:user" value="colon">
        <ul><li id="items[0]">first</li><li id="items[1]">second</li></ul>
        <p id="1st">digit</p>
        <p id="has space">space</p>
        <p id="line&#10;feed">lf</p>
        <p id="carriage&#13;return">cr</p>
        <p id="form&#12;feed">ff</p>
        <p id="literal-hash">no hash</p>
        <p id="#literal-hash">hash</p>
        <p id="id=weird">id-eq prefix</p>
        <p id="say&quot;hi">quote</p>
        <p id="back\\slash">backslash</p>
        <p id="a>>b">chain chars</p>
        <p id="résumé">unicode</p>
        <div id="generated">
          <button id="button.submit.af3b">one</button>
          <button id="button.submit.bd2a">two</button>
          <button id="button.submit.toolong">three</button>
          <span id="a4f38e-btn-submit-form-34ab">four</span>
        </div>
        <button id="button.submit.zz99">outside</button>
        <div id="shadow-host"></div>
        <iframe id="frame.ids" title="frame.ids" srcdoc="<button id='inner.button'>inner</button>"></iframe>
        <script>
          document.getElementById("shadow-host").attachShadow({ mode: "open" }).innerHTML =
            '<p id="in.open">shadow</p>';
        </script>
      </body>
    </html>
  `);
});

// Navigation fixture for the PageObject navigation helper (plan 1.3-1.4). Links and buttons
// navigate to the same path with a query, a hash, or a trailing slash, to an item page whose
// path has a dynamic segment, to another page, and (after a delay) to a page that bounces back.
app.get("/testnav", (_req, res) => {
	res.send(`
    <html>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <h1>Navigation playground</h1>
        <nav style="display: flex; flex-direction: column; gap: 8px;">
          <a id="self-query" href="/testnav?tab=1">Same page with a query</a>
          <a id="self-hash" href="/testnav#section">Same page with a hash</a>
          <a id="trailing" href="/testnav/">Same page with a trailing slash</a>
          <a id="item" href="/testnav/item/42">Item 42</a>
          <a id="other" href="/testids">Another page</a>
          <button id="delayed-item">Item 7 after 1.5 s</button>
          <button id="delayed-other">Another page after 1.5 s</button>
          <button id="bounce">Bounce after 1.5 s</button>
        </nav>
        <section id="section" style="margin-top: 600px;">Section</section>
        <script>
          const delayed = (id, href) =>
            document.getElementById(id).addEventListener('click', () => setTimeout(() => { location.href = href; }, 1500));
          delayed('delayed-item', '/testnav/item/7');
          delayed('delayed-other', '/testids');
          delayed('bounce', '/testnav/bounce');
        </script>
      </body>
    </html>
  `);
});

app.get("/testnav/item/:id", (req, res) => {
	if (!/^\d+$/.test(req.params.id)) {
		res.status(404).send("Not found");
		return;
	}
	res.send(`
    <html>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <h1 id="item-heading">Item ${req.params.id}</h1>
        <a id="back" href="/testnav">Back</a>
      </body>
    </html>
  `);
});

// Commits, then navigates straight back to /testnav before its own load event: a redirect that bounces.
app.get("/testnav/bounce", (_req, res) => {
	res.send(`
    <html>
      <body>
        <script>location.replace("/testnav");</script>
        <h1>Bouncing back</h1>
      </body>
    </html>
  `);
});

// Session storage fixture (plan 1.5). GET and POST render the same page, whose first script snapshots
// sessionStorage before anything else runs; the body shows that snapshot, the current entries, the
// request method and posted fields, and the Referer and Sec-Fetch headers the server received. Links,
// buttons and forms hop to the second origin (http://127.0.0.1:9000, the same server) by every kind of
// navigation the seed must survive. Query flags: coop=1 and coep=1 add the isolation headers, frames=1
// embeds /teststorage/frame from both origins, worker=1 and worker=passthrough register a service worker.
const SECOND_ORIGIN = "http://127.0.0.1:9000";
const escapeHtml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const STARTUP_SNAPSHOT =
	"<script>window.__startup = JSON.stringify(Object.fromEntries(Object.entries(sessionStorage)));</script>";

app.use(express.urlencoded({ extended: false }));

const renderStoragePage = (req, res) => {
	if (req.query.coop) res.set("Cross-Origin-Opener-Policy", "same-origin");
	if (req.query.coep) res.set("Cross-Origin-Embedder-Policy", "require-corp");
	res.set("X-Served-By", "server");
	res.set("Cache-Control", "no-store");
	const headers = {
		referer: req.get("referer") ?? null,
		"sec-fetch-site": req.get("sec-fetch-site") ?? null,
		"sec-fetch-user": req.get("sec-fetch-user") ?? null,
	};
	const worker =
		req.query.worker === "1"
			? "/teststorage/sw.js"
			: req.query.worker === "passthrough"
				? "/teststorage/sw-passthrough.js"
				: null;
	const frames = req.query.frames
		? `<iframe id="same-origin-frame" src="/teststorage/frame" title="same-origin frame"></iframe>
        <iframe id="second-origin-frame" src="${SECOND_ORIGIN}/teststorage/frame" title="second-origin frame"></iframe>`
		: "";
	res.send(`<!doctype html>
    <html>
      <head>
        ${STARTUP_SNAPSHOT}
        <meta charset="utf-8">
        <meta name="served-by" content="server">
        <title>Session storage playground</title>
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
        <h1>Session storage playground</h1>
        <pre id="served-by">server</pre>
        <pre id="startup"></pre>
        <pre id="current"></pre>
        <pre id="method">${escapeHtml(req.method)}</pre>
        <pre id="posted">${escapeHtml(JSON.stringify(req.body ?? {}))}</pre>
        <pre id="headers">${escapeHtml(JSON.stringify(headers))}</pre>
        <pre id="controlled"></pre>
        <nav style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start;">
          <a id="to-second-origin" href="${SECOND_ORIGIN}/teststorage?hop=link">Second origin by link</a>
          <a id="same-origin" href="/teststorage?second=1">Same origin, another page</a>
          <a id="redirect-302" href="/teststorage/redirect?status=302&amp;to=${encodeURIComponent(`${SECOND_ORIGIN}/teststorage?hop=302`)}">Second origin by 302</a>
          <a id="chain" href="/teststorage/chain">Second origin by a two-hop chain</a>
          <a id="popup" href="${SECOND_ORIGIN}/teststorage?hop=popup" target="_blank" rel="opener">Second origin in a new tab</a>
          <button id="script-to-second-origin">Second origin by script</button>
          <button id="meta-to-second-origin">Second origin by meta refresh</button>
          <form id="post-to-second-origin" method="post" action="${SECOND_ORIGIN}/teststorage">
            <input type="hidden" name="plain" value="simple">
            <input type="hidden" name="spaces" value="a b c">
            <input type="hidden" name="amp" value="x&amp;y">
            <input type="hidden" name="eq" value="k=v">
            <input type="hidden" name="plus" value="1+1">
            <input type="hidden" name="percent" value="100%">
            <input type="hidden" name="unicode" value="åæø 🚀">
            <input type="hidden" name="dup" value="1">
            <input type="hidden" name="dup" value="2">
            <input type="hidden" name="empty" value="">
            <button id="submit-to-second-origin" type="submit">Second origin by form POST</button>
          </form>
          <form id="post-303" method="post" action="/teststorage/login">
            <input type="hidden" name="u" value="x y">
            <button id="submit-303" type="submit">POST then 303 to the second origin</button>
          </form>
          <form id="post-307" method="post" action="/teststorage/login307">
            <input type="hidden" name="u" value="x y">
            <button id="submit-307" type="submit">POST then 307 to the second origin</button>
          </form>
        </nav>
        ${frames}
        <script>
          document.getElementById('startup').textContent = window.__startup;
          document.getElementById('current').textContent = JSON.stringify(Object.fromEntries(Object.entries(sessionStorage)));
          document.getElementById('controlled').textContent = navigator.serviceWorker && navigator.serviceWorker.controller ? 'yes' : 'no';
          document.getElementById('script-to-second-origin').addEventListener('click', () => { location.href = '${SECOND_ORIGIN}/teststorage?hop=script'; });
          document.getElementById('meta-to-second-origin').addEventListener('click', () => {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'refresh';
            meta.content = '0;url=${SECOND_ORIGIN}/teststorage?hop=meta';
            document.head.appendChild(meta);
          });
          ${worker ? `navigator.serviceWorker.register('${worker}', { scope: '/' });` : ""}
        </script>
      </body>
    </html>
  `);
};
app.get("/teststorage", renderStoragePage);
app.post("/teststorage", renderStoragePage);

// A small page for the iframes: snapshots its own sessionStorage and can start a top-level hop.
app.get("/teststorage/frame", (_req, res) => {
	res.set("Cache-Control", "no-store");
	res.send(`<!doctype html>
    <html>
      <head>${STARTUP_SNAPSHOT}<meta charset="utf-8"><title>Frame</title></head>
      <body>
        <pre id="frame-startup"></pre>
        <button id="hop-from-frame">Second origin from inside the frame</button>
        <script>
          document.getElementById('frame-startup').textContent = window.__startup;
          document.getElementById('hop-from-frame').addEventListener('click', () => { top.location.href = '${SECOND_ORIGIN}/teststorage?hop=frame'; });
        </script>
      </body>
    </html>
  `);
});

const isFixtureUrl = (value) => /^http:\/\/(localhost|127\.0\.0\.1):9000\//.test(value);

app.get("/teststorage/redirect", (req, res) => {
	const status = Number(req.query.status);
	const to = String(req.query.to ?? "");
	if (![301, 302, 303, 307, 308].includes(status) || !isFixtureUrl(to)) {
		res.status(400).send("Bad redirect");
		return;
	}
	res.redirect(status, to);
});

app.get("/teststorage/chain", (_req, res) => {
	res.redirect(302, `/teststorage/redirect?status=302&to=${encodeURIComponent(`${SECOND_ORIGIN}/teststorage?hop=chain`)}`);
});

app.post("/teststorage/login", (_req, res) => {
	res.redirect(303, `${SECOND_ORIGIN}/teststorage?hop=303`);
});

app.post("/teststorage/login307", (_req, res) => {
	res.redirect(307, `${SECOND_ORIGIN}/teststorage?hop=307`);
});

app.get("/teststorage/api", (_req, res) => {
	res.set("Access-Control-Allow-Origin", "*");
	res.json({ ok: true });
});

// A service worker that answers every navigation itself (an app-shell strategy), and one that lets
// everything through. Both are allowed the whole origin as scope.
const SW_PAGE =
	"<!doctype html><html><head>" +
	STARTUP_SNAPSHOT.replace(/<\/script>/g, "<\\/script>") +
	'<meta charset="utf-8"><meta name="served-by" content="service-worker"><title>Served by the worker</title></head>' +
	'<body><pre id="served-by">service-worker</pre><pre id="startup"></pre>' +
	"<script>document.getElementById('startup').textContent = window.__startup;<\\/script></body></html>";

app.get("/teststorage/sw.js", (_req, res) => {
	res.set("Content-Type", "text/javascript");
	res.set("Service-Worker-Allowed", "/");
	res.set("Cache-Control", "no-store");
	res.send(`
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
    self.addEventListener("fetch", (event) => {
      if (event.request.mode !== "navigate") return;
      event.respondWith(new Response(${JSON.stringify(SW_PAGE)}, { headers: { "content-type": "text/html" } }));
    });
  `);
});

app.get("/teststorage/sw-passthrough.js", (_req, res) => {
	res.set("Content-Type", "text/javascript");
	res.set("Service-Worker-Allowed", "/");
	res.set("Cache-Control", "no-store");
	res.send(`
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
    self.addEventListener("fetch", () => {});
  `);
});

// Start the server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
