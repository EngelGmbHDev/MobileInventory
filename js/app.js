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
    masterItemsByBarcode: new Map(),
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

        // Highlight the initial expected scan target (Lagerplatz)
        this.updateExpectedScanTarget();

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
            locationStatusItem: document.getElementById('locationStatusItem'),
            itemStatusItem: document.getElementById('itemStatusItem'),
            currentLocation: document.getElementById('currentLocation'),
            currentItem: document.getElementById('currentItem'),
            clearLocationBtn: document.getElementById('clearLocation'),
            clearItemBtn: document.getElementById('clearItem'),
            markEmptyBtn: document.getElementById('markEmptyBtn'),
            quantityInput: document.getElementById('quantity-input'),
            quantity: document.getElementById('quantity'),
            qtyMinus: document.getElementById('qtyMinus'),
            qtyPlus: document.getElementById('qtyPlus'),
            saveRecord: document.getElementById('saveRecord'),
            cancelRecord: document.getElementById('cancelRecord'),
            feedback: document.getElementById('scan-feedback'),
            goToRecords: document.getElementById('goToRecords'),

            // Records page
            exportExcel: document.getElementById('exportExcel'),
            sendEmail: document.getElementById('sendEmail'),
            clearRecords: document.getElementById('clearRecords'),
            recordCount: document.getElementById('recordCount'),
            recordsList: document.getElementById('recordsList'),
            goToScan: document.getElementById('goToScan'),
            
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
            clearLocationAfterSave: document.getElementById('clearLocationAfterSave'),
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
        
        // Manual edit of Lagerplatz/Artikel directly in the status fields
        this.elements.currentLocation.addEventListener('blur', () => this.commitLocationInput());
        this.elements.currentLocation.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.elements.currentLocation.blur();
        });
        this.elements.currentItem.addEventListener('blur', () => this.commitItemInput());
        this.elements.currentItem.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.elements.currentItem.blur();
        });

        // Clear scanned Lagerplatz/Artikel
        this.elements.clearLocationBtn.addEventListener('click', () => this.clearLocation());
        this.elements.clearItemBtn.addEventListener('click', () => this.cancelCurrentRecord());
        this.elements.markEmptyBtn.addEventListener('click', () => this.markLocationEmpty());

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

        // Page shortcuts (Scan <-> Aufnahmen)
        this.elements.goToRecords.addEventListener('click', () => this.navigateTo('records'));
        this.elements.goToScan.addEventListener('click', () => this.navigateTo('scan'));

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
        this.elements.clearLocationAfterSave.addEventListener('change', (e) => this.saveSetting('clearLocationAfterSave', e.target.checked));
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
     * Highlight whether a Lagerplatz or Artikel scan is expected next,
     * show/hide the clear ("✕") buttons for whatever is currently set,
     * and offer "Kein Artikel" only while an Artikel scan is expected
     */
    updateExpectedScanTarget() {
        const expectingLocation = !this.currentLocation;
        const expectingItem = !!this.currentLocation && !this.currentItem;
        this.elements.locationStatusItem.classList.toggle('expected', expectingLocation);
        this.elements.itemStatusItem.classList.toggle('expected', expectingItem);
        this.elements.clearLocationBtn.classList.toggle('hidden', !this.currentLocation);
        this.elements.clearItemBtn.classList.toggle('hidden', !this.currentItem);
        this.elements.markEmptyBtn.classList.toggle('hidden', !expectingItem);
    },

    /**
     * Clear the current Lagerplatz (and the Artikel that depends on it)
     */
    clearLocation() {
        this.currentLocation = null;
        this.currentItem = null;
        this.elements.currentLocation.value = '';
        this.elements.currentLocation.className = 'status-value';
        this.elements.currentItem.value = '';
        this.elements.currentItem.className = 'status-value';
        this.elements.quantityInput.classList.add('hidden');
        this.updateExpectedScanTarget();
        this.hideFeedback();
    },

    /**
     * Reset the Lagerplatz field to the last confirmed value
     * (used after a rejected/no-op manual edit)
     */
    resetLocationInput() {
        this.elements.currentLocation.value = this.currentLocation ? this.currentLocation.code : '';
    },

    /**
     * Reset the Artikel field to the last confirmed value
     * (used after a rejected/no-op manual edit)
     */
    resetItemInput() {
        this.elements.currentItem.value = this.currentItem ? this.currentItem.code : '';
    },

    /**
     * Commit a manually typed Lagerplatz code (fires on blur/Enter)
     */
    async commitLocationInput() {
        const value = this.elements.currentLocation.value.trim();
        if (!value || (this.currentLocation && value === this.currentLocation.code)) {
            this.resetLocationInput();
            return;
        }
        await this.setLocation(value);
    },

    /**
     * Commit a manually typed Artikel code/Barcode (fires on blur/Enter)
     */
    async commitItemInput() {
        const value = this.elements.currentItem.value.trim();
        const resolved = value ? this.resolveItemCode(value) : null;
        if (!value || (this.currentItem && resolved === this.currentItem.code)) {
            this.resetItemInput();
            return;
        }
        await this.setItem(value);
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

        // Don't let a background camera scan clobber an in-progress manual edit
        if (document.activeElement === this.elements.currentLocation ||
            document.activeElement === this.elements.currentItem) {
            console.log('[App] Ignoring scan while manually editing a field');
            return;
        }

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
        // A Barcode/EAN match is unambiguously an item - check this first
        // since it's an exact match (EAN-13 is shorter/numeric vs. Code 39 codes)
        if (this.masterItemsByBarcode.has(code)) {
            return false;
        }

        // Check against master data
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
            this.resetLocationInput();
            return;
        }

        this.currentLocation = {
            code,
            isValid
        };

        // Clear item when changing location
        this.currentItem = null;

        // Update UI
        this.elements.currentLocation.value = this.currentLocation.code;
        this.elements.currentLocation.classList.toggle('valid', isValid);
        this.elements.currentLocation.classList.toggle('invalid', !isValid);
        this.elements.currentItem.value = '';
        this.elements.currentItem.className = 'status-value';
        this.elements.quantityInput.classList.add('hidden');
        this.updateExpectedScanTarget();

        this.showFeedback(`Lagerplatz: ${this.currentLocation.code}`, isValid ? 'success' : 'warning');
    },
    
    /**
     * Set current item
     */
    async setItem(code) {
        if (!this.currentLocation) {
            this.showFeedback('Bitte zuerst Lagerplatz scannen!', 'error');
            this.resetItemInput();
            return;
        }

        // Resolve a scanned Barcode/EAN to its ItemCode (falls back to the
        // scanned value itself if it already is the ItemCode)
        const itemCode = this.resolveItemCode(code);
        const item = this.masterItems.get(itemCode);
        const isValid = !!item;

        // Check strict validation
        const strictValidation = await Database.getSetting('strictItemValidation', false);
        if (strictValidation && !isValid) {
            this.showFeedback('Unbekannter Artikel!', 'error');
            this.resetItemInput();
            return;
        }

        this.currentItem = {
            code: itemCode,
            isValid
        };

        // Update UI
        this.elements.currentItem.value = this.currentItem.code;
        this.elements.currentItem.classList.toggle('valid', isValid);
        this.elements.currentItem.classList.toggle('invalid', !isValid);
        this.updateExpectedScanTarget();

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

        await this.saveRecord(record);

        // Reset Artikel for the next scan, and Lagerplatz too unless the
        // "Lagerplatz nach Speichern löschen" setting is turned off
        // (useful for scanning multiple items into the same Lagerplatz)
        const clearLocationAfterSave = await Database.getSetting('clearLocationAfterSave', true);
        if (clearLocationAfterSave) {
            this.clearLocation();
        } else {
            this.resetCurrentItemOnly();
        }

        this.showFeedback(`✓ Gespeichert: ${quantity}x`, 'success');
    },

    /**
     * Record the current Lagerplatz as checked but empty (no Artikel) -
     * itemCode is stored as null so it's distinguishable from a real scan
     */
    async markLocationEmpty() {
        if (!this.currentLocation) {
            this.showFeedback('Bitte zuerst Lagerplatz scannen!', 'error');
            return;
        }

        const record = {
            locationCode: this.currentLocation.code,
            itemCode: null,
            quantity: 0,
            isValidLocation: this.currentLocation.isValid,
            isValidItem: true
        };

        await this.saveRecord(record);

        // Always clear Lagerplatz + Artikel - an empty Lagerplatz is fully
        // processed, regardless of the "nach Speichern löschen" setting
        this.clearLocation();

        this.showFeedback('✓ Lagerplatz als leer markiert', 'success');
    },

    /**
     * Persist a scan record and update the records count
     * (shared by saveCurrentRecord and markLocationEmpty - resetting the
     * Scan page and showing feedback afterwards is each caller's own job,
     * since clearLocation() itself hides any currently shown feedback)
     */
    async saveRecord(record) {
        await Database.addScanRecord(record);
        await this.updateRecordCount();
    },

    /**
     * Reset only the Artikel (keep Lagerplatz) - shared by "Abbrechen"
     * and by "Speichern" when clearLocationAfterSave is disabled
     */
    resetCurrentItemOnly() {
        this.currentItem = null;
        this.elements.currentItem.value = '';
        this.elements.currentItem.className = 'status-value';
        this.elements.quantityInput.classList.add('hidden');
        this.updateExpectedScanTarget();
    },

    /**
     * Cancel current record
     */
    cancelCurrentRecord() {
        this.resetCurrentItemOnly();
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
        this.elements.clearLocationAfterSave.checked = settings.clearLocationAfterSave !== false;
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
        this.masterItemsByBarcode.clear();
        this.masterLocations.clear();

        items.forEach(item => {
            this.masterItems.set(item.code, item);
            if (item.barcode) {
                this.masterItemsByBarcode.set(item.barcode, item.code);
            }
        });
        locations.forEach(loc => this.masterLocations.set(loc.code, loc));

        console.log(`[App] Loaded ${items.length} items, ${locations.length} locations`);
    },

    /**
     * Resolve a scanned code to an ItemCode.
     * Checks the Barcode/EAN column first (e.g. the EAN-13 printed on the
     * product), falling back to the scanned value itself being the ItemCode.
     */
    resolveItemCode(code) {
        return this.masterItemsByBarcode.get(code) || code;
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
                    <div class="record-item-code${record.itemCode ? '' : ' empty'}">${record.itemCode || 'Kein Artikel (leer)'}</div>
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
