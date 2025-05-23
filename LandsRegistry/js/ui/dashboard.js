// dashboard.js - Dashboard rendering logic

function renderLanding() {
    document.getElementById('app').innerHTML = `
        <div id="wallet-status"></div>
        <div class="landing-container">
            <h1>Land Registry Dashboard</h1>
            <div class="search-section">
                <input id="searchInput" type="text" placeholder="Enter Land ID..." />
                <button id="searchBtn">Search</button>
            </div>
            <div id="searchResults"></div>
            <div class="wallet-section">
                <button id="connectWalletBtn">Connect MetaMask Wallet</button>
            </div>
        </div>
    `;
}

function renderSearchResults(landId, ownershipHistory, transferHistory) {
    let html = `
        <div class="search-results">
            <h3>Land History Details</h3>
            <div class="land-info">
                <p><strong>Land ID:</strong> ${landId}</p>
                <p><strong>Total Records:</strong> ${ownershipHistory.length} ownership records, ${transferHistory.length} transfer records</p>
            </div>
            
            <div class="history-section">
                <h4>Ownership History</h4>
                ${ownershipHistory && ownershipHistory.length > 0 ? `
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>Owner</th>
                                <th>Shares</th>
                                <th>Date</th>
                                <th>Action</th>
                                <th>From</th>
                                <th>To</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ownershipHistory.map(r => `
                                <tr>
                                    <td>${r.owner.slice(0, 6)}...${r.owner.slice(-4)}</td>
                                    <td>${r.shares}</td>
                                    <td>${new Date(Number(r.timestamp) * 1000).toLocaleString()}</td>
                                    <td><span class="action-badge ${r.action.toLowerCase()}">${r.action}</span></td>
                                    <td>${r.from === '0x0000000000000000000000000000000000000000' ? 'N/A' : r.from.slice(0, 6) + '...' + r.from.slice(-4)}</td>
                                    <td>${r.to === '0x0000000000000000000000000000000000000000' ? 'N/A' : r.to.slice(0, 6) + '...' + r.to.slice(-4)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p class="no-data">No ownership history found</p>'}
            </div>
            
            <div class="history-section">
                <h4>Transfer History</h4>
                ${transferHistory && transferHistory.length > 0 ? `
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>From</th>
                                <th>To</th>
                                <th>Shares</th>
                                <th>Date</th>
                                <th>Price (MATIC)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transferHistory.map(r => `
                                <tr>
                                    <td>${r.from.slice(0, 6)}...${r.from.slice(-4)}</td>
                                    <td>${r.to.slice(0, 6)}...${r.to.slice(-4)}</td>
                                    <td>${r.shares}</td>
                                    <td>${new Date(Number(r.timestamp) * 1000).toLocaleString()}</td>
                                    <td>${r.price === '0.0' ? 'Transfer' : r.price}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p class="no-data">No transfer history found</p>'}
            </div>
        </div>
    `;
    
    // If we're in a modal, update the modal content
    if (window.showHistoryModal) {
        window.showHistoryModal(html);
    } else {
        // Otherwise update the search results div
        document.getElementById('searchResults').innerHTML = html;
    }
}

// Helper function to create a land ID cell with history button
function createLandIdCell(landId) {
    const cell = document.createElement('td');
    cell.textContent = landId;
    window.addHistoryButton(cell, landId);
    return cell;
}

// Expose the function globally
window.createLandIdCell = createLandIdCell;

function renderDashboard(role, account) {
    document.getElementById('app').innerHTML = `<div id="wallet-status"></div><div id="dashboard"></div>`;
    if (role === 'government') window.renderGovernmentDashboard(account);
    else if (role === 'registrar') window.renderRegistrarDashboard(account);
    else if (role === 'verifier') window.renderVerifierDashboard(account);
    else if (role === 'client') window.renderClientDashboard(account);
    else document.getElementById('dashboard').innerHTML = '<p>No role assigned to this account.</p>';
    if (typeof showConnectionStatus === 'function') showConnectionStatus(account);
}

window.renderLanding = renderLanding;
window.renderSearchResults = renderSearchResults;
window.renderDashboard = renderDashboard; 