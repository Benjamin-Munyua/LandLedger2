// utils.js - Helper functions for wallet, provider, contract, and role detection

function getProvider() {
    return new ethers.providers.JsonRpcProvider(ENV.ALCHEMY_RPC_URL);
}

async function getAbi() {
    const response = await fetch('abi/LandRegistry.json');
    const json = await response.json();
    return json;
}

async function getContract(providerOrSigner) {
    const abi = await getAbi();
    console.log('Creating contract with address:', ENV.CONTRACT_ADDRESS, 'and ABI:', abi);
    return new ethers.Contract(ENV.CONTRACT_ADDRESS, abi, providerOrSigner);
}

async function connectWallet() {
    if (!window.ethereum) {
        alert('MetaMask is required!');
        return null;
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0];
}

// Hardcoded role hashes using ethers.utils.id
const ROLE_HASHES = {
    government: ethers.utils.id('GOVERNMENT_ROLE'),
    registrar: ethers.utils.id('REGISTRAR_ROLE'),
    verifier: ethers.utils.id('VERIFIER_ROLE'),
    client: ethers.utils.id('CLIENT_ROLE')
};

async function getUserRole(address) {
    console.log('getUserRole called for address:', address);
    let provider;
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
    } else {
        provider = getProvider();
    }
    let contract;
    try {
        contract = await getContract(provider);
    } catch (e) {
        console.error('Error creating contract:', e);
        throw e;
    }
    for (const [name, hash] of Object.entries(ROLE_HASHES)) {
        try {
            console.log(`Checking role ${name} with hash ${hash} for address ${address}`);
            if (!hash) {
                console.error(`Role hash for ${name} is undefined!`);
                continue;
            }
            if (!contract.hasRole) {
                console.error('contract.hasRole is not a function! Contract:', contract);
                continue;
            }
            const hasRole = await contract.hasRole(hash, address);
            console.log(`hasRole(${name}):`, hasRole);
            if (hasRole) return name;
        } catch (e) {
            console.error(`Error checking role ${name}:`, e);
        }
    }
    return 'none';
}

// Expose functions globally
window.getProvider = getProvider;
window.getContract = getContract;
window.connectWallet = connectWallet;
window.getUserRole = getUserRole; 