/**
 * Mobile Inventur - Main Application
 */

const App = {
    // Default path (relative to index.html) for the shared master data file
    DEFAULT_MASTER_DATA_URL: 'data/stammdaten.xlsx',

    // Current state
    currentPage: 'scan',
    currentLocation: null,
    currentItem: null,
    masterItems: new Map(),
    masterLocations: new Map(),
    
    // DOM Elements
    elements: {},
    
    /**
     * Initialize application
     */
    async init() {
        console.log('[App] Initializing...');
        
        // Cache DOM elements
        this.cacheElements();

        // Sync theme toggle icon with theme applied in <head>
        this.initTheme();

        // Setup event listeners
        this.setupEventListeners();
        
        // Load settings
        await this.loadSettings();
        
        // Load master data counts
        await this.loadMasterDataCounts();
        
        // Load master data into memory
        await this.loadMasterDataIntoMemory();
        
        // Initialize scanner
        await this.initScanner();
        
        // Register service worker
        this.registerServiceWorker();
        
        // Update records count
        await this.updateRecordCount();
        
        console.log('[App] Ready');
    },
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Header
            themeToggle: document.getElementById('themeToggle'),
            menuBtn: document.getElementById('menuBtn'),
            menu: document.getElementById('menu'),
            menuItems: document.querySelectorAll('.menu-item'),
            
            // Pages
            pages: document.querySelectorAll('.page'),
            
            // Scan page
            currentLocation: document.getElementById('currentLocation'),
            currentItem: document.getElementById('currentItem'),
            manualCode: document.getElementById('manualCode'),
            manualSubmit: document.getElementById('manualSubmit'),
            quantityInput: document.getElementById('quantity-input'),
            quantity: document.getElementById('quantity'),
            qtyMinus: document.getElementById('qtyMinus'),
            qtyPlus: document.getElementById('qtyPlus'),
            saveRecord: document.getElementById('saveRecord'),
            cancelRecord: document.getElementById('cancelRecord'),
            feedback: document.getElementById('scan-feedback'),
            
            // Records page
            exportExcel: document.getElementById('exportExcel'),
            sendEmail: document.getElementById('sendEmail'),
            clearRecords: document.getElementById('clearRecords'),
            recordCount: document.getElementById('recordCount'),
            recordsList: document.getElementById('recordsList'),
            
            // Master data page
            masterFileInput: document.getElementById('masterFileInput'),
            loadMasterData: document.getElementById('loadMasterData'),
            masterServerPath: document.getElementById('masterServerPath'),
            loadMasterDataFromServer: document.getElementById('loadMasterDataFromServer'),
            clearMasterData: document.getElementById('clearMasterData'),
            downloadTemplate: document.getElementById('downloadTemplate'),
            itemCount: document.getElementById('itemCount'),
            locationCount: document.getElementById('locationCount'),
            
            // Settings
            cameraSelect: document.getElementById('cameraSelect'),
            beepOnScan: document.getElementById('beepOnScan'),
            vibrateOnScan: document.getElementById('vibrateOnScan'),
            emailRecipient: document.getElementById('emailRecipient'),
            strictItemValidation: document.getElementById('strictItemValidation'),
            strictLocationValidation: document.getElementById('strictLocationValidation'),
            exportAllData: document.getElementById('exportAllData'),
            resetApp: document.getElementById('resetApp'),
            
            // Toast
            toast: document.getElementById('toast')
        };
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.cycleTheme());

        // Keep theme in sync with system changes while on "system" preference
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const pref = document.documentElement.getAttribute('data-theme-preference');
            if (pref === 'system') this.applyTheme('system');
        });

        // Menu toggle
        this.elements.menuBtn.addEventListener('click', () => this.toggleMenu());
        
        // Menu navigation
        this.elements.menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.navigateTo(page);
            });
        });
        
        // Manual code input
        this.elements.manualSubmit.addEventListener('click', () => {
            const code = this.elements.manualCode.value.trim();
            if (code) {
                this.handleScan(code);
                this.elements.manualCode.value = '';
            }
        });
        
        this.elements.manualCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.elements.manualSubmit.click();
            }
        });
        
        // Quantity controls
        this.elements.qtyMinus.addEventListener('click', () => {
            const qty = parseInt(this.elements.quantity.value) || 0;
            if (qty > 0) this.elements.quantity.value = qty - 1;
        });
        
        this.elements.qtyPlus.addEventListener('click', () => {
            const qty = parseInt(this.elements.quantity.value) || 0;
            this.elements.quantity.value = qty + 1;
        });
        
        // Save/Cancel record
        this.elements.saveRecord.addEventListener('click', () => this.saveCurrentRecord());
        this.elements.cancelRecord.addEventListener('click', () => this.cancelCurrentRecord());
        
        // Records page
        this.elements.exportExcel.addEventListener('click', () => this.exportToExcel());
        this.elements.sendEmail.addEventListener('click', () => this.sendByEmail());
        this.elements.clearRecords.addEventListener('click', () => this.clearAllRecords());
        
        // Master data page
        this.elements.loadMasterData.addEventListener('click', () => this.loadMasterFile());
        this.elements.loadMasterDataFromServer.addEventListener('click', () => this.loadMasterDataFromServer());
        this.elements.masterServerPath.addEventListener('change', (e) => {
            Database.setSetting('masterDataUrl', e.target.value.trim());
        });
        this.elements.clearMasterData.addEventListener('click', () => this.clearMasterData());
        this.elements.downloadTemplate.addEventListener('click', () => Excel.downloadTemplate());
        
        // Settings
        this.elements.cameraSelect.addEventListener('change', (e) => this.saveSetting('camera', e.target.value));
        this.elements.beepOnScan.addEventListener('change', (e) => this.saveSetting('beepOnScan', e.target.checked));
        this.elements.vibrateOnScan.addEventListener('change', (e) => this.saveSetting('vibrateOnScan', e.target.checked));
        this.elements.emailRecipient.addEventListener('change', (e) => this.saveSetting('emailRecipient', e.target.value));
        this.elements.strictItemValidation.addEventListener('change', (e) => this.saveSetting('strictItemValidation', e.target.checked));
        this.elements.strictLocationValidation.addEventListener('change', (e) => this.saveSetting('strictLocationValidation', e.target.checked));
        this.elements.exportAllData.addEventListener('click', () => this.exportAllData());
        this.elements.resetApp.addEventListener('click', () => this.resetApp());
    },
    
    /**
     * Sync theme toggle icon with the theme already applied by the
     * inline script in <head> (avoids a flash of the wrong theme)
     */
    initTheme() {
        const pref = document.documentElement.getAttribute('data-theme-preference') || 'system';
        this.updateThemeToggleIcon(pref);
    },

    /**
     * Apply a theme preference ('system' | 'light' | 'dark')
     */
    applyTheme(pref, persist = true) {
        const resolved = pref === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : pref;

        document.documentElement.setAttribute('data-theme', resolved);
        document.documentElement.setAttribute('data-theme-preference', pref);

        if (persist) localStorage.setItem('theme-preference', pref);

        this.updateThemeToggleIcon(pref);
    },

    /**
     * Cycle theme preference: System -> Hell -> Dunkel -> System
     */
    cycleTheme() {
        const order = ['system', 'light', 'dark'];
        const current = document.documentElement.getAttribute('data-theme-preference') || 'system';
        const next = order[(order.indexOf(current) + 1) % order.length];
        this.applyTheme(next);
    },

    /**
     * Update theme toggle button icon/label
     */
    updateThemeToggleIcon(pref) {
        const icons = { system: '🌓', light: '☀️', dark: '🌙' };
        const labels = { system: 'Design: System (Antippen zum Wechseln)', light: 'Design: Hell (Antippen zum Wechseln)', dark: 'Design: Dunkel (Antippen zum Wechseln)' };
        this.elements.themeToggle.textContent = icons[pref];
        this.elements.themeToggle.title = labels[pref];
    },

    /**
     * Toggle menu visibility
     */
    toggleMenu() {
        this.elements.menu.classList.toggle('hidden');
    },
    
    /**
     * Navigate to page
     */
    async navigateTo(pageName) {
        // Update menu
        this.elements.menuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageName);
        });
        
        // Update pages
        this.elements.pages.forEach(page => {
            page.classList.toggle('active', page.id === `page-${pageName}`);
            page.classList.toggle('hidden', page.id !== `page-${pageName}`);
        });
        
        // Hide menu on mobile
        this.elements.menu.classList.add('hidden');
        
        // Page-specific actions
        if (pageName === 'scan') {
            await Scanner.start(await Database.getSetting('camera', 'environment'));
        } else {
            await Scanner.stop();
        }
        
        if (pageName === 'records') {
            await this.loadRecordsList();
        }
        
        this.currentPage = pageName;
    },
    
    /**
     * Initialize scanner
     */
    async initScanner() {
        const success = await Scanner.init('reader', (code) => this.handleScan(code));
        if (success) {
            const camera = await Database.getSetting('camera', 'environment');
            await Scanner.start(camera);
        }
    },
    
    /**
     * Handle scanned code
     */
    async handleScan(code) {
        console.log('[App] Scanned:', code);
        
        // Determine if location or item
        const isLocation = await this.isLocationCode(code);
        
        if (!this.currentLocation || isLocation) {
            // Set as location
            await this.setLocation(code);
        } else {
            // Set as item
            await this.setItem(code);
        }
    },
    
    /**
     * Check if code is a location
     */
    async isLocationCode(code) {
        // Check against master data first
        if (this.masterLocations.has(code)) {
            return true;
        }
        
        // Check against items
        if (this.masterItems.has(code)) {
            return false;
        }
        
        // Heuristic: location codes often contain dashes and are shorter
        // This can be customized based on your code format
        if (code.includes('-') && code.length < 15) {
            return true;
        }
        
        return false;
    },
    
    /**
     * Set current location
     */
    async setLocation(code) {
        const location = this.masterLocations.get(code);
        const isValid = !!location;
        
        // Check strict validation
        const strictValidation = await Database.getSetting('strictLocationValidation', false);
        if (strictValidation && !isValid) {
            this.showFeedback('Unbekannter Lagerplatz!', 'error');
            return;
        }
        
        this.currentLocation = {
            code,
            isValid
        };

        // Clear item when changing location
        this.currentItem = null;

        // Update UI
        this.elements.currentLocation.textContent = this.currentLocation.code;
        this.elements.currentLocation.classList.toggle('valid', isValid);
        this.elements.currentLocation.classList.toggle('invalid', !isValid);
        this.elements.currentItem.textContent = '-';
        this.elements.quantityInput.classList.add('hidden');

        this.showFeedback(`Lagerplatz: ${this.currentLocation.code}`, isValid ? 'success' : 'warning');
    },
    
    /**
     * Set current item
     */
    async setItem(code) {
        if (!this.currentLocation) {
            this.showFeedback('Bitte zuerst Lagerplatz scannen!', 'error');
            return;
        }
        
        const item = this.masterItems.get(code);
        const isValid = !!item;
        
        // Check strict validation
        const strictValidation = await Database.getSetting('strictItemValidation', false);
        if (strictValidation && !isValid) {
            this.showFeedback('Unbekannter Artikel!', 'error');
            return;
        }
        
        this.currentItem = {
            code,
            isValid
        };

        // Update UI
        this.elements.currentItem.textContent = this.currentItem.code;
        this.elements.currentItem.classList.toggle('valid', isValid);
        this.elements.currentItem.classList.toggle('invalid', !isValid);

        // Show quantity input
        this.elements.quantity.value = 1;
        this.elements.quantityInput.classList.remove('hidden');
        this.elements.quantity.focus();
        this.elements.quantity.select();

        this.showFeedback(`Artikel: ${this.currentItem.code}`, isValid ? 'success' : 'warning');
    },
    
    /**
     * Save current record
     */
    async saveCurrentRecord() {
        if (!this.currentLocation || !this.currentItem) {
            this.showFeedback('Lagerplatz und Artikel erforderlich!', 'error');
            return;
        }
        
        const quantity = parseInt(this.elements.quantity.value) || 0;
        
        const record = {
            locationCode: this.currentLocation.code,
            itemCode: this.currentItem.code,
            quantity,
            isValidLocation: this.currentLocation.isValid,
            isValidItem: this.currentItem.isValid
        };
        
        await Database.addScanRecord(record);
        
        // Reset item (keep location)
        this.currentItem = null;
        this.elements.currentItem.textContent = '-';
        this.elements.currentItem.className = 'status-value';
        this.elements.quantityInput.classList.add('hidden');
        
        await this.updateRecordCount();
        
        this.showFeedback(`✓ Gespeichert: ${quantity}x`, 'success');
    },
    
    /**
     * Cancel current record
     */
    cancelCurrentRecord() {
        this.currentItem = null;
        this.elements.currentItem.textContent = '-';
        this.elements.currentItem.className = 'status-value';
        this.elements.quantityInput.classList.add('hidden');
        this.hideFeedback();
    },
    
    /**
     * Load settings into UI
     */
    async loadSettings() {
        const settings = await Database.getAllSettings();
        
        this.elements.cameraSelect.value = settings.camera || 'environment';
        this.elements.beepOnScan.checked = settings.beepOnScan !== false;
        this.elements.vibrateOnScan.checked = settings.vibrateOnScan !== false;
        this.elements.emailRecipient.value = settings.emailRecipient || '';
        this.elements.strictItemValidation.checked = settings.strictItemValidation === true;
        this.elements.strictLocationValidation.checked = settings.strictLocationValidation === true;
        this.elements.masterServerPath.value = settings.masterDataUrl || this.DEFAULT_MASTER_DATA_URL;
    },
    
    /**
     * Save setting
     */
    async saveSetting(key, value) {
        await Database.setSetting(key, value);
        this.showToast('Einstellung gespeichert');
    },
    
    /**
     * Load master data counts
     */
    async loadMasterDataCounts() {
        this.elements.itemCount.textContent = await Database.getItemCount();
        this.elements.locationCount.textContent = await Database.getLocationCount();
    },
    
    /**
     * Load master data into memory for fast lookup
     */
    async loadMasterDataIntoMemory() {
        const items = await Database.getAllItems();
        const locations = await Database.getAllLocations();
        
        this.masterItems.clear();
        this.masterLocations.clear();
        
        items.forEach(item => this.masterItems.set(item.code, item));
        locations.forEach(loc => this.masterLocations.set(loc.code, loc));
        
        console.log(`[App] Loaded ${items.length} items, ${locations.length} locations`);
    },
    
    /**
     * Load master file
     */
    async loadMasterFile() {
        const file = this.elements.masterFileInput.files[0];
        if (!file) {
            this.showToast('Bitte Datei auswählen', 'error');
            return;
        }
        
        try {
            const data = await Excel.importMasterData(file);
            
            if (data.items.length > 0) {
                await Database.addItems(data.items);
            }
            
            if (data.locations.length > 0) {
                await Database.addLocations(data.locations);
            }
            
            await this.loadMasterDataCounts();
            await this.loadMasterDataIntoMemory();
            
            this.showToast(`${data.items.length} Artikel, ${data.locations.length} Lagerplätze geladen`, 'success');
            this.elements.masterFileInput.value = '';
            
        } catch (error) {
            console.error('[App] Import error:', error);
            this.showToast('Fehler beim Importieren: ' + error.message, 'error');
        }
    },
    
    /**
     * Load master data from a shared file in the project folder (e.g. data/stammdaten.xlsx)
     */
    async loadMasterDataFromServer() {
        const path = this.elements.masterServerPath.value.trim() || this.DEFAULT_MASTER_DATA_URL;

        try {
            const data = await Excel.importMasterDataFromUrl(path);

            if (data.items.length > 0) {
                await Database.addItems(data.items);
            }

            if (data.locations.length > 0) {
                await Database.addLocations(data.locations);
            }

            await Database.setSetting('masterDataUrl', path);
            await this.loadMasterDataCounts();
            await this.loadMasterDataIntoMemory();

            this.showToast(`${data.items.length} Artikel, ${data.locations.length} Lagerplätze aus Projektordner geladen`, 'success');

        } catch (error) {
            console.error('[App] Server import error:', error);
            this.showToast('Fehler beim Laden: ' + error.message, 'error');
        }
    },

    /**
     * Clear master data
     */
    async clearMasterData() {
        if (!confirm('Alle Stammdaten löschen?')) return;
        
        await Database.clearItems();
        await Database.clearLocations();
        await this.loadMasterDataCounts();
        this.masterItems.clear();
        this.masterLocations.clear();
        
        this.showToast('Stammdaten gelöscht');
    },
    
    /**
     * Update record count
     */
    async updateRecordCount() {
        const count = await Database.getRecordCount();
        this.elements.recordCount.textContent = `${count} Aufnahmen`;
    },
    
    /**
     * Load records list
     */
    async loadRecordsList() {
        const records = await Database.getAllRecords();
        await this.updateRecordCount();
        
        this.elements.recordsList.innerHTML = records.map(record => `
            <div class="record-item" data-id="${record.id}">
                <div class="record-info">
                    <div class="record-location">${record.locationCode}</div>
                    <div class="record-item-code">${record.itemCode}</div>
                </div>
                <div class="record-quantity">${record.quantity}</div>
                <button class="record-delete" onclick="App.deleteRecord(${record.id})">🗑️</button>
            </div>
        `).join('');
    },
    
    /**
     * Delete single record
     */
    async deleteRecord(id) {
        await Database.deleteRecord(id);
        await this.loadRecordsList();
        this.showToast('Aufnahme gelöscht');
    },
    
    /**
     * Clear all records
     */
    async clearAllRecords() {
        const count = await Database.getRecordCount();
        if (!confirm(`Alle ${count} Aufnahmen löschen?`)) return;
        
        await Database.clearRecords();
        await this.loadRecordsList();
        this.showToast('Alle Aufnahmen gelöscht');
    },
    
    /**
     * Export to Excel
     */
    async exportToExcel() {
        const records = await Database.getAllRecords();
        
        if (records.length === 0) {
            this.showToast('Keine Aufnahmen vorhanden', 'error');
            return;
        }
        
        const blob = Excel.exportRecords(records);

        Excel.downloadFile(blob, Excel.generateFilename());
        this.showToast('Excel exportiert', 'success');
    },
    
    /**
     * Send by email
     */
    async sendByEmail() {
        const records = await Database.getAllRecords();
        
        if (records.length === 0) {
            this.showToast('Keine Aufnahmen vorhanden', 'error');
            return;
        }
        
        // First export to trigger download
        await this.exportToExcel();
        
        // Then open email client
        const recipient = await Database.getSetting('emailRecipient', '');
        const subject = encodeURIComponent(`Inventur ${new Date().toLocaleDateString('de-DE')}`);
        const body = encodeURIComponent(`Inventur-Export\n\n${records.length} Aufnahmen\n\nBitte die heruntergeladene Excel-Datei anhängen.`);
        
        window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    },
    
    /**
     * Export all data
     */
    async exportAllData() {
        const data = await Database.exportAll();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `MobileInventur_Backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        
        this.showToast('Backup exportiert');
    },
    
    /**
     * Reset app
     */
    async resetApp() {
        if (!confirm('Alle Daten löschen und App zurücksetzen?')) return;
        if (!confirm('Diese Aktion kann nicht rückgängig gemacht werden. Fortfahren?')) return;
        
        await Database.clearAll();
        this.showToast('App zurückgesetzt');
        location.reload();
    },
    
    /**
     * Show feedback message
     */
    showFeedback(message, type = 'info') {
        this.elements.feedback.textContent = message;
        this.elements.feedback.className = `feedback ${type}`;
        this.elements.feedback.classList.remove('hidden');
        
        // Auto-hide after 3 seconds
        setTimeout(() => this.hideFeedback(), 3000);
    },
    
    /**
     * Hide feedback message
     */
    hideFeedback() {
        this.elements.feedback.classList.add('hidden');
    },
    
    /**
     * Show toast notification
     */
    showToast(message, type = '') {
        this.elements.toast.textContent = message;
        this.elements.toast.className = `toast ${type}`;
        this.elements.toast.classList.remove('hidden');
        
        setTimeout(() => {
            this.elements.toast.classList.add('hidden');
        }, 2500);
    },
    
    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[App] ServiceWorker registered:', registration);
            } catch (error) {
                console.log('[App] ServiceWorker registration failed:', error);
            }
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Export for global access
window.App = App;
