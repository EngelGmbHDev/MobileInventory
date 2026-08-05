/**
 * Database Module - IndexedDB operations using Dexie.js
 */

// Initialize Dexie database
const db = new Dexie('MobileInventur');

// Define schema
db.version(1).stores({
    masterItems: 'code, name, category',
    masterLocations: 'code, name, warehouse',
    scanRecords: '++id, timestamp, locationCode, itemCode, quantity, isValidItem, isValidLocation',
    appSettings: 'key'
});

/**
 * Database API
 */
const Database = {
    // ==========================================
    // Master Items
    // ==========================================
    
    async addItems(items) {
        try {
            await db.masterItems.clear();
            await db.masterItems.bulkAdd(items);
            console.log(`[DB] Added ${items.length} items`);
            return items.length;
        } catch (error) {
            console.error('[DB] Error adding items:', error);
            throw error;
        }
    },
    
    async getItem(code) {
        return await db.masterItems.get(code);
    },
    
    async getAllItems() {
        return await db.masterItems.toArray();
    },
    
    async getItemCount() {
        return await db.masterItems.count();
    },
    
    async clearItems() {
        await db.masterItems.clear();
        console.log('[DB] Items cleared');
    },
    
    // ==========================================
    // Master Locations
    // ==========================================
    
    async addLocations(locations) {
        try {
            await db.masterLocations.clear();
            await db.masterLocations.bulkAdd(locations);
            console.log(`[DB] Added ${locations.length} locations`);
            return locations.length;
        } catch (error) {
            console.error('[DB] Error adding locations:', error);
            throw error;
        }
    },
    
    async getLocation(code) {
        return await db.masterLocations.get(code);
    },
    
    async getAllLocations() {
        return await db.masterLocations.toArray();
    },
    
    async getLocationCount() {
        return await db.masterLocations.count();
    },
    
    async clearLocations() {
        await db.masterLocations.clear();
        console.log('[DB] Locations cleared');
    },
    
    // ==========================================
    // Scan Records
    // ==========================================
    
    async addScanRecord(record) {
        try {
            const id = await db.scanRecords.add({
                ...record,
                timestamp: new Date().toISOString()
            });
            console.log('[DB] Added scan record:', id);
            return id;
        } catch (error) {
            console.error('[DB] Error adding scan record:', error);
            throw error;
        }
    },
    
    async getAllRecords() {
        return await db.scanRecords.orderBy('timestamp').reverse().toArray();
    },
    
    async getRecordCount() {
        return await db.scanRecords.count();
    },
    
    async deleteRecord(id) {
        await db.scanRecords.delete(id);
        console.log('[DB] Deleted record:', id);
    },
    
    async clearRecords() {
        await db.scanRecords.clear();
        console.log('[DB] Records cleared');
    },
    
    // ==========================================
    // App Settings
    // ==========================================
    
    async getSetting(key, defaultValue = null) {
        const setting = await db.appSettings.get(key);
        return setting ? setting.value : defaultValue;
    },
    
    async setSetting(key, value) {
        await db.appSettings.put({ key, value });
        console.log(`[DB] Setting saved: ${key}`);
    },
    
    async getAllSettings() {
        const settings = await db.appSettings.toArray();
        const result = {};
        settings.forEach(s => result[s.key] = s.value);
        return result;
    },
    
    // ==========================================
    // Utility
    // ==========================================
    
    async clearAll() {
        await db.masterItems.clear();
        await db.masterLocations.clear();
        await db.scanRecords.clear();
        await db.appSettings.clear();
        console.log('[DB] All data cleared');
    },
    
    async exportAll() {
        return {
            masterItems: await db.masterItems.toArray(),
            masterLocations: await db.masterLocations.toArray(),
            scanRecords: await db.scanRecords.toArray(),
            appSettings: await db.appSettings.toArray(),
            exportedAt: new Date().toISOString()
        };
    }
};

// Export for use
window.Database = Database;
