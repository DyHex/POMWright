const express = require("express");
const path = require("node:path");

const app = express();
const port = 8080;

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

// Start the server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
