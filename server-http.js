// server-http.js
// Basic HTTP server using Node.js built-in 'http' module
// Lab 1 - Backend Development Fundamentals

const http = require('http');

// Define the port number
const PORT = 3000;

// Create the HTTP server
const server = http.createServer((req, res) => {
  // Set the response HTTP status code and content type header
  res.writeHead(200, { 'Content-Type': 'text/plain' });

  // Send the response body
  res.end('Hello');
});

// Start the server and listen on the defined port
server.listen(PORT, () => {
  console.log(`Basic HTTP server is running at http://localhost:${PORT}`);
});
