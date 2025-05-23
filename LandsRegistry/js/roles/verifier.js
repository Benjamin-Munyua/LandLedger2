// verifier.js - Verifier dashboard logic

function renderVerifierDashboard(account) {
    document.getElementById('dashboard').innerHTML = `
        <h2>Verifier Dashboard</h2>
        <p>Welcome, ${account}</p>
        <h3>Unverified Lands</h3>
        <div id="ver-unverified-lands">Loading...</div>
        <div id="ver-verify-status"></div>
        <h3>Lands You Have Verified</h3>
        <div id="ver-verified-lands">Loading...</div>
    `;
    loadUnverifiedLands(account);
    loadVerifiedLands(account);
}

async function loadUnverifiedLands(account) {
    const provider = window.getProvider();
    const contract = await window.getContract(provider);
    const landsDiv = document.getElementById('ver-unverified-lands');
    try {
        if (!contract.getAllLands) {
            landsDiv.innerHTML = '<p>getAllLands() not available in contract.</p>';
            return;
        }
        const landIds = await contract.getAllLands();
        
        // Filter and prepare table data
        const headers = ['Land ID', 'Location', 'Area', 'Price/Share', 'Action'];
        const data = [];
        
        for (const id of landIds) {
            const land = await contract.lands(id);
            if (!land.isVerified) {
                data.push([
                    id.toString(),
                    land.location,
                    land.area.toString(),
                    ethers.utils.formatEther(land.pricePerShare) + ' MATIC',
                    { landId: id }
                ]);
            }
        }

        if (data.length === 0) {
            landsDiv.innerHTML = '<p>No unverified lands.</p>';
            return;
        }

        // Create table with land ID column
        const table = window.createTable(headers, data, {
            className: 'lands-table',
            landIdColumns: [0], // First column (index 0) is the land ID
            columnRenderers: {
                4: (cellData, container) => { // Index 4 is the 'Action' column
                    const button = document.createElement('button');
                    button.textContent = 'Verify';
                    button.onclick = () => window.verifyLand(cellData.landId);
                    container.appendChild(button);
                }
            }
        });

        landsDiv.innerHTML = '';
        landsDiv.appendChild(table);
    } catch (e) {
        console.error('Error loading unverified lands:', e);
        landsDiv.innerHTML = '<p style="color:red">Error loading unverified lands.</p>';
    }
}

window.verifyLand = async function(landId) {
    const statusDiv = document.getElementById('ver-verify-status');
    statusDiv.textContent = 'Verifying...';
    try {
        const provider = window.getProvider();
        const contract = await window.getContract(provider);
        const fee = await contract.verificationFee();
        const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
        const contractWithSigner = await window.getContract(signer);
        const landIdBN = ethers.BigNumber.from(landId);
        const tx = await contractWithSigner.verifyLand(landIdBN, { value: fee });
        await tx.wait();
        statusDiv.textContent = 'Land verified successfully!';
        loadUnverifiedLands(await signer.getAddress());
        loadVerifiedLands(await signer.getAddress());
    } catch (e) {
        statusDiv.textContent = 'Error verifying land: ' + (e.data?.message || e.message);
    }
}

async function loadVerifiedLands(account) {
    const provider = window.getProvider();
    const contract = await window.getContract(provider);
    const landsDiv = document.getElementById('ver-verified-lands');
    try {
        if (!contract.getAllLands) {
            landsDiv.innerHTML = '<p>getAllLands() not available in contract.</p>';
            return;
        }
        const landIds = await contract.getAllLands();
        
        // Filter and prepare table data
        const headers = ['Land ID', 'Location', 'Area', 'Price/Share'];
        const data = [];
        
        for (const id of landIds) {
            const land = await contract.lands(id);
            if (land.isVerified && land.verifier.toLowerCase() === account.toLowerCase()) {
                data.push([
                    id.toString(),
                    land.location,
                    land.area.toString(),
                    ethers.utils.formatEther(land.pricePerShare) + ' MATIC'
                ]);
            }
        }

        if (data.length === 0) {
            landsDiv.innerHTML = '<p>You have not verified any lands yet.</p>';
            return;
        }

        // Create table with land ID column
        const table = window.createTable(headers, data, {
            className: 'lands-table',
            landIdColumns: [0] // First column (index 0) is the land ID
        });

        landsDiv.innerHTML = '';
        landsDiv.appendChild(table);
    } catch (e) {
        console.error('Error loading verified lands:', e);
        landsDiv.innerHTML = '<p style="color:red">Error loading verified lands.</p>';
    }
}

window.renderVerifierDashboard = renderVerifierDashboard; 
window.renderVerifierDashboard = renderVerifierDashboard; 