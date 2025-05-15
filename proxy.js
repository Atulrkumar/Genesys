/**
 * Genesys Cloud CORS Proxy Server
 * 
 * This Express server acts as a middleware between the frontend application and the Genesys Cloud API.
 * It solves Cross-Origin Resource Sharing (CORS) issues by proxying requests through a local server.
 * 
 * The proxy forwards requests to two main Genesys Cloud endpoints:
 * 1. API endpoint (api.mypurecloud.in) - For all API data requests
 * 2. Login endpoint (login.mypurecloud.in) - For authentication
 */

// Import required dependencies
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const port = 3000;

// Enable CORS for all routes
// This allows the frontend to make requests to this proxy server
app.use(cors());

// Serve static files from the current directory
// This makes the HTML, CSS, and JS files accessible through the server
app.use(express.static('.'));

/**
 * Proxy middleware for Genesys Cloud API requests
 * Routes all requests to /api/* to the Genesys Cloud API endpoint
 * Example: /api/v2/users will be forwarded to https://api.mypurecloud.in/v2/users
 */
app.use('/api', createProxyMiddleware({
  target: 'https://api.mypurecloud.in',  // Target API server
  changeOrigin: true,                    // Changes the origin of the host header to the target URL
  pathRewrite: {
    '^/api': '',                         // Removes the /api prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying request:', req.method, req.url);  // Logs each API request
  }
}));

/**
 * Proxy middleware for Genesys Cloud login requests
 * Routes all requests to /login/* to the Genesys Cloud login endpoint
 * Example: /login/oauth/token will be forwarded to https://login.mypurecloud.in/oauth/token
 */
app.use('/login', createProxyMiddleware({
  target: 'https://login.mypurecloud.in',  // Target login server
  changeOrigin: true,                      // Changes the origin of the host header to the target URL
  pathRewrite: {
    '^/login': '',                         // Removes the /login prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('Proxying login request:', req.method, req.url);  // Logs each login request
  }
}));

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`CORS proxy server running at http://localhost:${port}`);
  console.log(`Open http://localhost:${port}/index.html to use the application`);
}); 