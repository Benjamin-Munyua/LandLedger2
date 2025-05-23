// contract.js - ethers.js contract setup

// Initialize provider and contract
let provider;
let contract;

async function initializeContract() {
    try {
        // Use Web3Provider if MetaMask is available, otherwise use JsonRpcProvider
        if (window.ethereum) {
            provider = new ethers.providers.Web3Provider(window.ethereum);
        } else {
            provider = new ethers.providers.JsonRpcProvider(ENV.ALCHEMY_RPC_URL);
        }

        // Get contract ABI
        const response = await fetch('abi/LandRegistry.json');
        const abi = await response.json();

        // Create contract instance
        contract = new ethers.Contract(ENV.CONTRACT_ADDRESS, abi, provider);

        console.log('Contract initialized successfully');
        return { provider, contract };
    } catch (error) {
        console.error('Error initializing contract:', error);
        throw error;
    }
}

// Initialize contract when the page loads
window.addEventListener('load', async () => {
    try {
        const { provider: p, contract: c } = await initializeContract();
        window.provider = p;
        window.contract = c;
    } catch (error) {
        console.error('Failed to initialize contract:', error);
    }
}); 