// Global variables
let accessToken = null; // Stores the authentication token after successful login
let environment = 'mypurecloud.in'; // Set India as default environment
let refreshInterval = null; // Stores the interval ID for periodic data refresh

// Public CORS proxy URL
const corsProxy = 'https://cors-anywhere.herokuapp.com/';

/**
 * Appends the CORS proxy URL to any API URL
 * Used to bypass CORS restrictions when making cross-origin requests
 * @param {string} url - The original API URL
 * @return {string} The URL with CORS proxy prepended
 */
function getProxiedUrl(url) {
    return `${corsProxy}${url}`;
}

// DOM Elements
const clientIdInput = document.getElementById('client-id');
const clientSecretInput = document.getElementById('client-secret');
const environmentSelect = document.getElementById('environment');
const connectButton = document.getElementById('connect-button');
const loginSection = document.getElementById('login-section');
const dashboard = document.getElementById('dashboard');
const loginStatus = document.getElementById('login-status');
const agentList = document.getElementById('agent-list');
const queueList = document.getElementById('queue-list');

// Add a custom event listener to document to handle connection errors
document.addEventListener('connectionError', function(e) {
    showErrorMessage(e.detail);
});

/**
 * Displays an error message overlay with possible solutions
 * Creates a dialog box with error details and troubleshooting tips
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <h3>Connection Error</h3>
        <p>${message}</p>
        <div class="error-solutions">
            <h4>Possible Solutions:</h4>
            <ol>
                <li>The CORS proxy might be at capacity. <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">Request temporary access here</a></li>
                <li>Verify your Client ID and Client Secret are correct</li>
                <li>Make sure your Client ID has the necessary API permissions in Genesys Cloud</li>
                <li>Try using a different browser (Chrome works best)</li>
            </ol>
        </div>
        <button id="dismiss-error">Dismiss</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    document.getElementById('dismiss-error').addEventListener('click', function() {
        errorDiv.remove();
    });
}

// Event Listeners
connectButton.addEventListener('click', connectToGenesys);
environmentSelect.addEventListener('change', () => {
    environment = environmentSelect.value;
});

// Add a notification about CORS proxy at startup
window.addEventListener('DOMContentLoaded', () => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <p><strong>Important:</strong> This application uses a public CORS proxy to connect to Genesys Cloud API. 
        <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">Click here to request temporary access</a> before using this application.</p>
        <button id="dismiss-notification">×</button>
    `;
    
    document.body.appendChild(notification);
    
    document.getElementById('dismiss-notification').addEventListener('click', function() {
        notification.remove();
    });
});

/**
 * Authenticates with Genesys Cloud using client credentials
 * Obtains an OAuth token and initializes the dashboard on success
 * Displays error messages on failure
 */
async function connectToGenesys() {
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();
    
    if (!clientId || !clientSecret) {
        alert('Please enter both Client ID and Client Secret');
        return;
    }
    
    try {
        // Show loading state
        connectButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        connectButton.disabled = true;
        
        const tokenUrl = `https://login.${environment}/oauth/token`;
        console.log(`Attempting to connect to: ${tokenUrl} via CORS proxy`);
        
        // Get access token
        const tokenResponse = await fetch(getProxiedUrl(tokenUrl), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
        });
        
        if (!tokenResponse.ok) {
            let errorMessage = 'Authentication failed. Please check your credentials.';
            try {
                const errorText = await tokenResponse.text();
                console.error('Authentication error response:', errorText);
                errorMessage = `Authentication failed (${tokenResponse.status}): ${errorText || 'Please check your credentials.'}`;
            } catch (e) {
                console.error('Could not parse error response', e);
            }
            
            // If we get a 403 from the CORS proxy, it likely requires temporary access
            if (tokenResponse.status === 403) {
                showErrorMessage('The CORS proxy requires temporary access. Please click the link below to request access, then try again.');
            } else {
                showErrorMessage(errorMessage);
            }
            
            throw new Error(errorMessage);
        }
        
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
        
        console.log('Successfully authenticated. Token expires in', tokenData.expires_in, 'seconds');
        
        // Update UI
        loginStatus.textContent = 'Connected';
        loginStatus.classList.add('connected');
        loginSection.classList.add('hidden');
        dashboard.classList.remove('hidden');
        
        // Load initial data
        loadAgents();
        loadQueues();
        
        // Set up refresh interval
        refreshInterval = setInterval(() => {
            loadAgents();
            loadQueues();
        }, 30000); // Refresh every 30 seconds
        
    } catch (error) {
        alert(error.message);
        console.error('Error:', error);
        
        // Reset button state
        connectButton.innerHTML = '<i class="fas fa-plug"></i> Connect';
        connectButton.disabled = false;
    }
}

/**
 * Fetches online agents from Genesys Cloud API
 * Retrieves agents with their presence status and displays them in the UI
 */
