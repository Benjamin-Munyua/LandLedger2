// registrar.js - Registrar dashboard logic

function renderRegistrarDashboard(account) {
    document.getElementById('dashboard').innerHTML = `
        <h2>Registrar Dashboard</h2>
        <p>Welcome, ${account}</p>
        <h3>Register New Land</h3>
        <form id="reg-register-land-form">
            <input type="text" id="reg-location" placeholder="Location" required />
            <input type="number" id="reg-area" placeholder="Area (sq units)" required />
            <input type="number" id="reg-price" placeholder="Price per Share (in MATIC)" step="0.0001" required />
            <button type="submit">Register Land</button>
        </form>
        <div id="reg-register-status"></div>
        <h3>Your Registered Lands</h3>
        <div id="reg-lands-list">Loading...</div>
    `;
    document.getElementById('reg-register-land-form').onsubmit = registerLand;
    loadRegistrarLands(account);
}

async function registerLand(e) {
    e.preventDefault();
    const statusDiv = document.getElementById('reg-register-status');
    statusDiv.textContent = 'Registering...';
    const location = document.getElementById('reg-location').value;
    const area = ethers.BigNumber.from(document.getElementById('reg-area').value);
    const price = document.getElementById('reg-price').value;
    try {
        const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
        const contract = await window.getContract(signer);
        const priceWei = ethers.utils.parseEther(price);
        const tx = await contract.registerLand(location, area, priceWei);
        await tx.wait();
        statusDiv.textContent = 'Land registered successfully!';
        loadRegistrarLands(await signer.getAddress());
    } catch (e) {
        statusDiv.textContent = 'Error registering land: ' + (e.data?.message || e.message);
    }
}

async function loadRegistrarLands(account) {
    const provider = window.getProvider();
    const contract = await window.getContract(provider);
    const landsDiv = document.getElementById('reg-lands-list');
    try {
        if (!contract.getAllLands) {
            landsDiv.innerHTML = '<p>getAllLands() not available in contract.</p>';
            return;
        }
        const landIds = await contract.getAllLands();
        
        // Filter and prepare table data
        const headers = ['Land ID', 'Location', 'Area', 'Price/Share', 'Verified'];
        const data = [];
        
        for (const id of landIds) {
            const land = await contract.lands(id);
            if (land.registrar.toLowerCase() === account.toLowerCase()) {
                data.push([
                    id.toString(),
                    land.location,
                    land.area.toString(),
                    ethers.utils.formatEther(land.pricePerShare) + ' MATIC',
                    land.isVerified ? 'Yes' : 'No'
                ]);
            }
        }

        if (data.length === 0) {
            landsDiv.innerHTML = '<p>No lands registered by you yet.</p>';
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
        console.error('Error loading registrar lands:', e);
        landsDiv.innerHTML = '<p style="color:red">Error loading your lands.</p>';
    }
}

window.renderRegistrarDashboard = renderRegistrarDashboard; 