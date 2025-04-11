// server.js - Teacher Toolbox Backend using JSON File Storage
// CONFIGURATION: Assumes index.html, style.css, script.js are in ROOT directory

// --- Dependencies ---
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

// --- App Setup ---
const app = express();
console.log("Express app initialized.");

// --- Middleware ---

// 1. Serve static files from the ROOT directory
app.use(express.static(__dirname)); // Use root directory for static files
console.log("Serving static files from the root directory (__dirname).");

// 2. Allow express to parse JSON request bodies
app.use(express.json());
console.log("JSON body parsing middleware enabled.");

// --- Data Storage ---
const dataDir = path.join(__dirname, '.data');
const rosterFilePath = path.join(dataDir, 'rosters.json'); // Using a JSON file
console.log(`Using data directory: ${dataDir}`);
console.log(`Using roster data file path: ${rosterFilePath}`);

// Ensure the .data directory exists
try {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
        console.log(".data directory created.");
    } else {
        console.log(".data directory already exists.");
    }
} catch (err) {
    console.error("Error ensuring .data directory exists:", err);
    // Exit if we can't ensure data directory, as file operations will fail
    process.exit(1);
}

// Helper function to read rosters from the JSON file
function readRosters() {
    console.log(`Attempting to read rosters from JSON file: ${rosterFilePath}`);
    try {
        if (fs.existsSync(rosterFilePath)) {
            const data = fs.readFileSync(rosterFilePath, 'utf8');
            console.log("Roster JSON file read successfully.");
            return JSON.parse(data); // Parse the JSON data
        }
        console.log("Roster JSON file does not exist, returning empty array.");
        return []; // Return empty array if file doesn't exist
    } catch (err) {
        console.error(`Error reading or parsing roster JSON file (${rosterFilePath}):`, err);
        // If file is corrupt or unreadable, return empty array to prevent crashes downstream
        return [];
    }
}

// Helper function to write rosters to the JSON file
// NOTE: This is not concurrency-safe. Last write wins.
function writeRosters(rosters) {
    console.log(`Attempting to write ${rosters.length} rosters to JSON file: ${rosterFilePath}`);
    try {
        // Use null, 2 for pretty printing JSON (easier to read the file)
        fs.writeFileSync(rosterFilePath, JSON.stringify(rosters, null, 2));
        console.log("Rosters written to JSON file successfully.");
    } catch (err) {
        console.error(`Error writing roster JSON file (${rosterFilePath}):`, err);
    }
}

// --- API Endpoints (using JSON file) ---
console.log("Setting up API routes for JSON file storage...");

// === GET /api/rosters - Retrieve all rosters ===
app.get('/api/rosters', (req, res) => {
    console.log("==> Received request for GET /api/rosters");
    try {
        const rosters = readRosters();
        // Sort rosters alphabetically by name before sending (optional)
        rosters.sort((a, b) => a.name.localeCompare(b.name));
        console.log(`Sending ${rosters.length} rosters in response for GET /api/rosters.`);
        res.json(rosters); // Send the array
    } catch (error) { // Catch unexpected errors during read
        console.error("Unexpected error handling GET /api/rosters:", error);
        res.status(500).json({ error: "Internal server error reading rosters." });
    }
});
console.log("Route defined: GET /api/rosters");

// === POST /api/rosters - Create a new roster ===
app.post('/api/rosters', (req, res) => {
    console.log("==> Received request for POST /api/rosters with body:", req.body);
    const newRosterData = req.body;

    if (!newRosterData || !newRosterData.name || typeof newRosterData.data === 'undefined') {
        console.error("Invalid roster data received for POST");
        return res.status(400).json({ error: 'Invalid roster data. Requires name and data.' });
    }

    try {
        const rosters = readRosters(); // Read current rosters

        // Check if name already exists
        if (rosters.some(r => r.name === newRosterData.name)) {
            console.warn(`POST failed: Roster name "${newRosterData.name}" already exists.`);
            return res.status(409).json({ error: `Roster name "${newRosterData.name}" already exists.` });
        }

        // Create the new roster object with a unique ID
        const newRoster = {
            id: uuidv4(), // Generate unique ID
            name: newRosterData.name,
            data: newRosterData.data
        };

        rosters.push(newRoster); // Add to the array
        writeRosters(rosters); // Write the entire updated array back to the file

        console.log("New roster added:", newRoster);
        res.status(201).json(newRoster); // Respond with the created object

    } catch (error) { // Catch unexpected errors
        console.error("Unexpected error handling POST /api/rosters:", error);
        res.status(500).json({ error: "Internal server error saving roster." });
    }
});
console.log("Route defined: POST /api/rosters");

