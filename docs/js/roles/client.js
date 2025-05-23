// client.js - Client dashboard logic

function renderClientDashboard(account) {
    document.getElementById('dashboard').innerHTML = `
        <h2>Client Dashboard</h2>
        <p>Welcome, ${account}</p>
        <h3>Available Lands</h3>
        <div id="cli-lands-list">Loading...</div>
        <div id="cli-purchase-status"></div>
        <h3>Your Shares</h3>
        <div id="cli-shares-list">Loading...</div>
        <h3>Transfer Shares</h3>
        <form id="cli-transfer-form">
            <input type="number" id="cli-transfer-landid" placeholder="Land ID" required />
            <input type="text" id="cli-transfer-to" placeholder="Recipient Address" required />
            <input type="number" id="cli-transfer-shares" placeholder="Shares" required />
            <button type="submit">Transfer</button>
        </form>
        <div id="cli-transfer-status"></div>
    `;
    loadAvailableLands(account);
    loadClientShares(account);
    document.getElementById('cli-transfer-form').onsubmit = transferShares;
}

async function loadAvailableLands(account) {
    const provider = window.getProvider();
    const contract = await window.getContract(provider);
    const landsDiv = document.getElementById('cli-lands-list');
    try {
        if (!contract.getAllLands) {
            landsDiv.innerHTML = '<p>getAllLands() not available in contract.</p>';
            return;
        }
        const landIds = await contract.getAllLands();
        
        // Filter and prepare table data
        const headers = ['Land ID', 'Location', 'Area', 'Price/Share', 'Verified', 'Action'];
        const data = [];
        
        for (const id of landIds) {
            const land = await contract.lands(id);
            if (land.isVerified) {
                data.push([
                    id.toString(),
                    land.location,
                    land.area.toString(),
                    ethers.utils.formatEther(land.pricePerShare) + ' MATIC',
                    'Yes',
                    // Pass data needed for the button, not the button HTML itself
                    { landId: id, pricePerShare: land.pricePerShare }
                ]);
            }
        }

        if (data.length === 0) {
            landsDiv.innerHTML = '<p>No available lands.</p>';
            return;
        }

        // Define a renderer for the 'Action' column
        const actionRenderer = (cellData, container) => {
            const button = document.createElement('button');
            button.textContent = 'Purchase Shares';
            button.onclick = () => window.purchaseShares(cellData.landId, cellData.pricePerShare);
            container.appendChild(button);
        };

        // Create table with land ID and custom action renderers
        const table = window.createTable(headers, data, {
            className: 'lands-table',
            landIdColumns: [0], // First column (index 0) is the land ID
            columnRenderers: { 5: actionRenderer } // Index 5 is the 'Action' column
        });

        landsDiv.innerHTML = '';
        landsDiv.appendChild(table);
    } catch (e) {
        console.error('Error loading available lands:', e);
        landsDiv.innerHTML = '<p style="color:red">Error loading lands.</p>';
    }
}

window.purchaseShares = async function(landId, pricePerShare) {
    const shares = prompt('Enter number of shares to purchase:');
    if (!shares || isNaN(shares) || shares <= 0) return;
    const statusDiv = document.getElementById('cli-purchase-status');
    statusDiv.textContent = 'Processing purchase...';
    try {
        const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
        const contract = await window.getContract(signer);

        // Re-fetch land details to get the most accurate pricePerShare from the contract
        const landDetails = await contract.lands(landId);
        const accuratePricePerShare = landDetails.pricePerShare;

        const sharesBN = ethers.BigNumber.from(shares);
        // Use the accurately fetched pricePerShare BigNumber for calculation
        const totalPrice = accuratePricePerShare.mul(sharesBN);

        console.log('--- Purchase Shares Debug Info (Re-fetched Price) ---');
        console.log('Land ID:', landId.toString());
        console.log('Shares (entered):', shares);
        console.log('Shares (BigNumber):', sharesBN.toString());
        console.log('Accurate Price Per Share (BigNumber from contract):', accuratePricePerShare.toString());
        console.log('Total Price (calculated in Wei):', totalPrice.toString());
        console.log('------------------------------------');

        const tx = await contract.purchaseShares(landId, sharesBN, { value: totalPrice });
        await tx.wait();
        statusDiv.textContent = 'Shares purchased successfully!';
        loadClientShares(await signer.getAddress());
    } catch (e) {
        statusDiv.textContent = 'Error purchasing shares: ' + (e.data?.message || e.message);
        console.error('Purchase Shares Error:', e);
    }
}

async function loadClientShares(account) {
    const provider = window.getProvider();
    const contract = await window.getContract(provider);
    const sharesDiv = document.getElementById('cli-shares-list');
    try {
        if (!contract.getAllLands) {
            sharesDiv.innerHTML = '<p>getAllLands() not available in contract.</p>';
            return;
        }
        const landIds = await contract.getAllLands();
        
        // Filter and prepare table data
        const headers = ['Land ID', 'Shares Owned'];
        const data = [];
        
        for (const id of landIds) {
            const shares = await contract.shareBalances(id, account);
            if (shares.gt(0)) {
                data.push([
                    id.toString(),
                    shares.toString()
                ]);
            }
        }

        if (data.length === 0) {
            sharesDiv.innerHTML = '<p>You do not own any shares yet.</p>';
            return;
        }

        // Create table with land ID column
        const table = window.createTable(headers, data, {
            className: 'lands-table',
            landIdColumns: [0] // First column (index 0) is the land ID
        });

        sharesDiv.innerHTML = '';
        sharesDiv.appendChild(table);
    } catch (e) {
        console.error('Error loading client shares:', e);
        sharesDiv.innerHTML = '<p style="color:red">Error loading your shares.</p>';
    }
}

async function transferShares(e) {
    e.preventDefault();
    const statusDiv = document.getElementById('cli-transfer-status');
    statusDiv.textContent = 'Processing transfer...';
    const landId = ethers.BigNumber.from(document.getElementById('cli-transfer-landid').value);
    const to = document.getElementById('cli-transfer-to').value.trim();
    const shares = ethers.BigNumber.from(document.getElementById('cli-transfer-shares').value);
    try {
        const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
        const contract = await window.getContract(signer);
        const tx = await contract.safeTransferFrom(await signer.getAddress(), to, landId, shares, '0x');
        await tx.wait();
        statusDiv.textContent = 'Shares transferred successfully!';
        loadClientShares(await signer.getAddress());
    } catch (e) {
        statusDiv.textContent = 'Error transferring shares: ' + (e.data?.message || e.message);
    }
}

window.renderClientDashboard = renderClientDashboard; 
window.renderClientDashboard = renderClientDashboard; 