// shareManager.js - Centralized share management functionality

class ShareManager {
    constructor() {
        this.cache = new Map();
        this.listeners = new Set();
    }

    async getShareBalance(contract, landId, address) {
        const cacheKey = `${landId}-${address}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const balance = await contract.shareBalances(landId, address);
            this.cache.set(cacheKey, balance);
            return balance;
        } catch (error) {
            console.error('Error fetching share balance:', error);
            throw error;
        }
    }

    async getShareOwnership(contract, landId) {
        try {
            const [owners, balances] = await contract.getShareOwnership(landId);
            return { owners, balances };
        } catch (error) {
            console.error('Error fetching share ownership:', error);
            throw error;
        }
    }

    invalidateCache(landId, address) {
        if (address) {
            this.cache.delete(`${landId}-${address}`);
        } else {
            // Invalidate all entries for this landId
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${landId}-`)) {
                    this.cache.delete(key);
                }
            }
        }
        this.notifyListeners(landId);
    }

    addListener(callback) {
        this.listeners.add(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(landId) {
        this.listeners.forEach(callback => callback(landId));
    }
}

// Create a singleton instance
const shareManager = new ShareManager();
window.shareManager = shareManager; 