// === PUT /api/rosters/:id - Update an existing roster by ID ===
app.put('/api/rosters/:id', (req, res) => {
    const rosterId = req.params.id;
    const updatedData = req.body;
    console.log(`==> Received request for PUT /api/rosters/${rosterId} with body:`, updatedData);

    if (!updatedData || !updatedData.name || typeof updatedData.data === 'undefined') {
        console.error("Invalid update data received for PUT");
        return res.status(400).json({ error: 'Invalid roster data for update. Requires name and data.' });
    }

    try {
        let rosters = readRosters(); // Read current rosters
        const index = rosters.findIndex(r => r.id === rosterId); // Find index by ID

        if (index === -1) {
            console.warn(`PUT failed: Roster with ID ${rosterId} not found.`);
            return res.status(404).json({ error: 'Roster not found' });
        }

        // Check if the new name conflicts with another *different* roster
        const originalName = rosters[index].name;
        if (updatedData.name !== originalName && rosters.some((r, i) => i !== index && r.name === updatedData.name)) {
            console.warn(`PUT failed: New name "${updatedData.name}" conflicts with existing roster.`);
            return res.status(409).json({ error: `Another roster named "${updatedData.name}" already exists.` });
        }

        // Update the roster object in the array (keeping the original ID)
        rosters[index].name = updatedData.name;
        rosters[index].data = updatedData.data;

        writeRosters(rosters); // Write the entire updated array back

        console.log("Roster updated:", rosters[index]);
        res.json(rosters[index]); // Send back the updated object

    } catch (error) { // Catch unexpected errors
        console.error(`Unexpected error handling PUT /api/rosters/${rosterId}:`, error);
        res.status(500).json({ error: "Internal server error updating roster." });
    }
});
console.log("Route defined: PUT /api/rosters/:id");

// === DELETE /api/rosters/:id - Delete a roster by ID ===
app.delete('/api/rosters/:id', (req, res) => {
    const rosterId = req.params.id;
    console.log(`==> Received request for DELETE /api/rosters/${rosterId}`);

    try {
        let rosters = readRosters(); // Read current rosters
        const initialLength = rosters.length;
        // Filter out the roster with the matching ID
        rosters = rosters.filter(r => r.id !== rosterId);

        // Check if any roster was actually removed
        if (rosters.length === initialLength) {
            console.warn(`DELETE failed: Roster with ID ${rosterId} not found.`);
            return res.status(404).json({ error: 'Roster not found' });
        }

        writeRosters(rosters); // Write the filtered array back

        console.log(`Roster with ID ${rosterId} deleted.`);
        res.status(204).send(); // Success, no content

    } catch (error) { // Catch unexpected errors
        console.error(`Unexpected error handling DELETE /api/rosters/${rosterId}:`, error);
        res.status(500).json({ error: "Internal server error deleting roster." });
    }
});
console.log("Route defined: DELETE /api/rosters/:id");


// --- Serve the main HTML page (from ROOT) ---
// MUST be placed AFTER your API routes.
app.get('/', (request, response) => {
  console.log("==> Received request for GET / (serving index.html from root)");
  response.sendFile(path.join(__dirname, 'index.html')); // Serve from root
});
console.log("Route defined: GET / (serves index.html)");


// --- Error Handling Middleware ---
// Optional: Catches errors not handled in routes
app.use((err, req, res, next) => {
    console.error("Unhandled error caught by middleware:", err.stack);
    res.status(500).send('Something broke!');
});
console.log("Error handling middleware defined.");

// --- Listener ---
const port = process.env.PORT || 3000;
const listener = app.listen(port, () => {
  console.log(`=============================================`);
  console.log(`🚀 Your app is listening on port ${listener.address().port}`);
  console.log(`   Storage Mode: JSON File (${rosterFilePath})`); // Indicate mode
  console.log(`   Static files served from: root`);
  console.log(`   Main HTML file served from: root/index.html`);
  console.log(`=============================================`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  listener.close(() => { console.log('HTTP server closed'); });
});