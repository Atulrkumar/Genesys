// Global variables
let accessToken = null;
let environment = 'mypurecloud.com';
let refreshInterval = null;

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

// Event Listeners
connectButton.addEventListener('click', connectToGenesys);
environmentSelect.addEventListener('change', () => {
    environment = environmentSelect.value;
});

// Functions
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
        
        // Get access token
        const tokenResponse = await fetch(`https://login.${environment}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
        });
        
        if (!tokenResponse.ok) {
            throw new Error('Authentication failed. Please check your credentials.');
        }
        
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
        
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

async function loadAgents() {
    try {
        agentList.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Loading agents...</p>';
        
        const response = await fetch(`https://api.${environment}/api/v2/users?presence=ONLINE&expand=presence`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch agents');
        }
        
        const data = await response.json();
        displayAgents(data);
        
    } catch (error) {
        agentList.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> Error loading agents: ${error.message}</p>`;
        console.error('Error loading agents:', error);
    }
}

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

async function loadQueues() {
    try {
        queueList.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Loading queues...</p>';
        
        const response = await fetch(`https://api.${environment}/api/v2/analytics/queues/observations/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
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
            throw new Error('Failed to fetch queue data');
        }
        
        const data = await response.json();
        displayQueues(data);
        
    } catch (error) {
        queueList.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> Error loading queues: ${error.message}</p>`;
        console.error('Error loading queues:', error);
    }
}

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