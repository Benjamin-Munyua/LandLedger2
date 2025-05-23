// main.js - App entry, wallet connection, routing placeholder

let connectedAccount = null;

window.onload = async function() {
    console.log('Page loaded, rendering landing...');
    window.renderLanding();
    setupEventListeners();
    setupAccountChangeListener();
    
    // Wait for contract initialization
    try {
        const provider = window.getProvider();
        const contract = await window.getContract(provider);
        window.shareManager = new ShareManager();
        setupShareEventListeners(contract, window.shareManager);
    } catch (error) {
        console.error('Failed to setup share event listeners:', error);
    }
};

function showConnectionStatus(account) {
    let statusDiv = document.getElementById('wallet-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'wallet-status';
        statusDiv.style.marginBottom = '16px';
        statusDiv.style.textAlign = 'right';
        statusDiv.style.fontWeight = 'bold';
        document.getElementById('app').prepend(statusDiv);
    }
    let html = '';
    if (account) {
        html = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
        html += ' <button id="switchAccountBtn" style="margin-left:10px;">Switch Account</button>';
        statusDiv.style.color = '#2a4d69';
    } else {
        html = 'Not connected';
        statusDiv.style.color = '#b00';
    }
    statusDiv.innerHTML = html;
}

function setupEventListeners() {
    // Wait for DOM to be rendered
    setTimeout(() => {
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.onclick = async () => {
                connectBtn.disabled = true;
                connectBtn.textContent = 'Connecting...';
                console.log('Connect button clicked. Attempting MetaMask connection...');
                try {
                    const account = await window.connectWallet();
                    console.log('MetaMask returned account:', account);
                    if (account) {
                        connectedAccount = account;
                        showConnectionStatus(account);
                        connectBtn.textContent = `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;
                        connectBtn.disabled = true;
                        console.log('Attempting role detection for account:', account);
                        const role = await window.getUserRole(account);
                        console.log('Role detected:', role);
                        window.renderDashboard(role, account);
                    } else {
                        showConnectionStatus(null);
                        connectBtn.textContent = 'Connect MetaMask Wallet';
                        connectBtn.disabled = false;
                        console.log('No account returned from MetaMask.');
                    }
                } catch (e) {
                    showConnectionStatus(null);
                    connectBtn.textContent = 'Connect MetaMask Wallet';
                    connectBtn.disabled = false;
                    console.error('Connection to MetaMask failed or was rejected:', e);
                    alert('Connection to MetaMask failed or was rejected. See console for details.');
                }
            };
        }
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.onclick = async () => {
                const landId = document.getElementById('searchInput').value.trim();
                if (!landId) {
                    alert('Please enter a Land ID');
                    return;
                }
                
                // Show loading state
                const searchResults = document.getElementById('searchResults');
                searchResults.innerHTML = '<p>Loading...</p>';
                
                try {
                    const provider = window.getProvider();
                    const contract = await window.getContract(provider);
                    
                    // Validate if land exists
                    const land = await contract.lands(landId);
                    if (!land || land.registrar === '0x0000000000000000000000000000000000000000') {
                        searchResults.innerHTML = '<p style="color:red">Land ID not found</p>';
                        return;
                    }
                    
                    // Get ownership history using the optimized function
                    const ownershipHistory = await contract.getCompleteOwnershipHistory(landId);
                    
                    // Get transfer history using the optimized function
                    const transferHistory = await contract.getTransferHistory(landId);
                    
                    // Format the data for display
                    const formattedOwnershipHistory = ownershipHistory.map(record => ({
                        owner: record.owner,
                        shares: record.shares.toString(),
                        timestamp: record.timestamp.toString(),
                        action: record.action,
                        from: record.from,
                        to: record.to
                    }));
                    
                    const formattedTransferHistory = transferHistory.map(record => ({
                        from: record.from,
                        to: record.to,
                        shares: record.shares.toString(),
                        timestamp: record.timestamp.toString(),
                        price: ethers.utils.formatEther(record.price)
                    }));
                    
                    window.renderSearchResults(landId, formattedOwnershipHistory, formattedTransferHistory);
                } catch (error) {
                    console.error('Error fetching land history:', error);
                    searchResults.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
                }
            };
        }
        // Add Switch Account button handler
        const switchBtn = document.getElementById('switchAccountBtn');
        if (switchBtn) {
            switchBtn.onclick = async () => {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    if (accounts && accounts.length > 0) {
                        connectedAccount = accounts[0];
                        showConnectionStatus(connectedAccount);
                        const role = await window.getUserRole(connectedAccount);
                        window.renderDashboard(role, connectedAccount);
                    }
                } catch (e) {
                    alert('Failed to switch account. See console for details.');
                    console.error('Switch account error:', e);
                }
            };
        }
    }, 0);
}

function setupAccountChangeListener() {
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
            console.log('MetaMask accountsChanged event:', accounts);
            if (accounts.length === 0) {
                // Disconnected
                connectedAccount = null;
                showConnectionStatus(null);
                window.renderLanding();
                setupEventListeners();
                return;
            }
            const newAccount = accounts[0];
            connectedAccount = newAccount;
            showConnectionStatus(newAccount);
            try {
                const role = await window.getUserRole(newAccount);
                console.log('Role detected after account switch:', role);
                window.renderDashboard(role, newAccount);
            } catch (e) {
                console.error('Error during role detection after account switch:', e);
                window.renderLanding();
                setupEventListeners();
            }
        });
    }
}

// Show connection status on page load
showConnectionStatus(null);

// Add event listeners for share-related events
function setupShareEventListeners(contract, shareManager) {
    console.log('Setting up share event listeners...');
    contract.on('SharesTransferred', async (from, to, landId, shares) => {
        console.log(`SharesTransferred: ${shares} shares of Land ID ${landId} from ${from} to ${to}`);
        shareManager.invalidateCache(landId.toString(), from);
        shareManager.invalidateCache(landId.toString(), to);
        shareManager.notifyListeners(landId.toString()); // Notify listeners after cache invalidation
    });

    contract.on('SharesPurchased', async (buyer, landId, shares, price) => {
        console.log(`SharesPurchased: ${shares} shares of Land ID ${landId} by ${buyer} for ${ethers.utils.formatEther(price)} MATIC`);
        shareManager.invalidateCache(landId.toString(), buyer);
        shareManager.notifyListeners(landId.toString()); // Notify listeners after cache invalidation
    });

    // Add other relevant share events here if needed
}

// Add history button to land ID displays
function addHistoryButton(element, landId) {
    const button = document.createElement('button');
    button.className = 'history-btn';
    button.textContent = 'Show History';
    button.onclick = async () => {
        button.disabled = true;
        window.showHistoryModal('<div class="modal-loading">Loading history...</div>');
        
        try {
            const provider = window.getProvider();
            const contract = await window.getContract(provider);
            
            // Get ownership history
            const ownershipHistory = await contract.getCompleteOwnershipHistory(landId);
            
            // Get transfer history
            const transferHistory = await contract.getTransferHistory(landId);
            
            // Format the data for display
            const formattedOwnershipHistory = ownershipHistory.map(record => ({
                owner: record.owner,
                shares: record.shares.toString(),
                timestamp: record.timestamp.toString(),
                action: record.action,
                from: record.from,
                to: record.to
            }));
            
            const formattedTransferHistory = transferHistory.map(record => ({
                from: record.from,
                to: record.to,
                shares: record.shares.toString(),
                timestamp: record.timestamp.toString(),
                price: ethers.utils.formatEther(record.price)
            }));
            
            window.renderSearchResults(landId, formattedOwnershipHistory, formattedTransferHistory);
        } catch (error) {
            console.error('Error fetching land history:', error);
            window.showHistoryModal(`<p style="color:red">Error: ${error.message}</p>`);
        } finally {
            button.disabled = false;
        }
    };
    
    element.appendChild(button);
}

// Expose the function globally
window.addHistoryButton = addHistoryButton; 