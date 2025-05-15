# Genesys Cloud Dashboard

A real-time dashboard application for monitoring Genesys Cloud contact center metrics.

## Overview

This application provides a simple dashboard for viewing the status of agents and queues in your Genesys Cloud environment. It authenticates using client credentials and provides real-time updates on agent presence and queue statistics.

## Features

- Agent monitoring with presence status
- Queue monitoring with waiting and active call counts
- Real-time updates (refreshed every 30 seconds)
- Authentication with Genesys Cloud client credentials

## File Structure

- `index.html` - The main HTML file containing the UI structure
- `styles.css` - CSS styling for the application
- `script.js` - Frontend JavaScript with all application logic
- `proxy.js` - CORS proxy server for handling API requests
- `package.json` - Node.js dependencies
- `package-lock.json` - Lock file for exact dependency versions

## Setup Instructions

### Prerequisites

- Node.js installed (v14 or later recommended)
- Genesys Cloud organization with API credentials
- Client ID and Client Secret with appropriate permissions

### Installation and Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the local proxy server:
   ```
   npm start
   ```
4. Open the application in your browser at:
   ```
   http://localhost:3000/index.html
   ```
5. First, request temporary access to the CORS proxy by clicking the "Enable CORS Proxy" button
6. Enter your Genesys Cloud Client ID and Client Secret
7. Click "Connect" to authenticate and load the dashboard

## API Permissions Required

Your client credentials will need the following permissions:
- `presence:read` - For agent status
- `analytics:read` - For queue statistics
- `users:read` - For agent information

## Troubleshooting

- If you see "CORS proxy requires temporary access", follow the link to request temporary access
- If authentication fails, verify your Client ID and Secret are correct 
- If you have connectivity issues, check your network settings and DNS resolution
- DNS resolution issues may require using a different network or VPN

## How It Works

1. The application authenticates with Genesys Cloud using client credentials
2. It uses a CORS proxy to bypass cross-origin restrictions
3. After authentication, it fetches agent and queue data
4. The data is displayed in a user-friendly dashboard
5. Data is automatically refreshed every 30 seconds

## Author

Your Name

## License

This project is open-source and available under the MIT License.