async function loadAgents() {
    try {
        agentList.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Loading agents...</p>';
        
        const agentsUrl = `https://api.${environment}/api/v2/users?presence=ONLINE&expand=presence`;
        console.log(`Fetching agents from: ${agentsUrl} via CORS proxy`);
        
        const response = await fetch(getProxiedUrl(agentsUrl), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Agent fetch error response:', errorText);
            throw new Error(`Failed to fetch agents (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        displayAgents(data);
        
    } catch (error) {
        agentList.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> Error loading agents: ${error.message}</p>`;
        console.error('Error loading agents:', error);
    }
}

/**
 * Renders the list of agents in the UI
 * Formats agent data with status indicators and displays it in the agent list container
 * @param {Object} data - Agent data from the API response
 */
function displayAgents(data) {
    if (!data.entities || data.entities.length === 0) {
        agentList.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash fa-2x"></i><p>No agents currently online</p></div>';
        return;
    }
    
    agentList.innerHTML = '';
    
    // Sort agents by status (Available first, then others)
    data.entities.sort((a, b) => {
        const aStatus = a.presence?.presenceDefinition?.systemPresence || '';
        const bStatus = b.presence?.presenceDefinition?.systemPresence || '';
        
        if (aStatus === 'AVAILABLE' && bStatus !== 'AVAILABLE') return -1;
        if (bStatus === 'AVAILABLE' && aStatus !== 'AVAILABLE') return 1;
        return a.name.localeCompare(b.name);
    });
    
    data.entities.forEach(agent => {
        const agentElement = document.createElement('div');
        agentElement.className = 'agent-item';
        
        // Determine status color and icon
        let statusColor = '#999'; // Default gray
        let statusText = 'Unknown';
        let statusIcon = 'question-circle';
        
        if (agent.presence && agent.presence.presenceDefinition) {
            const status = agent.presence.presenceDefinition.systemPresence;
            statusText = agent.presence.presenceDefinition.languageLabels?.en_US || status;
            
            switch (status) {
                case 'AVAILABLE':
                    statusColor = '#48bb78'; // Green
                    statusIcon = 'check-circle';
                    break;
                case 'AWAY':
                    statusColor = '#ed8936'; // Orange
                    statusIcon = 'clock';
                    break;
                case 'BUSY':
                    statusColor = '#f56565'; // Red
                    statusIcon = 'times-circle';
                    break;
                case 'ON_QUEUE':
                    statusColor = '#4299e1'; // Blue
                    statusIcon = 'phone-volume';
                    break;
            }
        }
        
        agentElement.innerHTML = `
            <div class="status-indicator">
                <span class="status-dot" style="background-color: ${statusColor}"></span>
                <i class="fas fa-${statusIcon}" style="color: ${statusColor}"></i>
            </div>
            <div class="agent-details">
                <div class="agent-name">${agent.name}</div>
                <div class="agent-status">${statusText}</div>
            </div>
        `;
        
        agentList.appendChild(agentElement);
    });
}

/**
 * Fetches queue statistics from Genesys Cloud API
 * Retrieves metrics for all queues and displays them in the UI
 */
async function loadQueues() {
    try {
        queueList.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Loading queues...</p>';
        
        const queuesUrl = `https://api.${environment}/api/v2/analytics/queues/observations/query`;
        console.log(`Fetching queues from: ${queuesUrl} via CORS proxy`);
        
        const response = await fetch(getProxiedUrl(queuesUrl), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                "filter": {
                    "type": "OR",
                    "predicates": []
                },
                "metrics": [
                    "oWaiting",
                    "oActive"
                ]
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Queue fetch error response:', errorText);
            throw new Error(`Failed to fetch queue data (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        displayQueues(data);
        
    } catch (error) {
        queueList.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> Error loading queues: ${error.message}</p>`;
        console.error('Error loading queues:', error);
    }
}

/**
 * Renders the list of queues in the UI
 * Formats queue data with status indicators based on wait times
 * @param {Object} data - Queue data from the API response
 */
function displayQueues(data) {
    if (!data.results || data.results.length === 0) {
        queueList.innerHTML = '<div class="empty-state"><i class="fas fa-phone-slash fa-2x"></i><p>No queue data available</p></div>';
        return;
    }
    
    queueList.innerHTML = '';
    
    // Sort queues by waiting calls (highest first)
    data.results.sort((a, b) => {
        const aWaiting = a.data.find(metric => metric.metric === 'oWaiting')?.stats?.count || 0;
        const bWaiting = b.data.find(metric => metric.metric === 'oWaiting')?.stats?.count || 0;
        return bWaiting - aWaiting;
    });
    
    data.results.forEach(queue => {
        const queueElement = document.createElement('div');
        queueElement.className = 'queue-item';
        
        // Get waiting and active counts
        const waitingCalls = queue.data.find(metric => metric.metric === 'oWaiting')?.stats?.count || 0;
        const activeCalls = queue.data.find(metric => metric.metric === 'oActive')?.stats?.count || 0;
        
        // Determine status color based on waiting calls
        let statusColor = '#48bb78'; // Green by default
        let statusClass = 'success';
        
        if (waitingCalls > 10) {
            statusColor = '#f56565'; // Red for high load
            statusClass = 'danger';
        } else if (waitingCalls > 3) {
            statusColor = '#ed8936'; // Orange for moderate load
            statusClass = 'warning';
        }
        
        queueElement.innerHTML = `
            <div class="status-indicator">
                <span class="status-dot" style="background-color: ${statusColor}"></span>
            </div>
            <div class="queue-details">
                <div class="queue-name">${queue.group.name}</div>
                <div class="queue-stats">
                    <span class="badge ${statusClass}">${waitingCalls} waiting</span>
                    <span class="badge">${activeCalls} active</span>
                </div>
            </div>
        `;
        
        queueList.appendChild(queueElement);
    });
}