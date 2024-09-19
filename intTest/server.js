const express = require("express");
const path = require("path");

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

// Start the server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
