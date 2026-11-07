// server.js
// Express server with routing
// Lab 1 - Backend Development Fundamentals

const express = require('express');

// Initialize the Express application
const app = express();

// Define the port number
const PORT = 3000;

// ─── ROUTES ─────────────────────────────────────────────────────────────────

// GET / — Welcome message
app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Express Server!');
});

// GET /about — Student details in JSON
app.get('/about', (req, res) => {
  res.status(200).json({
    name: 'V.Siva Durga Prasad',
    registrationNumber: '252U1R7097',
    section: 'CSE(FSD)-1B',
    course: 'Backend Development Fundamentals',
    lab: 'Lab 1'
  });
});

// GET /time — Current date and time
app.get('/time', (req, res) => {
  const currentTime = new Date();
  res.status(200).send(`Current Date and Time: ${currentTime}`);
});

// Handle all undefined routes — 404 Not Found
app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

// ─── START SERVER ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Express server is running at http://localhost:${PORT}`);
});
