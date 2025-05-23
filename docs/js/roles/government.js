// government.js - Government dashboard logic

function renderGovernmentDashboard(account) {
    document.getElementById('dashboard').innerHTML = `
        <h2>Government Dashboard</h2>
        <p>Welcome, ${account}</p>
        <div id="gov-analytics">
            <h3>Platform Analytics</h3>
            <ul>
                <li>Total Lands: <span id="gov-total-lands">Loading...</span></li>
                <li>Total Shares Sold: <span id="gov-total-shares">Loading...</span></li>
                <li>Total Fees Collected: <span id="gov-total-fees">Loading...</span></li>
            </ul>
        </div>
        <button id="gov-withdraw-fees">Withdraw Collected Fees</button>
        <div id="gov-withdraw-status"></div>
        <h3>Update Verification Fee</h3>
        <form id="gov-update-fee-form" style="margin-bottom:16px;">
            <input type="number" id="gov-new-fee" placeholder="New Fee (in MATIC)" step="0.0001" required />
            <button type="submit">Update Fee</button>
        </form>
        <div id="gov-update-fee-status"></div>
        <h3>Role Management</h3>
        <form id="gov-role-mgmt-form" style="margin-bottom:16px;">
            <select id="gov-role-select">
                <option value="GOVERNMENT_ROLE">Government</option>
                <option value="REGISTRAR_ROLE">Registrar</option>
                <option value="VERIFIER_ROLE">Verifier</option>
                <option value="CLIENT_ROLE">Client</option>
            </select>
            <input type="text" id="gov-role-address" placeholder="Wallet Address" required style="width:260px;" />
            <button type="button" id="gov-grant-role">Grant Role</button>
            <button type="button" id="gov-revoke-role">Revoke Role</button>
        </form>
        <div id="gov-role-mgmt-status"></div>
        <h3>All Registered Lands</h3>
        <div id="gov-lands-list">Loading...</div>
    `;
    loadGovernmentAnalytics();
    loadAllLands();
    document.getElementById('gov-withdraw-fees').onclick = withdrawFees;
    document.getElementById('gov-update-fee-form').onsubmit = updateVerificationFeeHandler;
    setupRoleManagementHandlers();
}

async function loadGovernmentAnalytics() {
    const provider = window.getProvider();
    const contract = await window.getContract(provider);
    try {
        const totalLands = await contract.totalLands();
        const totalSharesSold = await contract.totalSharesSold();
        const totalFeesCollected = await contract.totalFeesCollected();
        document.getElementById('gov-total-lands').textContent = totalLands.toString();
        document.getElementById('gov-total-shares').textContent = totalSharesSold.toString();
        document.getElementById('gov-total-fees').textContent = ethers.utils.formatEther(totalFeesCollected) + ' MATIC';
    } catch (e) {
        document.getElementById('gov-analytics').innerHTML += '<p style="color:red">Error loading analytics.</p>';
    }
}

async function withdrawFees() {
    const statusDiv = document.getElementById('gov-withdraw-status');
    statusDiv.textContent = 'Processing...';
    try {
        const provider = window.getProvider();
        const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
        const contract = await window.getContract(signer);
        const tx = await contract.withdrawFees();
        await tx.wait();
        statusDiv.textContent = 'Fees withdrawn successfully!';
        loadGovernmentAnalytics();
    } catch (e) {
        statusDiv.textContent = 'Error withdrawing fees: ' + (e.data?.message || e.message);
    }
}

async function updateVerificationFeeHandler(e) {
    e.preventDefault();
    const statusDiv = document.getElementById('gov-update-fee-status');
    statusDiv.textContent = 'Updating fee...';
    const newFee = document.getElementById('gov-new-fee').value;
    try {
        const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
        const contract = await window.getContract(signer);
        const feeWei = ethers.utils.parseEther(newFee);
        const tx = await contract.updateVerificationFee(feeWei);
        await tx.wait();
        statusDiv.textContent = 'Verification fee updated!';
        loadGovernmentAnalytics();
    } catch (e) {
        statusDiv.textContent = 'Error updating fee: ' + (e.data?.message || e.message);
    }
}

async function loadAllLands() {
    const provider = window.getProvider();
    const contract = await window.getContract(provider);
    const landsDiv = document.getElementById('gov-lands-list');
    try {
        if (!contract.getAllLands) {
            landsDiv.innerHTML = '<p>getAllLands() not available in contract.</p>';
            return;
        }
        const landIds = await contract.getAllLands();
        if (!landIds.length) {
            landsDiv.innerHTML = '<p>No lands registered yet.</p>';
            return;
        }

        // Prepare table data
        const headers = ['Land ID', 'Location', 'Area', 'Price/Share', 'Verified'];
        const data = await Promise.all(landIds.map(async (id) => {
            const land = await contract.lands(id);
            return [
                id.toString(),
                land.location,
                land.area.toString(),
                ethers.utils.formatEther(land.pricePerShare) + ' MATIC',
                land.isVerified ? 'Yes' : 'No'
            ];
        }));

        // Create table with land ID column
        const table = window.createTable(headers, data, {
            className: 'lands-table',
            landIdColumns: [0] // First column (index 0) is the land ID
        });

        landsDiv.innerHTML = '';
        landsDiv.appendChild(table);
    } catch (e) {
        console.error('Error loading lands:', e);
        landsDiv.innerHTML = '<p style="color:red">Error loading lands.</p>';
    }
}

function getRoleHash(roleName) {
    if (roleName === 'GOVERNMENT_ROLE') return ethers.utils.id('GOVERNMENT_ROLE');
    if (roleName === 'REGISTRAR_ROLE') return ethers.utils.id('REGISTRAR_ROLE');
    if (roleName === 'VERIFIER_ROLE') return ethers.utils.id('VERIFIER_ROLE');
    if (roleName === 'CLIENT_ROLE') return ethers.utils.id('CLIENT_ROLE');
    return null;
}

function setupRoleManagementHandlers() {
    const grantBtn = document.getElementById('gov-grant-role');
    const revokeBtn = document.getElementById('gov-revoke-role');
    const statusDiv = document.getElementById('gov-role-mgmt-status');
    grantBtn.onclick = async () => {
        statusDiv.textContent = 'Granting role...';
        const role = document.getElementById('gov-role-select').value;
        const address = document.getElementById('gov-role-address').value.trim();
        try {
            const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
            const contract = await window.getContract(signer);
            const roleHash = getRoleHash(role);
            const tx = await contract.grantRole(roleHash, address);
            await tx.wait();
            statusDiv.textContent = 'Role granted successfully!';
        } catch (e) {
            statusDiv.textContent = 'Error granting role: ' + (e.data?.message || e.message);
        }
    };
    revokeBtn.onclick = async () => {
        statusDiv.textContent = 'Revoking role...';
        const role = document.getElementById('gov-role-select').value;
        const address = document.getElementById('gov-role-address').value.trim();
        try {
            const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
            const contract = await window.getContract(signer);
            const roleHash = getRoleHash(role);
            const tx = await contract.revokeRole(roleHash, address);
            await tx.wait();
            statusDiv.textContent = 'Role revoked successfully!';
        } catch (e) {
            statusDiv.textContent = 'Error revoking role: ' + (e.data?.message || e.message);
        }
    };
}

window.renderGovernmentDashboard = renderGovernmentDashboard; 