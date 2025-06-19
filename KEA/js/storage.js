/**
 * Storage Manager - Handles local storage, session storage, and IndexedDB
 */

class StorageManager {
    constructor() {
        this.prefix = 'knowledge-explorer-';
        this.version = '1.0.0';
        this.dbName = 'KnowledgeExplorerDB';
        this.dbVersion = 1;
        this.db = null;
        
        this.initIndexedDB();
    }

    // LocalStorage methods
    setLocal(key, value) {
        try {
            const data = {
                value: value,
                timestamp: Date.now(),
                version: this.version
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    getLocal(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return defaultValue;
            
            const data = JSON.parse(item);
            
            // Check version compatibility
            if (data.version !== this.version) {
                this.removeLocal(key);
                return defaultValue;
            }
            
            return data.value;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }

    removeLocal(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    }

    clearLocal() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }

    // SessionStorage methods
    setSession(key, value) {
        try {
            const data = {
                value: value,
                timestamp: Date.now()
            };
            sessionStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to sessionStorage:', error);
            return false;
        }
    }

    getSession(key, defaultValue = null) {
        try {
            const item = sessionStorage.getItem(this.prefix + key);
            if (!item) return defaultValue;
            
            const data = JSON.parse(item);
            return data.value;
        } catch (error) {
            console.error('Failed to read from sessionStorage:', error);
            return defaultValue;
        }
    }

    removeSession(key) {
        try {
            sessionStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Failed to remove from sessionStorage:', error);
            return false;
        }
    }

    // IndexedDB methods
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('concepts')) {
                    const conceptStore = db.createObjectStore('concepts', { keyPath: 'id' });
                    conceptStore.createIndex('name', 'name', { unique: false });
                    conceptStore.createIndex('category', 'category', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
            };
        });
    }

    async saveToIndexedDB(storeName, data) {
        if (!this.db) {
            await this.initIndexedDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getFromIndexedDB(storeName, key) {
        if (!this.db) {
            await this.initIndexedDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromIndexedDB(storeName) {
        if (!this.db) {
            await this.initIndexedDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFromIndexedDB(storeName, key) {
        if (!this.db) {
            await this.initIndexedDB();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Cache methods with expiration
    setCache(key, value, expirationMinutes = 60) {
        const expirationTime = Date.now() + (expirationMinutes * 60 * 1000);
        const cacheData = {
            value: value,
            expiration: expirationTime,
            timestamp: Date.now()
        };
        
        return this.setLocal(`cache_${key}`, cacheData);
    }

    getCache(key) {
        const cacheData = this.getLocal(`cache_${key}`);
        if (!cacheData) return null;
        
        // Check if expired
        if (Date.now() > cacheData.expiration) {
            this.removeLocal(`cache_${key}`);
            return null;
        }
        
        return cacheData.value;
    }

    clearExpiredCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix + 'cache_')) {
                const cacheData = this.getLocal(key.replace(this.prefix, ''));
                if (cacheData && Date.now() > cacheData.expiration) {
                    localStorage.removeItem(key);
                }
            }
        });
    }

    // Storage quota and usage
    async getStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    quota: estimate.quota,
                    usage: estimate.usage,
                    available: estimate.quota - estimate.usage,
                    percentage: (estimate.usage / estimate.quota) * 100
                };
            } catch (error) {
                console.error('Failed to get storage estimate:', error);
                return null;
            }
        }
        return null;
    }

    // Export/Import data
    exportData() {
        const data = {
            version: this.version,
            timestamp: Date.now(),
            localStorage: {},
            sessionStorage: {}
        };
        
        // Export localStorage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                data.localStorage[key] = localStorage.getItem(key);
            }
        });
        
        // Export sessionStorage
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                data.sessionStorage[key] = sessionStorage.getItem(key);
            }
        });
        
        return data;
    }

    importData(data) {
        try {
            if (data.version !== this.version) {
                console.warn('Version mismatch during import');
            }
            
            // Import localStorage
            Object.keys(data.localStorage || {}).forEach(key => {
                localStorage.setItem(key, data.localStorage[key]);
            });
            
            // Import sessionStorage
            Object.keys(data.sessionStorage || {}).forEach(key => {
                sessionStorage.setItem(key, data.sessionStorage[key]);
            });
            
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    // Backup and restore
    async createBackup() {
        const backup = {
            version: this.version,
            timestamp: Date.now(),
            data: this.exportData()
        };
        
        // Save to IndexedDB
        try {
            await this.saveToIndexedDB('cache', {
                key: 'backup_' + Date.now(),
                value: backup,
                type: 'backup'
            });
            return true;
        } catch (error) {
            console.error('Failed to create backup:', error);
            return false;
        }
    }

    async getBackups() {
        try {
            const allCache = await this.getAllFromIndexedDB('cache');
            return allCache.filter(item => item.type === 'backup');
        } catch (error) {
            console.error('Failed to get backups:', error);
            return [];
        }
    }

    async restoreBackup(backupKey) {
        try {
            const backup = await this.getFromIndexedDB('cache', backupKey);
            if (backup && backup.value) {
                return this.importData(backup.value.data);
            }
            return false;
        } catch (error) {
            console.error('Failed to restore backup:', error);
            return false;
        }
    }

    // Cleanup methods
    cleanup() {
        this.clearExpiredCache();
        
        // Remove old backups (keep only last 5)
        this.getBackups().then(backups => {
            if (backups.length > 5) {
                const sortedBackups = backups.sort((a, b) => b.value.timestamp - a.value.timestamp);
                const toDelete = sortedBackups.slice(5);
                toDelete.forEach(backup => {
                    this.deleteFromIndexedDB('cache', backup.key);
                });
            }
        });
    }

    // Storage event listener
    onStorageChange(callback) {
        window.addEventListener('storage', (event) => {
            if (event.key && event.key.startsWith(this.prefix)) {
                callback({
                    key: event.key.replace(this.prefix, ''),
                    oldValue: event.oldValue,
                    newValue: event.newValue,
                    storageArea: event.storageArea
                });
            }
        });
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

